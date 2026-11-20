import type { AppLanguage } from '../types';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';

export interface LangMap8<T> {
  'zh-CN': T;
  'en-US': T;
  'en-GB'?: T;
  'es-MX': T;
  'fr-FR': T;
  'de-DE': T;
  'pt-BR': T;
  'ja-JP': T;
}

/**
 * Compile-time checked 8-language selector.
 * Ensures zh-CN, en-US, es-MX, fr-FR, de-DE, pt-BR, and ja-JP are always provided,
 * while en-GB cleanly falls back to en-US unless an explicit UK/EU variant is passed.
 */
export function pickLang<T>(
  lang: AppLanguage | string | undefined | null,
  map: LangMap8<T>
): T {
  const norm = normalizeAppLanguage(lang ?? undefined, 'en-US');
  if (norm === 'en-GB') return map['en-GB'] ?? map['en-US'];
  return map[norm] ?? map['en-US'];
}
