import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Check } from "lucide-react";
import { toast } from "sonner";

interface ChiefGuest {
  name: string;
  characterId: string;
  photoUrl?: string;
}

interface ChiefGuestSetupProps {
  guests: ChiefGuest[];
  onGuestPhotoUpload: (guestName: string, photoUrl: string) => void;
}

const ChiefGuestSetup = ({ guests, onGuestPhotoUpload }: ChiefGuestSetupProps) => {
  const [uploadedPhotos, setUploadedPhotos] = useState<Map<string, string>>(new Map());

  const handlePhotoUpload = (guestName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const photoUrl = e.target?.result as string;
      const newPhotos = new Map(uploadedPhotos);
      newPhotos.set(guestName, photoUrl);
      setUploadedPhotos(newPhotos);
      onGuestPhotoUpload(guestName, photoUrl);
      toast.success(`Photo uploaded for ${guestName}`);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (guestName: string) => {
    const newPhotos = new Map(uploadedPhotos);
    newPhotos.delete(guestName);
    setUploadedPhotos(newPhotos);
    toast.info(`Photo removed for ${guestName}`);
  };

  return (
    <Card className="p-6 bg-card border-primary/20 shadow-card">
      <h2 className="text-2xl font-bold mb-4 text-primary">Chief Guest Setup</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Upload photos of your chief guests for automatic face recognition and Jarvis-style introductions
      </p>
      
      <div className="space-y-4">
        {guests.map((guest) => {
          const hasPhoto = uploadedPhotos.has(guest.name);
          const photoUrl = uploadedPhotos.get(guest.name);
          
          return (
            <div
              key={guest.name}
              className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border border-border"
            >
              <div className="flex-1">
                <p className="font-medium">{guest.name}</p>
                <p className="text-sm text-muted-foreground">
                  Character: {guest.characterId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </p>
              </div>
              
              {hasPhoto && photoUrl ? (
                <div className="flex items-center gap-2">
                  <img
                    src={photoUrl}
                    alt={guest.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removePhoto(guest.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Check className="h-5 w-5 text-green-500" />
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(guest.name, e)}
                    className="hidden"
                    id={`photo-${guest.name}`}
                  />
                  <label htmlFor={`photo-${guest.name}`}>
                    <Button size="sm" variant="outline" asChild>
                      <span className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
        <p className="text-sm text-foreground">
          <strong>Note:</strong> When a chief guest shows their face to the webcam, they will be automatically recognized 
          and transformed into their assigned Marvel character with a special Jarvis-style voice introduction!
        </p>
      </div>
    </Card>
  );
};

export default ChiefGuestSetup;
