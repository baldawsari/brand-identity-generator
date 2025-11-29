import React, { forwardRef } from 'react';
import type { BrandIdentity } from '../../types';

interface SocialPostTemplateProps {
  identity: BrandIdentity;
  logoUrl: string;
  headline?: string;
  subheadline?: string;
  isRtl?: boolean;
  variant?: 'announcement' | 'quote' | 'promo';
}

/**
 * SocialPostTemplate - Renders a social media post template (1080x1080px for Instagram)
 * Uses actual brand colors, fonts, and logo from the identity
 */
export const SocialPostTemplate = forwardRef<HTMLDivElement, SocialPostTemplateProps>(
  ({ identity, logoUrl, headline, subheadline, isRtl = false, variant = 'announcement' }, ref) => {
    const primaryColor = identity.colorPalette[0]?.hex || '#2c3e50';
    const secondaryColor = identity.colorPalette[1]?.hex || '#7f8c8d';
    const accentColor = identity.colorPalette[2]?.hex || '#3498db';
    const headerFont = identity.fontPairings.header;
    const bodyFont = identity.fontPairings.body;

    // Default content based on variant - localized for Arabic
    const content = {
      headline: headline || (variant === 'quote'
        ? (isRtl ? '"الابتكار هو القدرة على رؤية التغيير كفرصة."' : '"Innovation is the ability to see change as an opportunity."')
        : variant === 'promo'
          ? (isRtl ? 'عرض خاص' : 'Special Offer')
          : (isRtl ? 'أخبار مثيرة!' : 'Exciting News!')),
      subheadline: subheadline || (variant === 'quote'
        ? `— ${identity.companyName}`
        : variant === 'promo'
          ? (isRtl ? 'لفترة محدودة فقط. تواصل معنا اليوم!' : 'Limited time only. Contact us today!')
          : (isRtl ? 'نحن بصدد إطلاق شيء مذهل. ترقبوا!' : `We're launching something amazing. Stay tuned!`)),
    };

    // Load fonts via Google Fonts
    const headerFontUrl = `https://fonts.googleapis.com/css2?family=${headerFont.replace(/\s/g, '+')}:wght@400;700&display=swap`;
    const bodyFontUrl = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(/\s/g, '+')}:wght@400;700&display=swap`;

    // Background style based on variant
    const getBackgroundStyle = () => {
      switch (variant) {
        case 'quote':
          return {
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%)`,
          };
        case 'promo':
          return {
            background: `linear-gradient(180deg, ${accentColor} 0%, ${primaryColor} 100%)`,
          };
        default:
          return {
            background: `linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)`,
          };
      }
    };

    const isLightBackground = variant === 'announcement';
    const textColor = isLightBackground ? primaryColor : '#ffffff';
    const subtextColor = isLightBackground ? secondaryColor : 'rgba(255,255,255,0.85)';

    return (
      <>
        <link href={headerFontUrl} rel="stylesheet" />
        <link href={bodyFontUrl} rel="stylesheet" />
        <div
          ref={ref}
          className="social-post-template"
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{
            width: '1080px',
            height: '1080px',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: `'${bodyFont}', sans-serif`,
            ...getBackgroundStyle(),
          }}
        >
          {/* Decorative elements */}
          {variant === 'announcement' && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '-100px',
                  right: '-100px',
                  width: '400px',
                  height: '400px',
                  borderRadius: '50%',
                  background: `${primaryColor}10`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-150px',
                  left: '-150px',
                  width: '500px',
                  height: '500px',
                  borderRadius: '50%',
                  background: `${accentColor}10`,
                }}
              />
            </>
          )}

          {/* Logo */}
          <div
            style={{
              position: 'absolute',
              top: '60px',
              [isRtl ? 'right' : 'left']: '60px',
            }}
          >
            <img
              src={logoUrl}
              alt={identity.companyName}
              style={{
                height: '80px',
                width: 'auto',
                objectFit: 'contain',
                filter: isLightBackground ? 'none' : 'brightness(0) invert(1)',
              }}
            />
          </div>

          {/* Main content */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '60px',
              right: '60px',
              transform: 'translateY(-50%)',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: `'${headerFont}', sans-serif`,
                fontSize: variant === 'quote' ? '56px' : '72px',
                fontWeight: 700,
                color: textColor,
                margin: 0,
                marginBottom: '32px',
                lineHeight: 1.2,
              }}
            >
              {content.headline}
            </h1>
            <p
              style={{
                fontSize: '28px',
                color: subtextColor,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {content.subheadline}
            </p>
          </div>

          {/* Bottom accent bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '12px',
              background: isLightBackground ? primaryColor : 'rgba(255,255,255,0.3)',
            }}
          />

          {/* Company name in corner */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              [isRtl ? 'left' : 'right']: '60px',
            }}
          >
            <p
              style={{
                fontFamily: `'${headerFont}', sans-serif`,
                fontSize: '18px',
                color: subtextColor,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              {identity.companyName}
            </p>
          </div>
        </div>
      </>
    );
  }
);

// Helper function to adjust color brightness
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

SocialPostTemplate.displayName = 'SocialPostTemplate';

export default SocialPostTemplate;
