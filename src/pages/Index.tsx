import { useState } from "react";
import { characters, predefinedFaces } from "@/data/characters";
import { Character } from "@/types/character";
import WebcamCapture from "@/components/WebcamCapture";
import CharacterDisplay from "@/components/CharacterDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { ElevenLabsService } from "@/utils/elevenLabsService";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedFace, setCapturedFace] = useState<string>("");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [userName, setUserName] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const getRandomCharacter = (): Character => {
    return characters[Math.floor(Math.random() * characters.length)];
  };

  const getPredefinedCharacter = (name: string): Character | null => {
    const predefined = predefinedFaces.find(
      (pf) => pf.name.toLowerCase() === name.toLowerCase()
    );
    if (predefined) {
      return characters.find((c) => c.id === predefined.characterId) || null;
    }
    return null;
  };

  const handleCapture = (imageData: string) => {
    setCapturedFace(imageData);
    
    // Check if user has a predefined character
    const predefinedChar = userName ? getPredefinedCharacter(userName) : null;
    const character = predefinedChar || getRandomCharacter();
    
    setSelectedCharacter(character);
    
    if (predefinedChar) {
      toast.success(`Welcome back, ${userName}! You've been assigned your character.`);
    } else {
      toast.success(`You've been transformed into ${character.name}!`);
    }
  };

  const handlePlayVoice = async () => {
    if (!selectedCharacter?.voiceId || !elevenLabsKey) {
      toast.error("Please enter your ElevenLabs API key to hear the character story.");
      return;
    }

    // Check if this is a predefined face character
    const isPredefined = predefinedFaces.some(
      (pf) => pf.characterId === selectedCharacter.id &&
             pf.name.toLowerCase() === userName.toLowerCase()
    );

    if (!isPredefined) {
      toast.info("Voice-over is only available for predefined characters!");
      return;
    }

    setIsPlayingVoice(true);
    try {
      const service = new ElevenLabsService(elevenLabsKey);
      await service.playCharacterDescription(
        selectedCharacter.description,
        selectedCharacter.voiceId
      );
      toast.success("Audio playback complete!");
    } catch (error) {
      toast.error("Failed to play audio. Please check your API key.");
    } finally {
      setIsPlayingVoice(false);
    }
  };

  const handleReset = () => {
    setCapturedFace("");
    setSelectedCharacter(null);
    setUserName("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div
        className="relative py-20 px-4 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-accent bg-clip-text text-transparent">
            Marvel Face Filter
          </h1>
          <p className="text-xl md:text-2xl text-foreground/90 mb-8">
            Transform into your favorite Marvel superhero!
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Zap className="w-5 h-5 text-marvel-gold" />
            <span>Powered by AI • 12 Iconic Characters</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {!capturedFace ? (
          <div className="space-y-8">
            {/* User Input Card */}
            <Card className="p-6 bg-card border-primary/20 shadow-card">
              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Name (Optional)
                  </label>
                  <Input
                    placeholder="Enter your name..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="bg-background/50 border-primary/30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Predefined names (Tony, Steve, Bruce) get special characters with voice-over!
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ElevenLabs API Key (For Voice-Over)
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter API key..."
                    value={elevenLabsKey}
                    onChange={(e) => setElevenLabsKey(e.target.value)}
                    className="bg-background/50 border-primary/30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for predefined character voice-overs. Get it from{" "}
                    <a
                      href="https://elevenlabs.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      elevenlabs.io
                    </a>
                  </p>
                </div>
              </div>
            </Card>

            {/* Webcam Section */}
            <WebcamCapture
              onCapture={handleCapture}
              isActive={isCameraActive}
              onToggle={() => setIsCameraActive(!isCameraActive)}
            />

            {/* Character Grid Preview */}
            <div className="mt-12">
              <h2 className="text-3xl font-bold text-center mb-8">
                Available Characters
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {characters.map((char) => (
                  <Card
                    key={char.id}
                    className="p-2 bg-card hover:border-primary transition-all cursor-pointer group"
                  >
                    <img
                      src={char.image}
                      alt={char.name}
                      className="w-full aspect-square object-cover rounded mb-2 group-hover:scale-105 transition-transform"
                    />
                    <p className="text-center text-sm font-medium">{char.name}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <CharacterDisplay
              character={selectedCharacter!}
              faceImage={capturedFace}
              onPlayVoice={handlePlayVoice}
              isPlayingVoice={isPlayingVoice}
            />
            
            <div className="text-center">
              <Button
                onClick={handleReset}
                size="lg"
                variant="outline"
                className="shadow-glow"
              >
                Transform Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
