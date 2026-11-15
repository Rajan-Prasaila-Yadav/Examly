'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Download, Monitor, Smartphone, CheckCircle2, X, ExternalLink, Share } from 'lucide-react';

interface PwaContextType {
  canInstall: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  promptInstall: () => Promise<void>;
  openGuide: () => void;
  closeGuide: () => void;
  isGuideOpen: boolean;
}

const PwaContext = createContext<PwaContextType>({
  canInstall: false,
  isStandalone: false,
  isIOS: false,
  isAndroid: false,
  isDesktop: true,
  promptInstall: async () => {},
  openGuide: () => {},
  closeGuide: () => {},
  isGuideOpen: false,
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    // 1. Detect standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // 2. Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isIosDevice && !isAndroidDevice);

    // 3. Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('Examly ServiceWorker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.log('Examly ServiceWorker registration failed:', err);
          });
      });
    }

    // 4. Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setIsGuideOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      // If native prompt isn't directly available (e.g. iOS Safari, or prompt not fired yet), open friendly visual guide
      setIsGuideOpen(true);
    }
  };

  const openGuide = () => setIsGuideOpen(true);
  const closeGuide = () => setIsGuideOpen(false);

  return (
    <PwaContext.Provider
      value={{
        canInstall: !isStandalone,
        isStandalone,
        isIOS,
        isAndroid,
        isDesktop,
        promptInstall,
        openGuide,
        closeGuide,
        isGuideOpen,
      }}
    >
      {children}
      {isGuideOpen && <PwaInstallModal onClose={closeGuide} />}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}

/**
 * Top header install button for Desktop and Mobile
 */
export function PwaInstallHeaderButton() {
  const { isStandalone, promptInstall, isDesktop } = usePwa();

  if (isStandalone) {
    return null;
  }

  return (
    <button
      onClick={promptInstall}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-500/25 shadow-sm active:scale-95"
      title={isDesktop ? 'Download Examly as a Desktop App' : 'Install Examly Mobile App'}
      aria-label="Install Examly App"
    >
      {isDesktop ? <Monitor size={15} className="shrink-0" /> : <Smartphone size={15} className="shrink-0" />}
      <span className="hidden sm:inline font-semibold">
        {isDesktop ? 'Download App' : 'Install App'}
      </span>
      <Download size={13} className="opacity-75" />
    </button>
  );
}

/**
 * Visual modal with interactive instructions to install on Desktop, Android, or iOS
 */
export function PwaInstallModal({ onClose }: { onClose: () => void }) {
  const { isIOS, isAndroid, isDesktop, promptInstall } = usePwa();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl relative text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* App Icon & Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-13 h-13 rounded-2xl p-1 bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-500 shadow-lg shrink-0 flex items-center justify-center">
            <img
              src="/icons/icon-192.png"
              alt="Examly App Icon"
              className="w-11 h-11 rounded-xl object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-lg leading-tight">Examly</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Install for instant access, offline mode & full-screen tests.
            </p>
          </div>
        </div>

        {/* Specific platform instructions */}
        <div className="space-y-3.5 py-2">
          {isIOS ? (
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Smartphone size={16} className="text-brand-500" />
                Install on iOS / Safari:
              </p>
              <div className="space-y-2 pl-1">
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button <Share size={13} className="inline mx-0.5" /> in your Safari bottom toolbar.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Tap <strong>Add</strong> in the top right. Examly will launch as a native app!
                  </span>
                </div>
              </div>
            </div>
          ) : isAndroid ? (
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Smartphone size={16} className="text-brand-500" />
                Install on Android:
              </p>
              <div className="space-y-2 pl-1">
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Tap the <strong>Menu (⋮)</strong> in Chrome / Browser.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Monitor size={16} className="text-brand-500" />
                Install on Desktop (Windows / Mac / Linux):
              </p>
              <div className="space-y-2 pl-1">
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Look for the <strong>Install App (⊕ / ⬇)</strong> icon in your browser address bar (top right).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Or click browser <strong>Menu (⋮)</strong> &gt; <strong>Save and share</strong> &gt; <strong>Install Examly</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Features List */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>Full-screen Exam Mode</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>Instant Offline Cache</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>Zero App Store Downloads</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span>Automatic Background Updates</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              promptInstall();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all active:scale-95"
          >
            <Download size={15} />
            Install Now
          </button>
        </div>
      </div>
    </div>
  );
}
