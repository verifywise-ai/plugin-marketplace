/**
 * Framework Detail Drawer
 *
 * Shows detailed view of a custom framework including:
 * - Framework metadata
 * - Full structure (categories → controls → subcontrols)
 * - Linked projects with progress
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  X,
  ChevronDown,
  Building2,
  Layers,
  FolderOpen,
  CheckCircle,
  Clock,
  Users,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  colors,
  textColors,
  fontSizes,
  bgColors,
  borderColors,
} from "./theme";

interface FrameworkDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  frameworkId: number | null;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
  };
  onNavigateToProject?: (projectId: number, frameworkId: number) => void;
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
  summary?: string;
  questions?: string[];
  evidence_examples?: string[];
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
  onNavigateToProject,
}) => {
  const [details, setDetails] = useState<FrameworkDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevel1, setExpandedLevel1] = useState<number | false>(false);

  const api = apiServices || {
    get: async (url: string) => {
      const response = await fetch(`/api${url}`);
      return { data: await response.json() };
    },
  };

  const loadDetails = useCallback(async () => {
    if (!frameworkId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(
        `/plugins/custom-framework-import/frameworks/${frameworkId}/details`
      );
      const data = response.data.data || response.data;
      setDetails(data);
    } catch (err: any) {
      setError(err.message || "Failed to load framework details");
    } finally {
      setLoading(false);
    }
  }, [frameworkId, api]);

  useEffect(() => {
    if (open && frameworkId) {
      loadDetails();
    }
  }, [open, frameworkId, loadDetails]);

  const handleClose = () => {
    setDetails(null);
    setExpandedLevel1(false);
    onClose();
  };

  const countItems = (
    structure: Level1Item[]
  ): { level1: number; level2: number; level3: number } => {
    let level1 = 0;
    let level2 = 0;
    let level3 = 0;

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
    if (percentage >= 100) return colors.success;
    if (percentage >= 50) return colors.primary;
    if (percentage >= 25) return colors.warning;
    return textColors.secondary;
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: { width: { xs: "100%", sm: 600 }, maxWidth: "100%" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2.5,
          borderBottom: `1px solid ${borderColors.light}`,
          background: bgColors.modalHeader,
        }}
      >
        <Typography sx={{ fontSize: "15px", fontWeight: 600, color: textColors.primary }}>
          Framework Details
        </Typography>
        <IconButton onClick={handleClose} size="small" sx={{ "&:hover": { bgcolor: bgColors.hover } }}>
          <X size={20} color={textColors.muted} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 0 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        ) : details ? (
          <>
            {/* Framework Info */}
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                {details.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                paragraph
              >
                {details.description}
              </Typography>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
                <Chip
                  icon={<Building2 size={14} />}
                  label={
                    details.is_organizational ? "Organizational" : "Project-level"
                  }
                  size="small"
                  color={details.is_organizational ? "primary" : "default"}
                  variant="outlined"
                />
                <Chip
                  icon={<Layers size={14} />}
                  label={
                    details.hierarchy_type === "three_level"
                      ? "3 Levels"
                      : "2 Levels"
                  }
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`v${details.version}`}
                  size="small"
                  variant="outlined"
                />
              </Box>

              {/* Structure Summary */}
              {details.structure && (
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "#f8fafc", mb: 3 }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    gutterBottom
                  >
                    Structure Summary
                  </Typography>
                  <Box sx={{ display: "flex", gap: 4 }}>
                    <Box>
                      <Typography variant="h4" fontWeight={600}>
                        {countItems(details.structure).level1}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {details.level_1_name}s
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight={600}>
                        {countItems(details.structure).level2}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {details.level_2_name}s
                      </Typography>
                    </Box>
                    {details.hierarchy_type === "three_level" && (
                      <Box>
                        <Typography variant="h4" fontWeight={600}>
                          {countItems(details.structure).level3}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {details.level_3_name}s
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              )}
            </Box>

            <Divider />

            {/* Linked Projects */}
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                <FolderOpen
                  size={18}
                  style={{ verticalAlign: "middle", marginRight: 8 }}
                />
                Linked Projects ({details.linkedProjects?.length || 0})
              </Typography>

              {details.linkedProjects?.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This framework hasn't been added to any projects yet.
                </Alert>
              ) : (
                <List sx={{ mt: 1 }}>
                  {details.linkedProjects?.map((project) => (
                    <Paper
                      key={project.project_framework_id}
                      variant="outlined"
                      sx={{ mb: 2, overflow: "hidden" }}
                    >
                      <ListItem sx={{ py: 2 }}>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography variant="subtitle2" fontWeight={500}>
                                {project.project_title}
                              </Typography>
                              {project.is_organizational && (
                                <Chip
                                  label="Org"
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: `${colors.primary}15`,
                                    color: colors.primary,
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                  mb: 1,
                                }}
                              >
                                <Box sx={{ flex: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={project.progress.percentage}
                                    sx={{
                                      height: 8,
                                      borderRadius: 4,
                                      bgcolor: "#e2e8f0",
                                      "& .MuiLinearProgress-bar": {
                                        bgcolor: getProgressColor(
                                          project.progress.percentage
                                        ),
                                      },
                                    }}
                                  />
                                </Box>
                                <Typography
                                  variant="body2"
                                  fontWeight={500}
                                  sx={{
                                    color: getProgressColor(
                                      project.progress.percentage
                                    ),
                                    minWidth: 45,
                                  }}
                                >
                                  {project.progress.percentage}%
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 2,
                                  flexWrap: "wrap",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <CheckCircle
                                    size={14}
                                    color={colors.success}
                                  />
                                  <Typography variant="caption">
                                    {project.progress.completed}/
                                    {project.progress.total} completed
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Users
                                    size={14}
                                    color={colors.info}
                                  />
                                  <Typography variant="caption">
                                    {project.progress.assigned} assigned
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Clock
                                    size={14}
                                    color={textColors.muted}
                                  />
                                  <Typography variant="caption">
                                    Added{" "}
                                    {new Date(
                                      project.added_at
                                    ).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          }
                        />
                        {onNavigateToProject && (
                          <ListItemSecondaryAction>
                            <Tooltip title="View in project">
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() =>
                                  onNavigateToProject(
                                    project.project_id,
                                    details.id
                                  )
                                }
                              >
                                <ExternalLink size={18} />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    </Paper>
                  ))}
                </List>
              )}
            </Box>

            <Divider />

            {/* Framework Structure */}
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                <FileText
                  size={18}
                  style={{ verticalAlign: "middle", marginRight: 8 }}
                />
                Framework Structure
              </Typography>

              <Box sx={{ mt: 2 }}>
                {details.structure?.map((level1, idx) => (
                  <Accordion
                    key={level1.id}
                    expanded={expandedLevel1 === idx}
                    onChange={() =>
                      setExpandedLevel1(expandedLevel1 === idx ? false : idx)
                    }
                    sx={{
                      mb: 1,
                      "&:before": { display: "none" },
                      boxShadow: "none",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px !important",
                      overflow: "hidden",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ChevronDown size={18} />}
                      sx={{
                        bgcolor: "#f8fafc",
                        "&:hover": { bgcolor: "#f1f5f9" },
                        minHeight: 48,
                        "& .MuiAccordionSummary-content": { my: 1 },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          width: "100%",
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={500}>
                          {level1.title}
                        </Typography>
                        <Chip
                          label={`${level1.items?.length || 0} ${details.level_2_name}s`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.7rem",
                            bgcolor: "#e2e8f0",
                          }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 2, bgcolor: "#fff" }}>
                      {level1.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {level1.description}
                        </Typography>
                      )}

                      {level1.items?.map((level2) => (
                        <Paper
                          key={level2.id}
                          variant="outlined"
                          sx={{ p: 2, mb: 1, bgcolor: "#fafafa" }}
                        >
                          <Typography variant="body2" fontWeight={500}>
                            {level2.title}
                          </Typography>
                          {level2.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ mt: 0.5 }}
                            >
                              {level2.description}
                            </Typography>
                          )}

                          {/* Level 3 items */}
                          {level2.items && level2.items.length > 0 && (
                            <Box
                              sx={{
                                mt: 1.5,
                                pl: 2,
                                borderLeft: "2px solid #e2e8f0",
                              }}
                            >
                              {level2.items.map((level3) => (
                                <Box key={level3.id} sx={{ py: 0.5 }}>
                                  <Typography variant="caption">
                                    {level3.title}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Box>
          </>
        ) : null}
      </Box>
    </Drawer>
  );
};
