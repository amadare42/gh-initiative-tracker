import { useLocaleContext } from '../../localisation';

import './styles.scss';
import { useAppSelector } from '../../store';

export function ChangeLocale() {
    const localeContext = useLocaleContext();
    const flagUrl = localeContext.locale == 'ua' ? '/flags/ua.png' : '/flags/en.png';

    const isEditingMode = useAppSelector(state => state.ui.isExtraControlsVisible);

    const toggleLocale = () => {
        const newLocale = localeContext.locale == 'ua' ? 'en' : 'ua';
        localeContext.setLocale(newLocale);
    }

    return isEditingMode ? <button onClick={toggleLocale} className={'ChangeLocale-button'}>
        <img src={ flagUrl } alt={localeContext.locale} />
    </button> : null;
}
