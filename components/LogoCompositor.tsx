import React, { useRef, useEffect, useState, useCallback } from 'react';

export type LogoLayout = 'horizontal' | 'vertical' | 'icon-only';

interface LogoCompositorProps {
  iconUrl: string;
  companyName: string;
  fontFamily: string;
  primaryColor: string;
  layout: LogoLayout;
  isRtl?: boolean;
  onExport?: (dataUrl: string) => void;
  className?: string;
}

interface LogoCompositorDisplayProps {
  identity: {
    companyName: string;
    logoMark?: string;
    logoImage?: string;
    fontPairings: { header: string };
    colorPalette: { hex: string }[];
  };
  isRtl?: boolean;
  onVariationsGenerated?: (variations: { horizontal: string; vertical: string; iconOnly: string }) => void;
}

// Canvas dimensions for each layout
const CANVAS_CONFIGS = {
  horizontal: { width: 800, height: 200 },
  vertical: { width: 400, height: 400 },
  'icon-only': { width: 300, height: 300 },
};

/**
 * Load an image from a URL and return it as an HTMLImageElement
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Wait for a Google Font to be loaded
 */
const loadFont = async (fontFamily: string): Promise<void> => {
  // Add the font link if not already present
  const fontId = `font-${fontFamily.replace(/\s/g, '-')}`;
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s/g, '+')}:wght@400;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  // Wait for font to load using document.fonts API
  try {
    await document.fonts.load(`bold 48px "${fontFamily}"`);
  } catch {
    // Fallback: wait a bit for font to load
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

/**
 * Core LogoCompositor component that renders a logo with icon + text on canvas
 */
export const LogoCompositor: React.FC<LogoCompositorProps> = ({
  iconUrl,
  companyName,
  fontFamily,
  primaryColor,
  layout,
  isRtl = false,
  onExport,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderLogo = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !iconUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load font and image in parallel
      const [img] = await Promise.all([
        loadImage(iconUrl),
        loadFont(fontFamily),
      ]);

      const config = CANVAS_CONFIGS[layout];
      canvas.width = config.width;
      canvas.height = config.height;

      // Clear canvas with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate dimensions based on layout
      if (layout === 'icon-only') {
        // Icon only - centered, fill most of the canvas
        const iconSize = Math.min(canvas.width, canvas.height) * 0.8;
        const x = (canvas.width - iconSize) / 2;
        const y = (canvas.height - iconSize) / 2;
        ctx.drawImage(img, x, y, iconSize, iconSize);
      } else if (layout === 'horizontal') {
        // Horizontal: icon on left/right, text next to it
        const iconSize = canvas.height * 0.7;
        const padding = 30;
        const textFontSize = Math.min(48, canvas.height * 0.25);

        ctx.font = `bold ${textFontSize}px "${fontFamily}", sans-serif`;
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(companyName).width;

        if (isRtl) {
          // RTL: text on right, icon on left of text
          const totalWidth = iconSize + padding + textWidth;
          const startX = (canvas.width - totalWidth) / 2;

          // Draw text first (on the right)
          ctx.fillStyle = primaryColor;
          ctx.textAlign = 'right';
          ctx.fillText(companyName, canvas.width - startX, canvas.height / 2);

          // Draw icon
          const iconX = startX;
          const iconY = (canvas.height - iconSize) / 2;
          ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
        } else {
          // LTR: icon on left, text on right
          const totalWidth = iconSize + padding + textWidth;
          const startX = (canvas.width - totalWidth) / 2;

          // Draw icon
          const iconX = startX;
          const iconY = (canvas.height - iconSize) / 2;
          ctx.drawImage(img, iconX, iconY, iconSize, iconSize);

          // Draw text
          ctx.fillStyle = primaryColor;
          ctx.textAlign = 'left';
          ctx.fillText(companyName, iconX + iconSize + padding, canvas.height / 2);
        }
      } else if (layout === 'vertical') {
        // Vertical: icon on top, text below
        const iconSize = canvas.width * 0.5;
        const padding = 20;
        const textFontSize = Math.min(36, canvas.width * 0.12);

        // Draw icon centered at top
        const iconX = (canvas.width - iconSize) / 2;
        const iconY = canvas.height * 0.15;
        ctx.drawImage(img, iconX, iconY, iconSize, iconSize);

        // Draw text below icon
        ctx.font = `bold ${textFontSize}px "${fontFamily}", sans-serif`;
        ctx.fillStyle = primaryColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(companyName, canvas.width / 2, iconY + iconSize + padding);
      }

      // Export the result
      const dataUrl = canvas.toDataURL('image/png');
      onExport?.(dataUrl);
      setIsLoading(false);
    } catch (err) {
      console.error('Logo composition error:', err);
      setError('Failed to generate logo');
      setIsLoading(false);
    }
  }, [iconUrl, companyName, fontFamily, primaryColor, layout, isRtl, onExport]);

  useEffect(() => {
    renderLogo();
  }, [renderLogo]);

  const config = CANVAS_CONFIGS[layout];

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={config.width}
        height={config.height}
        className={`max-w-full h-auto ${isLoading ? 'opacity-50' : ''}`}
        style={{ background: '#fff' }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

/**
 * High-level component that generates all logo variations from a BrandIdentity
 */
export const LogoVariationsGenerator: React.FC<LogoCompositorDisplayProps> = ({
  identity,
  isRtl = false,
  onVariationsGenerated,
}) => {
  const [variations, setVariations] = useState<{
    horizontal?: string;
    vertical?: string;
    iconOnly?: string;
  }>({});

  const iconUrl = identity.logoMark || identity.logoImage || '';
  const fontFamily = identity.fontPairings.header;
  const primaryColor = identity.colorPalette[0]?.hex || '#000000';

  const handleExport = useCallback((layout: LogoLayout, dataUrl: string) => {
    setVariations(prev => {
      const updated = { ...prev, [layout === 'icon-only' ? 'iconOnly' : layout]: dataUrl };

      // Check if all variations are ready
      if (updated.horizontal && updated.vertical && updated.iconOnly) {
        onVariationsGenerated?.({
          horizontal: updated.horizontal,
          vertical: updated.vertical,
          iconOnly: updated.iconOnly,
        });
      }

      return updated;
    });
  }, [onVariationsGenerated]);

  if (!iconUrl) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-2">Horizontal</h4>
        <LogoCompositor
          iconUrl={iconUrl}
          companyName={identity.companyName}
          fontFamily={fontFamily}
          primaryColor={primaryColor}
          layout="horizontal"
          isRtl={isRtl}
          onExport={(dataUrl) => handleExport('horizontal', dataUrl)}
          className="border border-gray-200 rounded-lg overflow-hidden"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Vertical</h4>
          <LogoCompositor
            iconUrl={iconUrl}
            companyName={identity.companyName}
            fontFamily={fontFamily}
            primaryColor={primaryColor}
            layout="vertical"
            isRtl={isRtl}
            onExport={(dataUrl) => handleExport('vertical', dataUrl)}
            className="border border-gray-200 rounded-lg overflow-hidden"
          />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Icon Only</h4>
          <LogoCompositor
            iconUrl={iconUrl}
            companyName={identity.companyName}
            fontFamily={fontFamily}
            primaryColor={primaryColor}
            layout="icon-only"
            isRtl={isRtl}
            onExport={(dataUrl) => handleExport('icon-only', dataUrl)}
            className="border border-gray-200 rounded-lg overflow-hidden"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Simple logo display that shows just one composited logo
 */
export const CompositedLogo: React.FC<{
  iconUrl: string;
  companyName: string;
  fontFamily: string;
  primaryColor: string;
  layout?: LogoLayout;
  isRtl?: boolean;
  className?: string;
}> = ({
  iconUrl,
  companyName,
  fontFamily,
  primaryColor,
  layout = 'horizontal',
  isRtl = false,
  className = '',
}) => {
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  if (!iconUrl) {
    return null;
  }

  return (
    <div className={className}>
      {logoDataUrl ? (
        <img src={logoDataUrl} alt={`${companyName} logo`} className="max-w-full h-auto" />
      ) : (
        <LogoCompositor
          iconUrl={iconUrl}
          companyName={companyName}
          fontFamily={fontFamily}
          primaryColor={primaryColor}
          layout={layout}
          isRtl={isRtl}
          onExport={setLogoDataUrl}
        />
      )}
    </div>
  );
};

export default LogoCompositor;
