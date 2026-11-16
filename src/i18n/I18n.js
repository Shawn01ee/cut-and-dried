import { CUT_STRINGS } from './cutStrings.js';
import { STRINGS, NAME_KO } from './strings.js';
import { TYCOON_STRINGS } from './tycoonStrings.js';
import { INSIGHT_STRINGS } from './insightStrings.js';

/** Looks up UI text for the current language, falling back to English. */
export class I18n {
  constructor(lang) { this.lang = lang === 'ko' ? 'ko' : 'en'; }
  t(key, ...args) {
    const text = CUT_STRINGS[this.lang][key] ?? INSIGHT_STRINGS[this.lang][key] ?? TYCOON_STRINGS[this.lang][key] ?? STRINGS[this.lang][key] ?? INSIGHT_STRINGS.en[key] ?? TYCOON_STRINGS.en[key] ?? STRINGS.en[key] ?? key;
    return String(text).replace(/\{(\d)\}/g, (_, i) => args[+i]);
  }
  name(n) { return this.lang === 'ko' ? (NAME_KO[n] || n) : n; }
}
