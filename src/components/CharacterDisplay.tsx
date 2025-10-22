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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;

    // Load character body
    const characterImg = new Image();
    characterImg.crossOrigin = "anonymous";
    
    await new Promise((resolve, reject) => {
      characterImg.onload = resolve;
      characterImg.onerror = reject;
      characterImg.src = character.image;
    });

    // Draw character body
    ctx.drawImage(characterImg, 0, 0, canvas.width, canvas.height);

    // Load and draw face
    const faceImg = new Image();
    await new Promise((resolve, reject) => {
      faceImg.onload = resolve;
      faceImg.onerror = reject;
      faceImg.src = faceImage;
    });

    // Calculate face position (center top area)
    const faceWidth = canvas.width * 0.25;
    const faceHeight = faceWidth * (faceImg.height / faceImg.width);
    const faceX = canvas.width / 2 - faceWidth / 2;
    const faceY = canvas.height * 0.12;

    // Draw face with circular mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      faceX + faceWidth / 2,
      faceY + faceHeight / 2,
      faceWidth / 2,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(faceImg, faceX, faceY, faceWidth, faceHeight);
    ctx.restore();

    // Add glow effect around face
    ctx.shadowColor = "rgba(226, 54, 54, 0.6)";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "rgba(226, 54, 54, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      faceX + faceWidth / 2,
      faceY + faceHeight / 2,
      faceWidth / 2 + 2,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    const finalImage = canvas.toDataURL("image/png");
    setCompositeImage(finalImage);
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
