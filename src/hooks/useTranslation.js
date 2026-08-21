// src/hooks/useTranslation.js
import { useApp } from '@/lib/AppContext';
import { getTranslation } from '@/lib/translations';
import { translateOption } from '@/lib/optionLabels';

export function useTranslation() {
  const { user } = useApp();
  const lang = user?.language || 'en';
  const t = (key) => getTranslation(lang, key);
  // tOpt: translate a dropdown/chip OPTION LABEL only. The underlying
  // value (what you pass to onChange / send to the AI prompt) never
  // changes — only what's displayed to the user does.
  const tOpt = (category, value) => translateOption(lang, category, value);
  return { t, tOpt, lang };
}