import { useState, useEffect } from "react";
import { characters, predefinedChiefGuests, getJarvisIntroduction } from "@/data/characters";
import { Character } from "@/types/character";
import WebcamCapture from "@/components/WebcamCapture";
import CharacterDisplay from "@/components/CharacterDisplay";
import ChiefGuestSetup from "@/components/ChiefGuestSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Settings } from "lucide-react";
import { toast } from "sonner";
import { ElevenLabsService } from "@/utils/elevenLabsService";
import { loadFaceRecognitionModels, matchFaceToReferences, extractFaceDescriptor } from "@/utils/faceRecognition";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedFace, setCapturedFace] = useState<string>("");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [recognizedGuest, setRecognizedGuest] = useState<string | null>(null);
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [guestPhotos, setGuestPhotos] = useState<Map<string, string>>(new Map());
  const [faceDescriptors, setFaceDescriptors] = useState<Map<string, Float32Array>>(new Map());
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    // Load face recognition models on mount
    loadFaceRecognitionModels()
      .then(() => {
        setModelsLoaded(true);
        toast.success("Face recognition ready!");
      })
      .catch((error) => {
        console.error("Failed to load face recognition models:", error);
        toast.error("Face recognition unavailable. Models failed to load.");
      });
  }, []);

  const handleGuestPhotoUpload = async (guestName: string, photoUrl: string) => {
    const newPhotos = new Map(guestPhotos);
    newPhotos.set(guestName, photoUrl);
    setGuestPhotos(newPhotos);

    if (!modelsLoaded) {
      toast.warning("Face recognition models still loading...");
      return;
    }

    // Extract face descriptor from uploaded photo
    const img = document.createElement('img');
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = photoUrl;
    });

    try {
      const descriptor = await extractFaceDescriptor(img);
      if (descriptor) {
        const newDescriptors = new Map(faceDescriptors);
        newDescriptors.set(guestName, descriptor);
        setFaceDescriptors(newDescriptors);
        toast.success(`Face profile created for ${guestName}`);
      } else {
        toast.error(`No face detected in photo for ${guestName}`);
      }
    } catch (error) {
      console.error("Error processing face:", error);
      toast.error("Failed to process face in photo");
    }
  };

  const getRandomCharacter = (): Character => {
    return characters[Math.floor(Math.random() * characters.length)];
  };

  const getChiefGuestCharacter = (guestName: string): Character | null => {
    const guest = predefinedChiefGuests.find(g => g.name === guestName);
    if (guest) {
      return characters.find((c) => c.id === guest.characterId) || null;
    }
    return null;
  };

  const handleCapture = async (imageData: string) => {
    setCapturedFace(imageData);
    setRecognizedGuest(null);

    // Try to match face if models are loaded and we have descriptors
    if (modelsLoaded && faceDescriptors.size > 0) {
      toast.info("Analyzing face...");
      
      try {
        const match = await matchFaceToReferences(imageData, faceDescriptors);
        
        if (match) {
          // Chief guest recognized!
          const character = getChiefGuestCharacter(match.name);
          if (character) {
            setSelectedCharacter(character);
            setRecognizedGuest(match.name);
            toast.success(`Welcome, ${match.name}! Recognition confidence: ${match.confidence.toFixed(1)}%`);
            return;
          }
        }
      } catch (error) {
        console.error("Face matching error:", error);
      }
    }

    // Random character for non-chief guests
    const character = getRandomCharacter();
    setSelectedCharacter(character);
    toast.success(`You've been transformed into ${character.name}!`);
  };

  const handlePlayVoice = async () => {
    if (!elevenLabsKey) {
      toast.error("Please enter your ElevenLabs API key to hear Jarvis introduction.");
      return;
    }

    if (!recognizedGuest || !selectedCharacter) {
      toast.info("Jarvis voice-over is only available for recognized chief guests!");
      return;
    }

    setIsPlayingVoice(true);
    try {
      const service = new ElevenLabsService(elevenLabsKey);
      const jarvisIntro = getJarvisIntroduction(recognizedGuest, selectedCharacter);
      await service.playJarvisIntroduction(jarvisIntro);
      toast.success("Jarvis protocol complete!");
    } catch (error) {
      toast.error("Failed to play audio. Please check your API key.");
    } finally {
      setIsPlayingVoice(false);
    }
  };

  const handleReset = () => {
    setCapturedFace("");
    setSelectedCharacter(null);
    setRecognizedGuest(null);
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
            Transform into your favorite Marvel superhero with AI-powered face recognition!
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Zap className="w-5 h-5 text-marvel-gold" />
            <span>Powered by AI • Face Recognition • 12 Iconic Characters</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {!capturedFace ? (
          <Tabs defaultValue="capture" className="space-y-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="capture">Capture</TabsTrigger>
              <TabsTrigger value="setup">
                <Settings className="w-4 h-4 mr-2" />
                Chief Guest Setup
              </TabsTrigger>
            </TabsList>

            <TabsContent value="capture" className="space-y-8">
              {/* API Key Input */}
              <Card className="p-6 bg-card border-primary/20 shadow-card max-w-md mx-auto">
                <label className="block text-sm font-medium mb-2">
                  ElevenLabs API Key (For Jarvis Voice-Over)
                </label>
                <Input
                  type="password"
                  placeholder="Enter API key..."
                  value={elevenLabsKey}
                  onChange={(e) => setElevenLabsKey(e.target.value)}
                  className="bg-background/50 border-primary/30"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Required for chief guest Jarvis introductions. Get it from{" "}
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    elevenlabs.io
                  </a>
                </p>
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
            </TabsContent>

            <TabsContent value="setup">
              <ChiefGuestSetup
                guests={predefinedChiefGuests}
                onGuestPhotoUpload={handleGuestPhotoUpload}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-8">
            {recognizedGuest && (
              <div className="text-center p-4 bg-gradient-accent rounded-lg shadow-glow animate-pulse-glow">
                <p className="text-xl font-bold text-background">
                  🎯 Chief Guest Recognized: {recognizedGuest}
                </p>
              </div>
            )}
            
            <CharacterDisplay
              character={selectedCharacter!}
              faceImage={capturedFace}
              onPlayVoice={recognizedGuest ? handlePlayVoice : undefined}
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
