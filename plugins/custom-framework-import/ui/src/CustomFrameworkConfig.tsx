/**
 * Custom Framework Config
 *
 * Main configuration/management panel for the Custom Framework Import plugin.
 * Accessible from Settings > Custom Frameworks
 * Uses VerifyWise design system for consistency
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from "@mui/material";
import {
  Plus,
  RefreshCw,
  FileJson,
} from "lucide-react";
import {
  colors,
  textColors,
  fontSizes,
  buttonStyles,
  cardStyles,
  emptyStateStyles,
  borderColors,
  bgColors,
} from "./theme";
import { FrameworkImportModal } from "./FrameworkImportModal";
import { FrameworkDetailDrawer } from "./FrameworkDetailDrawer";
import { FrameworksTable } from "./FrameworksTable";

interface CustomFramework {
  id: number;
  framework_id?: number; // Only present in project-framework associations
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

interface Project {
  id: number;
  project_title: string;
  is_organizational: boolean;
}

interface CustomFrameworkConfigProps {
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    delete?: (url: string) => Promise<any>;
  };
  pluginEnabled?: boolean;
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
}

export const CustomFrameworkConfig: React.FC<CustomFrameworkConfigProps> = ({
  apiServices,
  pluginEnabled = true,
  pluginKey = "custom-framework-import",
}) => {
  const [frameworks, setFrameworks] = useState<CustomFramework[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addToProjectDialogOpen, setAddToProjectDialogOpen] = useState(false);
  const [selectedFramework, setSelectedFramework] =
    useState<CustomFramework | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [actionLoading, setActionLoading] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailFrameworkId, setDetailFrameworkId] = useState<number | null>(
    null
  );

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
    delete: async (url: string) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, { method: "DELETE", headers });
      return { data: await response.json(), status: response.status };
    },
  };

  const loadFrameworks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch ALL frameworks from all installed framework plugins
      const response = await api.get(
        `/plugins/${pluginKey}/frameworks?all=true`
      );
      const data = response.data.data || response.data;
      setFrameworks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load frameworks");
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadProjects = useCallback(async () => {
    try {
      const response = await api.get("/projects");
      const data = response.data.data || response.data;
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load projects:", err);
    }
  }, [api]);

  useEffect(() => {
    loadFrameworks();
    loadProjects();
  }, [loadFrameworks, loadProjects]);

  // Auto-dismiss success/error messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleDeleteFramework = async () => {
    if (!selectedFramework) return;

    try {
      setActionLoading(true);
      const deleteMethod =
        api.delete ||
        (async (url: string) => {
          const response = await fetch(`/api${url}`, { method: "DELETE" });
          return { data: await response.json(), status: response.status };
        });
      await deleteMethod(
        `/plugins/${pluginKey}/frameworks/${selectedFramework.id}`
      );

      // If we reach here, delete was successful (errors are thrown)
      setSuccess(`Framework "${selectedFramework.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setSelectedFramework(null);
      loadFrameworks();
    } catch (err: any) {
      // CustomException from apiServices has: err.message, err.status, err.response
      // err.response = { message: "Bad Request", data: { message: "detailed error" } }
      const errorMessage = err.response?.data?.message ||
                           err.response?.message ||
                           (err.message !== "Bad Request" ? err.message : null) ||
                           "Failed to delete framework";
      setError(errorMessage);
      setDeleteDialogOpen(false);
      setSelectedFramework(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddToProject = async () => {
    if (!selectedFramework || !selectedProjectId) return;

    try {
      setActionLoading(true);
      await api.post(`/plugins/${pluginKey}/add-to-project`, {
        frameworkId: selectedFramework.id,
        projectId: selectedProjectId,
      });
      setSuccess(
        `Framework "${selectedFramework.name}" added to project successfully`
      );
      setAddToProjectDialogOpen(false);
      setSelectedFramework(null);
      setSelectedProjectId("");
    } catch (err: any) {
      setError(err.message || "Failed to add framework to project");
    } finally {
      setActionLoading(false);
    }
  };

  const getCompatibleProjects = () => {
    if (!selectedFramework) return [];
    return projects.filter(
      (p) => p.is_organizational === selectedFramework.is_organizational
    );
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (!pluginEnabled) {
    return (
      <Box sx={cardStyles.default}>
        <Alert severity="info" sx={{ border: "none" }}>
          Custom Framework Import plugin is not enabled. Enable it to import
          and manage custom compliance frameworks.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 8 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: fontSizes.large,
              fontWeight: 600,
              color: textColors.primary,
            }}
          >
            Custom Frameworks
          </Typography>
          <Typography
            sx={{
              fontSize: fontSizes.medium,
              color: textColors.muted,
              mt: 0.5,
            }}
          >
            Import and manage custom compliance frameworks
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton
              onClick={loadFrameworks}
              disabled={loading}
              sx={{
                border: `1px solid ${borderColors.default}`,
                borderRadius: "4px",
                width: 32,
                height: 32,
                "&:hover": { backgroundColor: bgColors.hover },
              }}
            >
              <RefreshCw size={16} color={textColors.muted} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setImportModalOpen(true)}
            sx={buttonStyles.primary.contained}
          >
            Import Framework
          </Button>
        </Stack>
      </Box>

      {/* Messages */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, fontSize: fontSizes.medium }}
          onClose={clearMessages}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2, fontSize: fontSizes.medium }}
          onClose={clearMessages}
        >
          {success}
        </Alert>
      )}

      {/* Frameworks Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={24} sx={{ color: colors.primary }} />
        </Box>
      ) : frameworks.length === 0 ? (
        <Box sx={{ ...cardStyles.gradient, ...emptyStateStyles.container }}>
          <FileJson
            size={48}
            color={textColors.muted}
            style={{ marginBottom: 16 }}
          />
          <Typography sx={emptyStateStyles.title}>
            No Custom Frameworks
          </Typography>
          <Typography sx={emptyStateStyles.description}>
            Import your first custom compliance framework to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setImportModalOpen(true)}
            sx={buttonStyles.primary.contained}
          >
            Import Framework
          </Button>
        </Box>
      ) : (
        <FrameworksTable
          frameworks={frameworks}
          onViewDetails={(fw) => {
            setDetailFrameworkId(fw.id);
            setDetailDrawerOpen(true);
          }}
          onDelete={(fw) => {
            setSelectedFramework(fw);
            setDeleteDialogOpen(true);
          }}
        />
      )}

      {/* Import Modal */}
      <FrameworkImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={() => {
          loadFrameworks();
          setSuccess("Framework imported successfully");
        }}
        apiServices={api}
        pluginKey={pluginKey}
      />

      {/* Delete Confirmation Dialog - matching app's ConfirmationModal */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
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
        <Stack sx={{ gap: "16px" }}>
          <Typography sx={{ color: "#344054", fontWeight: "bolder" }}>
            Confirm delete
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "#344054" }}>
            Are you sure you want to delete "{selectedFramework?.name}"? This
            will remove the framework structure but will not affect projects
            that have already implemented it.
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="text"
            onClick={() => setDeleteDialogOpen(false)}
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
            onClick={handleDeleteFramework}
            disabled={actionLoading}
            sx={{ textTransform: "none" }}
          >
            {actionLoading ? "Deleting..." : "Delete"}
          </Button>
        </Stack>
      </Dialog>

      {/* Add to Project Dialog */}
      <Dialog
        open={addToProjectDialogOpen}
        onClose={() => setAddToProjectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "15px",
            fontWeight: 600,
            color: textColors.primary,
            pb: 1,
          }}
        >
          Add Framework to Project
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontSize: fontSizes.medium,
              color: textColors.muted,
              mb: 2,
            }}
          >
            Select a project to add "{selectedFramework?.name}" to. This will
            create implementation records for tracking compliance.
          </Typography>

          {selectedFramework?.is_organizational && (
            <Alert severity="info" sx={{ mb: 2, fontSize: fontSizes.medium }}>
              This is an organizational framework and can only be added to
              organizational projects.
            </Alert>
          )}

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel sx={{ fontSize: fontSizes.medium }}>
              Select Project
            </InputLabel>
            <Select
              value={selectedProjectId}
              label="Select Project"
              onChange={(e) => setSelectedProjectId(e.target.value as number)}
              sx={{ fontSize: fontSizes.medium }}
            >
              {getCompatibleProjects().map((project) => (
                <MenuItem
                  key={project.id}
                  value={project.id}
                  sx={{ fontSize: fontSizes.medium }}
                >
                  {project.project_title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {getCompatibleProjects().length === 0 && (
            <Alert severity="warning" sx={{ mt: 2, fontSize: fontSizes.medium }}>
              No compatible projects found. Create a{" "}
              {selectedFramework?.is_organizational ? "organizational" : "regular"}{" "}
              project first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setAddToProjectDialogOpen(false)}
            sx={{
              ...buttonStyles.primary.outlined,
              color: textColors.secondary,
              borderColor: borderColors.default,
              "&:hover": {
                borderColor: textColors.secondary,
                backgroundColor: bgColors.hover,
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddToProject}
            disabled={actionLoading || !selectedProjectId}
            sx={buttonStyles.primary.contained}
          >
            {actionLoading ? "Adding..." : "Add to Project"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Framework Detail Drawer */}
      <FrameworkDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setDetailFrameworkId(null);
        }}
        frameworkId={detailFrameworkId}
        apiServices={api}
        pluginKey={pluginKey}
      />
    </Box>
  );
};
