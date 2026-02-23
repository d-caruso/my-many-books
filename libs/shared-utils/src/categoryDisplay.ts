type CategoryLike = {
  name: string;
  translationKey?: string | null;
};

type Translator = (key: string, options?: Record<string, unknown>) => string;

const CATEGORY_NAMESPACE_PREFIX = 'categories.';

const toI18nLookupKey = (translationKey: string): string => {
  if (translationKey.startsWith(CATEGORY_NAMESPACE_PREFIX)) {
    return `categories:${translationKey.slice(CATEGORY_NAMESPACE_PREFIX.length)}`;
  }
  return translationKey;
};

export function getCategoryDisplayName(category: CategoryLike, t: Translator): string {
  if (!category.translationKey) {
    return category.name;
  }

  const translated = t(toI18nLookupKey(category.translationKey), {
    defaultValue: category.name,
  });

  if (!translated || translated === category.translationKey) {
    return category.name;
  }

  return translated;
}

