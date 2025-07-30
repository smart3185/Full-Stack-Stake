import React, { createContext, useContext, useState, useCallback } from 'react';
import Banner from './Banner';

interface BannerContextType {
  showBanner: (message: string, duration?: number) => void;
}

const BannerContext = createContext<BannerContextType>({
  showBanner: () => {},
});

export const useBanner = () => useContext(BannerContext);

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [banner, setBanner] = useState<{ message: string; duration: number } | null>(null);

  const showBanner = useCallback((message: string, duration = 2000) => {
    setBanner({ message, duration });
    setTimeout(() => setBanner(null), duration);
  }, []);

  return (
    <BannerContext.Provider value={{ showBanner }}>
      {banner && <Banner message={banner.message} duration={banner.duration} />}
      {children}
    </BannerContext.Provider>
  );
}; 