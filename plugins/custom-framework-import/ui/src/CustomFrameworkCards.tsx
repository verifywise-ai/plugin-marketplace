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
  Dialog,
} from "@mui/material";
import { Check as CheckIcon, FileJson } from "lucide-react";
import {
  colors,
  fontSizes,
  borderColors,
} from "./theme";

interface CustomFramework {
  id: number;
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
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
}

// Card styles matching the core app's FrameworkSettings exactly
const frameworkCardStyle = {
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid #d0d5dd",
  borderRadius: "4px",
  p: "24px",
  display: "flex",
  flexDirection: "column" as const,
  minHeight: "150px",
};

const frameworkCardTitleStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: "#000000",
};

const frameworkCardDescriptionStyle = {
  fontSize: 13,
  color: "#666666",
  mb: "auto",
};

export const CustomFrameworkCards: React.FC<CustomFrameworkCardsProps> = ({
  project,
  isLoading: externalLoading,
  onFrameworkAdded,
  onFrameworkRemoved,
  setAlert,
  setIsLoading: setExternalLoading,
  apiServices,
  pluginKey = "custom-framework-import",
}) => {
  const [frameworks, setFrameworks] = useState<CustomFramework[]>([]);
  const [addedFrameworkIds, setAddedFrameworkIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [frameworkToRemove, setFrameworkToRemove] = useState<CustomFramework | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  // Helper to get auth token from localStorage (redux-persist)
  const getAuthToken = (): string | null => {
    try {
      const persistedRoot = localStorage.getItem("persist:root");
      if (persistedRoot) {
        const parsed = JSON.parse(persistedRoot);
        if (parsed.auth) {
          const authState = JSON.parse(parsed.auth);
          return authState.authToken || null;
        }
      }
    } catch {
      // Silently fail
    }
    return null;
  };

  const api = apiServices || {
    get: async (url: string) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, { headers });
      return { data: await response.json(), status: response.status };
    },
    post: async (url: string, body?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      return { data: await response.json(), status: response.status };
    },
  };

  const loadFrameworks = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all custom frameworks
      const response = await api.get(
        `/plugins/${pluginKey}/frameworks`
      );

      // Handle various response structures
      let rawData = response.data;
      // If wrapped in { data: ... }
      if (rawData && typeof rawData === 'object' && 'data' in rawData) {
        rawData = rawData.data;
      }
      // If still wrapped (e.g., { status, data })
      if (rawData && typeof rawData === 'object' && !Array.isArray(rawData) && 'data' in rawData) {
        rawData = rawData.data;
      }

      const frameworksArray = Array.isArray(rawData) ? rawData : [];

      // Debug logging
      console.log("[CustomFrameworkCards] Raw frameworks response:", response.data);
      console.log("[CustomFrameworkCards] Parsed frameworks:", frameworksArray);

      // Filter frameworks based on project type (organizational vs project-level)
      const filtered = frameworksArray.filter(
        (fw: CustomFramework) => fw.is_organizational === project.is_organizational
      );

      console.log("[CustomFrameworkCards] Filtered frameworks:", filtered);
      setFrameworks(filtered);

      // Fetch which custom frameworks are added to this project
      try {
        const addedResponse = await api.get(
          `/plugins/${pluginKey}/projects/${project.id}/custom-frameworks`
        );
        let addedRaw = addedResponse.data;
        if (addedRaw && typeof addedRaw === 'object' && 'data' in addedRaw) {
          addedRaw = addedRaw.data;
        }
        if (addedRaw && typeof addedRaw === 'object' && !Array.isArray(addedRaw) && 'data' in addedRaw) {
          addedRaw = addedRaw.data;
        }
        const addedArray = Array.isArray(addedRaw) ? addedRaw : [];
        const addedIds = new Set<number>(
          addedArray.map((f: any) => f.framework_id)
        );
        console.log("[CustomFrameworkCards] Added framework IDs:", addedIds);
        setAddedFrameworkIds(addedIds);
      } catch {
        // If endpoint doesn't exist yet, just use empty set
        setAddedFrameworkIds(new Set());
      }
    } catch (err) {
      console.error("Failed to load custom frameworks:", err);
    } finally {
      setLoading(false);
    }
  }, [project.is_organizational, project.id, pluginKey]);

  useEffect(() => {
    loadFrameworks();
  }, [loadFrameworks]);

  // Emit custom framework count to parent (AddFrameworkModal) for total count calculation
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("customFrameworkCountChanged", {
        detail: { projectId: project.id, count: addedFrameworkIds.size },
      })
    );
  }, [addedFrameworkIds.size, project.id]);

  const isFrameworkAdded = (fw: CustomFramework): boolean => {
    return addedFrameworkIds.has(fw.id);
  };

  const handleAddFramework = async (fw: CustomFramework) => {
    console.log("[CustomFrameworkCards] Adding framework:", fw);

    if (!fw.id) {
      console.error("[CustomFrameworkCards] Framework ID is missing!", fw);
      if (setAlert) {
        setAlert({
          variant: "error",
          body: "Framework ID is missing. Please refresh and try again.",
          isToast: true,
          visible: true,
        });
        setTimeout(() => setAlert(null), 3000);
      }
      return;
    }

    setActionLoading(fw.id);
    if (setExternalLoading) setExternalLoading(true);

    try {
      const response = await api.post(
        `/plugins/${pluginKey}/add-to-project`,
        {
          frameworkId: fw.id,
          projectId: project.id,
        }
      );

      if (response.status === 200 || response.status === 201) {
        // Update local state immediately
        setAddedFrameworkIds((prev) => new Set([...prev, fw.id]));
        if (setAlert) {
          setAlert({
            variant: "success",
            body: `Framework "${fw.name}" added successfully`,
            isToast: true,
            visible: true,
          });
          setTimeout(() => setAlert(null), 3000);
        }
        // Emit custom event to notify other plugin components (e.g., CustomFrameworkControls)
        window.dispatchEvent(
          new CustomEvent("customFrameworkChanged", {
            detail: { projectId: project.id, action: "add", frameworkId: fw.id },
          })
        );
        if (onFrameworkAdded) onFrameworkAdded();
      } else {
        if (setAlert) {
          setAlert({
            variant: "error",
            body: "Failed to add framework. Please try again.",
            isToast: true,
            visible: true,
          });
          setTimeout(() => setAlert(null), 3000);
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
        setTimeout(() => setAlert(null), 3000);
      }
    } finally {
      setActionLoading(null);
      if (setExternalLoading) setExternalLoading(false);
    }
  };

  const handleRemoveFramework = async () => {
    if (!frameworkToRemove) return;

    setActionLoading(frameworkToRemove.id);
    if (setExternalLoading) setExternalLoading(true);

    try {
      const response = await api.post(
        `/plugins/${pluginKey}/remove-from-project`,
        {
          frameworkId: frameworkToRemove.id,
          projectId: project.id,
        }
      );

      if (response.status === 200) {
        // Update local state immediately
        setAddedFrameworkIds((prev) => {
          const next = new Set(prev);
          next.delete(frameworkToRemove.id);
          return next;
        });
        if (setAlert) {
          setAlert({
            variant: "success",
            body: `Framework "${frameworkToRemove.name}" removed successfully`,
            isToast: true,
            visible: true,
          });
          setTimeout(() => setAlert(null), 3000);
        }
        // Emit custom event to notify other plugin components (e.g., CustomFrameworkControls)
        window.dispatchEvent(
          new CustomEvent("customFrameworkChanged", {
            detail: { projectId: project.id, action: "remove", frameworkId: frameworkToRemove.id },
          })
        );
        if (onFrameworkRemoved) onFrameworkRemoved(frameworkToRemove.id);
      } else {
        if (setAlert) {
          setAlert({
            variant: "error",
            body: "Failed to remove framework. Please try again.",
            isToast: true,
            visible: true,
          });
          setTimeout(() => setAlert(null), 3000);
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
        setTimeout(() => setAlert(null), 3000);
      }
    } finally {
      setActionLoading(null);
      setIsRemoveModalOpen(false);
      setFrameworkToRemove(null);
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

  // Total framework count = system frameworks + added custom frameworks
  const systemFrameworkCount = project.framework?.length || 0;
  const customFrameworkCount = addedFrameworkIds.size;
  const totalFrameworkCount = systemFrameworkCount + customFrameworkCount;

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

      {/* Custom framework cards - 3 column grid matching system frameworks */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          alignItems: "stretch",
        }}
      >
        {frameworks.map((fw) => {
          const isAdded = isFrameworkAdded(fw);
          const isActionInProgress = actionLoading === fw.id;
          // Can only remove if there's more than 1 total framework (system + custom)
          const cannotRemove = isAdded && totalFrameworkCount <= 1;

          return (
            <Box key={fw.id} sx={frameworkCardStyle}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography sx={frameworkCardTitleStyle}>{fw.name}</Typography>
                {isAdded && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      backgroundColor: "#E6F4EE",
                      borderRadius: "4px",
                      px: 1.5,
                      py: 0.5,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#13715B",
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

              <Box display="flex" justifyContent="flex-end" mt={2}>
                {isAdded ? (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={externalLoading || isActionInProgress || cannotRemove}
                    onClick={() => {
                      setFrameworkToRemove(fw);
                      setIsRemoveModalOpen(true);
                    }}
                    sx={{
                      minWidth: 100,
                      borderColor: "#F87171",
                      color: "#DC2626",
                      fontWeight: 600,
                      textTransform: "none",
                      "&:hover": {
                        borderColor: "#EF4444",
                        backgroundColor: "#FEF2F2",
                      },
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
                      minWidth: 100,
                      fontWeight: 600,
                      textTransform: "none",
                      backgroundColor: "#13715B",
                      color: "#fff",
                      "&:hover": { backgroundColor: "#0e5c47" },
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
      </Box>

      {/* Confirmation Modal for Remove - matching app's ConfirmationModal */}
      <Dialog
        open={isRemoveModalOpen && frameworkToRemove !== null}
        onClose={() => {
          setIsRemoveModalOpen(false);
          setFrameworkToRemove(null);
        }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        }}
        PaperProps={{
          sx: {
            width: "485px",
            maxWidth: "calc(100vw - 32px)",
            borderRadius: "4px",
            padding: "16px",
            boxShadow: "0px 8px 8px -4px rgba(16, 24, 40, 0.03), 0px 20px 24px -4px rgba(16, 24, 40, 0.08)",
            gap: "16px",
            boxSizing: "border-box",
            margin: 0,
          },
        }}
      >
        {/* Content */}
        <Stack sx={{ gap: "16px" }}>
          <Typography sx={{ color: "#344054", fontWeight: "bolder" }}>
            Confirm framework removal
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "#344054" }}>
            Are you sure you want to remove {frameworkToRemove?.name} from the project?
          </Typography>
        </Stack>
        {/* Actions */}
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="text"
            onClick={() => {
              setIsRemoveModalOpen(false);
              setFrameworkToRemove(null);
            }}
            sx={{
              color: "#344054",
              textTransform: "none",
              px: "32px",
              width: 120,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveFramework}
            disabled={actionLoading !== null}
            sx={{ textTransform: "none" }}
          >
            {actionLoading !== null ? "Removing..." : "Remove"}
          </Button>
        </Stack>
      </Dialog>
    </Stack>
  );
};

export default CustomFrameworkCards;
