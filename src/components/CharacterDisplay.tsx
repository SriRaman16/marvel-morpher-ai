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

    try {
      toast.info("Transforming your image...");
      
      // Convert character image to base64
      const characterBase64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = reject;
        img.src = character.image;
      });

      // Call Fotor API via backend function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transform-character`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userImage: faceImage,
            characterImage: characterBase64,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Transformation failed');
      }

      setCompositeImage(data.transformedImage);
      toast.success("Transformation complete!");
    } catch (error) {
      console.error("Error transforming image:", error);
      toast.error("Failed to transform image. Please try again.");
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
