import React from 'react';
import type { BrandAssets } from '../types';
import { useLanguage } from '../LanguageContext';

interface BrandAssetsProps {
  assets: BrandAssets;
}

const AssetCard: React.FC<{ title: string; imageUrl: string }> = ({ title, imageUrl }) => (
    <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">{title}</h3>
        <div className="flex-grow flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
            <img 
                src={imageUrl} 
                alt={title} 
                className="w-full h-full object-contain"
            />
        </div>
    </div>
);


const BrandAssetsComponent: React.FC<BrandAssetsProps> = ({ assets }) => {
  const { t } = useLanguage();
  
  if (!assets) {
    return null;
  }

  return (
    <div className="mt-8 p-4 md:p-8 bg-gray-100 rounded-2xl animate-fade-in">
        <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">{t('brandAssetsTitle')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AssetCard title={t('assetBusinessCard')} imageUrl={assets.businessCardUrl} />
            <AssetCard title={t('assetLetterhead')} imageUrl={assets.letterheadUrl} />
            <AssetCard title={t('assetSocialPost')} imageUrl={assets.socialPostUrl} />
        </div>
    </div>
  );
};

export default BrandAssetsComponent;
