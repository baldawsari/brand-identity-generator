import React, { useState, useCallback, useEffect, Suspense } from 'react';
import {
  generateBrandIdentity,
  translateBrandIdentity,
  buildIdentityFromLogo,
  rebrandLogoAndBuildIdentity,
  regenerateLogoAndConcepts,
  generateLogoMark,
  setApiKey,
  getCurrentApiKey,
  hasApiKey,
  clearApiKey,
} from './services/geminiService';
import type { BrandIdentity } from './types';
import BrandBible from './components/BrandBible';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load heavy components to reduce initial bundle size
const DocumentTemplates = React.lazy(() => import('./components/DocumentTemplates'));
const BrandAssetsComponent = React.lazy(() => import('./components/BrandAssets'));
const ChatBot = React.lazy(() => import('./components/ChatBot'));

// Reusable nice fallback for Suspense (used for lazy-loaded heavy components)
const LoadingFallback: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center py-10 text-gray-500">
    <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-3" />
    <span className="text-sm">{message}</span>
  </div>
);
import { LoadingSpinner, SparklesIcon, CloseIcon, ChevronDownIcon } from './components/icons';
import { LanguageProvider, useLanguage } from './LanguageContext';

const ApiKeyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentStatus: 'none' | 'env' | 'user';
}> = ({ isOpen, onClose, onSave, currentStatus }) => {
  const [localKey, setLocalKey] = useState('');

  useEffect(() => {
    if (!isOpen) setLocalKey('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md transform animate-fade-in-up text-start"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Gemini API Key Required</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="text-sm text-gray-600 space-y-3">
          <p>
            This app uses Google Gemini to generate brands. For security, your API key is never stored on any server and is only kept in your browser session.
          </p>
          <p>
            Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>.
          </p>
        </div>

        <div className="mt-5">
          <input
            type="password"
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            placeholder="Paste your Gemini API key (starts with AIza...)"
            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && localKey.trim()) {
                onSave(localKey);
              }
            }}
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => onSave(localKey)}
            disabled={!localKey.trim()}
            className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
          >
            Save & Continue
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white text-gray-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-100 border border-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>

        {currentStatus === 'env' && (
          <p className="mt-3 text-xs text-green-600">A key is already configured for local development.</p>
        )}
      </div>
    </div>
  );
};


const TranslationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adaptTypography: boolean) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  const { lang, t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sourceLangName = lang === 'en' ? t('languageEnglish') : t('languageArabic');
  const targetLangName = lang === 'en' ? t('languageArabic') : t('languageEnglish');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-md transform animate-fade-in-up text-start"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{t('translationModalTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="mt-3 text-gray-600">
          {t('translationModalQuestion', {
            targetLang: targetLangName,
            sourceLang: sourceLangName,
          })}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onConfirm(true)}
            className="w-full bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('translationModalFindNew')}
          </button>
          <button
            onClick={() => onConfirm(false)}
            className="w-full bg-white text-gray-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-100 border border-gray-300 transition-colors"
          >
            {t('translationModalKeepCurrent')}
          </button>
        </div>
      </div>
    </div>
  );
};


const AppContent: React.FC = () => {
  // API Key management (BYOK - Bring Your Own Key)
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'none' | 'env' | 'user'>('none');

  // Core inputs
  const [mission, setMission] = useState<string>('');
  const [providedCompanyName, setProvidedCompanyName] = useState<string>('');

  // Optional assets state
  const [isAssetsOpen, setIsAssetsOpen] = useState<boolean>(false);
  const [logoStartPoint, setLogoStartPoint] = useState<'idea' | 'file'>('idea');
  const [providedLogoDescription, setProvidedLogoDescription] = useState<string>('');
  const [uploadedLogo, setUploadedLogo] = useState<File | null>(null);
  const [rebrandLogo, setRebrandLogo] = useState<boolean>(false);
  const [rebrandNotes, setRebrandNotes] = useState<string>('');
  const [brandColors, setBrandColors] = useState<string>('');
  const [brandFonts, setBrandFonts] = useState({ header: '', body: '' });

  // State for results
  const [originalBrandBible, setOriginalBrandBible] = useState<BrandIdentity | null>(null);
  const [translatedBrandBible, setTranslatedBrandBible] = useState<BrandIdentity | null>(null);
  const [originalLang, setOriginalLang] = useState<'en' | 'ar' | null>(null);

  // Status states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingLogo, setIsLoadingLogo] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isRegeneratingLogo, setIsRegeneratingLogo] = useState<boolean>(false);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState<boolean>(false);
  const [showDocuments, setShowDocuments] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { lang, setLanguage, t } = useLanguage();

  // Sync API key status (checks both user-provided and env-injected key)
  const refreshApiKeyStatus = useCallback(() => {
    const currentKey = getCurrentApiKey();
    if (!currentKey) {
      setApiKeyStatus('none');
    } else if (getCurrentApiKey() && !apiKeyInput && process.env.API_KEY) {
      // Key is coming from environment (local dev)
      setApiKeyStatus('env');
    } else {
      setApiKeyStatus('user');
    }
  }, [apiKeyInput]);

  useEffect(() => {
    refreshApiKeyStatus();
  }, [refreshApiKeyStatus]);

  // Note: handleSetApiKey and handleClearApiKey logic is currently handled inline in the modal / status pill.
  // They are kept for potential future "Clear Key" UI.

  const clearResults = () => {
    setOriginalBrandBible(null);
    setTranslatedBrandBible(null);
    setOriginalLang(null);
    setShowDocuments(false);
    setError(null);
  };

  const handleGenerate = useCallback(async () => {
    // --- Validation ---
    if (!hasApiKey()) {
      setIsApiKeyModalOpen(true);
      setError('Please set your Gemini API key to continue.');
      return;
    }
    if (!mission.trim()) {
      setError(t('errorMission'));
      return;
    }
    if (isAssetsOpen && logoStartPoint === 'file' && !uploadedLogo) {
      setError(t('errorLogoUpload'));
      return;
    }
    if (isAssetsOpen && logoStartPoint === 'file' && !providedCompanyName.trim()) {
      setError(t('errorCompanyNameForLogo'));
      return;
    }

    setIsLoading(true);
    clearResults();

    try {
      const hasProvidedAssets = isAssetsOpen && logoStartPoint === 'file' && uploadedLogo;

      // --- Persona 4: The Rebrander ---
      if (hasProvidedAssets && rebrandLogo) {
        const identity = await rebrandLogoAndBuildIdentity(mission, providedCompanyName, uploadedLogo!, lang, rebrandNotes);
        setOriginalBrandBible(identity);
        setOriginalLang(lang);

        setIsLoadingLogo(true);
        // Generate icon-only logo mark (no text) - text is composited by LogoCompositor
        const logoMarkUrl = await generateLogoMark(identity);
        setOriginalBrandBible(prev => prev ? { ...prev, logoMark: logoMarkUrl, logoImage: logoMarkUrl } : null);
        setIsLoadingLogo(false);
      }
      // --- Persona 3: The Prepared Professional ---
      // User has logo, colors, and fonts - build identity and show template-based assets
      else if (hasProvidedAssets && brandColors && brandFonts.header && brandFonts.body) {
        const identity = await buildIdentityFromLogo(mission, providedCompanyName, uploadedLogo!, lang);
        const logoUrl = URL.createObjectURL(uploadedLogo!);
        identity.logoImage = logoUrl;
        // Override fonts with user-provided ones
        identity.fontPairings = {
          header: brandFonts.header,
          body: brandFonts.body,
          notes: `User-specified fonts: ${brandFonts.header} for headers, ${brandFonts.body} for body.`
        };
        setOriginalBrandBible(identity);
        setOriginalLang(lang);
      }
      // --- Persona 2: The Semi-Prepared Entrepreneur ---
      else if (hasProvidedAssets) {
        const identity = await buildIdentityFromLogo(mission, providedCompanyName, uploadedLogo!, lang);
        const logoUrl = URL.createObjectURL(uploadedLogo!);
        identity.logoImage = logoUrl;
        setOriginalBrandBible(identity);
        setOriginalLang(lang);
      }
      // --- Persona 1: The Complete Beginner ---
      else {
        const logoDesc = isAssetsOpen && logoStartPoint === 'idea' ? providedLogoDescription : undefined;
        const identity = await generateBrandIdentity(mission, lang, providedCompanyName || undefined, logoDesc);
        setOriginalBrandBible(identity);
        setOriginalLang(lang);

        setIsLoadingLogo(true);
        // Generate icon-only logo mark (no text) - text is composited by LogoCompositor
        const logoMarkUrl = await generateLogoMark(identity);
        setOriginalBrandBible(prev => prev ? { ...prev, logoMark: logoMarkUrl, logoImage: logoMarkUrl } : null);
        setIsLoadingLogo(false);
      }
    } catch (err: any) {
      console.error(err);

      // Use our new typed error system for better messages
      if (err?.code === 'NO_API_KEY' || err?.message === 'NO_API_KEY') {
        setIsApiKeyModalOpen(true);
        setError('Please set your Gemini API key to continue.');
      } else if (err?.userMessage) {
        // Typed GeminiError
        setError(err.userMessage);
      } else if (err.message && err.message.includes("Requested entity was not found")) {
        setError("API Key invalid or expired. Please check your key.");
      } else {
        setError(`Error: ${err.message || 'Something went wrong. Please try again.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [mission, lang, isAssetsOpen, logoStartPoint, rebrandLogo, rebrandNotes, providedCompanyName, providedLogoDescription, uploadedLogo, brandColors, brandFonts, t]);

  const handleInitiateTranslate = () => {
    if (!originalBrandBible) return;
    setIsTranslationModalOpen(true);
  };

  const handleConfirmTranslation = useCallback(async (adaptTypography: boolean) => {
    if (!originalBrandBible || !originalLang) return;

    setIsTranslationModalOpen(false);
    setIsTranslating(true);
    setError(null);
    const targetLang = originalLang === 'en' ? 'ar' : 'en';

    try {
      const translatedIdentity = await translateBrandIdentity(originalBrandBible, targetLang, adaptTypography);
      translatedIdentity.logoImage = originalBrandBible.logoImage;

      setTranslatedBrandBible(translatedIdentity);
      setLanguage(targetLang);
    } catch (err: any) {
      console.error(err);
      setError(err?.userMessage || t('errorTranslate'));
    } finally {
      setIsTranslating(false);
    }
  }, [originalBrandBible, originalLang, setLanguage, t]);

  const handleRegenerateLogo = useCallback(async () => {
    if (!originalBrandBible || !originalLang) return;

    setIsRegeneratingLogo(true);
    setError(null);

    // Clear old logo images before generating new ones
    setOriginalBrandBible(prev => prev ? { ...prev, logoImage: undefined, logoMark: undefined } : null);
    setTranslatedBrandBible(null);

    try {
      const { logo, logoConcepts } = await regenerateLogoAndConcepts(mission, originalBrandBible.companyName, originalLang);

      const updatedBible = { ...originalBrandBible, logo, logoConcepts };
      setOriginalBrandBible(updatedBible);

      // Generate icon-only logo mark (no text) - text is composited by LogoCompositor
      const logoMarkUrl = await generateLogoMark(updatedBible);
      setOriginalBrandBible(prev => prev ? { ...prev, logoMark: logoMarkUrl, logoImage: logoMarkUrl } : null);

    } catch (err: any) {
      console.error("Regeneration error:", err);
      setError(err?.userMessage || t('errorGenerate'));
    } finally {
      setIsRegeneratingLogo(false);
    }
  }, [originalBrandBible, originalLang, mission, t]);

  const displayedBible = lang === originalLang ? originalBrandBible : translatedBrandBible;
  const showTranslateButton = originalBrandBible !== null && translatedBrandBible === null;
  const isBilingualReady = originalBrandBible !== null && translatedBrandBible !== null;




  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="inline-flex items-center bg-indigo-100 text-indigo-700 text-sm font-semibold px-4 py-1 rounded-full">
              <SparklesIcon className="w-5 h-5 me-2" />
              {t('poweredBy')}
            </div>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                apiKeyStatus === 'user' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                apiKeyStatus === 'env' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
              title={apiKeyStatus === 'user' ? 'Using your personal API key (secure)' : apiKeyStatus === 'env' ? 'Using local dev key from .env' : 'Click to set your Gemini API key'}
            >
              {apiKeyStatus === 'user' ? 'Personal Key' : apiKeyStatus === 'env' ? 'Dev Key' : 'Set API Key'}
            </button>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            {t('mainHeading')}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            {t('subHeading')}
          </p>
        </div>

        <div className="max-w-2xl mx-auto mt-10">
          <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2 text-start">{t('companyNameLabel')}</label>
                <input type="text" id="companyName" className="w-full p-3 border border-gray-300 rounded-lg" placeholder={t('companyNamePlaceholder')} value={providedCompanyName} onChange={(e) => setProvidedCompanyName(e.target.value)} disabled={isLoading || isTranslating} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="mission" className="block text-sm font-medium text-gray-700 mb-2 text-start">
                  {t('missionLabel')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="mission"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder={t('missionPlaceholder')}
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  disabled={isLoading || isTranslating}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200">
              <button onClick={() => setIsAssetsOpen(!isAssetsOpen)} className="w-full flex justify-between items-center p-3 font-semibold text-gray-700">
                <span>{t('addAssetsOptional')}</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isAssetsOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAssetsOpen && (
                <div className="p-4 border-t border-gray-200 space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-start">{t('logoSituationLabel')}</label>
                    <div className="w-full bg-gray-100 p-1 rounded-full flex items-center">
                      <button onClick={() => setLogoStartPoint('idea')} disabled={isLoading || isTranslating} className={`w-full px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${logoStartPoint === 'idea' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500'}`} >{t('logoStartIdea')}</button>
                      <button onClick={() => setLogoStartPoint('file')} disabled={isLoading || isTranslating} className={`w-full px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${logoStartPoint === 'file' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500'}`} >{t('logoStartFile')}</button>
                    </div>
                  </div>

                  {logoStartPoint === 'idea' && (
                    <div>
                      <label htmlFor="logoDescription" className="block text-sm font-medium text-gray-700 mb-2 text-start">{t('logoDescriptionLabel')}</label>
                      <input type="text" id="logoDescription" className="w-full p-3 border border-gray-300 rounded-lg" placeholder={t('logoDescriptionPlaceholder')} value={providedLogoDescription} onChange={(e) => setProvidedLogoDescription(e.target.value)} disabled={isLoading || isTranslating} />
                    </div>
                  )}

                  {logoStartPoint === 'file' && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="logoUpload" className="block text-sm font-medium text-gray-700 mb-2 text-start">{t('logoUploadLabel')}</label>
                        <input type="file" id="logoUpload" accept="image/png, image/jpeg, image/webp" onChange={(e) => setUploadedLogo(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" disabled={isLoading || isTranslating} />
                      </div>
                      {uploadedLogo && (
                        <div className="flex items-center gap-2 pt-2">
                          <input type="checkbox" id="rebrandLogo" checked={rebrandLogo} onChange={e => setRebrandLogo(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <label htmlFor="rebrandLogo" className="text-sm font-medium text-gray-700">{t('rebrandCheckboxLabel')}</label>
                        </div>
                      )}
                      {uploadedLogo && rebrandLogo && (
                        <div>
                          <label htmlFor="rebrandNotes" className="block text-sm font-medium text-gray-700 mb-2 text-start">{t('rebrandNotesLabel')}</label>
                          <textarea id="rebrandNotes" rows={2} className="w-full p-3 border border-gray-300 rounded-lg" placeholder={t('rebrandNotesPlaceholder')} value={rebrandNotes} onChange={(e) => setRebrandNotes(e.target.value)} disabled={isLoading || isTranslating}></textarea>
                        </div>
                      )}
                      {uploadedLogo && !rebrandLogo && (
                        <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-200">
                          <p className="text-sm text-gray-600 text-start">{t('preparedProfessionalPrompt')}</p>
                          <div>
                            <label htmlFor="brandColors" className="block text-sm font-medium text-gray-700 mb-2 text-start">{t('brandColorsLabel')}</label>
                            <input type="text" id="brandColors" className="w-full p-3 border border-gray-300 rounded-lg" placeholder={t('brandColorsPlaceholder')} value={brandColors} onChange={(e) => setBrandColors(e.target.value)} disabled={isLoading || isTranslating} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label htmlFor="headerFont" className="block text-sm font-medium text-gray-700 mb-2 text-start">{t('headerFontLabel')}</label>
                              <input type="text" id="headerFont" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="e.g., Montserrat" value={brandFonts.header} onChange={(e) => setBrandFonts(f => ({ ...f, header: e.target.value }))} disabled={isLoading || isTranslating} />
                            </div>
                            <div>
                              <label htmlFor="bodyFont" className="block text-sm font-medium text-gray-700 mb-2 text-start">{t('bodyFontLabel')}</label>
                              <input type="text" id="bodyFont" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="e.g., Lato" value={brandFonts.body} onChange={(e) => setBrandFonts(f => ({ ...f, body: e.target.value }))} disabled={isLoading || isTranslating} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!originalBrandBible && (
              <div className="pt-2">
                <div className="w-full max-w-xs mx-auto bg-gray-100 p-1 rounded-full flex items-center">
                  <button onClick={() => setLanguage('en')} disabled={isLoading} className={`w-full px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${lang === 'en' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500'}`} >{t('languageEnglish')}</button>
                  <button onClick={() => setLanguage('ar')} disabled={isLoading} className={`w-full px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${lang === 'ar' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500'}`} >{t('languageArabic')}</button>
                </div>
              </div>
            )}

            <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-all flex items-center justify-center">
              {isLoading ? <><LoadingSpinner className="w-5 h-5 me-2" /><span>{t('generating')}</span></> : <><SparklesIcon className="w-5 h-5 me-2" /><span>{t('generateButton')}</span></>}
            </button>
            {error && <p className="mt-2 text-center text-red-600">{error}</p>}
          </div>
        </div>

        {isLoading && !originalBrandBible && (
          <div className="text-center mt-8 text-gray-600"><p>{t('loadingMessage')}</p></div>
        )}

        {displayedBible && (
          <ErrorBoundary>
            <BrandBible
              identity={displayedBible}
              isLoadingLogo={isLoadingLogo}
              onInitiateTranslate={handleInitiateTranslate}
              isTranslating={isTranslating}
              showTranslateButton={showTranslateButton}
              isBilingualReady={isBilingualReady}
              onRegenerateLogo={handleRegenerateLogo}
              isRegeneratingLogo={isRegeneratingLogo}
            />
          </ErrorBoundary>
        )}

        {displayedBible && (
          <div className="mt-8 text-center">
            {!showDocuments && (
              <button
                onClick={() => setShowDocuments(true)}
                className="bg-indigo-600 text-white font-semibold py-3 px-8 rounded-full hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center mx-auto"
              >
                <SparklesIcon className="w-5 h-5 me-2" />
                Generate Documents Assets
              </button>
            )}
            {showDocuments && (
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback message="Loading export tools..." />}>
                  <DocumentTemplates identity={displayedBible} lang={lang} />
                </Suspense>
              </ErrorBoundary>
            )}
          </div>
        )}

        {/* Marketing Assets - show for any brand identity with a logo */}
        {displayedBible && displayedBible.logoImage && (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback message="Loading marketing asset previews..." />}>
              <BrandAssetsComponent
                identity={displayedBible}
                logoUrl={displayedBible.logoMark || displayedBible.logoImage}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </main>
      <Suspense fallback={null}>
        <ChatBot />
      </Suspense>
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={(key) => {
          if (key?.trim()) {
            setApiKey(key.trim());
            setApiKeyStatus('user');
          }
          setIsApiKeyModalOpen(false);
        }}
        currentStatus={apiKeyStatus}
      />
      <TranslationModal
        isOpen={isTranslationModalOpen}
        onClose={() => setIsTranslationModalOpen(false)}
        onConfirm={handleConfirmTranslation}
      />

      {/* Safety & Attribution Footer (recommended for Gemini-powered apps) */}
      <footer className="mt-16 pb-8 text-center text-xs text-gray-400">
        Brand identities are generated using{' '}
        <a
          href="https://ai.google.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-500"
        >
          Gemini
        </a>{' '}
        by Google. Results may vary. Always review AI-generated assets before use.
      </footer>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);


export default App;