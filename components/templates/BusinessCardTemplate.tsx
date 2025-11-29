import React, { forwardRef } from 'react';
import type { BrandIdentity } from '../../types';

interface BusinessCardTemplateProps {
  identity: BrandIdentity;
  logoUrl: string;
  contactInfo?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  isRtl?: boolean;
}

/**
 * BusinessCardTemplate - Renders a professional business card (3.5in x 2in)
 * Uses actual brand colors, fonts, and logo from the identity
 */
export const BusinessCardTemplate = forwardRef<HTMLDivElement, BusinessCardTemplateProps>(
  ({ identity, logoUrl, contactInfo, isRtl = false }, ref) => {
    const primaryColor = identity.colorPalette[0]?.hex || '#2c3e50';
    const secondaryColor = identity.colorPalette[1]?.hex || '#7f8c8d';
    const accentColor = identity.colorPalette[2]?.hex || '#3498db';
    const headerFont = identity.fontPairings.header;
    const bodyFont = identity.fontPairings.body;

    // Default contact info - localized placeholders for Arabic
    const contact = {
      name: contactInfo?.name || (isRtl ? 'محمد أحمد' : 'John Doe'),
      title: contactInfo?.title || (isRtl ? 'الرئيس التنفيذي' : 'Chief Executive Officer'),
      email: contactInfo?.email || `contact@${identity.companyName.toLowerCase().replace(/\s/g, '')}.com`,
      phone: contactInfo?.phone || (isRtl ? '+966 55 123 4567' : '+1 (555) 123-4567'),
      website: contactInfo?.website || `www.${identity.companyName.toLowerCase().replace(/\s/g, '')}.com`,
    };

    // Load fonts via Google Fonts
    const headerFontUrl = `https://fonts.googleapis.com/css2?family=${headerFont.replace(/\s/g, '+')}:wght@400;700&display=swap`;
    const bodyFontUrl = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(/\s/g, '+')}:wght@400;700&display=swap`;

    return (
      <>
        <link href={headerFontUrl} rel="stylesheet" />
        <link href={bodyFontUrl} rel="stylesheet" />
        <div
          ref={ref}
          className="business-card-template"
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{
            width: '3.5in',
            height: '2in',
            backgroundColor: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            fontFamily: `'${bodyFont}', sans-serif`,
          }}
        >
          {/* Accent stripe */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              [isRtl ? 'left' : 'right']: 0,
              width: '0.3in',
              height: '100%',
              background: `linear-gradient(180deg, ${primaryColor} 0%, ${accentColor} 100%)`,
            }}
          />

          {/* Logo */}
          <div
            style={{
              position: 'absolute',
              top: '0.25in',
              [isRtl ? 'right' : 'left']: '0.25in',
            }}
          >
            <img
              src={logoUrl}
              alt={identity.companyName}
              style={{
                height: '0.5in',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Contact info */}
          <div
            style={{
              position: 'absolute',
              bottom: '0.25in',
              [isRtl ? 'right' : 'left']: '0.25in',
              [isRtl ? 'left' : 'right']: '0.5in',
            }}
          >
            <h3
              style={{
                fontFamily: `'${headerFont}', sans-serif`,
                fontSize: '14px',
                fontWeight: 700,
                color: primaryColor,
                margin: 0,
                marginBottom: '2px',
              }}
            >
              {contact.name}
            </h3>
            <p
              style={{
                fontSize: '10px',
                color: secondaryColor,
                margin: 0,
                marginBottom: '8px',
              }}
            >
              {contact.title}
            </p>
            <div style={{ fontSize: '9px', color: '#333333', lineHeight: 1.6 }}>
              <p style={{ margin: 0, direction: 'ltr', unicodeBidi: 'isolate' }}>{contact.email}</p>
              <p style={{ margin: 0, direction: 'ltr', unicodeBidi: 'isolate' }}>{contact.phone}</p>
              <p style={{ margin: 0, direction: 'ltr', unicodeBidi: 'isolate' }}>{contact.website}</p>
            </div>
          </div>

          {/* Company name */}
          <div
            style={{
              position: 'absolute',
              top: '0.25in',
              [isRtl ? 'left' : 'right']: '0.5in',
            }}
          >
            <p
              style={{
                fontFamily: `'${headerFont}', sans-serif`,
                fontSize: '8px',
                color: secondaryColor,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '1px',
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

BusinessCardTemplate.displayName = 'BusinessCardTemplate';

export default BusinessCardTemplate;
