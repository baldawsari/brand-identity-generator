/**
 * Brand Kit Exporter
 * 
 * Responsible for generating a professional, designer-friendly ZIP file
 * containing all brand assets (logos in multiple formats, palette, fonts, guidelines).
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BrandIdentity } from '../types';
import { pngToColorSvg, downloadSvg } from './vectorize';
import { fetchFontBuffer } from './fontRegistry';

export interface BrandKitOptions {
  includePng?: boolean;
  includeSvg?: boolean;
  includePalette?: boolean;
  includeFonts?: boolean;
  includeGuidelines?: boolean;
}

const defaultOptions: BrandKitOptions = {
  includePng: true,
  includeSvg: true,
  includePalette: true,
  includeFonts: true,
  includeGuidelines: true,
};

/**
 * Generate and trigger download of a complete Brand Kit ZIP.
 * This is the main entry point for the "Download Brand Kit" feature.
 */
export async function downloadBrandKit(
  identity: BrandIdentity,
  iconPngUrl: string,           // The icon-only mark (best for vectorization)
  logoVariations: {
    'icon-only'?: string;
    horizontal?: string;
    vertical?: string;
  } = {},
  options: BrandKitOptions = {}
): Promise<void> {
  const opts = { ...defaultOptions, ...options };
  const zip = new JSZip();

  const safeName = identity.companyName.toLowerCase().replace(/\s+/g, '-');
  const folderName = `${safeName}-brand-kit`;
  const root = zip.folder(folderName)!;

  const logosFolder = root.folder('logos')!;

  // 1. Primary Icon Mark (SVG is most valuable here)
  if (iconPngUrl) {
    if (opts.includeSvg) {
      try {
        const primaryColor = identity.colorPalette[0]?.hex || '#111111';
        const svg = await pngToColorSvg(iconPngUrl, primaryColor);
        logosFolder.file(`${safeName}-icon.svg`, svg);
      } catch (e) {
        console.warn('SVG generation failed for icon mark', e);
      }
    }
    if (opts.includePng) {
      const pngBlob = await fetch(iconPngUrl).then(r => r.blob());
      logosFolder.file(`${safeName}-icon.png`, pngBlob);
    }
  }

  // 2. Full Logo Lockups (Horizontal & Vertical) - high-res PNG
  if (opts.includePng) {
    if (logoVariations.horizontal) {
      const blob = await fetch(logoVariations.horizontal).then(r => r.blob());
      logosFolder.file(`${safeName}-horizontal.png`, blob);
    }
    if (logoVariations.vertical) {
      const blob = await fetch(logoVariations.vertical).then(r => r.blob());
      logosFolder.file(`${safeName}-vertical.png`, blob);
    }
    if (logoVariations['icon-only'] && logoVariations['icon-only'] !== iconPngUrl) {
      const blob = await fetch(logoVariations['icon-only']).then(r => r.blob());
      logosFolder.file(`${safeName}-icon-only.png`, blob);
    }
  }

  // 3. Color Palette
  if (opts.includePalette) {
    const paletteJson = {
      company: identity.companyName,
      colors: identity.colorPalette.map(c => ({
        name: c.name,
        hex: c.hex,
        usage: c.usage,
      })),
    };
    root.file('palette/colors.json', JSON.stringify(paletteJson, null, 2));

    // Also generate a simple CSS variables file
    const cssVars = identity.colorPalette
      .map((c, i) => `  --color-${i + 1}: ${c.hex}; /* ${c.name} - ${c.usage} */`)
      .join('\n');
    root.file('palette/colors.css', `:root {\n${cssVars}\n}`);
  }

  // 4. Typography
  if (opts.includeFonts) {
    const typography = {
      header: identity.fontPairings.header,
      body: identity.fontPairings.body,
      notes: identity.fontPairings.notes,
    };
    root.file('typography/fonts.json', JSON.stringify(typography, null, 2));
  }

  // 5. Basic Brand Guidelines (Markdown)
  if (opts.includeGuidelines) {
    const guidelines = `# ${identity.companyName} — Brand Guidelines

## Logo
- Primary icon mark should always have clear space equal to 50% of its height.
- Do not stretch or distort the logo.
- Preferred usage: on white or very light backgrounds.

## Color Palette
${identity.colorPalette.map(c => `- **${c.name}** (${c.hex}) — ${c.usage}`).join('\n')}

## Typography
- **Headlines**: ${identity.fontPairings.header}
- **Body**: ${identity.fontPairings.body}
- ${identity.fontPairings.notes}

---
*Generated with Brand Identity Generator — Powered by Gemini*
`;
    root.file('Brand-Guidelines.md', guidelines);
  }

  // Generate and download the ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${folderName}.zip`);
}
