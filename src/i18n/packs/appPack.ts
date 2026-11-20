import type { AppLanguage } from '../../types';
import { getAppPackACopy, type AppPackACopy } from './appPackA';
import { getAppPackBCopy, type AppPackBCopy } from './appPackB';

export type AppPackCopy = AppPackACopy & AppPackBCopy;

export function getAppPack(lang: AppLanguage): AppPackCopy {
  return {
    ...getAppPackACopy(lang),
    ...getAppPackBCopy(lang),
  };
}
