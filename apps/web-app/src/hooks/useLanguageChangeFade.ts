import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_FADE_IN_TIMING, LANGUAGE_FADE_OUT_TIMING } from '../constants/animations';

interface UseLanguageChangeFadeOptions {
  keyframePrefix?: string;
}

export const getLanguageFadeKeyframesSx = (keyframePrefix = 'langFade') =>
  ({
    [`@keyframes ${keyframePrefix}Out`]: {
      '0%': { opacity: 1 },
      '100%': { opacity: 0 },
    },
    [`@keyframes ${keyframePrefix}In`]: {
      '0%': { opacity: 0 },
      '100%': { opacity: 1 },
    },
  }) as const;

interface UseFadeOnChangeOptions {
  keyframePrefix?: string;
  skipInitial?: boolean;
}

export const useLanguageChangeFade = (
  elementRef: RefObject<HTMLElement | null>,
  options: UseLanguageChangeFadeOptions = {}
) => {
  const { i18n } = useTranslation();
  const keyframePrefix = options.keyframePrefix ?? 'langFade';

  useEffect(() => {
    const handleFadeOut = () => {
      const el = elementRef.current;
      if (!el) return;

      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = `${keyframePrefix}Out ${LANGUAGE_FADE_OUT_TIMING}`;
    };

    const handleFadeIn = () => {
      const el = elementRef.current;
      if (!el) return;

      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = `${keyframePrefix}In ${LANGUAGE_FADE_IN_TIMING}`;
      el.addEventListener(
        'animationend',
        () => {
          el.style.animation = '';
        },
        { once: true }
      );
    };

    document.addEventListener('languageChanging', handleFadeOut);
    i18n.on('languageChanged', handleFadeIn);

    return () => {
      document.removeEventListener('languageChanging', handleFadeOut);
      i18n.off('languageChanged', handleFadeIn);
    };
  }, [elementRef, i18n, keyframePrefix]);

  return getLanguageFadeKeyframesSx(keyframePrefix);
};

export const useFadeInOnChange = (
  elementRef: RefObject<HTMLElement | null>,
  changeKey: string,
  options: UseFadeOnChangeOptions = {}
) => {
  const keyframePrefix = options.keyframePrefix ?? 'viewFade';
  const skipInitial = options.skipInitial ?? true;
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (skipInitial && isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const el = elementRef.current;
    if (!el) {
      isFirstRenderRef.current = false;
      return;
    }

    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = `${keyframePrefix}In ${LANGUAGE_FADE_IN_TIMING}`;
    el.addEventListener(
      'animationend',
      () => {
        el.style.animation = '';
      },
      { once: true }
    );

    isFirstRenderRef.current = false;
  }, [changeKey, elementRef, keyframePrefix, skipInitial]);

  return getLanguageFadeKeyframesSx(keyframePrefix);
};
