import { useEffect, useRef, useState } from "react";
import { Character } from "@/types/character";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Volume2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface CharacterDisplayProps {
  character: Character;
  faceImage: string;
  onPlayVoice?: () => void;
  isPlayingVoice?: boolean;
}

const CharacterDisplay = ({
  character,
  faceImage,
  onPlayVoice,
  isPlayingVoice,
}: CharacterDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositeImage, setCompositeImage] = useState<string>("");
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    compositeImages();
  }, [character, faceImage]);

  const compositeImages = async () => {
    if (!character || !faceImage) return;
    
    const { detectFaceLandmarks } = await import('@/utils/faceRecognition');
    const { extractAndPositionFace } = await import('@/utils/faceMorphing');

    try {
      const bodyImg = new Image();
      bodyImg.crossOrigin = "anonymous";
      
      const faceImg = new Image();
      faceImg.crossOrigin = "anonymous";

      await Promise.all([
        new Promise((resolve, reject) => {
          bodyImg.onload = resolve;
          bodyImg.onerror = reject;
          bodyImg.src = character.image;
        }),
        new Promise((resolve, reject) => {
          faceImg.onload = resolve;
          faceImg.onerror = reject;
          faceImg.src = faceImage;
        }),
      ]);

      // Detect face landmarks from user's face
      const landmarks = await detectFaceLandmarks(faceImg);
      
      if (!landmarks) {
        console.warn('No face landmarks detected, using simple overlay');
        // Fallback to simple overlay if no landmarks detected
        const canvas = canvasRef.current!;
        canvas.width = bodyImg.width;
        canvas.height = bodyImg.height;
        const ctx = canvas.getContext("2d")!;

        ctx.drawImage(bodyImg, 0, 0);

        const faceWidth = bodyImg.width * 0.35;
        const faceHeight = faceWidth;
        const faceX = bodyImg.width * 0.32;
        const faceY = bodyImg.height * 0.08;

        ctx.save();
        ctx.beginPath();
        ctx.arc(faceX + faceWidth / 2, faceY + faceHeight / 2, faceWidth / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(faceImg, faceX, faceY, faceWidth, faceHeight);
        ctx.restore();

        const dataUrl = canvas.toDataURL("image/png");
        setCompositeImage(dataUrl);
        return;
      }

      // Define character face region (adjust based on character body structure)
      const characterFaceRegion = {
        x: bodyImg.width * 0.32,
        y: bodyImg.height * 0.08,
        width: bodyImg.width * 0.35,
        height: bodyImg.width * 0.35
      };

      // Use face morphing with landmark mapping
      const resultCanvas = extractAndPositionFace(
        faceImg,
        bodyImg,
        landmarks,
        characterFaceRegion
      );

      // Update canvas reference and composite image
      const canvas = canvasRef.current!;
      canvas.width = resultCanvas.width;
      canvas.height = resultCanvas.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(resultCanvas, 0, 0);

      const dataUrl = canvas.toDataURL("image/png");
      setCompositeImage(dataUrl);
    } catch (error) {
      console.error("Error compositing images:", error);
    }
  };

  const downloadImage = () => {
    const link = document.createElement("a");
    link.download = `marvel-${character.name.toLowerCase()}-transformation.png`;
    link.href = compositeImage;
    link.click();
    toast.success("Image downloaded!");
  };

  return (
    <div className="flex flex-col items-center gap-6 animate-slide-up">
      <div className="relative">
        <canvas ref={canvasRef} className="hidden" />
        {compositeImage && (
          <div className="relative rounded-lg overflow-hidden border-2 border-primary shadow-glow">
            <img
              src={compositeImage}
              alt={`${character.name} transformation`}
              className="w-full max-w-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
              <h3 className="text-2xl font-bold text-primary">{character.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {character.description}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Button onClick={downloadImage} size="lg" className="shadow-glow">
          <Download className="mr-2 h-5 w-5" />
          Download
        </Button>

        {onPlayVoice && (
          <Button
            onClick={onPlayVoice}
            size="lg"
            variant="secondary"
            disabled={isPlayingVoice}
            className="shadow-glow"
          >
            <Volume2 className="mr-2 h-5 w-5" />
            {isPlayingVoice ? "Playing..." : "Hear Story"}
          </Button>
        )}

        <Button
          onClick={() => setShowQR(!showQR)}
          size="lg"
          variant="outline"
          className="shadow-glow"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          {showQR ? "Hide" : "Show"} QR Code
        </Button>
      </div>

      {showQR && compositeImage && (
        <div className="p-6 bg-card rounded-lg border-2 border-primary shadow-glow animate-slide-up">
          <p className="text-sm text-center mb-4 text-muted-foreground">
            Scan to download your Marvel transformation
          </p>
          <QRCodeSVG value={compositeImage} size={200} level="H" />
        </div>
      )}
    </div>
  );
};

export default CharacterDisplay;
