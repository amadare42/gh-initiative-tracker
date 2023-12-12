import { createContext, useContext } from 'react';
import ua from './ua.json';
import { useLocalStorage } from '../utils/useLocalStorage';

export const LocalizationContext = createContext({
    locale: 'en',
    setLocale: (locale: string) => {},
    t: (value: string) => value
});

export function LocalizationProvider({ children }: any) {
    const isBrowserUa = navigator.language == 'uk-UA';
    const [locale, setLocale] = useLocalStorage<string>('locale', isBrowserUa ? 'ua' : 'en');

    const t = (value: string) => {
        let localizedValue = value;
        switch (locale) {
            case 'ua':
                localizedValue = ua[value]
        }

        return localizedValue || value;
    }

    return <LocalizationContext.Provider value={ { locale, setLocale, t } }>
        { children }
    </LocalizationContext.Provider>
}

export function useLocaleContext() {
    return useContext(LocalizationContext);
}

export function useLocalize() {
    const { t } = useContext(LocalizationContext);
    return t;
}
