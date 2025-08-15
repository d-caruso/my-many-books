/**
 * Button component styles - can be adapted for web (CSS) or mobile (StyleSheet)
 */

export const buttonStyles = {
  // Base styles that work across platforms
  base: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },

  // Size variants
  sizes: {
    xs: { paddingHorizontal: 8, paddingVertical: 6, minHeight: 32 },
    sm: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36 },
    md: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 },
    lg: { paddingHorizontal: 24, paddingVertical: 16, minHeight: 48 },
    xl: { paddingHorizontal: 32, paddingVertical: 20, minHeight: 52 },
  },

  // Color variants (platform-specific implementations will override)
  variants: {
    primary: {
      backgroundColor: '#3B82F6',
      color: '#FFFFFF',
    },
    secondary: {
      backgroundColor: '#F3F4F6',
      color: '#374151',
      borderWidth: 1,
      borderColor: '#D1D5DB',
    },
    danger: {
      backgroundColor: '#EF4444',
      color: '#FFFFFF',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#6B7280',
    },
  },

  // State styles
  states: {
    disabled: {
      opacity: 0.5,
    },
    loading: {
      opacity: 0.8,
    },
  },
};