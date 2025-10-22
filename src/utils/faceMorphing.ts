import * as faceapi from 'face-api.js';

interface Point {
  x: number;
  y: number;
}

// Get triangles for Delaunay triangulation
function getDelaunayTriangles(points: Point[], width: number, height: number): number[][] {
  // Add corner points to ensure full coverage
  const allPoints = [
    ...points,
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: 0, y: height - 1 },
    { x: width - 1, y: height - 1 }
  ];

  // Simple triangulation - divide face into triangles based on landmarks
  const triangles: number[][] = [];
  
  // Face outline triangles (points 0-16 are face contour)
  for (let i = 0; i < 16; i++) {
    triangles.push([i, i + 1, 33]); // nose tip as center
  }
  
  // Eye triangles
  triangles.push([36, 37, 38]); // left eye
  triangles.push([36, 38, 39]);
  triangles.push([39, 38, 40]);
  triangles.push([39, 40, 41]);
  
  triangles.push([42, 43, 44]); // right eye
  triangles.push([42, 44, 45]);
  triangles.push([45, 44, 46]);
  triangles.push([45, 46, 47]);
  
  // Nose triangles
  for (let i = 27; i < 30; i++) {
    triangles.push([i, i + 1, 33]);
  }
  
  // Mouth triangles
  for (let i = 48; i < 59; i++) {
    triangles.push([i, i + 1, 33]);
  }
  triangles.push([59, 48, 33]);
  
  return triangles;
}

// Warp triangle from source to destination
function warpTriangle(
  src: HTMLCanvasElement,
  dst: HTMLCanvasElement,
  srcTriangle: Point[],
  dstTriangle: Point[]
) {
  const ctx = dst.getContext('2d')!;
  
  // Get bounding box of destination triangle
  const minX = Math.floor(Math.min(dstTriangle[0].x, dstTriangle[1].x, dstTriangle[2].x));
  const maxX = Math.ceil(Math.max(dstTriangle[0].x, dstTriangle[1].x, dstTriangle[2].x));
  const minY = Math.floor(Math.min(dstTriangle[0].y, dstTriangle[1].y, dstTriangle[2].y));
  const maxY = Math.ceil(Math.max(dstTriangle[0].y, dstTriangle[1].y, dstTriangle[2].y));
  
  // Calculate affine transform matrix from dst to src triangle
  const [p1, p2, p3] = dstTriangle;
  const [q1, q2, q3] = srcTriangle;
  
  const det = (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y);
  if (Math.abs(det) < 1e-10) return;
  
  // For each pixel in destination triangle bounding box
  for (let y = Math.max(0, minY); y < Math.min(dst.height, maxY); y++) {
    for (let x = Math.max(0, minX); x < Math.min(dst.width, maxX); x++) {
      // Calculate barycentric coordinates
      const w1 = ((p2.x - p1.x) * (y - p1.y) - (p2.y - p1.y) * (x - p1.x)) / det;
      const w2 = ((p3.x - p2.x) * (y - p2.y) - (p3.y - p2.y) * (x - p2.x)) / det;
      const w0 = 1 - w1 - w2;
      
      // Check if point is inside triangle
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
        // Map to source triangle
        const srcX = w0 * q1.x + w1 * q2.x + w2 * q3.x;
        const srcY = w0 * q1.y + w1 * q2.y + w2 * q3.y;
        
        // Sample from source (bilinear interpolation)
        if (srcX >= 0 && srcX < src.width - 1 && srcY >= 0 && srcY < src.height - 1) {
          const srcCtx = src.getContext('2d')!;
          const srcData = srcCtx.getImageData(Math.floor(srcX), Math.floor(srcY), 1, 1).data;
          ctx.fillStyle = `rgba(${srcData[0]},${srcData[1]},${srcData[2]},${srcData[3] / 255})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
}

export async function morphFaceToCharacter(
  userFaceCanvas: HTMLCanvasElement,
  characterBodyImg: HTMLImageElement,
  userLandmarks: faceapi.FaceLandmarks68,
  characterFaceRegion: { x: number; y: number; width: number; height: number }
): Promise<HTMLCanvasElement> {
  // Create output canvas
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = characterBodyImg.width;
  outputCanvas.height = characterBodyImg.height;
  const ctx = outputCanvas.getContext('2d')!;
  
  // Draw character body first
  ctx.drawImage(characterBodyImg, 0, 0);
  
  // Get user face landmarks as points
  const userPoints = userLandmarks.positions.map(p => ({ x: p.x, y: p.y }));
  
  // Define character face landmarks (generic positions within the face region)
  // These are normalized positions that work for most Marvel character faces
  const charFaceW = characterFaceRegion.width;
  const charFaceH = characterFaceRegion.height;
  const charFaceX = characterFaceRegion.x;
  const charFaceY = characterFaceRegion.y;
  
  // Scale user landmarks to character face region
  const userBounds = {
    minX: Math.min(...userPoints.map(p => p.x)),
    maxX: Math.max(...userPoints.map(p => p.x)),
    minY: Math.min(...userPoints.map(p => p.y)),
    maxY: Math.max(...userPoints.map(p => p.y))
  };
  
  const userWidth = userBounds.maxX - userBounds.minX;
  const userHeight = userBounds.maxY - userBounds.minY;
  
  // Map user landmarks to character face region
  const characterPoints = userPoints.map(p => ({
    x: charFaceX + ((p.x - userBounds.minX) / userWidth) * charFaceW,
    y: charFaceY + ((p.y - userBounds.minY) / userHeight) * charFaceH
  }));
  
  // Get triangulation
  const triangles = getDelaunayTriangles(userPoints, userFaceCanvas.width, userFaceCanvas.height);
  
  // Create temporary canvas for morphed face
  const morphCanvas = document.createElement('canvas');
  morphCanvas.width = outputCanvas.width;
  morphCanvas.height = outputCanvas.height;
  
  // Warp each triangle
  for (const triangle of triangles) {
    if (triangle[0] < userPoints.length && triangle[1] < userPoints.length && triangle[2] < userPoints.length) {
      const srcTriangle = [
        userPoints[triangle[0]],
        userPoints[triangle[1]],
        userPoints[triangle[2]]
      ];
      
      const dstTriangle = [
        characterPoints[triangle[0]],
        characterPoints[triangle[1]],
        characterPoints[triangle[2]]
      ];
      
      warpTriangle(userFaceCanvas, morphCanvas, srcTriangle, dstTriangle);
    }
  }
  
  // Blend morphed face onto character body with feathered edges
  ctx.save();
  
  // Create circular mask for smooth blending
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'blur(3px)';
  
  // Draw morphed face
  ctx.drawImage(morphCanvas, 0, 0);
  
  ctx.restore();
  
  return outputCanvas;
}

// Simpler fallback: just extract and position the face
export function extractAndPositionFace(
  userFaceImg: HTMLImageElement,
  characterBodyImg: HTMLImageElement,
  userLandmarks: faceapi.FaceLandmarks68,
  characterFaceRegion: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = characterBodyImg.width;
  outputCanvas.height = characterBodyImg.height;
  const ctx = outputCanvas.getContext('2d')!;
  
  // Draw character body
  ctx.drawImage(characterBodyImg, 0, 0);
  
  // Get user face bounds from landmarks
  const positions = userLandmarks.positions;
  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y));
  
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  
  // Add padding
  const padding = faceWidth * 0.3;
  const srcX = Math.max(0, minX - padding);
  const srcY = Math.max(0, minY - padding * 1.5); // More padding on top for hair
  const srcW = Math.min(userFaceImg.width - srcX, faceWidth + padding * 2);
  const srcH = Math.min(userFaceImg.height - srcY, faceHeight + padding * 2.5);
  
  // Draw user face onto character with circular mask
  ctx.save();
  
  // Create circular clipping path
  const centerX = characterFaceRegion.x + characterFaceRegion.width / 2;
  const centerY = characterFaceRegion.y + characterFaceRegion.height / 2;
  const radius = Math.min(characterFaceRegion.width, characterFaceRegion.height) / 2;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  
  // Add feathering
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  
  // Draw the face
  ctx.drawImage(
    userFaceImg,
    srcX, srcY, srcW, srcH,
    characterFaceRegion.x,
    characterFaceRegion.y,
    characterFaceRegion.width,
    characterFaceRegion.height
  );
  
  ctx.restore();
  
  // Add glow effect around face
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(8px)';
  
  const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.7, centerX, centerY, radius * 1.2);
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  return outputCanvas;
}
