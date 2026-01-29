import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  LinearProgress,
  Grid,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  colors,
  statusColors,
  StatusType,
} from "./theme";
import { ControlItemDrawer } from "./ControlItemDrawer";

interface CustomFrameworkViewerProps {
  frameworkId: number;
  projectId: number;
  frameworkName?: string;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    patch: (url: string, data?: any) => Promise<any>;
  };
  onRefresh?: () => void;
}

interface FrameworkData {
  projectFrameworkId: number;
  frameworkId: number;
  name: string;
  description: string;
  is_organizational: boolean;
  hierarchy_type: string;
  level_1_name: string;
  level_2_name: string;
  level_3_name?: string;
  structure: Level1Item[];
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
  summary?: string;
  questions?: string[];
  evidence_examples?: string[];
  order_no: number;
  impl_id?: number;
  status?: string;
  owner?: number;
  owner_name?: string;
  owner_surname?: string;
  reviewer?: number;
  reviewer_name?: string;
  reviewer_surname?: string;
  approver?: number;
  approver_name?: string;
  approver_surname?: string;
  due_date?: string;
  implementation_details?: string;
  evidence_links?: any[];
  linked_risks?: any[];
  items?: Level3Item[];
}

interface Level3Item {
  id: number;
  title: string;
  description?: string;
  order_no: number;
  impl_id?: number;
  status?: string;
  owner?: number;
  due_date?: string;
}

interface ProgressData {
  level2: {
    total: number;
    completed: number;
    assigned: number;
    percentage: number;
  };
  level3?: {
    total: number;
    completed: number;
    assigned: number;
    percentage: number;
  };
  overall: {
    total: number;
    completed: number;
    assigned: number;
    percentage: number;
  };
}

export const CustomFrameworkViewer: React.FC<CustomFrameworkViewerProps> = ({
  frameworkId,
  projectId,
  frameworkName,
  apiServices,
  onRefresh,
}) => {
  const [data, setData] = useState<FrameworkData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevel1, setExpandedLevel1] = useState<number | null>(0);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Level2Item | null>(null);

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
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api${url}`, { headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return { data: await response.json(), status: response.status };
    },
    post: async (url: string, body?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api${url}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return { data: await response.json(), status: response.status };
    },
    patch: async (url: string, body?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api${url}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return { data: await response.json(), status: response.status };
    },
  };

  const loadFrameworkData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dataResponse, progressResponse] = await Promise.all([
        api.get(`/plugins/custom-framework-import/projects/${projectId}/frameworks/${frameworkId}`),
        api.get(`/plugins/custom-framework-import/projects/${projectId}/frameworks/${frameworkId}/progress`),
      ]);

      const frameworkData = dataResponse.data.data || dataResponse.data;
      const progressData = progressResponse.data.data || progressResponse.data;

      // Check if the responses contain error messages instead of actual data
      if (frameworkData.message && !frameworkData.structure) {
        throw new Error(frameworkData.message);
      }

      setData(frameworkData);

      // Only set progress if it has the expected structure
      if (progressData && progressData.level2 && progressData.overall) {
        setProgress(progressData);
      } else {
        // Set default progress if API returns unexpected structure
        setProgress(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load framework data");
    } finally {
      setLoading(false);
    }
  }, [frameworkId, projectId]);

  useEffect(() => {
    loadFrameworkData();
  }, [loadFrameworkData]);

  const handleRefresh = useCallback(() => {
    loadFrameworkData();
    onRefresh?.();
  }, [loadFrameworkData, onRefresh]);

  const handleItemClick = (item: Level2Item) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedItem(null);
  };

  const handleItemSave = () => {
    // Reload data after saving
    loadFrameworkData();
  };

  const getStatusColor = (status: string): string => {
    const statusConfig = statusColors[status as StatusType];
    return statusConfig?.color || "#9CA3AF";
  };

  const getStatusBg = (status: string): string => {
    const statusConfig = statusColors[status as StatusType];
    return statusConfig?.bg || "#f1f5f9";
  };

  const calculateLevel1Progress = (items: Level2Item[]): { completed: number; total: number; percentage: number } => {
    if (!items || items.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = items.filter((i) => i.status === "Implemented").length;
    const total = items.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return "#13715B";
    if (percentage >= 50) return "#13715B";
    return "#13715B";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button size="small" onClick={handleRefresh} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No framework data available
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Box>
          <Typography sx={{ fontSize: "16px", fontWeight: 600, color: "#1A1919" }}>
            {data.name || frameworkName}
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "#666666", mt: 0.5 }}>
            {data.description}
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} size="small" sx={{ color: "#666666" }}>
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Progress Summary Card */}
      {progress && progress.overall && progress.level2 && (
        <Box
          sx={{
            border: "1px solid #E5E7EB",
            borderRadius: "4px",
            p: 2.5,
            mb: 3,
            mt: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            {/* Overall Progress */}
            <Box>
              <Typography sx={{ fontSize: "12px", color: "#666666", mb: 1 }}>
                Overall Progress
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ position: "relative", display: "inline-flex" }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={50}
                    thickness={4}
                    sx={{ color: "#F3F4F6" }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={progress.overall.percentage ?? 0}
                    size={50}
                    thickness={4}
                    sx={{
                      color: colors.primary,
                      position: "absolute",
                      left: 0,
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: "24px", fontWeight: 600, color: "#1A1919" }}>
                  {progress.overall.percentage ?? 0}%
                </Typography>
              </Box>
            </Box>

            {/* Controls Count */}
            <Box>
              <Typography sx={{ fontSize: "12px", color: "#666666", mb: 1 }}>
                {data.level_2_name}s
              </Typography>
              <Typography sx={{ fontSize: "24px", fontWeight: 600, color: colors.primary }}>
                {progress.level2.completed ?? 0}
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#666666" }}>
                of {progress.level2.total ?? 0} implemented
              </Typography>
            </Box>

            {/* Assigned Count */}
            <Box>
              <Typography sx={{ fontSize: "12px", color: "#666666", mb: 1 }}>
                Assigned
              </Typography>
              <Typography sx={{ fontSize: "24px", fontWeight: 600, color: colors.primary }}>
                {progress.overall.assigned ?? 0}
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#666666" }}>
                of {progress.overall.total ?? 0} have owners
              </Typography>
            </Box>
          </Box>

          {/* Completed text */}
          <Typography sx={{ fontSize: "13px", color: "#1A1919", mt: 2 }}>
            {progress.overall.completed ?? 0} / {progress.overall.total ?? 0} completed
          </Typography>
        </Box>
      )}

      {/* Framework Structure - Accordions */}
      {data.structure?.map((level1, idx) => {
        const level1Progress = calculateLevel1Progress(level1.items);
        const isExpanded = expandedLevel1 === idx;

        return (
          <Accordion
            key={level1.id}
            expanded={isExpanded}
            onChange={() => setExpandedLevel1(isExpanded ? null : idx)}
            sx={{
              mb: 2,
              "&:before": { display: "none" },
              boxShadow: "none",
              border: "1px solid #E5E7EB",
              borderRadius: "4px !important",
              overflow: "hidden",
            }}
            disableGutters
          >
            <AccordionSummary
              expandIcon={
                <ChevronUp
                  size={20}
                  style={{
                    color: "#666666",
                    transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)",
                    transition: "transform 0.2s",
                  }}
                />
              }
              sx={{
                px: 2.5,
                py: 1.5,
                minHeight: "auto",
                "& .MuiAccordionSummary-content": {
                  my: 0,
                  mr: 2,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", pr: 2 }}>
                <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#1A1919" }}>
                  {level1.title}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ width: 100 }}>
                    <LinearProgress
                      variant="determinate"
                      value={level1Progress.percentage}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#F3F4F6",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: getProgressColor(level1Progress.percentage),
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: "13px", color: "#666666", minWidth: 35, textAlign: "right" }}>
                    {level1Progress.percentage}%
                  </Typography>
                  <Typography sx={{ fontSize: "13px", color: "#666666", minWidth: 40 }}>
                    {level1Progress.completed} / {level1Progress.total}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ px: 2.5, py: 2, borderTop: "1px solid #E5E7EB" }}>
              {level1.description && (
                <Typography sx={{ fontSize: "13px", color: "#666666", mb: 2 }}>
                  {level1.description}
                </Typography>
              )}

              <Grid container spacing={2}>
                {level1.items?.map((level2) => (
                  <Grid item xs={12} key={level2.id}>
                    <Box
                      onClick={() => handleItemClick(level2)}
                      sx={{
                        p: 2,
                        cursor: "pointer",
                        border: "1px solid #E5E7EB",
                        borderLeft: `4px solid ${getStatusColor(level2.status || "Not started")}`,
                        borderRadius: "4px",
                        backgroundColor: "#fff",
                        transition: "all 0.2s",
                        "&:hover": {
                          backgroundColor: "#FBFBFB",
                          borderColor: "#d0d5dd",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 500,
                              color: "#1A1919",
                              mb: 0.5,
                            }}
                          >
                            {level2.title}
                          </Typography>
                          {level2.description && (
                            <Typography
                              sx={{
                                fontSize: "12px",
                                color: "#666666",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                lineHeight: 1.4,
                              }}
                            >
                              {level2.description}
                            </Typography>
                          )}
                        </Box>

                        <Chip
                          label={level2.status || "Not started"}
                          size="small"
                          sx={{
                            backgroundColor: getStatusBg(level2.status || "Not started"),
                            color: getStatusColor(level2.status || "Not started"),
                            fontWeight: 500,
                            fontSize: "11px",
                            height: 24,
                            flexShrink: 0,
                            border: "none",
                            "& .MuiChip-label": {
                              px: 1.5,
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Control Item Drawer */}
      <ControlItemDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        item={selectedItem}
        frameworkData={data ? {
          level_1_name: data.level_1_name,
          level_2_name: data.level_2_name,
          level_3_name: data.level_3_name,
        } : null}
        projectId={projectId}
        onSave={handleItemSave}
        apiServices={api}
      />
    </Box>
  );
};
