import React, { useState, useEffect } from 'react';
import type { BrandIdentity, LogoVariations } from '../types';
import { ColorInfo, FontPair } from '../types';
import { LoadingSpinner, CloseIcon, RefreshIcon } from './icons';
import { useLanguage } from '../LanguageContext';
import { LogoCompositor, LogoLayout } from './LogoCompositor';

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
    const { t, lang } = useLanguage();
    const [activeLayout, setActiveLayout] = useState<LogoLayout>('horizontal');
    const [compositedLogos, setCompositedLogos] = useState<Record<LogoLayout, string | null>>({
        horizontal: null,
        vertical: null,
        'icon-only': null,
    });

    // Check if this is a user-uploaded logo (blob URL) - can't composite those
    const isUserUploadedLogo = identity.logoImage?.startsWith('blob:');
    const canRegenerate = !isUserUploadedLogo;

    // Use logoMark (icon-only) for compositing, fallback to logoImage
    const iconUrl = identity.logoMark || identity.logoImage || '';
    const fontFamily = identity.fontPairings.header;
    const primaryColor = identity.colorPalette[0]?.hex || '#000000';
    const isRtl = lang === 'ar';

    const handleExport = (layout: LogoLayout, dataUrl: string) => {
        setCompositedLogos(prev => ({ ...prev, [layout]: dataUrl }));
    };

    const layoutOptions: { key: LogoLayout; label: string }[] = [
        { key: 'horizontal', label: 'Horizontal' },
        { key: 'vertical', label: 'Vertical' },
        { key: 'icon-only', label: 'Icon' },
    ];

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col">
            <div className="w-full flex justify-between items-start mb-4">
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

            {/* Layout selector - only show if not a user-uploaded logo */}
            {!isUserUploadedLogo && iconUrl && (
                <div className="flex justify-center mb-4">
                    <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                        {layoutOptions.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setActiveLayout(key)}
                                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeLayout === key
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-grow flex items-center justify-center w-full min-h-[200px]">
                {isLoadingLogo || isRegenerating || !iconUrl ? (
                    <div className="flex flex-col items-center text-gray-500">
                        <LoadingSpinner className="w-12 h-12 text-indigo-500" />
                        <p className="mt-3 text-sm">{isRegenerating ? t('regenerating') : t('generatingLogo')}</p>
                    </div>
                ) : isUserUploadedLogo ? (
                    // For user-uploaded logos, just show the image as-is
                    <img src={identity.logoImage} alt={t('logoAlt')} className="max-w-full max-h-64 object-contain rounded-lg" />
                ) : (
                    // For AI-generated logos, use the LogoCompositor
                    <div className="w-full flex justify-center">
                        {compositedLogos[activeLayout] ? (
                            <img
                                src={compositedLogos[activeLayout]!}
                                alt={`${identity.companyName} logo (${activeLayout})`}
                                className="max-w-full max-h-64 object-contain rounded-lg border border-gray-100"
                            />
                        ) : (
                            <LogoCompositor
                                iconUrl={iconUrl}
                                companyName={identity.companyName}
                                fontFamily={fontFamily}
                                primaryColor={primaryColor}
                                layout={activeLayout}
                                isRtl={isRtl}
                                onExport={(dataUrl) => handleExport(activeLayout, dataUrl)}
                                className="border border-gray-100 rounded-lg overflow-hidden"
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Show all variations in a grid below */}
            {!isUserUploadedLogo && iconUrl && !isLoadingLogo && !isRegenerating && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2 text-center">Logo Variations</p>
                    <div className="grid grid-cols-3 gap-2">
                        {layoutOptions.map(({ key }) => (
                            <div
                                key={key}
                                onClick={() => setActiveLayout(key)}
                                className={`cursor-pointer p-2 rounded border ${activeLayout === key ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                {compositedLogos[key] ? (
                                    <img
                                        src={compositedLogos[key]!}
                                        alt={`${key} layout`}
                                        className="w-full h-12 object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-12 flex items-center justify-center">
                                        <LogoCompositor
                                            iconUrl={iconUrl}
                                            companyName={identity.companyName}
                                            fontFamily={fontFamily}
                                            primaryColor={primaryColor}
                                            layout={key}
                                            isRtl={isRtl}
                                            onExport={(dataUrl) => handleExport(key, dataUrl)}
                                            className="max-h-12"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Logo Display - Full width on mobile, half on desktop */}
                <div className="lg:row-span-2">
                    <LogoDisplay identity={identity} isLoadingLogo={isLoadingLogo} onRegenerate={onRegenerateLogo} isRegenerating={isRegeneratingLogo} />
                </div>
                {/* Color Palette */}
                <div>
                    <ColorPalette colors={identity.colorPalette} />
                </div>
                {/* Typography */}
                <div>
                    <FontPairings fonts={identity.fontPairings} />
                </div>
                {/* Logo Concepts - Full width */}
                <div className="lg:col-span-2">
                    <LogoConcepts concepts={identity.logoConcepts} isRegenerating={isRegeneratingLogo} />
                </div>
            </div>
        </div>
    );
};

export default BrandBible;