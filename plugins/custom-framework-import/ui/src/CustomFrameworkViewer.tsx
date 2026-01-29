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
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ChevronDown,
  Clock,
  User,
  FileText,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import {
  colors,
  textColors,
  borderColors,
  statusColors,
  StatusType,
  theme,
} from "./theme";

interface CustomFrameworkViewerProps {
  frameworkId: number;
  projectId: number;
  frameworkName?: string;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    patch: (url: string, data?: any) => Promise<any>;
  };
  onItemClick?: (item: any, level: number) => void;
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
  onItemClick,
  onRefresh,
}) => {
  const [data, setData] = useState<FrameworkData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevel1, setExpandedLevel1] = useState<number | null>(null);

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
    patch: async (url: string, body?: any) => {
      const response = await fetch(`/api${url}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { data: await response.json() };
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

      setData(frameworkData);
      setProgress(progressData);
    } catch (err: any) {
      setError(err.message || "Failed to load framework data");
    } finally {
      setLoading(false);
    }
  }, [frameworkId, projectId, api]);

  useEffect(() => {
    loadFrameworkData();
  }, [loadFrameworkData]);

  const handleRefresh = useCallback(() => {
    loadFrameworkData();
    onRefresh?.();
  }, [loadFrameworkData, onRefresh]);

  const getStatusColor = (status: string): string => {
    const statusConfig = statusColors[status as StatusType];
    return statusConfig?.color || "#94a3b8";
  };

  const getStatusBg = (status: string): string => {
    const statusConfig = statusColors[status as StatusType];
    return statusConfig?.bg || "#f1f5f9";
  };

  const calculateLevel1Progress = (items: Level2Item[]): number => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter((i) => i.status === "Implemented").length;
    return Math.round((completed / items.length) * 100);
  };

  const formatUserName = (item: Level2Item): string | null => {
    if (item.owner_name && item.owner_surname) {
      return `${item.owner_name} ${item.owner_surname}`;
    }
    return null;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
        <CircularProgress />
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {data.name || frameworkName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {data.description}
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Progress Summary */}
      {progress && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Overall Progress
                  </Typography>
                  <Box sx={{ position: "relative", display: "inline-flex", my: 1 }}>
                    <CircularProgress
                      variant="determinate"
                      value={progress.overall.percentage}
                      size={80}
                      thickness={4}
                      sx={{ color: colors.primary }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="h6" fontWeight={600}>
                        {progress.overall.percentage}%
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {progress.overall.completed} / {progress.overall.total} completed
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {data.level_2_name}s
                  </Typography>
                  <Typography variant="h4" fontWeight={600} sx={{ my: 1, color: colors.primary }}>
                    {progress.level2.completed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    of {progress.level2.total} implemented
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Assigned
                  </Typography>
                  <Typography variant="h4" fontWeight={600} sx={{ my: 1, color: colors.info }}>
                    {progress.overall.assigned}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    of {progress.overall.total} have owners
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Framework Structure */}
      {data.structure?.map((level1, idx) => {
        const level1Progress = calculateLevel1Progress(level1.items);

        return (
          <Accordion
            key={level1.id}
            expanded={expandedLevel1 === idx}
            onChange={() => setExpandedLevel1(expandedLevel1 === idx ? null : idx)}
            sx={{
              mb: 2,
              "&:before": { display: "none" },
              boxShadow: theme.shadows.sm,
              borderRadius: `${theme.borderRadius.md} !important`,
              overflow: "hidden",
            }}
          >
            <AccordionSummary
              expandIcon={<ChevronDown />}
              sx={{
                bgcolor: "#f8fafc",
                "&:hover": { bgcolor: "#f1f5f9" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 2, pr: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                  {level1.title}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ width: 100 }}>
                    <LinearProgress
                      variant="determinate"
                      value={level1Progress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: "#e2e8f0",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: level1Progress === 100 ? colors.success : colors.primary,
                        },
                      }}
                    />
                  </Box>
                  <Chip
                    label={`${level1Progress}%`}
                    size="small"
                    sx={{
                      bgcolor: level1Progress === 100 ? statusColors["Implemented"].bg : "#e2e8f0",
                      color: level1Progress === 100 ? colors.success : textColors.secondary,
                      fontWeight: 500,
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                    {level1.items?.filter((i) => i.status === "Implemented").length} / {level1.items?.length}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ p: 0 }}>
              {level1.description && (
                <Box sx={{ px: 3, py: 2, bgcolor: "#fafafa", borderBottom: "1px solid #e2e8f0" }}>
                  <Typography variant="body2" color="text.secondary">
                    {level1.description}
                  </Typography>
                </Box>
              )}

              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {level1.items?.map((level2) => (
                    <Grid item xs={12} key={level2.id}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          cursor: onItemClick ? "pointer" : "default",
                          transition: "all 0.2s",
                          border: "1px solid #e2e8f0",
                          borderLeft: `4px solid ${getStatusColor(level2.status || "Not started")}`,
                          "&:hover": onItemClick
                            ? {
                                bgcolor: "#f8fafc",
                                borderColor: colors.primary,
                              }
                            : {},
                        }}
                        onClick={() => onItemClick?.(level2, 2)}
                      >
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={500}>
                              {level2.title}
                            </Typography>
                            {level2.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.5,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {level2.description}
                              </Typography>
                            )}

                            {/* Metadata row */}
                            <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
                              {formatUserName(level2) && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <User size={14} color={textColors.secondary} />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatUserName(level2)}
                                  </Typography>
                                </Box>
                              )}

                              {level2.due_date && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Clock size={14} color={textColors.secondary} />
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(level2.due_date).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              )}

                              {level2.evidence_links && level2.evidence_links.length > 0 && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <FileText size={14} color={textColors.secondary} />
                                  <Typography variant="caption" color="text.secondary">
                                    {level2.evidence_links.length} evidence
                                  </Typography>
                                </Box>
                              )}

                              {level2.linked_risks && level2.linked_risks.length > 0 && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <LinkIcon size={14} color={colors.warning} />
                                  <Typography variant="caption" color="text.secondary">
                                    {level2.linked_risks.length} risks
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>

                          <Chip
                            label={level2.status || "Not started"}
                            size="small"
                            sx={{
                              bgcolor: getStatusBg(level2.status || "Not started"),
                              color: getStatusColor(level2.status || "Not started"),
                              fontWeight: 500,
                              flexShrink: 0,
                            }}
                          />
                        </Box>

                        {/* Level 3 items (nested) */}
                        {level2.items && level2.items.length > 0 && (
                          <Box sx={{ mt: 2, pl: 2, borderLeft: "2px solid #e2e8f0" }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                              {data.level_3_name}s ({level2.items.length})
                            </Typography>
                            {level2.items.slice(0, 3).map((level3) => (
                              <Box
                                key={level3.id}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  py: 0.5,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: getStatusColor(level3.status || "Not started"),
                                  }}
                                />
                                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                                  {level3.title}
                                </Typography>
                                <Chip
                                  label={level3.status || "Not started"}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: getStatusBg(level3.status || "Not started"),
                                    color: getStatusColor(level3.status || "Not started"),
                                  }}
                                />
                              </Box>
                            ))}
                            {level2.items.length > 3 && (
                              <Typography variant="caption" color="text.secondary">
                                +{level2.items.length - 3} more
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};
