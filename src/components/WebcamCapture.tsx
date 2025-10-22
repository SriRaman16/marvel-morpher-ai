import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface WebcamCaptureProps {
  onCapture: (imageData: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

const WebcamCapture = ({ onCapture, isActive, onToggle }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isActive) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [isActive]);

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/png");
        onCapture(imageData);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-2xl aspect-video bg-card rounded-lg overflow-hidden border-2 border-primary shadow-glow">
        {isActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CameraOff className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="flex gap-4">
        <Button
          onClick={onToggle}
          variant={isActive ? "secondary" : "default"}
          size="lg"
          className="shadow-glow"
        >
          {isActive ? (
            <>
              <CameraOff className="mr-2 h-5 w-5" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="mr-2 h-5 w-5" />
              Start Camera
            </>
          )}
        </Button>
        
        {isActive && (
          <Button
            onClick={captureImage}
            size="lg"
            className="bg-gradient-accent shadow-glow"
          >
            Capture & Transform
          </Button>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;
