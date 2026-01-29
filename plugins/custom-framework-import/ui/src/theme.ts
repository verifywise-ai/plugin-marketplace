/**
 * Theme configuration for Custom Framework Import plugin
 * Matches VerifyWise design system exactly
 */

// Font sizes - matching VerifyWise v1SingleTheme
export const fontSizes = {
  small: "11px",
  medium: "13px",
  large: "16px",
};

// Color palette - matching VerifyWise v1SingleTheme
export const colors = {
  primary: "#13715B",
  primaryHover: "#0f604d",
  secondary: "#6B7280",
  secondaryHover: "#4B5563",
  success: "#059669",
  successHover: "#047857",
  warning: "#D97706",
  warningHover: "#B45309",
  error: "#DB504A",
  errorHover: "#B91C1C",
  info: "#3B82F6",
  infoHover: "#2563EB",
};

// Text colors
export const textColors = {
  primary: "#1A1919",
  secondary: "#344054",
  muted: "#475467",
  disabled: "#9CA3AF",
  theme: "#0f604d",
  error: "#DB504A",
};

// Background colors
export const bgColors = {
  default: "#ffffff",
  subtle: "#f8fafc",
  hover: "#f5f5f5",
  gradient: "linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)",
  modalHeader: "linear-gradient(180deg, #F8FAFB 0%, #F3F5F8 100%)",
  modalFooter: "linear-gradient(180deg, #F3F5F8 0%, #F8FAFB 100%)",
};

// Border colors
export const borderColors = {
  default: "#d0d5dd",
  light: "#E0E4E9",
  input: "#D0D5DD",
};

// Button sizes - matching VerifyWise v1SingleTheme
export const buttonSizes = {
  small: {
    height: 28,
    fontSize: "12px",
    padding: "6px 12px",
    minHeight: 28,
  },
  medium: {
    height: 32,
    fontSize: "13px",
    padding: "8px 16px",
    minHeight: 32,
  },
  large: {
    height: 40,
    fontSize: "14px",
    padding: "10px 20px",
    minHeight: 40,
  },
};

// Button styles - matching VerifyWise v1SingleTheme
export const buttonStyles = {
  primary: {
    contained: {
      ...buttonSizes.medium,
      backgroundColor: colors.primary,
      color: "#fff",
      boxShadow: "none",
      textTransform: "inherit" as const,
      borderRadius: "4px",
      border: "none",
      fontWeight: 500,
      transition: "all 0.2s ease",
      "&:hover": {
        backgroundColor: colors.primaryHover,
        boxShadow: "none",
      },
      "&.Mui-disabled": {
        backgroundColor: "#E5E7EB",
        color: "#9CA3AF",
      },
    },
    outlined: {
      ...buttonSizes.medium,
      backgroundColor: "transparent",
      color: colors.primary,
      border: `1px solid ${colors.primary}`,
      boxShadow: "none",
      textTransform: "inherit" as const,
      borderRadius: "4px",
      fontWeight: 500,
      transition: "all 0.2s ease",
      "&:hover": {
        backgroundColor: `${colors.primary}08`,
        borderColor: colors.primaryHover,
        boxShadow: "none",
      },
      "&.Mui-disabled": {
        borderColor: "#E5E7EB",
        color: "#9CA3AF",
      },
    },
  },
  error: {
    contained: {
      ...buttonSizes.medium,
      backgroundColor: colors.error,
      color: "#fff",
      boxShadow: "none",
      textTransform: "inherit" as const,
      borderRadius: "4px",
      border: "none",
      fontWeight: 500,
      transition: "all 0.2s ease",
      "&:hover": {
        backgroundColor: colors.errorHover,
        boxShadow: "none",
      },
    },
  },
};

// Table styles - matching VerifyWise tableStyles.primary
export const tableStyles = {
  frame: {
    border: `1px solid ${borderColors.default}`,
    borderRadius: "4px",
    "& td, & th": {
      border: 0,
    },
  },
  header: {
    row: {
      textTransform: "uppercase" as const,
      borderBottom: `1px solid ${borderColors.default}`,
      background: bgColors.gradient,
    },
    cell: {
      color: textColors.muted,
      fontSize: fontSizes.medium,
      fontWeight: 600,
      padding: "12px 16px",
      whiteSpace: "nowrap" as const,
    },
  },
  body: {
    row: {
      textTransform: "none" as const,
      borderBottom: `1px solid ${borderColors.default}`,
      backgroundColor: bgColors.default,
      transition: "background-color 0.2s ease",
      "&:last-child": {
        borderBottom: "none",
      },
      "&:hover": {
        backgroundColor: bgColors.hover,
        cursor: "pointer",
      },
    },
    cell: {
      fontSize: fontSizes.medium,
      padding: "12px 16px",
      color: textColors.secondary,
    },
  },
};

// Card styles
export const cardStyles = {
  default: {
    border: `1px solid ${borderColors.default}`,
    borderRadius: "4px",
    backgroundColor: bgColors.default,
    padding: "16px",
  },
  gradient: {
    border: `1px solid ${borderColors.default}`,
    borderRadius: "4px",
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    padding: "16px",
  },
};

// Alert styles - matching VerifyWise alertStyles
export const alertStyles = {
  success: {
    color: "#079455",
    backgroundColor: "#ecfdf3",
    borderColor: "#12715B",
  },
  error: {
    color: "#f04438",
    backgroundColor: "#f9eced",
    borderColor: "#f04438",
  },
  warning: {
    color: "#DC6803",
    backgroundColor: "#fffcf5",
    borderColor: "#fec84b",
  },
  info: {
    color: "#0288d1",
    backgroundColor: "#e5f6fd",
    borderColor: "#d0d5dd",
  },
};

// Status options for frameworks
export const statusOptions = [
  "Not started",
  "Draft",
  "In progress",
  "Awaiting review",
  "Awaiting approval",
  "Implemented",
  "Audited",
  "Needs rework",
] as const;

export type StatusType = (typeof statusOptions)[number];

// Status colors - matching VerifyWise dashboard colors
export const statusColors: Record<StatusType, { color: string; bg: string }> = {
  "Not started": { color: "#9CA3AF", bg: "#f1f5f9" },
  Draft: { color: "#D97706", bg: "#fffbeb" },
  "In progress": { color: "#3b82f6", bg: "#eff6ff" },
  "Awaiting review": { color: "#3B82F6", bg: "#EFF6FF" },
  "Awaiting approval": { color: "#8B5CF6", bg: "#f5f3ff" },
  Implemented: { color: "#13715B", bg: "#ecfdf5" },
  Audited: { color: "#06b6d4", bg: "#ecfeff" },
  "Needs rework": { color: "#EA580C", bg: "#fef2f2" },
};

// Chip/Badge styles
export const chipStyles = {
  default: {
    fontSize: fontSizes.small,
    fontWeight: 500,
    borderRadius: "4px",
    padding: "2px 8px",
    height: "auto",
  },
  organizational: {
    backgroundColor: `${colors.primary}15`,
    color: colors.primary,
    border: `1px solid ${colors.primary}30`,
  },
  project: {
    backgroundColor: "#f3f4f6",
    color: textColors.secondary,
    border: "1px solid #e5e7eb",
  },
};

// Empty state styles
export const emptyStateStyles = {
  container: {
    textAlign: "center" as const,
    padding: "48px 24px",
  },
  icon: {
    color: textColors.muted,
    marginBottom: "16px",
  },
  title: {
    fontSize: fontSizes.large,
    fontWeight: 600,
    color: textColors.primary,
    marginBottom: "8px",
  },
  description: {
    fontSize: fontSizes.medium,
    color: textColors.muted,
    marginBottom: "24px",
  },
};

// Legacy theme object for backward compatibility
export const theme = {
  colors: {
    primary: {
      main: colors.primary,
      light: "#1a8a70",
      dark: colors.primaryHover,
      contrastText: "#FFFFFF",
      bg: "#e6f4f0",
    },
    success: {
      main: colors.success,
      light: "#34d399",
      dark: colors.successHover,
      bg: "#ecfdf5",
    },
    warning: {
      main: colors.warning,
      light: "#fbbf24",
      dark: colors.warningHover,
      bg: "#fffbeb",
    },
    error: {
      main: colors.error,
      light: "#f87171",
      dark: colors.errorHover,
      bg: "#fef2f2",
    },
    info: {
      main: colors.info,
      light: "#60a5fa",
      dark: colors.infoHover,
      bg: "#eff6ff",
    },
    text: textColors,
    background: bgColors,
    border: borderColors,
  },
  typography: {
    fontSizes,
  },
  buttons: buttonStyles,
  tables: tableStyles,
  cards: cardStyles,
  alerts: alertStyles,
  chips: chipStyles,
  emptyState: emptyStateStyles,
  status: statusColors,
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  },
  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  },
};
