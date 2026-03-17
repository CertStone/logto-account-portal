"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  normalizeLocale,
  readStoredLanguage,
  saveLanguage,
  t,
  type Language,
} from "./index";

const LANGUAGE_CHANGED_EVENT = "account-center-language-changed";

export function useTranslations() {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onLanguageChanged = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setLanguageState(normalizeLocale(detail));
    };

    window.addEventListener(LANGUAGE_CHANGED_EVENT, onLanguageChanged as EventListener);

    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, onLanguageChanged as EventListener);
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    saveLanguage(nextLanguage);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: nextLanguage }));
    }
  }, []);

  const translate = useCallback(
    (key: string, params?: Record<string, string>) => t(key, language, params),
    [language]
  );

  return useMemo(
    () => ({ t: translate, language, setLanguage }),
    [translate, language, setLanguage]
  );
}
