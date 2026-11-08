import { STRINGS, NAME_KO } from './strings.js';
import { TYCOON_STRINGS } from './tycoonStrings.js';

/** Looks up UI text for the current language, falling back to English. */
export class I18n {
  constructor(lang) { this.lang = lang === 'ko' ? 'ko' : 'en'; }
  t(key, ...args) {
    const text = TYCOON_STRINGS[this.lang][key] ?? STRINGS[this.lang][key] ?? TYCOON_STRINGS.en[key] ?? STRINGS.en[key] ?? key;
    return String(text).replace(/\{(\d)\}/g, (_, i) => args[+i]);
  }
  name(n) { return this.lang === 'ko' ? (NAME_KO[n] || n) : n; }
}
