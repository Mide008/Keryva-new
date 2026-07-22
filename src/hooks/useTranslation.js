// src/hooks/useTranslation.js
import { useApp } from '@/lib/AppContext';
import { getTranslation } from '@/lib/translations';

export function useTranslation() {
  const { user } = useApp();
  const lang = user?.language || 'en';
  const t = (key) => getTranslation(lang, key);
  return { t, lang };
}