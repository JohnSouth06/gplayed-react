import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

// Import de tes dictionnaires
import fr from '../locales/fr.json';
import en from '../locales/en.json';

// Initialisation de i18n
const i18n = new I18n({
  fr: fr,
  en: en,
});

// Comportement de repli : si la langue n'est pas trouvée, on utilise l'anglais par défaut
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Détection de la langue de l'appareil
const deviceLanguage = getLocales()[0].languageCode;

// On applique la langue du téléphone si elle existe dans nos dictionnaires, sinon c'est l'anglais
i18n.locale = (deviceLanguage === 'fr') ? 'fr' : 'en';

export default i18n;