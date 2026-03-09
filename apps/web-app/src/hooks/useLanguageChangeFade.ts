import { useLayoutEffect, useRef } from 'react';
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

export const runFadeOut = (element: HTMLElement | null, keyframePrefix = 'langFade') => {
  if (!element) return;

  element.style.animation = 'none';
  void element.offsetHeight;
  element.style.animation = `${keyframePrefix}Out ${LANGUAGE_FADE_OUT_TIMING}`;
};

interface UseFadeOnChangeOptions {
  keyframePrefix?: string;
  skipInitial?: boolean;
  fadeInTiming?: string;
}

export const useLanguageChangeFade = (
  elementRef: RefObject<HTMLElement | null>,
  options: UseLanguageChangeFadeOptions = {}
) => {
  const { i18n } = useTranslation();
  const keyframePrefix = options.keyframePrefix ?? 'langFade';

  useLayoutEffect(() => {
    const handleFadeOut = () => {
      const el = elementRef.current;
      if (!el) return;

      runFadeOut(el, keyframePrefix);
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
  const fadeInTiming = options.fadeInTiming ?? LANGUAGE_FADE_IN_TIMING;
  const isFirstRenderRef = useRef(true);

  useLayoutEffect(() => {
    if (skipInitial && isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const el = elementRef.current;
    if (!el) {
      isFirstRenderRef.current = false;
      return;
    }

    const transitionTiming = fadeInTiming.replace(/\sforwards\b/, '').trim();
    let handleTransitionEnd: ((event: TransitionEvent) => void) | null = null;

    el.style.animation = 'none';
    el.style.transition = 'none';
    el.style.opacity = '0';
    void el.offsetHeight;
    const rafId = window.requestAnimationFrame(() => {
      el.style.transition = `opacity ${transitionTiming}`;
      handleTransitionEnd = (event: TransitionEvent) => {
        if (event.propertyName !== 'opacity') return;
        el.style.transition = '';
        el.style.opacity = '';
      };
      el.addEventListener('transitionend', handleTransitionEnd);
      el.style.opacity = '1';
    });

    isFirstRenderRef.current = false;
    return () => {
      window.cancelAnimationFrame(rafId);
      if (handleTransitionEnd) {
        el.removeEventListener('transitionend', handleTransitionEnd);
      }
    };
  }, [changeKey, elementRef, keyframePrefix, skipInitial, fadeInTiming]);

  return getLanguageFadeKeyframesSx(keyframePrefix);
};
