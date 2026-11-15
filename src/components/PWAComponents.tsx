import React, { useEffect, useState } from 'react';
import { Download, WifiOff, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallModalButton: React.FC<{
  variant?: 'header' | 'sidebar' | 'banner';
}> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleTrigger = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleTrigger}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleTrigger}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span className="truncate">Install Clamir App</span>
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#111827]" />
                <h3 className="text-base font-semibold text-[#111827]">Install Clamir AI Application</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[#6B7280]">
              <p className="text-[#111827] font-medium">
                Install Clamir AI on your device for instant standalone access, faster workspace loading, and offline report viewing.
              </p>
              {isIOS ? (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3.5 space-y-1.5 text-xs text-[#111827]">
                  <p className="font-semibold">iOS Safari Instructions:</p>
                  <p>1. Tap the <strong>Share</strong> icon in the Safari bottom bar.</p>
                  <p>2. Select <strong>Add to Home Screen</strong> and tap <strong>Add</strong>.</p>
                </div>
              ) : (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3.5 space-y-1.5 text-xs text-[#111827]">
                  <p className="font-semibold">Desktop / Mobile Browser Instructions:</p>
                  <p>1. Open this application in a top-level browser tab.</p>
                  <p>2. Click the <strong>Install Clamir AI</strong> icon in your browser address bar, or open the browser menu and choose <strong>Install App / Add to Home Screen</strong>.</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-white bg-black rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-[#111827] text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 border-b border-[#E5E7EB]">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Viewing cached static workspace assets. Live AI simulations require an active connection.</span>
    </div>
  );
};
