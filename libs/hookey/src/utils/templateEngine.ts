/**
 * Template Engine for replacing variables in strings
 * Supports simple variables: {{name}}
 * Supports nested variables: {{user.email}}, {{book.author.name}}
 */

/**
 * Get a nested value from an object using dot notation
 * @param obj - The object to extract value from
 * @param path - Dot-separated path (e.g., 'user.email')
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
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
export function replaceTemplateVariables(template: string, data: Record<string, any>): string {
  if (!template || typeof template !== 'string') {
    return template;
  }

  if (!data || typeof data !== 'object') {
    return template;
  }

  // Match {{variable}} or {{nested.variable}} patterns
  const variablePattern = /\{\{([^}]+)\}\}/g;

  return template.replace(variablePattern, (match, variable) => {
    // Trim whitespace from variable name
    const trimmedVariable = variable.trim();

    // Get the value using dot notation
    const value = getNestedValue(data, trimmedVariable);

    // If value is undefined or null, return the original placeholder
    if (value === undefined || value === null) {
      return match;
    }

    // Convert value to string
    // Handle arrays and objects by stringifying them
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  });
}
