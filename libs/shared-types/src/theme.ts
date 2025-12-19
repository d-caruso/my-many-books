/**
 * Theme-related type definitions
 */

import { z } from 'zod';

export const ThemeNameValues = [
  'default',
  'dark',
  'bookish',
  'forest',
  'ocean',
  'sunset',
  'lavender',
] as const;

export const ThemeNameSchema = z.enum(ThemeNameValues);
export type ThemeName = z.infer<typeof ThemeNameSchema>;

export const ThemeSchema = z.object({
  name: ThemeNameSchema,
  displayName: z.string().min(1),
  colors: z.object({
    primary: z.string().min(1),
    secondary: z.string().min(1),
    accent: z.string().min(1),
    surface: z.string().min(1),
    background: z.string().min(1),
    text: z.object({
      primary: z.string().min(1),
      secondary: z.string().min(1),
      muted: z.string().min(1),
    }),
    semantic: z.object({
      success: z.string().min(1),
      warning: z.string().min(1),
      error: z.string().min(1),
      info: z.string().min(1),
    }),
  }),
});

export type Theme = z.infer<typeof ThemeSchema>;
