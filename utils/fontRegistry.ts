/**
 * Font Registry - Manages bundled fonts and provides fallback to Google Fonts
 *
 * This module helps avoid CORS issues by preferring locally bundled fonts
 * when available, falling back to Google Fonts API when necessary.
 */

export interface FontInfo {
  name: string;
  slug: string;
  category: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace';
  weights: number[];
  isBundled: boolean;
  bundledWeights?: number[];
  language?: 'latin' | 'arabic' | 'both';
}

// Registry of known fonts with their metadata
const FONT_REGISTRY: Record<string, FontInfo> = {
  // Latin fonts
  'Inter': {
    name: 'Inter',
    slug: 'inter',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'latin',
  },
  'Roboto': {
    name: 'Roboto',
    slug: 'roboto',
    category: 'sans-serif',
    weights: [400, 500, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'latin',
  },
  'Montserrat': {
    name: 'Montserrat',
    slug: 'montserrat',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'latin',
  },
  'Lato': {
    name: 'Lato',
    slug: 'lato',
    category: 'sans-serif',
    weights: [400, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'latin',
  },
  'Open Sans': {
    name: 'Open Sans',
    slug: 'opensans',
    category: 'sans-serif',
    weights: [400, 600, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'latin',
  },
  'Poppins': {
    name: 'Poppins',
    slug: 'poppins',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'latin',
  },
  'Playfair Display': {
    name: 'Playfair Display',
    slug: 'playfairdisplay',
    category: 'serif',
    weights: [400, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'latin',
  },

  // Arabic fonts
  'Tajawal': {
    name: 'Tajawal',
    slug: 'tajawal',
    category: 'sans-serif',
    weights: [400, 500, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'arabic',
  },
  'Cairo': {
    name: 'Cairo',
    slug: 'cairo',
    category: 'sans-serif',
    weights: [400, 600, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'arabic',
  },
  'Almarai': {
    name: 'Almarai',
    slug: 'almarai',
    category: 'sans-serif',
    weights: [400, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'arabic',
  },
  'IBM Plex Sans Arabic': {
    name: 'IBM Plex Sans Arabic',
    slug: 'ibmplexsansarabic',
    category: 'sans-serif',
    weights: [400, 500, 600, 700],
    isBundled: true,
    bundledWeights: [400, 700],
    language: 'arabic',
  },
};

/**
 * Get font info from registry
 */
export const getFontInfo = (fontName: string): FontInfo | null => {
  return FONT_REGISTRY[fontName] || null;
};

/**
 * Check if a font is bundled locally
 */
export const isFontBundled = (fontName: string): boolean => {
  const info = FONT_REGISTRY[fontName];
  return info?.isBundled ?? false;
};

/**
 * Get the local path for a bundled font file
 */
export const getBundledFontPath = (
  fontName: string,
  weight: 'Regular' | 'Bold' | number = 'Regular'
): string | null => {
  const info = FONT_REGISTRY[fontName];
  if (!info?.isBundled) return null;

  const weightStr = typeof weight === 'number'
    ? (weight >= 600 ? 'Bold' : 'Regular')
    : weight;

  const slug = info.slug;
  const fileName = `${fontName.replace(/\s/g, '')}-${weightStr}.ttf`;

  return `/fonts/${fileName}`;
};

/**
 * Get all bundled font paths for a font family
 */
export const getAllBundledFontPaths = (fontName: string): { regular?: string; bold?: string } | null => {
  const info = FONT_REGISTRY[fontName];
  if (!info?.isBundled) return null;

  return {
    regular: getBundledFontPath(fontName, 'Regular'),
    bold: getBundledFontPath(fontName, 'Bold'),
  };
};

/**
 * Get Google Fonts URL for a font (fallback when not bundled)
 */
export const getGoogleFontUrl = (fontName: string, weights: number[] = [400, 700]): string => {
  const weightStr = weights.join(';');
  const encodedName = fontName.replace(/\s/g, '+');
  return `https://fonts.googleapis.com/css2?family=${encodedName}:wght@${weightStr}&display=swap`;
};

/**
 * Get GitHub raw URL for a font file (fallback for ZIP bundling)
 */
export const getGitHubFontUrl = (fontName: string, weight: 'Regular' | 'Bold' = 'Regular'): string => {
  const slug = fontName.toLowerCase().replace(/\s/g, '');
  const fileName = `${fontName.replace(/\s/g, '')}-${weight}.ttf`;
  return `https://raw.githubusercontent.com/google/fonts/main/ofl/${slug}/${fileName}`;
};

/**
 * Attempt to fetch a font file, trying bundled first, then GitHub
 */
export const fetchFontBuffer = async (
  fontName: string,
  weight: 'Regular' | 'Bold' = 'Regular'
): Promise<ArrayBuffer | null> => {
  // Try bundled font first
  const bundledPath = getBundledFontPath(fontName, weight);
  if (bundledPath) {
    try {
      const response = await fetch(bundledPath);
      if (response.ok) {
        return await response.arrayBuffer();
      }
    } catch (e) {
      console.warn(`Failed to load bundled font ${fontName}-${weight}:`, e);
    }
  }

  // Fall back to GitHub
  try {
    const slug = fontName.toLowerCase().replace(/\s/g, '');
    let fileName = `${fontName.replace(/\s/g, '')}-${weight}.ttf`;
    let url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${slug}/${fileName}`;

    let response = await fetch(url);

    // Try static folder if main folder fails
    if (!response.ok) {
      fileName = `static/${fontName.replace(/\s/g, '')}-${weight}.ttf`;
      url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${slug}/${fileName}`;
      response = await fetch(url);
    }

    // Try variable font if static also fails
    if (!response.ok && weight === 'Regular') {
      fileName = `${fontName.replace(/\s/g, '')}-VariableFont_wght.ttf`;
      url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${slug}/${fileName}`;
      response = await fetch(url);
    }

    if (response.ok) {
      return await response.arrayBuffer();
    }
  } catch (e) {
    console.warn(`Failed to load font from GitHub ${fontName}-${weight}:`, e);
  }

  return null;
};

/**
 * Get CSS @font-face declarations for bundled fonts
 */
export const getBundledFontFaceCSS = (fontName: string): string => {
  const paths = getAllBundledFontPaths(fontName);
  if (!paths) return '';

  return `
@font-face {
  font-family: '${fontName}';
  src: url('${paths.regular}') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: '${fontName}';
  src: url('${paths.bold}') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
`.trim();
};

/**
 * Get a list of all bundled fonts
 */
export const getAllBundledFonts = (): FontInfo[] => {
  return Object.values(FONT_REGISTRY).filter(font => font.isBundled);
};

/**
 * Get bundled fonts by language
 */
export const getBundledFontsByLanguage = (language: 'latin' | 'arabic'): FontInfo[] => {
  return Object.values(FONT_REGISTRY).filter(
    font => font.isBundled && (font.language === language || font.language === 'both')
  );
};

export default FONT_REGISTRY;
