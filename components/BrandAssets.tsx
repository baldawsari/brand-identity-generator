import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import type { BrandIdentity } from '../types';
import { useLanguage } from '../LanguageContext';
import { BusinessCardTemplate, LetterheadTemplate, SocialPostTemplate, PresentationTemplate } from './templates';
import { LoadingSpinner, CloseIcon } from './icons';

interface BrandAssetsProps {
  identity: BrandIdentity;
  logoUrl: string;
}

interface AssetPreview {
  name: string;
  translationKey: string;
  imageUrl: string | null;
  isGenerating: boolean;
  dimensions: { width: number; height: number };
  scale: number;
}

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ExpandIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const BrandAssetsComponent: React.FC<BrandAssetsProps> = ({ identity, logoUrl }) => {
  const { t, lang } = useLanguage();
  const isRtl = lang === 'ar';

  // Refs for template containers
  const businessCardRef = useRef<HTMLDivElement>(null);
  const letterheadRef = useRef<HTMLDivElement>(null);
  const socialPostRef = useRef<HTMLDivElement>(null);
  const presentationRef = useRef<HTMLDivElement>(null);

  // State for generated previews
  const [assets, setAssets] = useState<AssetPreview[]>([
    { name: 'businessCard', translationKey: 'assetBusinessCard', imageUrl: null, isGenerating: true, dimensions: { width: 336, height: 192 }, scale: 2 },
    { name: 'letterhead', translationKey: 'assetLetterhead', imageUrl: null, isGenerating: true, dimensions: { width: 816, height: 1056 }, scale: 0.5 },
    { name: 'socialPost', translationKey: 'assetSocialPost', imageUrl: null, isGenerating: true, dimensions: { width: 1080, height: 1080 }, scale: 0.5 },
    { name: 'presentation', translationKey: 'assetPresentation', imageUrl: null, isGenerating: true, dimensions: { width: 1920, height: 1080 }, scale: 0.5 },
  ]);

  // Modal state
  const [selectedAsset, setSelectedAsset] = useState<AssetPreview | null>(null);

  // Generate image from template ref
  const generateImage = useCallback(async (
    ref: React.RefObject<HTMLDivElement>,
    assetName: string,
    pixelRatio: number = 2
  ) => {
    if (!ref.current) return null;

    try {
      // Wait a bit for fonts to load
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(ref.current, {
        quality: 1,
        pixelRatio,
        cacheBust: true,
      });

      return dataUrl;
    } catch (error) {
      console.error(`Error generating ${assetName}:`, error);
      return null;
    }
  }, []);

  // Generate all assets when identity changes
  useEffect(() => {
    const generateAllAssets = async () => {
      // Reset all to generating state
      setAssets(prev => prev.map(a => ({ ...a, isGenerating: true, imageUrl: null })));

      // Small delay to ensure templates are rendered
      await new Promise(resolve => setTimeout(resolve, 300));

      // Generate each asset
      const results = await Promise.all([
        generateImage(businessCardRef, 'businessCard', 3),
        generateImage(letterheadRef, 'letterhead', 1.5),
        generateImage(socialPostRef, 'socialPost', 1),
        generateImage(presentationRef, 'presentation', 1),
      ]);

      setAssets(prev => prev.map((asset, index) => ({
        ...asset,
        imageUrl: results[index],
        isGenerating: false,
      })));
    };

    generateAllAssets();
  }, [identity, logoUrl, generateImage]);

  // Download handler
  const handleDownload = useCallback((asset: AssetPreview) => {
    if (!asset.imageUrl) return;

    const link = document.createElement('a');
    link.download = `${identity.companyName.replace(/\s+/g, '-').toLowerCase()}-${asset.name}.png`;
    link.href = asset.imageUrl;
    link.click();
  }, [identity.companyName]);

  // Close modal on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAsset(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="mt-12 animate-fade-in">
      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('brandAssetsTitle')}</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {lang === 'ar'
            ? 'أصول تسويقية جاهزة للاستخدام مبنية على هوية علامتك التجارية'
            : 'Ready-to-use marketing assets built from your brand identity'}
        </p>
      </div>

      {/* Hidden template containers for image generation */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none" aria-hidden="true">
        <div style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
          <BusinessCardTemplate
            ref={businessCardRef}
            identity={identity}
            logoUrl={logoUrl}
            isRtl={isRtl}
          />
        </div>
        <div style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
          <LetterheadTemplate
            ref={letterheadRef}
            identity={identity}
            logoUrl={logoUrl}
            isRtl={isRtl}
          />
        </div>
        <div style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
          <SocialPostTemplate
            ref={socialPostRef}
            identity={identity}
            logoUrl={logoUrl}
            isRtl={isRtl}
          />
        </div>
        <div style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
          <PresentationTemplate
            ref={presentationRef}
            identity={identity}
            logoUrl={logoUrl}
            isRtl={isRtl}
          />
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
        {assets.map((asset) => (
          <div
            key={asset.name}
            className="group bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          >
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{t(asset.translationKey)}</h3>
            </div>

            {/* Preview Area */}
            <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
              {asset.isGenerating ? (
                <div className="flex flex-col items-center gap-3">
                  <LoadingSpinner className="w-8 h-8 text-indigo-500" />
                  <span className="text-sm text-gray-500">
                    {lang === 'ar' ? 'جارٍ الإنشاء...' : 'Generating...'}
                  </span>
                </div>
              ) : asset.imageUrl ? (
                <>
                  <img
                    src={asset.imageUrl}
                    alt={t(asset.translationKey)}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className="bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full font-medium shadow-lg hover:bg-white transition-colors flex items-center gap-2"
                    >
                      <ExpandIcon className="w-4 h-4" />
                      {lang === 'ar' ? 'عرض' : 'Preview'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400">
                  <p>{lang === 'ar' ? 'فشل في إنشاء المعاينة' : 'Failed to generate preview'}</p>
                </div>
              )}
            </div>

            {/* Card Actions */}
            <div className="px-5 py-4 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => handleDownload(asset)}
                disabled={!asset.imageUrl || asset.isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <DownloadIcon className="w-4 h-4" />
                {lang === 'ar' ? 'تحميل PNG' : 'Download PNG'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {selectedAsset && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {t(selectedAsset.translationKey)}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownload(selectedAsset)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  {lang === 'ar' ? 'تحميل' : 'Download'}
                </button>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 overflow-auto max-h-[calc(90vh-80px)]">
              {selectedAsset.imageUrl && (
                <img
                  src={selectedAsset.imageUrl}
                  alt={t(selectedAsset.translationKey)}
                  className="max-w-full h-auto mx-auto rounded-lg shadow-xl"
                  style={{ maxHeight: 'calc(90vh - 160px)' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandAssetsComponent;
