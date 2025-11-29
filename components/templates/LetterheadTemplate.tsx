import React, { forwardRef } from 'react';
import type { BrandIdentity } from '../../types';

interface LetterheadTemplateProps {
  identity: BrandIdentity;
  logoUrl: string;
  contactInfo?: {
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  isRtl?: boolean;
  showContent?: boolean;
}

/**
 * LetterheadTemplate - Renders a professional letterhead (8.5in x 11in)
 * Uses actual brand colors, fonts, and logo from the identity
 */
export const LetterheadTemplate = forwardRef<HTMLDivElement, LetterheadTemplateProps>(
  ({ identity, logoUrl, contactInfo, isRtl = false, showContent = true }, ref) => {
    const primaryColor = identity.colorPalette[0]?.hex || '#2c3e50';
    const secondaryColor = identity.colorPalette[1]?.hex || '#7f8c8d';
    const headerFont = identity.fontPairings.header;
    const bodyFont = identity.fontPairings.body;

    // Default contact info - localized for Arabic
    const contact = {
      address: contactInfo?.address || (isRtl ? 'شارع الأعمال 123، جناح 100، المدينة 12345' : '123 Business Street, Suite 100, City, State 12345'),
      phone: contactInfo?.phone || (isRtl ? '+966 55 123 4567' : '+1 (555) 123-4567'),
      email: contactInfo?.email || `contact@${identity.companyName.toLowerCase().replace(/\s/g, '')}.com`,
      website: contactInfo?.website || `www.${identity.companyName.toLowerCase().replace(/\s/g, '')}.com`,
    };

    // Load fonts via Google Fonts
    const headerFontUrl = `https://fonts.googleapis.com/css2?family=${headerFont.replace(/\s/g, '+')}:wght@400;700&display=swap`;
    const bodyFontUrl = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(/\s/g, '+')}:wght@400;700&display=swap`;

    // Sample letter content - localized date
    const sampleDate = new Date().toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <>
        <link href={headerFontUrl} rel="stylesheet" />
        <link href={bodyFontUrl} rel="stylesheet" />
        <div
          ref={ref}
          className="letterhead-template"
          dir={isRtl ? 'rtl' : 'ltr'}
          style={{
            width: '8.5in',
            height: '11in',
            backgroundColor: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            fontFamily: `'${bodyFont}', sans-serif`,
            padding: '0.75in 1in',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '0.5in',
              paddingBottom: '0.25in',
              borderBottom: `3px solid ${primaryColor}`,
            }}
          >
            {/* Logo and company name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img
                src={logoUrl}
                alt={identity.companyName}
                style={{
                  height: '60px',
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
              <div>
                <h1
                  style={{
                    fontFamily: `'${headerFont}', sans-serif`,
                    fontSize: '24px',
                    fontWeight: 700,
                    color: primaryColor,
                    margin: 0,
                  }}
                >
                  {identity.companyName}
                </h1>
                <p
                  style={{
                    fontSize: '11px',
                    color: secondaryColor,
                    margin: 0,
                    marginTop: '4px',
                    fontStyle: 'italic',
                  }}
                >
                  {identity.logo.style}
                </p>
              </div>
            </div>

            {/* Contact info */}
            <div
              style={{
                textAlign: isRtl ? 'left' : 'right',
                fontSize: '10px',
                color: '#555555',
                lineHeight: 1.6,
              }}
            >
              <p style={{ margin: 0 }}>{contact.address}</p>
              <p style={{ margin: 0, direction: 'ltr', unicodeBidi: 'isolate' }}>{contact.phone}</p>
              <p style={{ margin: 0, direction: 'ltr', unicodeBidi: 'isolate' }}>{contact.email}</p>
              <p style={{ margin: 0, color: primaryColor, fontWeight: 600, direction: 'ltr', unicodeBidi: 'isolate' }}>{contact.website}</p>
            </div>
          </div>

          {/* Letter content */}
          {showContent && (
            <div style={{ fontSize: '12px', lineHeight: 1.8, color: '#333333' }}>
              <p style={{ marginBottom: '24px' }}>{sampleDate}</p>

              <p style={{ marginBottom: '24px' }}>
                {isRtl ? 'عزيزي الشريك الكريم،' : 'Dear Valued Partner,'}
              </p>

              <p style={{ marginBottom: '16px' }}>
                {isRtl
                  ? `نشكرك على اهتمامك بـ ${identity.companyName}. نحن ملتزمون بتقديم قيمة استثنائية وبناء علاقات دائمة مع شركائنا وعملائنا.`
                  : `Thank you for your interest in ${identity.companyName}. We are committed to delivering exceptional value and building lasting relationships with our partners and clients.`}
              </p>

              <p style={{ marginBottom: '16px' }}>
                {isRtl
                  ? 'فريقنا مكرس لتقديم حلول مبتكرة تلبي احتياجاتكم الفريدة. نتطلع إلى فرصة العمل معًا وإنشاء شيء رائع.'
                  : 'Our team is dedicated to providing innovative solutions that meet your unique needs. We look forward to the opportunity to work together and create something remarkable.'}
              </p>

              <p style={{ marginBottom: '24px' }}>
                {isRtl
                  ? 'لا تترددوا في التواصل معنا إذا كانت لديكم أي أسئلة أو ترغبون في مناقشة كيف يمكننا التعاون.'
                  : `Please don't hesitate to reach out if you have any questions or would like to discuss how we can collaborate.`}
              </p>

              <p style={{ marginBottom: '8px' }}>
                {isRtl ? 'مع أطيب التحيات،' : 'Warm regards,'}
              </p>

              <p style={{ marginBottom: '0' }}>
                <strong style={{ fontFamily: `'${headerFont}', sans-serif`, color: primaryColor }}>
                  {isRtl ? `فريق ${identity.companyName}` : `The ${identity.companyName} Team`}
                </strong>
              </p>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '0.5in',
              left: '1in',
              right: '1in',
              borderTop: `1px solid ${secondaryColor}`,
              paddingTop: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '9px',
              color: secondaryColor,
            }}
          >
            <span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{contact.website}</span>
            <span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{contact.email}</span>
            <span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{contact.phone}</span>
          </div>
        </div>
      </>
    );
  }
);

LetterheadTemplate.displayName = 'LetterheadTemplate';

export default LetterheadTemplate;
