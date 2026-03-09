/**
 * Template Engine for replacing variables in strings
 * Supports simple variables: {{name}}
 * Supports nested variables: {{user.email}}, {{book.author.name}}
 */

const TEMPLATE_VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;
const TEMPLATE_ARRAY_SEPARATOR = ', ';

type TemplatePrimitive = string | number | boolean | null;
export type TemplateValue = TemplatePrimitive | TemplateData | TemplateValue[];

export interface TemplateData {
  [key: string]: TemplateValue | undefined;
}

function isTemplateData(value: TemplateValue | undefined): value is TemplateData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toTemplateData(value: unknown): TemplateData {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as TemplateData;
  }

  return {};
}

/**
 * Get a nested value from an object using dot notation
 * @param obj - The object to extract value from
 * @param path - Dot-separated path (e.g., 'user.email')
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(
  obj: TemplateData | null | undefined,
  path: string
): TemplateValue | undefined {
  const parts = path.split('.');
  let current: TemplateValue | undefined = obj ?? undefined;

  for (const part of parts) {
    if (!isTemplateData(current)) {
      return undefined;
    }

    if (!(part in current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

function formatTemplateValue(value: TemplateValue): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatTemplateValue(item)).join(TEMPLATE_ARRAY_SEPARATOR);
  }

  if (isTemplateData(value)) {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Replace template variables in a string with actual values
 * @param template - String containing {{variable}} placeholders
 * @param data - Object containing values for replacement
 * @returns String with variables replaced
 *
 * @example
 * replaceTemplateVariables('Hello {{name}}!', { name: 'World' })
 * // Returns: 'Hello World!'
 *
 * @example
 * replaceTemplateVariables('Email: {{user.email}}', { user: { email: 'test@example.com' } })
 * // Returns: 'Email: test@example.com'
 */
export function replaceTemplateVariables(template: string, data: Record<string, unknown>): string {
  if (!template || typeof template !== 'string') {
    return template;
  }

  const templateData = toTemplateData(data);
  let replaced = template;

  for (const match of template.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const placeholder = match[0];
    const variable = match[1];

    if (placeholder === undefined || variable === undefined) {
      continue;
    }

    const trimmedVariable = variable.trim();
    const value = getNestedValue(templateData, trimmedVariable);
    if (value === undefined || value === null) {
      continue;
    }

    replaced = replaced.replace(placeholder, formatTemplateValue(value));
  }

  return replaced;
}
