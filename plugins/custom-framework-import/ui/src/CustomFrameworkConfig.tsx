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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
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
  Trash2,
  Eye,
  RefreshCw,
  FileJson,
  Building2,
  Layers,
  Link as LinkIcon,
} from "lucide-react";
import {
  colors,
  textColors,
  fontSizes,
  buttonStyles,
  tableStyles,
  cardStyles,
  emptyStateStyles,
  borderColors,
  bgColors,
} from "./theme";
import { FrameworkImportModal } from "./FrameworkImportModal";
import { FrameworkDetailDrawer } from "./FrameworkDetailDrawer";

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
}

export const CustomFrameworkConfig: React.FC<CustomFrameworkConfigProps> = ({
  apiServices,
  pluginEnabled = true,
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
      return { data: await response.json() };
    },
    delete: async (url: string) => {
      const response = await fetch(`/api${url}`, { method: "DELETE" });
      return { data: await response.json() };
    },
  };

  const loadFrameworks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(
        "/plugins/custom-framework-import/frameworks"
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

  const handleDeleteFramework = async () => {
    if (!selectedFramework) return;

    try {
      setActionLoading(true);
      const deleteMethod =
        api.delete ||
        (async (url: string) => {
          const response = await fetch(`/api${url}`, { method: "DELETE" });
          return { data: await response.json() };
        });
      await deleteMethod(
        `/plugins/custom-framework-import/frameworks/${selectedFramework.framework_id}`
      );
      setSuccess(`Framework "${selectedFramework.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setSelectedFramework(null);
      loadFrameworks();
    } catch (err: any) {
      setError(err.message || "Failed to delete framework");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddToProject = async () => {
    if (!selectedFramework || !selectedProjectId) return;

    try {
      setActionLoading(true);
      await api.post("/plugins/custom-framework-import/add-to-project", {
        frameworkId: selectedFramework.framework_id,
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
    <Box>
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
        <TableContainer component={Paper} sx={tableStyles.frame}>
          <Table>
            <TableHead>
              <TableRow sx={tableStyles.header.row}>
                <TableCell sx={tableStyles.header.cell}>Framework</TableCell>
                <TableCell sx={tableStyles.header.cell}>Type</TableCell>
                <TableCell sx={tableStyles.header.cell}>Hierarchy</TableCell>
                <TableCell sx={tableStyles.header.cell}>Structure</TableCell>
                <TableCell sx={tableStyles.header.cell}>Created</TableCell>
                <TableCell sx={{ ...tableStyles.header.cell, textAlign: "right" }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {frameworks.map((fw) => (
                <TableRow key={fw.id} sx={tableStyles.body.row}>
                  <TableCell sx={tableStyles.body.cell}>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: fontSizes.medium,
                          fontWeight: 500,
                          color: textColors.primary,
                        }}
                      >
                        {fw.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: fontSizes.small,
                          color: textColors.muted,
                          mt: 0.25,
                        }}
                      >
                        {fw.description?.substring(0, 60)}
                        {fw.description && fw.description.length > 60
                          ? "..."
                          : ""}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={tableStyles.body.cell}>
                    <Chip
                      icon={<Building2 size={12} />}
                      label={fw.is_organizational ? "Organizational" : "Project"}
                      size="small"
                      sx={{
                        fontSize: fontSizes.small,
                        fontWeight: 500,
                        height: 24,
                        backgroundColor: fw.is_organizational
                          ? `${colors.primary}12`
                          : "#f3f4f6",
                        color: fw.is_organizational
                          ? colors.primary
                          : textColors.secondary,
                        border: fw.is_organizational
                          ? `1px solid ${colors.primary}30`
                          : "1px solid #e5e7eb",
                        "& .MuiChip-icon": {
                          color: fw.is_organizational
                            ? colors.primary
                            : textColors.muted,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={tableStyles.body.cell}>
                    <Chip
                      icon={<Layers size={12} />}
                      label={
                        fw.hierarchy_type === "three_level"
                          ? "3 Levels"
                          : "2 Levels"
                      }
                      size="small"
                      sx={{
                        fontSize: fontSizes.small,
                        fontWeight: 500,
                        height: 24,
                        backgroundColor: "#f3f4f6",
                        color: textColors.secondary,
                        border: "1px solid #e5e7eb",
                        "& .MuiChip-icon": { color: textColors.muted },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={tableStyles.body.cell}>
                    <Typography sx={{ fontSize: fontSizes.medium }}>
                      {fw.level1_count || 0} {fw.level_1_name}s,{" "}
                      {fw.level2_count || 0} {fw.level_2_name}s
                      {fw.hierarchy_type === "three_level" && fw.level3_count
                        ? `, ${fw.level3_count} ${fw.level_3_name}s`
                        : ""}
                    </Typography>
                  </TableCell>
                  <TableCell sx={tableStyles.body.cell}>
                    <Typography sx={{ fontSize: fontSizes.medium }}>
                      {new Date(fw.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ ...tableStyles.body.cell, textAlign: "right" }}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Add to Project">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedFramework(fw);
                            setAddToProjectDialogOpen(true);
                          }}
                          sx={{
                            width: 28,
                            height: 28,
                            "&:hover": { backgroundColor: bgColors.hover },
                          }}
                        >
                          <LinkIcon size={14} color={textColors.muted} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setDetailFrameworkId(fw.id);
                            setDetailDrawerOpen(true);
                          }}
                          sx={{
                            width: 28,
                            height: 28,
                            "&:hover": { backgroundColor: bgColors.hover },
                          }}
                        >
                          <Eye size={14} color={textColors.muted} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedFramework(fw);
                            setDeleteDialogOpen(true);
                          }}
                          sx={{
                            width: 28,
                            height: 28,
                            "&:hover": {
                              backgroundColor: "#fef2f2",
                              "& svg": { color: colors.error },
                            },
                          }}
                        >
                          <Trash2 size={14} color={textColors.muted} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "8px",
            maxWidth: 400,
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
          Delete Framework
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: fontSizes.medium, color: textColors.secondary }}>
            Are you sure you want to delete "{selectedFramework?.name}"? This
            will remove the framework structure but will not affect projects
            that have already implemented it.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
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
            onClick={handleDeleteFramework}
            disabled={actionLoading}
            sx={buttonStyles.error.contained}
          >
            {actionLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
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
      />
    </Box>
  );
};
