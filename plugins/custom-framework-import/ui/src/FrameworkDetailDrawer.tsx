/**
 * Framework Detail Drawer
 *
 * Shows detailed view of a custom framework.
 * Matches VerifyWise standard drawer patterns.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Drawer,
  Button,
  Divider,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  X as CloseIcon,
  Building2,
  Layers,
  CheckCircle,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { colors } from "./theme";

interface FrameworkDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  frameworkId: number | null;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
  };
  onNavigateToProject?: (projectId: number, frameworkId: number) => void;
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
}

interface FrameworkDetails {
  id: number;
  name: string;
  description: string;
  version: string;
  is_organizational: boolean;
  hierarchy_type: string;
  level_1_name: string;
  level_2_name: string;
  level_3_name?: string;
  created_at: string;
  structure: Level1Item[];
  linkedProjects: LinkedProject[];
}

interface Level1Item {
  id: number;
  title: string;
  description?: string;
  order_no: number;
  items: Level2Item[];
}

interface Level2Item {
  id: number;
  title: string;
  description?: string;
  order_no: number;
  items?: Level3Item[];
}

interface Level3Item {
  id: number;
  title: string;
  description?: string;
  order_no: number;
}

interface LinkedProject {
  project_framework_id: number;
  project_id: number;
  project_title: string;
  is_organizational: boolean;
  added_at: string;
  progress: {
    total: number;
    completed: number;
    assigned: number;
    percentage: number;
  };
}

export const FrameworkDetailDrawer: React.FC<FrameworkDetailDrawerProps> = ({
  open,
  onClose,
  frameworkId,
  apiServices,
  onNavigateToProject: _onNavigateToProject,
  pluginKey,
}) => {
  const [details, setDetails] = useState<FrameworkDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [expandedLevel1, setExpandedLevel1] = useState<Set<number>>(new Set());

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
  };

  const loadDetails = useCallback(async () => {
    if (!frameworkId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(
        `/plugins/${pluginKey}/frameworks/${frameworkId}`
      );
      const data = response.data.data || response.data;
      setDetails(data);
    } catch (err: any) {
      setError(err.message || "Failed to load framework details");
    } finally {
      setLoading(false);
    }
  }, [frameworkId, pluginKey]);

  useEffect(() => {
    if (open && frameworkId) {
      loadDetails();
      setActiveTab("details");
      setExpandedLevel1(new Set());
    }
  }, [open, frameworkId, loadDetails]);

  const handleClose = () => {
    setDetails(null);
    setExpandedLevel1(new Set());
    onClose();
  };

  const toggleLevel1 = (id: number) => {
    setExpandedLevel1((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const countItems = (structure: Level1Item[]) => {
    let level1 = 0, level2 = 0, level3 = 0;
    for (const l1 of structure || []) {
      level1++;
      for (const l2 of l1.items || []) {
        level2++;
        level3 += (l2.items || []).length;
      }
    }
    return { level1, level2, level3 };
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return "#16A34A";
    if (percentage >= 50) return colors.primary;
    if (percentage >= 25) return "#F59E0B";
    return "#94A3B8";
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: 600,
          margin: 0,
          borderRadius: 0,
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding="15px 20px"
      >
        <Typography fontSize={15} fontWeight={700}>
          {loading ? "Loading..." : details?.name || "Framework Details"}
        </Typography>
        <Button
          onClick={handleClose}
          sx={{ minWidth: 0, padding: "5px" }}
        >
          <CloseIcon size={20} color="#667085" />
        </Button>
      </Stack>
      <Divider />

      {/* Tabs */}
      <Box sx={{ padding: "0 20px" }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              minHeight: 40,
              fontSize: 13,
              textTransform: "none",
              color: "#667085",
              "&.Mui-selected": {
                color: colors.primary,
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: colors.primary,
            },
          }}
        >
          <Tab value="details" label="Details" />
          <Tab value="structure" label="Structure" />
          <Tab value="projects" label={`Projects (${details?.linkedProjects?.length || 0})`} />
        </Tabs>
      </Box>
      <Divider />

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={24} sx={{ color: colors.primary }} />
          </Box>
        ) : error ? (
          <Box sx={{ padding: "15px 20px" }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : details ? (
          <>
            {/* Details Tab */}
            {activeTab === "details" && (
              <Stack sx={{ padding: "15px 20px", gap: "15px" }}>
                {/* Description */}
                {details.description && (
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#344054", mb: 0.5 }}>
                      Description
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#667085", lineHeight: 1.6 }}>
                      {details.description}
                    </Typography>
                  </Box>
                )}

                {/* Type & Hierarchy */}
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#344054", mb: 1 }}>
                    Type
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      icon={<Building2 size={12} />}
                      label={details.is_organizational ? "Organizational" : "Project-level"}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: 11,
                        backgroundColor: details.is_organizational ? "#ECFDF3" : "#F2F4F7",
                        color: details.is_organizational ? "#027A48" : "#344054",
                        border: details.is_organizational ? "1px solid #A6F4C5" : "1px solid #E4E7EC",
                        "& .MuiChip-icon": {
                          color: details.is_organizational ? "#027A48" : "#667085",
                        },
                      }}
                    />
                    <Chip
                      icon={<Layers size={12} />}
                      label={details.hierarchy_type === "three_level" ? "3 Levels" : "2 Levels"}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: 11,
                        backgroundColor: "#F2F4F7",
                        color: "#344054",
                        border: "1px solid #E4E7EC",
                        "& .MuiChip-icon": { color: "#667085" },
                      }}
                    />
                  </Stack>
                </Box>

                {/* Version */}
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#344054", mb: 0.5 }}>
                    Version
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "#667085" }}>
                    v{details.version}
                  </Typography>
                </Box>

                {/* Created */}
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#344054", mb: 0.5 }}>
                    Created
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "#667085" }}>
                    {new Date(details.created_at).toLocaleDateString()}
                  </Typography>
                </Box>

                {/* Structure Summary */}
                {details.structure && (
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#344054", mb: 1 }}>
                      Structure Summary
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Box sx={{ textAlign: "center", flex: 1, p: 1.5, backgroundColor: "#F9FAFB", borderRadius: "4px", border: "1px solid #EAECF0" }}>
                        <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#101828" }}>
                          {countItems(details.structure).level1}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#667085" }}>
                          {details.level_1_name}s
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "center", flex: 1, p: 1.5, backgroundColor: "#F9FAFB", borderRadius: "4px", border: "1px solid #EAECF0" }}>
                        <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#101828" }}>
                          {countItems(details.structure).level2}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#667085" }}>
                          {details.level_2_name}s
                        </Typography>
                      </Box>
                      {details.hierarchy_type === "three_level" && details.level_3_name && (
                        <Box sx={{ textAlign: "center", flex: 1, p: 1.5, backgroundColor: "#F9FAFB", borderRadius: "4px", border: "1px solid #EAECF0" }}>
                          <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#101828" }}>
                            {countItems(details.structure).level3}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: "#667085" }}>
                            {details.level_3_name}s
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}

            {/* Structure Tab */}
            {activeTab === "structure" && (
              <Stack sx={{ padding: "15px 20px", gap: "10px" }}>
                {details.structure?.map((level1) => (
                  <Box
                    key={level1.id}
                    sx={{
                      border: "1px solid #EAECF0",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      onClick={() => toggleLevel1(level1.id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        backgroundColor: "#F9FAFB",
                        cursor: "pointer",
                        "&:hover": { backgroundColor: "#F3F4F6" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {expandedLevel1.has(level1.id) ? (
                          <ChevronDown size={14} color="#667085" />
                        ) : (
                          <ChevronRight size={14} color="#667085" />
                        )}
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#344054" }}>
                          {level1.title}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 11, color: "#667085" }}>
                        {level1.items?.length || 0} {details.level_2_name}s
                      </Typography>
                    </Box>

                    {expandedLevel1.has(level1.id) && (
                      <Box sx={{ p: "8px 12px", backgroundColor: "#FFFFFF" }}>
                        <Stack spacing={1}>
                          {level1.items?.map((level2) => (
                            <Box
                              key={level2.id}
                              sx={{
                                padding: "8px 10px",
                                backgroundColor: "#F9FAFB",
                                borderRadius: "4px",
                                borderLeft: "2px solid #D0D5DD",
                              }}
                            >
                              <Typography sx={{ fontSize: 12, color: "#344054" }}>
                                {level2.title}
                              </Typography>
                              {level2.items && level2.items.length > 0 && (
                                <Typography sx={{ fontSize: 11, color: "#667085", mt: 0.5 }}>
                                  {level2.items.length} {details.level_3_name}s
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            )}

            {/* Projects Tab */}
            {activeTab === "projects" && (
              <Stack sx={{ padding: "15px 20px", gap: "10px" }}>
                {!details.linkedProjects || details.linkedProjects.length === 0 ? (
                  <Box
                    sx={{
                      padding: "20px",
                      backgroundColor: "#F9FAFB",
                      borderRadius: "4px",
                      border: "1px solid #EAECF0",
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: "#667085" }}>
                      Not linked to any projects yet
                    </Typography>
                  </Box>
                ) : (
                  details.linkedProjects.map((project) => (
                    <Box
                      key={project.project_framework_id}
                      sx={{
                        padding: "12px",
                        backgroundColor: "#FFFFFF",
                        borderRadius: "4px",
                        border: "1px solid #EAECF0",
                        "&:hover": { backgroundColor: "#F9FAFB" },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#344054" }}>
                            {project.project_title}
                          </Typography>
                          {project.is_organizational && (
                            <Chip
                              label="Org"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: 9,
                                backgroundColor: "#ECFDF3",
                                color: "#027A48",
                              }}
                            />
                          )}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: getProgressColor(project.progress.percentage),
                          }}
                        >
                          {project.progress.percentage}%
                        </Typography>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={project.progress.percentage}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "#E5E7EB",
                          mb: 1,
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: getProgressColor(project.progress.percentage),
                            borderRadius: 2,
                          },
                        }}
                      />

                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <CheckCircle size={10} color="#16A34A" />
                          <Typography sx={{ fontSize: 10, color: "#667085" }}>
                            {project.progress.completed}/{project.progress.total}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Users size={10} color="#3B82F6" />
                          <Typography sx={{ fontSize: 10, color: "#667085" }}>
                            {project.progress.assigned} assigned
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))
                )}
              </Stack>
            )}
          </>
        ) : null}
      </Box>

      {/* Footer */}
      <Stack
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: "15px 20px",
          marginTop: "auto",
          borderTop: "1px solid #EAECF0",
        }}
      >
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{
            height: 34,
            fontSize: 13,
            textTransform: "none",
            borderColor: "#D0D5DD",
            color: "#344054",
            "&:hover": { backgroundColor: "#F9FAFB", borderColor: "#98A2B3" },
          }}
        >
          Close
        </Button>
      </Stack>
    </Drawer>
  );
};
