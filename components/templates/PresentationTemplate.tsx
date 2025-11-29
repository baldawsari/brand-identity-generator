import React, { forwardRef } from 'react';
import type { BrandIdentity } from '../../types';

interface PresentationTemplateProps {
  identity: BrandIdentity;
  logoUrl: string;
  title?: string;
  subtitle?: string;
  isRtl?: boolean;
  variant?: 'title' | 'section' | 'content';
}

/**
 * PresentationTemplate - Renders a presentation slide (16:9 aspect ratio, 1920x1080)
 * Uses actual brand colors, fonts, and logo from the identity
 */
export const PresentationTemplate = forwardRef<HTMLDivElement, PresentationTemplateProps>(
  ({ identity, logoUrl, title, subtitle, isRtl = false, variant = 'title' }, ref) => {
    const primaryColor = identity.colorPalette[0]?.hex || '#2c3e50';
    const secondaryColor = identity.colorPalette[1]?.hex || '#7f8c8d';
    const accentColor = identity.colorPalette[2]?.hex || '#3498db';
    const backgroundColor = identity.colorPalette[4]?.hex || '#f8f9fa';
    const headerFont = identity.fontPairings.header;
    const bodyFont = identity.fontPairings.body;

    // Default content based on variant - localized for Arabic
    const content = {
      title: title || (variant === 'section'
        ? (isRtl ? 'نظرة عامة' : 'Overview')
        : (isRtl ? `مرحباً بكم في ${identity.companyName}` : `Welcome to ${identity.companyName}`)),
      subtitle: subtitle || (variant === 'section'
        ? (isRtl ? 'القسم الأول' : 'Section One')
        : (isRtl ? 'تقديم رؤيتنا ورسالتنا' : 'Presenting Our Vision & Mission')),
    };

    // Load fonts via Google Fonts
    const headerFontUrl = `https://fonts.googleapis.com/css2?family=${headerFont.replace(/\s/g, '+')}:wght@400;600;700&display=swap`;
    const bodyFontUrl = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(/\s/g, '+')}:wght@400;500;600&display=swap`;

    return (
      <>
        <link href={headerFontUrl} rel="stylesheet" />
        <link href={bodyFontUrl} rel="stylesheet" />
        <div
          ref={ref}
          className="presentation-template"
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{
            width: '1920px',
            height: '1080px',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: `'${bodyFont}', sans-serif`,
            background: variant === 'title'
              ? `linear-gradient(135deg, ${backgroundColor} 0%, #ffffff 50%, ${backgroundColor} 100%)`
              : '#ffffff',
          }}
        >
          {/* Decorative geometric shapes */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              [isRtl ? 'left' : 'right']: 0,
              width: '45%',
              height: '100%',
              background: `linear-gradient(${isRtl ? '225deg' : '-45deg'}, ${primaryColor} 0%, ${accentColor} 100%)`,
              clipPath: isRtl
                ? 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)'
                : 'polygon(70% 0, 100% 0, 100% 100%, 100% 100%, 0% 100%)',
              opacity: variant === 'title' ? 1 : 0.1,
            }}
          />

          {/* Accent circle */}
          <div
            style={{
              position: 'absolute',
              bottom: '-200px',
              [isRtl ? 'right' : 'left']: '-200px',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              border: `3px solid ${accentColor}`,
              opacity: 0.2,
            }}
          />

          {/* Small decorative dots */}
          <div
            style={{
              position: 'absolute',
              top: '80px',
              [isRtl ? 'right' : 'left']: '80px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
            }}
          >
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: variant === 'title' ? secondaryColor : primaryColor,
                  opacity: 0.3,
                }}
              />
            ))}
          </div>

          {/* Logo */}
          <div
            style={{
              position: 'absolute',
              top: '60px',
              [isRtl ? 'left' : 'right']: variant === 'title' ? '100px' : '80px',
              zIndex: 10,
            }}
          >
            <img
              src={logoUrl}
              alt={identity.companyName}
              style={{
                height: variant === 'title' ? '80px' : '60px',
                width: 'auto',
                objectFit: 'contain',
                filter: variant === 'title' ? 'brightness(0) invert(1)' : 'none',
              }}
            />
          </div>

          {/* Main content area */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              [isRtl ? 'right' : 'left']: '100px',
              transform: 'translateY(-50%)',
              maxWidth: variant === 'title' ? '50%' : '70%',
              zIndex: 10,
            }}
          >
            {/* Title */}
            <h1
              style={{
                fontFamily: `'${headerFont}', sans-serif`,
                fontSize: variant === 'title' ? '72px' : '56px',
                fontWeight: 700,
                color: primaryColor,
                margin: 0,
                marginBottom: '24px',
                lineHeight: 1.2,
                letterSpacing: '-1px',
              }}
            >
              {content.title}
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: variant === 'title' ? '28px' : '24px',
                fontWeight: 500,
                color: secondaryColor,
                margin: 0,
                marginBottom: '40px',
                lineHeight: 1.5,
              }}
            >
              {content.subtitle}
            </p>

            {/* Accent line */}
            <div
              style={{
                width: '120px',
                height: '6px',
                backgroundColor: accentColor,
                borderRadius: '3px',
              }}
            />
          </div>

          {/* Company name on colored section (for title slide) */}
          {variant === 'title' && (
            <div
              style={{
                position: 'absolute',
                bottom: '80px',
                [isRtl ? 'left' : 'right']: '100px',
                zIndex: 10,
              }}
            >
              <p
                style={{
                  fontFamily: `'${headerFont}', sans-serif`,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '3px',
                }}
              >
                {identity.companyName}
              </p>
            </div>
          )}

          {/* Footer bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '8px',
              background: variant === 'title'
                ? 'transparent'
                : `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`,
            }}
          />

          {/* Page indicator for non-title slides */}
          {variant !== 'title' && (
            <div
              style={{
                position: 'absolute',
                bottom: '40px',
                [isRtl ? 'right' : 'left']: '80px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <img
                src={logoUrl}
                alt=""
                style={{
                  height: '32px',
                  width: 'auto',
                  objectFit: 'contain',
                  opacity: 0.6,
                }}
              />
              <span
                style={{
                  fontSize: '14px',
                  color: secondaryColor,
                  fontWeight: 500,
                }}
              >
                {identity.companyName}
              </span>
            </div>
          )}
        </div>
      </>
    );
  }
);

PresentationTemplate.displayName = 'PresentationTemplate';

export default PresentationTemplate;
