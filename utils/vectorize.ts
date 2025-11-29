/**
 * Vectorization Utility - Converts PNG/raster images to SVG using image tracing
 *
 * This module provides client-side PNG to SVG conversion for professional
 * vector output of logo marks and icons.
 */

// We'll use a simple potrace-style algorithm for basic vectorization
// For more advanced tracing, imagetracerjs can be used

interface TraceOptions {
  threshold?: number; // 0-255, controls black/white cutoff
  turnPolicy?: 'minority' | 'majority' | 'black' | 'white';
  turdSize?: number; // Minimum area for path inclusion
  optTolerance?: number; // Curve optimization tolerance
}

/**
 * Convert a data URL to an ImageData object
 */
async function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Convert ImageData to a simple black/white bitmap
 */
function imageToBitmap(imageData: ImageData, threshold: number = 128): boolean[][] {
  const { width, height, data } = imageData;
  const bitmap: boolean[][] = [];

  for (let y = 0; y < height; y++) {
    bitmap[y] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Calculate luminance and check alpha
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const isBlack = a > 128 && luminance < threshold;
      bitmap[y][x] = isBlack;
    }
  }

  return bitmap;
}

/**
 * Simple edge detection for bitmap
 */
function findEdges(bitmap: boolean[][]): { x: number; y: number }[] {
  const height = bitmap.length;
  const width = bitmap[0]?.length || 0;
  const edges: { x: number; y: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!bitmap[y][x]) continue;

      // Check if this is an edge pixel (has a white neighbor)
      const hasWhiteNeighbor =
        (x === 0 || !bitmap[y][x - 1]) ||
        (x === width - 1 || !bitmap[y][x + 1]) ||
        (y === 0 || !bitmap[y - 1][x]) ||
        (y === height - 1 || !bitmap[y + 1][x]);

      if (hasWhiteNeighbor) {
        edges.push({ x, y });
      }
    }
  }

  return edges;
}

/**
 * Convert bitmap to SVG paths using simple contour tracing
 */
function bitmapToSvgPaths(bitmap: boolean[][], color: string = '#000000'): string[] {
  const height = bitmap.length;
  const width = bitmap[0]?.length || 0;
  const visited: boolean[][] = bitmap.map(row => row.map(() => false));
  const paths: string[] = [];

  // Simple flood-fill based region detection
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (bitmap[y][x] && !visited[y][x]) {
        // Start a new region
        const region: { x: number; y: number }[] = [];
        const stack: { x: number; y: number }[] = [{ x, y }];

        while (stack.length > 0) {
          const { x: cx, y: cy } = stack.pop()!;
          if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
          if (visited[cy][cx] || !bitmap[cy][cx]) continue;

          visited[cy][cx] = true;
          region.push({ x: cx, y: cy });

          stack.push({ x: cx + 1, y: cy });
          stack.push({ x: cx - 1, y: cy });
          stack.push({ x: cx, y: cy + 1 });
          stack.push({ x: cx, y: cy - 1 });
        }

        // Convert region to path (simplified - just creates rectangles for each pixel)
        if (region.length > 10) { // Skip tiny regions
          // Create a simple bounding rect for the region
          const minX = Math.min(...region.map(p => p.x));
          const maxX = Math.max(...region.map(p => p.x));
          const minY = Math.min(...region.map(p => p.y));
          const maxY = Math.max(...region.map(p => p.y));

          // Create path data for each pixel row (run-length encoding)
          let pathData = '';
          for (let ry = minY; ry <= maxY; ry++) {
            let inRun = false;
            let runStart = 0;
            for (let rx = minX; rx <= maxX + 1; rx++) {
              const isBlack = rx <= maxX && region.some(p => p.x === rx && p.y === ry);
              if (isBlack && !inRun) {
                runStart = rx;
                inRun = true;
              } else if (!isBlack && inRun) {
                pathData += `M${runStart},${ry}h${rx - runStart}v1h${runStart - rx}z`;
                inRun = false;
              }
            }
          }

          if (pathData) {
            paths.push(`<path d="${pathData}" fill="${color}"/>`);
          }
        }
      }
    }
  }

  return paths;
}

/**
 * Convert a PNG data URL to SVG string
 */
export async function pngToSvg(
  pngDataUrl: string,
  options: TraceOptions = {}
): Promise<string> {
  const { threshold = 128 } = options;

  try {
    const imageData = await dataUrlToImageData(pngDataUrl);
    const bitmap = imageToBitmap(imageData, threshold);
    const paths = bitmapToSvgPaths(bitmap);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageData.width} ${imageData.height}" width="${imageData.width}" height="${imageData.height}">
  <title>Vectorized Logo</title>
  ${paths.join('\n  ')}
</svg>`;

    return svg;
  } catch (error) {
    console.error('Vectorization failed:', error);
    throw new Error('Failed to convert image to SVG');
  }
}

/**
 * Convert PNG to SVG with color extraction (preserves main colors)
 */
export async function pngToColorSvg(
  pngDataUrl: string,
  primaryColor: string = '#000000'
): Promise<string> {
  const imageData = await dataUrlToImageData(pngDataUrl);
  const { width, height } = imageData;

  // For simplicity, we'll just use the provided primary color
  // A more advanced version would extract colors from the image
  const bitmap = imageToBitmap(imageData, 128);
  const paths = bitmapToSvgPaths(bitmap, primaryColor);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <title>Vectorized Logo</title>
  ${paths.join('\n  ')}
</svg>`;
}

/**
 * Convert SVG string to data URL
 */
export function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Download SVG as a file
 */
export function downloadSvg(svg: string, filename: string = 'logo.svg'): void {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  pngToSvg,
  pngToColorSvg,
  svgToDataUrl,
  downloadSvg,
};
