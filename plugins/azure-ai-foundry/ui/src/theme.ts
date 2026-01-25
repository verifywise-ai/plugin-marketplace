/**
 * VerifyWise Plugin Theme
 *
 * Shared design tokens and styles for plugin UI consistency
 * This matches the main VerifyWise application theme
 */

// Color palette
export const colors = {
  primary: "#13715B",
  primaryHover: "#0f604d",
  primaryLight: "rgba(19, 113, 91, 0.08)",

  secondary: "#6B7280",
  secondaryHover: "#4B5563",

  success: "#059669",
  successHover: "#047857",
  successLight: "rgba(5, 150, 105, 0.1)",

  warning: "#D97706",
  warningHover: "#B45309",
  warningLight: "rgba(217, 119, 6, 0.1)",

  error: "#DB504A",
  errorHover: "#B91C1C",
  errorLight: "rgba(219, 80, 74, 0.1)",

  info: "#3B82F6",
  infoHover: "#2563EB",
  infoLight: "rgba(59, 130, 246, 0.1)",

  // Text colors
  textPrimary: "#1A1919",
  textSecondary: "#344054",
  textTertiary: "#667085",
  textDisabled: "#9CA3AF",

  // Background colors
  background: "#ffffff",
  backgroundSecondary: "#f9fafb",
  backgroundHover: "#f5f5f5",

  // Border colors
  border: "#d0d5dd",
  borderLight: "#e5e7eb",

  // Status colors
  white: "#ffffff",
  disabled: "#E5E7EB",
};

// Typography
export const typography = {
  fontFamily: "'Geist', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif",

  sizes: {
    xs: "11px",
    sm: "12px",
    md: "13px",
    lg: "14px",
    xl: "16px",
    xxl: "18px",
  },

  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px",
};

// Border radius
export const borderRadius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  full: "9999px",
};

// Shadows
export const shadows = {
  none: "none",
  sm: "0px 1px 2px rgba(16, 24, 40, 0.05)",
  md: "0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)",
  lg: "0px 4px 24px -4px rgba(16, 24, 40, 0.08), 0px 3px 3px -3px rgba(16, 24, 40, 0.03)",
};

// Button styles
export const buttonStyles = {
  // Base styles for all buttons
  base: {
    borderRadius: borderRadius.sm,
    fontWeight: typography.weights.medium,
    fontSize: typography.sizes.md,
    textTransform: "none" as const,
    boxShadow: shadows.none,
    transition: "all 0.2s ease",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  // Size variants
  sizes: {
    small: {
      height: "28px",
      padding: "6px 12px",
      fontSize: typography.sizes.sm,
    },
    medium: {
      height: "34px",
      padding: "8px 16px",
      fontSize: typography.sizes.md,
    },
    large: {
      height: "40px",
      padding: "10px 20px",
      fontSize: typography.sizes.lg,
    },
  },

  // Primary button
  primary: {
    contained: {
      backgroundColor: colors.primary,
      color: colors.white,
      border: "none",
      "&:hover": {
        backgroundColor: colors.primaryHover,
      },
      "&:disabled": {
        backgroundColor: colors.disabled,
        color: colors.textDisabled,
        cursor: "not-allowed",
      },
    },
    outlined: {
      backgroundColor: "transparent",
      color: colors.primary,
      border: `1px solid ${colors.primary}`,
      "&:hover": {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primaryHover,
      },
      "&:disabled": {
        borderColor: colors.disabled,
        color: colors.textDisabled,
        cursor: "not-allowed",
      },
    },
    text: {
      backgroundColor: "transparent",
      color: colors.primary,
      border: "none",
      "&:hover": {
        backgroundColor: colors.primaryLight,
      },
      "&:disabled": {
        color: colors.textDisabled,
        cursor: "not-allowed",
      },
    },
  },

  // Secondary button
  secondary: {
    contained: {
      backgroundColor: colors.secondary,
      color: colors.white,
      border: "none",
      "&:hover": {
        backgroundColor: colors.secondaryHover,
      },
    },
    outlined: {
      backgroundColor: "transparent",
      color: colors.secondary,
      border: `1px solid ${colors.border}`,
      "&:hover": {
        backgroundColor: colors.backgroundHover,
        borderColor: colors.secondary,
      },
    },
  },

  // Error/destructive button
  error: {
    contained: {
      backgroundColor: colors.error,
      color: colors.white,
      border: "none",
      "&:hover": {
        backgroundColor: colors.errorHover,
      },
    },
    outlined: {
      backgroundColor: "transparent",
      color: colors.error,
      border: `1px solid ${colors.error}`,
      "&:hover": {
        backgroundColor: colors.errorLight,
        borderColor: colors.errorHover,
      },
    },
  },
};

// Input/form styles
export const inputStyles = {
  base: {
    borderRadius: borderRadius.sm,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    fontSize: typography.sizes.md,
    padding: "8px 12px",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: colors.primary,
    },
    "&:focus": {
      borderColor: colors.primary,
      outline: "none",
      boxShadow: `0 0 0 2px ${colors.primaryLight}`,
    },
    "&:disabled": {
      backgroundColor: colors.backgroundSecondary,
      color: colors.textDisabled,
      cursor: "not-allowed",
    },
  },

  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  helperText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },

  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
};

// Card styles
export const cardStyles = {
  base: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
    padding: spacing.lg,
  },

  elevated: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    boxShadow: shadows.lg,
    padding: spacing.lg,
  },
};

// Table styles
export const tableStyles = {
  header: {
    backgroundColor: colors.backgroundSecondary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    textTransform: "uppercase" as const,
    padding: "12px 16px",
  },

  cell: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    padding: "12px 16px",
    borderBottom: `1px solid ${colors.borderLight}`,
  },

  row: {
    "&:hover": {
      backgroundColor: colors.backgroundHover,
    },
  },
};

// Alert styles
export const alertStyles = {
  success: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    color: colors.success,
  },
  warning: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
    color: colors.warning,
  },
  error: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
    color: colors.error,
  },
  info: {
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
    color: colors.info,
  },
};

// Chip/badge styles
export const chipStyles = {
  base: {
    borderRadius: borderRadius.sm,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    padding: "2px 8px",
    display: "inline-flex",
    alignItems: "center",
  },

  success: {
    backgroundColor: colors.successLight,
    color: "#16a34a",
  },
  warning: {
    backgroundColor: colors.warningLight,
    color: "#ca8a04",
  },
  error: {
    backgroundColor: colors.errorLight,
    color: colors.error,
  },
  info: {
    backgroundColor: colors.infoLight,
    color: colors.info,
  },
  neutral: {
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    color: "#4b5563",
  },
};

// Modal/Dialog styles
export const modalStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1300,
  },

  content: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    maxWidth: "600px",
    width: "90%",
    maxHeight: "90vh",
    overflow: "auto",
  },

  header: {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.borderLight}`,
  },

  body: {
    padding: spacing.lg,
  },

  footer: {
    padding: spacing.lg,
    borderTop: `1px solid ${colors.borderLight}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },

  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    margin: 0,
  },
};

// Export all as default theme object
const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  buttonStyles,
  inputStyles,
  cardStyles,
  tableStyles,
  alertStyles,
  chipStyles,
  modalStyles,
};

export default theme;
