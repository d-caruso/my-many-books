import { replaceTemplateVariables, getNestedValue } from '../templateEngine';

describe('getNestedValue', () => {
  it('gets top-level property', () => {
    const obj = { name: 'John' };
    expect(getNestedValue(obj, 'name')).toBe('John');
  });

  it('gets nested property', () => {
    const obj = { user: { email: 'test@example.com' } };
    expect(getNestedValue(obj, 'user.email')).toBe('test@example.com');
  });

  it('gets deeply nested property', () => {
    const obj = { book: { author: { name: 'Jane Doe' } } };
    expect(getNestedValue(obj, 'book.author.name')).toBe('Jane Doe');
  });

  it('returns undefined for non-existent property', () => {
    const obj = { name: 'John' };
    expect(getNestedValue(obj, 'age')).toBeUndefined();
  });

  it('returns undefined for non-existent nested property', () => {
    const obj = { user: { name: 'John' } };
    expect(getNestedValue(obj, 'user.email')).toBeUndefined();
  });

  it('returns undefined for null object', () => {
    expect(getNestedValue(null, 'name')).toBeUndefined();
  });

  it('returns undefined for undefined object', () => {
    expect(getNestedValue(undefined, 'name')).toBeUndefined();
  });

  it('handles null in middle of path', () => {
    const obj = { user: null };
    expect(getNestedValue(obj, 'user.email')).toBeUndefined();
  });

  it('handles arrays', () => {
    const obj = { items: ['a', 'b', 'c'] };
    expect(getNestedValue(obj, 'items')).toEqual(['a', 'b', 'c']);
  });
});

describe('replaceTemplateVariables', () => {
  it('replaces simple variable', () => {
    const template = 'Hello {{name}}!';
    const data = { name: 'World' };
    expect(replaceTemplateVariables(template, data)).toBe('Hello World!');
  });

  it('replaces multiple variables', () => {
    const template = '{{greeting}} {{name}}!';
    const data = { greeting: 'Hello', name: 'World' };
    expect(replaceTemplateVariables(template, data)).toBe('Hello World!');
  });

  it('replaces nested variable', () => {
    const template = 'Email: {{user.email}}';
    const data = { user: { email: 'test@example.com' } };
    expect(replaceTemplateVariables(template, data)).toBe('Email: test@example.com');
  });

  it('replaces deeply nested variable', () => {
    const template = 'Author: {{book.author.name}}';
    const data = { book: { author: { name: 'Jane Doe' } } };
    expect(replaceTemplateVariables(template, data)).toBe('Author: Jane Doe');
  });

  it('handles whitespace in variable names', () => {
    const template = 'Hello {{ name }}!';
    const data = { name: 'World' };
    expect(replaceTemplateVariables(template, data)).toBe('Hello World!');
  });

  it('keeps placeholder for undefined variable', () => {
    const template = 'Hello {{name}}!';
    const data = {};
    expect(replaceTemplateVariables(template, data)).toBe('Hello {{name}}!');
  });

  it('keeps placeholder for null variable', () => {
    const template = 'Hello {{name}}!';
    const data = { name: null };
    expect(replaceTemplateVariables(template, data)).toBe('Hello {{name}}!');
  });

  it('keeps placeholder for non-existent nested property', () => {
    const template = 'Email: {{user.email}}';
    const data = { user: {} };
    expect(replaceTemplateVariables(template, data)).toBe('Email: {{user.email}}');
  });

  it('handles number values', () => {
    const template = 'Count: {{count}}';
    const data = { count: 42 };
    expect(replaceTemplateVariables(template, data)).toBe('Count: 42');
  });

  it('handles boolean values', () => {
    const template = 'Active: {{isActive}}';
    const data = { isActive: true };
    expect(replaceTemplateVariables(template, data)).toBe('Active: true');
  });

  it('handles array values by joining', () => {
    const template = 'Tags: {{tags}}';
    const data = { tags: ['nodejs', 'typescript', 'hooks'] };
    expect(replaceTemplateVariables(template, data)).toBe('Tags: nodejs, typescript, hooks');
  });

  it('handles object values by stringifying', () => {
    const template = 'Data: {{metadata}}';
    const data = { metadata: { key: 'value', count: 5 } };
    expect(replaceTemplateVariables(template, data)).toBe('Data: {"key":"value","count":5}');
  });

  it('handles empty string template', () => {
    expect(replaceTemplateVariables('', { name: 'Test' })).toBe('');
  });

  it('handles template with no variables', () => {
    const template = 'Hello World!';
    expect(replaceTemplateVariables(template, { name: 'Test' })).toBe('Hello World!');
  });

  it('handles empty data object', () => {
    const template = 'Hello {{name}}!';
    expect(replaceTemplateVariables(template, {})).toBe('Hello {{name}}!');
  });

  it('handles complex template with multiple variable types', () => {
    const template = 'User {{user.name}} ({{user.id}}) created book "{{book.title}}" with {{book.pageCount}} pages';
    const data = {
      user: { name: 'John Doe', id: 123 },
      book: { title: '1984', pageCount: 328 }
    };
    expect(replaceTemplateVariables(template, data))
      .toBe('User John Doe (123) created book "1984" with 328 pages');
  });

  it('handles zero value (should not be treated as falsy)', () => {
    const template = 'Count: {{count}}';
    const data = { count: 0 };
    expect(replaceTemplateVariables(template, data)).toBe('Count: 0');
  });

  it('handles false value (should not be treated as falsy)', () => {
    const template = 'Active: {{isActive}}';
    const data = { isActive: false };
    expect(replaceTemplateVariables(template, data)).toBe('Active: false');
  });

  it('returns original template if template is not a string', () => {
    expect(replaceTemplateVariables(null as any, { name: 'Test' })).toBe(null);
    expect(replaceTemplateVariables(undefined as any, { name: 'Test' })).toBe(undefined);
    expect(replaceTemplateVariables(123 as any, { name: 'Test' })).toBe(123);
  });

  it('returns template unchanged if data is not an object', () => {
    const template = 'Hello {{name}}!';
    expect(replaceTemplateVariables(template, null as any)).toBe(template);
    expect(replaceTemplateVariables(template, undefined as any)).toBe(template);
    expect(replaceTemplateVariables(template, 'invalid' as any)).toBe(template);
  });
});
