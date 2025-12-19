import i18n, { initializeI18n, changeLanguage, getCurrentLanguage } from '../config';
import {
  DEFAULT_LANGUAGE,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  TranslationNamespace,
} from '../types';

import enCommon from '../locales/en/common.json';
import enValidation from '../locales/en/validation.json';
import enErrors from '../locales/en/errors.json';
import enBooks from '../locales/en/books.json';
import enAdmin from '../locales/en/pages.json';
import enHooks from '../locales/en/hooks.json';
import enDialogs from '../locales/en/dialogs.json';

import itCommon from '../locales/it/common.json';
import itValidation from '../locales/it/validation.json';
import itErrors from '../locales/it/errors.json';
import itBooks from '../locales/it/books.json';
import itAdmin from '../locales/it/pages.json';
import itHooks from '../locales/it/hooks.json';
import itDialogs from '../locales/it/dialogs.json';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const flattenKeys = (value: JsonValue, prefix: string = ''): string[] => {
  if (value === null) return [prefix].filter(Boolean);
  if (Array.isArray(value)) return [prefix].filter(Boolean);
  if (typeof value !== 'object') return [prefix].filter(Boolean);

  const objectValue = value as JsonObject;
  return Object.entries(objectValue).flatMap(([key, nested]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return flattenKeys(nested, nextPrefix);
  });
};

describe('shared-i18n integration', () => {
  test('switching languages updates current language', async () => {
    await initializeI18n(DEFAULT_LANGUAGE);
    expect(getCurrentLanguage()).toBe('en');

    await changeLanguage('it');
    expect(getCurrentLanguage()).toBe('it');
  });

  test('SUPPORTED_LANGUAGES includes all SupportedLanguage enum values', () => {
    const supportedCodes = SUPPORTED_LANGUAGES.map((lang) => lang.code).sort();
    const enumCodes = Object.values(SupportedLanguage).sort();
    expect(supportedCodes).toEqual(enumCodes);
    expect(supportedCodes).toContain(DEFAULT_LANGUAGE);
  });

  test('loaded namespaces have no language-only keys (and core namespaces have full parity)', () => {
    const resources = [
      [TranslationNamespace.COMMON, enCommon, itCommon],
      [TranslationNamespace.VALIDATION, enValidation, itValidation],
      [TranslationNamespace.ERRORS, enErrors, itErrors],
      [TranslationNamespace.BOOKS, enBooks, itBooks],
      [TranslationNamespace.ADMIN, enAdmin, itAdmin],
      [TranslationNamespace.HOOKS, enHooks, itHooks],
      [TranslationNamespace.DIALOGS, enDialogs, itDialogs],
    ] as const;

    for (const [namespace, en, it] of resources) {
      const enKeys = flattenKeys(en as unknown as JsonValue).sort();
      const itKeys = flattenKeys(it as unknown as JsonValue).sort();
      const enSet = new Set(enKeys);
      const itOnly = itKeys.filter((key) => !enSet.has(key));
      expect(itOnly).toEqual([]);

      const missingInIt = enKeys.filter((key) => !itKeys.includes(key));
      const allowMissing = namespace === TranslationNamespace.HOOKS;
      if (!allowMissing) {
        expect(missingInIt).toEqual([]);
      }

      expect(enKeys.length).toBeGreaterThan(0);
      expect(namespace).toBeDefined();
    }
  });

  test('missing keys in it fall back to English', async () => {
    await initializeI18n(SupportedLanguage.IT);
    const english = i18n.t('list.title', { ns: TranslationNamespace.HOOKS, lng: SupportedLanguage.EN });
    const italianOrFallback = i18n.t('list.title', { ns: TranslationNamespace.HOOKS });

    expect(english).not.toContain('list.title');
    expect(italianOrFallback).toBe(english);
  });
});
