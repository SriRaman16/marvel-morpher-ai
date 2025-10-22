import { Character } from "@/types/character";
import hulkImage from "@/assets/characters/hulk.png";
import ironmanImage from "@/assets/characters/ironman.png";
import captainAmericaImage from "@/assets/characters/captain-america.png";
import spidermanImage from "@/assets/characters/spiderman.png";
import thanosImage from "@/assets/characters/thanos.png";
import doctorStrangeImage from "@/assets/characters/doctor-strange.png";
import sheHulkImage from "@/assets/characters/she-hulk.png";
import visionImage from "@/assets/characters/vision.png";
import captainMarvelImage from "@/assets/characters/captain-marvel.png";
import wolverineImage from "@/assets/characters/wolverine.png";
import gamoraImage from "@/assets/characters/gamora.png";
import nickFuryImage from "@/assets/characters/nick-fury.png";

export const characters: Character[] = [
  {
    id: "hulk",
    name: "Hulk",
    image: hulkImage,
    description: "The incredible Hulk possesses superhuman strength that increases with his rage. Bruce Banner transforms into this green giant when angered, making him one of the most powerful beings in the universe.",
    voiceId: "9BWtsMINqrJLrRacOk9x", // Aria
  },
  {
    id: "ironman",
    name: "Iron Man",
    image: ironmanImage,
    description: "Genius billionaire Tony Stark uses his powered armor suit equipped with cutting-edge technology, repulsor beams, and flight capabilities to protect the world as Iron Man.",
    voiceId: "IKne3meq5aSn9XLyUdCD", // Charlie
  },
  {
    id: "captain-america",
    name: "Captain America",
    image: captainAmericaImage,
    description: "Steve Rogers, enhanced by the Super Soldier Serum, embodies peak human potential. Armed with his iconic vibranium shield, he leads with courage, honor, and unwavering dedication to justice.",
    voiceId: "bIHbv24MWmeRgasZH58o", // Will
  },
  {
    id: "spiderman",
    name: "Spider-Man",
    image: spidermanImage,
    description: "Peter Parker gained spider-like abilities after being bitten by a radioactive spider. With wall-crawling powers, spider-sense, and web-slinging abilities, he protects New York City.",
    voiceId: "N2lVS1w4EtoT3dr4eOWO", // Callum
  },
  {
    id: "thanos",
    name: "Thanos",
    image: thanosImage,
    description: "The Mad Titan Thanos seeks ultimate power through the Infinity Stones. With incredible strength and a twisted sense of balance, he's one of the universe's most formidable threats.",
    voiceId: "onwK4e9ZLuTAKqWW03F9", // Daniel
  },
  {
    id: "doctor-strange",
    name: "Doctor Strange",
    image: doctorStrangeImage,
    description: "Master of the mystic arts, Stephen Strange wields powerful magic and can manipulate time and dimensions. As the Sorcerer Supreme, he protects Earth from mystical threats.",
    voiceId: "JBFqnCBsd6RMkjVDRZzb", // George
  },
  {
    id: "she-hulk",
    name: "She-Hulk",
    image: sheHulkImage,
    description: "Jennifer Walters gained Hulk-like powers through a blood transfusion from her cousin Bruce Banner. Unlike Hulk, she retains her intelligence and personality while transformed.",
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah
  },
  {
    id: "vision",
    name: "Vision",
    image: visionImage,
    description: "An android powered by the Mind Stone, Vision possesses superhuman strength, flight, energy projection, and density manipulation. He embodies both logic and humanity.",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ", // Liam
  },
  {
    id: "captain-marvel",
    name: "Captain Marvel",
    image: captainMarvelImage,
    description: "Carol Danvers possesses incredible cosmic powers including energy projection, flight, and superhuman strength. She's one of the universe's most powerful heroes.",
    voiceId: "XB0fDUnXU5powFXDhCwa", // Charlotte
  },
  {
    id: "wolverine",
    name: "Wolverine",
    image: wolverineImage,
    description: "Logan's mutant healing factor and adamantium claws make him nearly indestructible. With enhanced senses and combat skills, he's the best there is at what he does.",
    voiceId: "cjVigY5qzO86Huf0OWal", // Eric
  },
  {
    id: "gamora",
    name: "Gamora",
    image: gamoraImage,
    description: "The deadliest woman in the galaxy, Gamora is a master assassin with superhuman abilities. Trained by Thanos, she now fights for good as a Guardian of the Galaxy.",
    voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica
  },
  {
    id: "nick-fury",
    name: "Nick Fury",
    image: nickFuryImage,
    description: "Director of S.H.I.E.L.D., Nick Fury is a master strategist and spy. With his tactical genius and vast resources, he assembles and guides Earth's mightiest heroes.",
    voiceId: "pqHfZKP75CvOlQylNhV4", // Bill
  },
];

// Predefined chief guests with their assigned characters and reference photos
// Users will upload their photos which will be stored for face recognition
export const predefinedChiefGuests = [
  { 
    name: "Chief Guest 1", 
    characterId: "ironman",
    description: "The genius inventor with an arc reactor powering his suit"
  },
  { 
    name: "Chief Guest 2", 
    characterId: "captain-america",
    description: "The super soldier with unmatched courage and leadership"
  },
  { 
    name: "Chief Guest 3", 
    characterId: "hulk",
    description: "The incredible green giant with unlimited strength"
  },
];

// Jarvis-style voice-over template
export const getJarvisIntroduction = (guestName: string, character: Character): string => {
  return `Good evening. Welcome, ${guestName}. Facial recognition confirmed. Initiating character transformation protocol. You have been designated as ${character.name}. ${character.description} The transformation is complete. All systems operational.`;
};
