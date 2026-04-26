import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CountryCode = 'US' | 'LV';

export interface Country {
  code: CountryCode;
  name: string;
  flag: string;
  region: 'EU' | 'US';          // legal region (EU = GDPR, US = CCPA/California)
  defaultLanguage: 'en' | 'lv'; // suggested language (never forced)
  requiresCookieConsent: boolean; // GDPR requires explicit consent
}

export const COUNTRIES: Record<CountryCode, Country> = {
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    region: 'US',
    defaultLanguage: 'en',
    requiresCookieConsent: false, // CCPA does not require banner (no federal law)
  },
  LV: {
    code: 'LV',
    name: 'Latvia',
    flag: '🇱🇻',
    region: 'EU',
    defaultLanguage: 'lv',
    requiresCookieConsent: true, // GDPR applies — must show consent banner
  },
};

interface CountryContextType {
  country: Country;
  countryCode: CountryCode;
  setCountry: (code: CountryCode) => void;
  isEU: boolean;
  isUS: boolean;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

const STORAGE_KEY = 'famactify-country';

export const CountryProvider = ({ children }: { children: ReactNode }) => {
  const [countryCode, setCountryCode] = useState<CountryCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as CountryCode | null;
    if (saved && saved in COUNTRIES) return saved;
    // Auto-detect from browser locale as default suggestion
    const locale = navigator.language || 'en-US';
    return locale.includes('lv') ? 'LV' : 'US';
  });

  const setCountry = (code: CountryCode) => {
    setCountryCode(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const country = COUNTRIES[countryCode];

  return (
    <CountryContext.Provider value={{
      country,
      countryCode,
      setCountry,
      isEU: country.region === 'EU',
      isUS: country.region === 'US',
    }}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};
