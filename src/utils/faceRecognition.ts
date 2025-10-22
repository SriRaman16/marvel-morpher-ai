import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export async function loadFaceRecognitionModels() {
  if (modelsLoaded) return;
  
  const MODEL_URL = '/models';
  
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Face recognition models loaded successfully');
  } catch (error) {
    console.error('Error loading face recognition models:', error);
    throw error;
  }
}

export async function extractFaceDescriptor(imageElement: HTMLImageElement): Promise<Float32Array | null> {
  try {
    const detection = await faceapi
      .detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      return null;
    }
    
    return detection.descriptor;
  } catch (error) {
    console.error('Error extracting face descriptor:', error);
    return null;
  }
}

export function compareFaces(descriptor1: Float32Array, descriptor2: Float32Array): number {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
}

export async function matchFaceToReferences(
  capturedImageData: string,
  referenceDescriptors: Map<string, Float32Array>
): Promise<{ name: string; confidence: number } | null> {
  const img = document.createElement('img');
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = capturedImageData;
  });
  
  const capturedDescriptor = await extractFaceDescriptor(img);
  
  if (!capturedDescriptor) {
    return null;
  }
  
  let bestMatch: { name: string; distance: number } | null = null;
  const MATCH_THRESHOLD = 0.6; // Lower is more similar
  
  for (const [name, refDescriptor] of referenceDescriptors.entries()) {
    const distance = compareFaces(capturedDescriptor, refDescriptor);
    
    if (distance < MATCH_THRESHOLD) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { name, distance };
      }
    }
  }
  
  if (bestMatch) {
    const confidence = Math.max(0, Math.min(100, (1 - bestMatch.distance) * 100));
    return { name: bestMatch.name, confidence };
  }
  
  return null;
}
