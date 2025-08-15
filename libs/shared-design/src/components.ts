/**
 * Shared component style configurations - platform agnostic
 */

import { designTokens } from './tokens';

export const componentStyles = {
  // Button styles
  button: {
    base: {
      borderRadius: designTokens.borderRadius.md,
      fontWeight: designTokens.typography.fontWeight.medium,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    sizes: {
      xs: {
        paddingHorizontal: designTokens.spacing[2],
        paddingVertical: designTokens.spacing[1],
        fontSize: designTokens.typography.fontSize.xs,
        minHeight: 32,
      },
      sm: {
        paddingHorizontal: designTokens.spacing[3],
        paddingVertical: designTokens.spacing[2],
        fontSize: designTokens.typography.fontSize.sm,
        minHeight: 36,
      },
      md: {
        paddingHorizontal: designTokens.spacing[4],
        paddingVertical: designTokens.spacing[3],
        fontSize: designTokens.typography.fontSize.base,
        minHeight: 44,
      },
      lg: {
        paddingHorizontal: designTokens.spacing[6],
        paddingVertical: designTokens.spacing[4],
        fontSize: designTokens.typography.fontSize.lg,
        minHeight: 48,
      },
    },

    variants: {
      primary: {
        backgroundColor: designTokens.colors.primary[500],
        color: '#FFFFFF',
        hover: {
          backgroundColor: designTokens.colors.primary[600],
        },
        active: {
          backgroundColor: designTokens.colors.primary[700],
        },
        disabled: {
          backgroundColor: designTokens.colors.neutral[300],
          color: designTokens.colors.neutral[500],
        }
      },
      secondary: {
        backgroundColor: designTokens.colors.neutral[100],
        color: designTokens.colors.neutral[700],
        borderWidth: 1,
        borderColor: designTokens.colors.neutral[300],
        hover: {
          backgroundColor: designTokens.colors.neutral[200],
        },
        active: {
          backgroundColor: designTokens.colors.neutral[300],
        }
      },
      danger: {
        backgroundColor: designTokens.colors.semantic.error,
        color: '#FFFFFF',
        hover: {
          backgroundColor: '#DC2626',
        },
        active: {
          backgroundColor: '#B91C1C',
        }
      },
      ghost: {
        backgroundColor: 'transparent',
        color: designTokens.colors.neutral[600],
        hover: {
          backgroundColor: designTokens.colors.neutral[100],
          color: designTokens.colors.neutral[700],
        }
      }
    }
  },

  // Input styles
  input: {
    base: {
      borderRadius: designTokens.borderRadius.md,
      borderWidth: 1,
      borderColor: designTokens.colors.neutral[300],
      padding: designTokens.spacing[3],
      fontSize: designTokens.typography.fontSize.base,
      backgroundColor: '#FFFFFF',
      color: designTokens.colors.neutral[900],
      transition: 'all 0.2s ease',
    },
    states: {
      focus: {
        borderColor: designTokens.colors.primary[500],
        outline: 'none',
        boxShadow: `0 0 0 3px ${designTokens.colors.primary[100]}`,
      },
      error: {
        borderColor: designTokens.colors.semantic.error,
        boxShadow: `0 0 0 3px #FEE2E2`,
      },
      disabled: {
        backgroundColor: designTokens.colors.neutral[100],
        color: designTokens.colors.neutral[500],
        cursor: 'not-allowed',
      }
    }
  },

  // Card styles
  card: {
    base: {
      backgroundColor: '#FFFFFF',
      borderRadius: designTokens.borderRadius.lg,
      boxShadow: designTokens.shadows.base,
      padding: designTokens.spacing[4],
      border: `1px solid ${designTokens.colors.neutral[200]}`,
    },
    variants: {
      elevated: {
        boxShadow: designTokens.shadows.lg,
      },
      outlined: {
        boxShadow: 'none',
        borderColor: designTokens.colors.neutral[300],
      },
      flat: {
        boxShadow: 'none',
        border: 'none',
      }
    }
  },

  // Badge/Chip styles
  badge: {
    base: {
      borderRadius: designTokens.borderRadius.full,
      paddingHorizontal: designTokens.spacing[2],
      paddingVertical: designTokens.spacing[1],
      fontSize: designTokens.typography.fontSize.xs,
      fontWeight: designTokens.typography.fontWeight.medium,
      display: 'inline-flex',
      alignItems: 'center',
    },
    variants: {
      'in-progress': {
        backgroundColor: designTokens.colors.status['in-progress'],
        color: '#FFFFFF',
      },
      'paused': {
        backgroundColor: designTokens.colors.status['paused'],
        color: '#FFFFFF',
      },
      'finished': {
        backgroundColor: designTokens.colors.status['finished'],
        color: '#FFFFFF',
      },
      'default': {
        backgroundColor: designTokens.colors.neutral[200],
        color: designTokens.colors.neutral[700],
      }
    }
  }
};