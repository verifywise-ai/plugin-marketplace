/**
 * Custom Framework Cards
 *
 * Renders custom framework cards in the Add Framework modal.
 * This component is injected via PluginSlot into the core app's framework selection UI.
 * Uses VerifyWise design system for consistency with the core app.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Chip,
  Stack,
} from "@mui/material";
import { Check as CheckIcon, FileJson } from "lucide-react";
import {
  colors,
  textColors,
  fontSizes,
  buttonStyles,
  borderColors,
} from "./theme";

interface CustomFramework {
  id: number;
  framework_id: number;
  name: string;
  description: string;
  hierarchy_type: string;
  level_1_name: string;
  level_2_name: string;
  level_3_name?: string;
  is_organizational: boolean;
  created_at: string;
  level1_count?: number;
  level2_count?: number;
  level3_count?: number;
}

interface ProjectFramework {
  id: number;
  framework_id: number;
  project_framework_id?: number;
}

interface Project {
  id: number;
  project_title: string;
  is_organizational: boolean;
  framework?: ProjectFramework[];
}

interface CustomFrameworkCardsProps {
  project: Project;
  isLoading: boolean;
  onFrameworkAdded?: () => void;
  onFrameworkRemoved?: (frameworkId: number) => void;
  setAlert?: (alert: any) => void;
  setIsLoading?: (loading: boolean) => void;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
  };
}

// Card styles matching the core app's AddNewFramework exactly
const frameworkCardStyle = {
  border: `1.5px solid ${colors.primary}`,
  borderRadius: "8px",
  background: "#e3f5e6",
  padding: "20px",
  transition: "background 0.2s",
  marginBottom: "24px",
};

const frameworkCardTitleStyle = {
  fontWeight: 500,
  color: "#232B3A",
  fontSize: fontSizes.large,
};

const frameworkCardDescriptionStyle = {
  color: "#6B7280",
  fontSize: "14px",
  textAlign: "left" as const,
  marginBottom: "8px",
  lineHeight: 1.5,
};

export const CustomFrameworkCards: React.FC<CustomFrameworkCardsProps> = ({
  project,
  isLoading: externalLoading,
  onFrameworkAdded,
  onFrameworkRemoved,
  setAlert,
  setIsLoading: setExternalLoading,
  apiServices,
}) => {
  const [frameworks, setFrameworks] = useState<CustomFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const api = apiServices || {
    get: async (url: string) => {
      const response = await fetch(`/api${url}`);
      return { data: await response.json() };
    },
    post: async (url: string, body?: any) => {
      const response = await fetch(`/api${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { data: await response.json(), status: response.status };
    },
  };

  const loadFrameworks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(
        "/plugins/custom-framework-import/frameworks"
      );
      const data = response.data.data || response.data;
      // Filter frameworks based on project type (organizational vs project-level)
      const filtered = (Array.isArray(data) ? data : []).filter(
        (fw: CustomFramework) => fw.is_organizational === project.is_organizational
      );
      setFrameworks(filtered);
    } catch (err) {
      console.error("Failed to load custom frameworks:", err);
    } finally {
      setLoading(false);
    }
  }, [project.is_organizational]);

  useEffect(() => {
    loadFrameworks();
  }, [loadFrameworks]);

  const isFrameworkAdded = (fw: CustomFramework): boolean => {
    return (
      project.framework?.some(
        (pf) => Number(pf.framework_id) === fw.framework_id
      ) || false
    );
  };

  const handleAddFramework = async (fw: CustomFramework) => {
    setActionLoading(fw.id);
    if (setExternalLoading) setExternalLoading(true);

    try {
      const response = await api.post(
        "/plugins/custom-framework-import/add-to-project",
        {
          frameworkId: fw.framework_id,
          projectId: project.id,
        }
      );

      if (response.status === 200 || response.status === 201) {
        if (setAlert) {
          setAlert({
            variant: "success",
            body: `Framework "${fw.name}" added successfully`,
            isToast: true,
            visible: true,
          });
        }
        if (onFrameworkAdded) onFrameworkAdded();
      } else {
        if (setAlert) {
          setAlert({
            variant: "error",
            body: "Failed to add framework. Please try again.",
            isToast: true,
            visible: true,
          });
        }
      }
    } catch (err) {
      console.error("Error adding custom framework:", err);
      if (setAlert) {
        setAlert({
          variant: "error",
          body: "An unexpected error occurred. Please try again.",
          isToast: true,
          visible: true,
        });
      }
    } finally {
      setActionLoading(null);
      if (setExternalLoading) setExternalLoading(false);
    }
  };

  const handleRemoveFramework = async (fw: CustomFramework) => {
    setActionLoading(fw.id);
    if (setExternalLoading) setExternalLoading(true);

    try {
      const response = await api.post(
        "/plugins/custom-framework-import/remove-from-project",
        {
          frameworkId: fw.framework_id,
          projectId: project.id,
        }
      );

      if (response.status === 200) {
        if (setAlert) {
          setAlert({
            variant: "success",
            body: `Framework "${fw.name}" removed successfully`,
            isToast: true,
            visible: true,
          });
        }
        if (onFrameworkRemoved) onFrameworkRemoved(fw.framework_id);
      } else {
        if (setAlert) {
          setAlert({
            variant: "error",
            body: "Failed to remove framework. Please try again.",
            isToast: true,
            visible: true,
          });
        }
      }
    } catch (err) {
      console.error("Error removing custom framework:", err);
      if (setAlert) {
        setAlert({
          variant: "error",
          body: "An unexpected error occurred. Please try again.",
          isToast: true,
          visible: true,
        });
      }
    } finally {
      setActionLoading(null);
      if (setExternalLoading) setExternalLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} sx={{ color: colors.primary }} />
      </Box>
    );
  }

  if (frameworks.length === 0) {
    return null; // Don't show anything if no custom frameworks available
  }

  const onlyOneFramework = project.framework?.length === 1;

  return (
    <Stack spacing={3}>
      {/* Divider with label */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Divider sx={{ flex: 1, borderColor: borderColors.default }} />
        <Chip
          icon={<FileJson size={14} />}
          label="Custom Frameworks"
          size="small"
          sx={{
            backgroundColor: `${colors.primary}12`,
            color: colors.primary,
            fontWeight: 500,
            fontSize: fontSizes.small,
            border: `1px solid ${colors.primary}30`,
            "& .MuiChip-icon": { color: colors.primary },
          }}
        />
        <Divider sx={{ flex: 1, borderColor: borderColors.default }} />
      </Box>

      {/* Custom framework cards */}
      {frameworks.map((fw) => {
        const isAdded = isFrameworkAdded(fw);
        const isActionInProgress = actionLoading === fw.id;
        const cannotRemove = isAdded && onlyOneFramework;

        return (
          <Box key={fw.id} sx={frameworkCardStyle}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              mb={1}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={frameworkCardTitleStyle}>{fw.name}</Typography>
                <Chip
                  label="Custom"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: fontSizes.small,
                    fontWeight: 500,
                    backgroundColor: "#eff6ff",
                    color: colors.info,
                    border: `1px solid ${colors.info}30`,
                  }}
                />
              </Box>
              {isAdded && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    background: "#E6F4EE",
                    borderRadius: "12px",
                    px: 1.5,
                    py: 0.5,
                    fontSize: fontSizes.medium,
                    fontWeight: 600,
                    color: colors.primary,
                  }}
                >
                  <CheckIcon size={16} />
                  Added
                </Box>
              )}
            </Box>
            <Typography sx={frameworkCardDescriptionStyle}>
              {fw.description}
            </Typography>
            <Typography
              sx={{
                color: textColors.muted,
                fontSize: fontSizes.small,
                display: "block",
                mb: 2,
              }}
            >
              {fw.level1_count || 0} {fw.level_1_name}s, {fw.level2_count || 0}{" "}
              {fw.level_2_name}s
              {fw.hierarchy_type === "three_level" && fw.level3_count
                ? `, ${fw.level3_count} ${fw.level_3_name}s`
                : ""}
            </Typography>
            <Box display="flex" justifyContent="flex-end">
              {isAdded ? (
                <Button
                  variant="contained"
                  size="small"
                  disabled={externalLoading || isActionInProgress || cannotRemove}
                  onClick={() => handleRemoveFramework(fw)}
                  sx={{
                    ...buttonStyles.error.contained,
                    minWidth: 100,
                  }}
                >
                  {isActionInProgress ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    "Remove"
                  )}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  disabled={externalLoading || isActionInProgress}
                  onClick={() => handleAddFramework(fw)}
                  sx={{
                    ...buttonStyles.primary.contained,
                    minWidth: 100,
                  }}
                >
                  {isActionInProgress ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    "Add"
                  )}
                </Button>
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
};

export default CustomFrameworkCards;
