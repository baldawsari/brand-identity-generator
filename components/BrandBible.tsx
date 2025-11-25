import React, { useState, useEffect } from 'react';
import type { BrandIdentity } from '../types';
import { ColorInfo, FontPair } from '../types';
import { LoadingSpinner, CloseIcon, RefreshIcon } from './icons';
import { useLanguage } from '../LanguageContext';

interface BrandBibleProps {
    identity: BrandIdentity | null;
    isLoadingLogo: boolean;
    onInitiateTranslate: () => void;
    isTranslating: boolean;
    showTranslateButton: boolean;
    isBilingualReady: boolean;
    onRegenerateLogo: () => void;
    isRegeneratingLogo: boolean;
}

const FontPreviewModal: React.FC<{ fontName: string; isOpen: boolean; onClose: () => void; }> = ({ fontName, isOpen, onClose }) => {
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
    const { t } = useLanguage();

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            <link href={fontUrl} rel="stylesheet" />
            <div
                className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in"
                onClick={onClose}
                aria-modal="true"
                role="dialog"
            >
                <div
                    className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-2xl transform animate-fade-in-up text-start"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontFamily: `'${fontName}', sans-serif` }}
                >
                    <div className="flex justify-between items-start">
                        <h2 className="text-3xl font-bold text-gray-800">{fontName}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <CloseIcon className="w-7 h-7" />
                        </button>
                    </div>
                    <div className="mt-6 border-t pt-6 space-y-4">
                        <p className="text-xl" style={{ fontWeight: 400 }}>Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz</p>
                        <p className="text-xl" style={{ fontWeight: 400 }}>0123456789</p>
                        <p className="text-4xl font-bold" style={{ fontWeight: 700 }}>{t('fontPreviewSentence1')}</p>
                        <p className="text-base text-gray-700" style={{ fontWeight: 400 }}>
                            {t('fontPreviewSentence2')}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

const LogoDisplay: React.FC<{ identity: BrandIdentity; isLoadingLogo: boolean; onRegenerate: () => void; isRegenerating: boolean; }> = ({ identity, isLoadingLogo, onRegenerate, isRegenerating }) => {
    const { t } = useLanguage();
    const canRegenerate = !identity.logoImage?.startsWith('blob:');

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center aspect-square">
            <div className="w-full flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{identity.companyName}</h3>
                    <p className="text-sm text-gray-500">{t('primaryLogo')} ({identity.logo.style})</p>
                </div>
                {canRegenerate && (
                    <button
                        onClick={onRegenerate}
                        disabled={isRegenerating || isLoadingLogo}
                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 transition-colors rounded-lg px-3 py-1.5 hover:bg-indigo-50 disabled:bg-gray-100"
                    >
                        {isRegenerating ? <LoadingSpinner className="w-4 h-4" /> : <RefreshIcon className="w-4 h-4" />}
                        <span>{isRegenerating ? t('regenerating') : t('regenerateLogo')}</span>
                    </button>
                )}
            </div>
            <div className="flex-grow flex items-center justify-center w-full mt-2">
                {isLoadingLogo || isRegenerating || !identity.logoImage ? (
                    <div className="flex flex-col items-center text-gray-500">
                        <LoadingSpinner className="w-12 h-12 text-indigo-500" />
                        <p className="mt-3 text-sm">{isRegenerating ? t('regenerating') : t('generatingLogo')}</p>
                    </div>
                ) : (
                    <img src={identity.logoImage} alt={t('logoAlt')} className="max-w-full max-h-64 object-contain rounded-lg" />
                )}
            </div>
        </div>
    );
};

const ColorPalette: React.FC<{ colors: ColorInfo[] }> = ({ colors }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('colorPalette')}</h3>
            <div className="grid grid-cols-5 gap-3">
                {colors.map((color) => (
                    <div key={color.hex} className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full border-2 border-gray-200" style={{ backgroundColor: color.hex }} />
                        <p className="mt-2 text-sm font-semibold text-gray-700">{color.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{color.hex}</p>
                    </div>
                ))}
            </div>
            <div className="mt-4 space-y-2">
                {colors.map((color) => (
                    <div key={`${color.hex}-usage`} className="flex items-start text-sm">
                        <div className="w-4 h-4 rounded-full mt-0.5 ms-2 flex-shrink-0" style={{ backgroundColor: color.hex }} />
                        <p><span className="font-semibold">{color.name}:</span> <span className="text-gray-600">{color.usage}</span></p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FontPairings: React.FC<{ fonts: FontPair }> = ({ fonts }) => {
    const [fontToPreview, setFontToPreview] = useState<string | null>(null);
    const { t } = useLanguage();

    const headerFontUrl = `https://fonts.googleapis.com/css2?family=${fonts.header.replace(/ /g, '+')}:wght@700&display=swap`;
    const bodyFontUrl = `https://fonts.googleapis.com/css2?family=${fonts.body.replace(/ /g, '+')}:wght@400&display=swap`;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <link href={headerFontUrl} rel="stylesheet" />
            <link href={bodyFontUrl} rel="stylesheet" />
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('typography')}</h3>
            <div className="mb-4">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">{t('headerFont')}</p>
                    <button
                        onClick={() => setFontToPreview(fonts.header)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded px-2 py-1 transition-colors"
                    >
                        {t('preview')}
                    </button>
                </div>
                <p className="text-3xl truncate" style={{ fontFamily: `'${fonts.header}', sans-serif` }}>{fonts.header}</p>
            </div>
            <div className="mb-4">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">{t('bodyFont')}</p>
                    <button
                        onClick={() => setFontToPreview(fonts.body)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded px-2 py-1 transition-colors"
                    >
                        {t('preview')}
                    </button>
                </div>
                <p className="text-lg" style={{ fontFamily: `'${fonts.body}', sans-serif` }}>{fonts.body}</p>
                <p className="text-gray-600 mt-1" style={{ fontFamily: `'${fonts.body}', sans-serif` }}>{t('fontPreviewSentence1')}</p>
            </div>
            <p className="text-sm text-gray-600 italic">"{fonts.notes}"</p>

            {fontToPreview && (
                <FontPreviewModal
                    fontName={fontToPreview}
                    isOpen={!!fontToPreview}
                    onClose={() => setFontToPreview(null)}
                />
            )}
        </div>
    );
};

const LogoConcepts: React.FC<{ concepts: string[], isRegenerating: boolean }> = ({ concepts, isRegenerating }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg relative min-h-[150px]">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('logoConcepts')}</h3>
            {isRegenerating ? (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-xl">
                    <LoadingSpinner className="w-8 h-8 text-indigo-500" />
                </div>
            ) : (
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {concepts.map((concept, index) => <li key={index}>{concept}</li>)}
                </ul>
            )}
        </div>
    );
};


const BrandBible: React.FC<BrandBibleProps> = ({ identity, isLoadingLogo, onInitiateTranslate, isTranslating, showTranslateButton, isBilingualReady, onRegenerateLogo, isRegeneratingLogo }) => {
    const { lang, setLanguage, t } = useLanguage();

    if (!identity) {
        return null;
    }

    return (
        <div className="mt-8 p-4 md:p-8 bg-gray-100 rounded-2xl animate-fade-in">
            <div className="flex justify-center items-center mb-6 relative">
                <h2 className="text-3xl font-bold text-gray-900">{t('brandBibleTitle')}</h2>

                {showTranslateButton && (
                    <button
                        onClick={onInitiateTranslate}
                        disabled={isTranslating}
                        className="absolute end-0 bg-white text-indigo-600 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 disabled:bg-gray-200 disabled:text-gray-400 transition-all duration-300 flex items-center justify-center space-x-2 border border-gray-200"
                    >
                        {isTranslating ? (
                            <>
                                <LoadingSpinner className="w-5 h-5" />
                                <span>{t('translating')}</span>
                            </>
                        ) : (
                            <span>{lang === 'en' ? t('translateToArabic') : t('translateToEnglish')}</span>
                        )}
                    </button>
                )}

                {isBilingualReady && (
                    <div className="absolute end-0 bg-gray-200 p-1 rounded-full flex items-center space-x-1">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${lang === 'en' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('languageEnglish')}
                        </button>
                        <button
                            onClick={() => setLanguage('ar')}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${lang === 'ar' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('languageArabic')}
                        </button>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <LogoDisplay identity={identity} isLoadingLogo={isLoadingLogo} onRegenerate={onRegenerateLogo} isRegenerating={isRegeneratingLogo} />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <ColorPalette colors={identity.colorPalette} />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <FontPairings fonts={identity.fontPairings} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <LogoConcepts concepts={identity.logoConcepts} isRegenerating={isRegeneratingLogo} />
                </div>
            </div>
        </div>
    );
};

export default BrandBible;