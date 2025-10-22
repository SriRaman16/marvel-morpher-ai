export interface Character {
  id: string;
  name: string;
  image: string;
  description: string;
  voiceId?: string;
  gender: "male" | "female";
}

export interface PredefinedFace {
  name: string;
  characterId: string;
  referenceImage?: string;
}
