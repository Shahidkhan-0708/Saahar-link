/**
 * i18n seed bundles (ADR-018): en / hi / mr.
 * Plain dictionaries + a tiny `t()` — the i18next migration is a drop-in swap
 * once the full string inventory lands (S5-INT02).
 */
export type Lang = "en" | "hi" | "mr";

const bundles: Record<Lang, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.admin": "Administration",
    "nav.trainer": "Trainer",
    "nav.learn": "My learning",
    "nav.employer": "Employer",
    "nav.audit": "Audit",
    "nav.login": "Sign in",
    "nav.logout": "Sign out",
    "sync.online": "Online",
    "sync.offline": "Offline",
    "sync.queued": "Queued",
    "sync.conflicts": "Conflicts",
    "sync.synced": "Synced",
    "app.tagline": "Offline-first cooperative training",
    "login.title": "Sign in to Sahakar-Link",
    "login.email": "Email",
    "login.password": "Password",
    "login.submit": "Sign in",
  },
  hi: {
    "nav.home": "होम",
    "nav.admin": "प्रशासन",
    "nav.trainer": "प्रशिक्षक",
    "nav.learn": "मेरी शिक्षा",
    "nav.employer": "नियोक्ता",
    "nav.audit": "ऑडिट",
    "nav.login": "साइन इन",
    "nav.logout": "साइन आउट",
    "sync.online": "ऑनलाइन",
    "sync.offline": "ऑफ़लाइन",
    "sync.queued": "कतार में",
    "sync.conflicts": "टकराव",
    "sync.synced": "सिंक हुआ",
    "app.tagline": "ऑफ़लाइन-प्रथम सहकारी प्रशिक्षण",
    "login.title": "सहकार-लिंक में साइन इन करें",
    "login.email": "ईमेल",
    "login.password": "पासवर्ड",
    "login.submit": "साइन इन",
  },
  mr: {
    "nav.home": "मुख्यपृष्ठ",
    "nav.admin": "प्रशासन",
    "nav.trainer": "प्रशिक्षक",
    "nav.learn": "माझे शिक्षण",
    "nav.employer": "नियोक्ता",
    "nav.audit": "ऑडिट",
    "nav.login": "साइन इन",
    "nav.logout": "साइन आउट",
    "sync.online": "ऑनलाइन",
    "sync.offline": "ऑफलाइन",
    "sync.queued": "कतारात",
    "sync.conflicts": "संघर्ष",
    "sync.synced": "सिंक झाले",
    "app.tagline": "ऑफलाइन-प्रथम सहकारी प्रशिक्षण",
    "login.title": "सहकार-लिंकमध्ये साइन इन करा",
    "login.email": "ईमेल",
    "login.password": "पासवर्ड",
    "login.submit": "साइन इन",
  },
};

const LANG_KEY = "sahakar.lang";

export function currentLang(): Lang {
  return (localStorage.getItem(LANG_KEY) as Lang) ?? "en";
}

export function setLang(lang: Lang): void {
  localStorage.setItem(LANG_KEY, lang);
  window.dispatchEvent(new CustomEvent("sahakar:lang"));
}

export function t(key: string): string {
  return bundles[currentLang()]?.[key] ?? bundles.en[key] ?? key;
}
