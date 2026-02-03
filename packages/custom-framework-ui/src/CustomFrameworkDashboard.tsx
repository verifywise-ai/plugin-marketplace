/**
 * Custom Framework Dashboard
 *
 * Shows dashboard/overview for custom frameworks.
 * Displays progress and status for all custom frameworks attached to the project.
 * Matches the styling of the organizational frameworks dashboard.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  LinearProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  CircleDashed,
  CircleDot,
  CircleDotDashed,
  CircleCheck,
  FolderOpen,
  ChevronRight,
} from "lucide-react";

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
}

interface FrameworkProgress {
  framework_id: number;
  name: string;
  total: number;
  completed: number;
  percentage: number;
}

interface Level2Item {
  id: number;
  name: string;
  description?: string;
  status?: string;
  owner_id?: number;
  level3_items?: Level3Item[];
}

interface Level3Item {
  id: number;
  name: string;
  description?: string;
  status?: string;
  owner_id?: number;
}

interface FrameworkDetails {
  framework_id: number;
  name: string;
  level2_items: Level2Item[];
}

interface Project {
  id: number;
  project_title: string;
  is_organizational: boolean;
}

interface CustomFrameworkDashboardProps {
  project: Project;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
  };
  // When true, only show categories overview for the specified framework
  showTabContent?: boolean;
  frameworkId?: number;
  frameworkName?: string;
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
  /** Navigation callback for when user clicks on a category card */
  onNavigate?: (frameworkId: number, frameworkName: string) => void;
}

// Card styles matching the organizational frameworks dashboard
const cardStyles = {
  cardContainer: {
    border: "1px solid #d0d5dd",
    borderRadius: "4px",
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: "#F1F3F4",
    p: "10px 16px",
    borderBottom: "1px solid #d0d5dd",
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#000000",
    lineHeight: "16px",
    m: 0,
  },
  cardContentWithGradient: {
    background: "linear-gradient(135deg, #FEFFFE 0%, #F8F9FA 100%)",
    p: "16px",
  },
};

// Tab styles matching Framework page
const tabStyle = {
  textTransform: "none",
  fontWeight: 400,
  alignItems: "center",
  justifyContent: "flex-end",
  padding: "16px 0 7px",
  minHeight: "20px",
  minWidth: "auto",
  "&.Mui-selected": {
    color: "#13715B",
  },
};

const tabListStyle = {
  minHeight: "20px",
  "& .MuiTabs-flexContainer": {
    columnGap: "34px",
  },
};

// Status color mapping
const getStatusColor = (status: string): string => {
  const statusLower = status?.toLowerCase() || "";
  if (statusLower === "implemented" || statusLower === "done" || statusLower === "completed") return "#13715B";
  if (statusLower === "in progress" || statusLower === "in_progress") return "#F59E0B";
  if (statusLower === "awaiting review" || statusLower === "awaiting_review") return "#3B82F6";
  if (statusLower === "awaiting approval" || statusLower === "awaiting_approval") return "#8B5CF6";
  if (statusLower === "draft") return "#D1D5DB";
  if (statusLower === "needs rework" || statusLower === "needs_rework") return "#EA580C";
  return "#9CA3AF"; // Not started / default
};

// localStorage keys for custom framework navigation
const CUSTOM_FRAMEWORK_SELECTED_KEY = "verifywise_custom_framework_selected";
const CUSTOM_FRAMEWORK_EXPANDED_CATEGORY_KEY = "verifywise_custom_framework_expanded_category";

export const CustomFrameworkDashboard: React.FC<CustomFrameworkDashboardProps> = ({
  project,
  apiServices,
  showTabContent,
  frameworkId: propFrameworkId,
  frameworkName: _propFrameworkName,
  pluginKey,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [frameworks, setFrameworks] = useState<CustomFramework[]>([]);
  const [progressData, setProgressData] = useState<FrameworkProgress[]>([]);
  const [frameworkDetails, setFrameworkDetails] = useState<Map<number, FrameworkDetails>>(new Map());
  const [activeTab, setActiveTab] = useState(0);

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

  const apiRef = useRef(apiServices || {
    get: async (url: string) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, { headers });
      return { data: await response.json(), status: response.status };
    },
  });

  // Update ref if apiServices changes
  useEffect(() => {
    if (apiServices) {
      apiRef.current = apiServices;
    }
  }, [apiServices]);

  const loadData = useCallback(async () => {
    const api = apiRef.current;
    if (!project?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch custom frameworks for this project
      const response = await api.get(
        `/plugins/${pluginKey}/projects/${project.id}/custom-frameworks?is_organizational=${project.is_organizational}`
      );

      let rawData = response.data;
      if (rawData && typeof rawData === "object" && "data" in rawData) {
        rawData = rawData.data;
      }
      if (rawData && typeof rawData === "object" && !Array.isArray(rawData) && "data" in rawData) {
        rawData = rawData.data;
      }

      const frameworksArray = Array.isArray(rawData) ? rawData : [];
      setFrameworks(frameworksArray);

      // Fetch progress for each framework
      const progressPromises = frameworksArray.map(async (fw: CustomFramework) => {
        try {
          const progressRes = await api.get(
            `/plugins/${pluginKey}/projects/${project.id}/frameworks/${fw.framework_id}/progress`
          );

          // Debug: log the raw response
          console.log(`[CustomFrameworkDashboard] Progress response for ${fw.name}:`, progressRes.data);

          // Handle different response structures
          // API returns: { data: { overall: { total, completed, ... }, level2: { ... } }, message: "OK" }
          let progressData = progressRes.data;
          if (progressData?.data) {
            progressData = progressData.data;
          }

          // The progress data has nested structure with 'overall' or 'level2' keys
          // Extract from overall first, then level2, then try direct access
          const overallData = progressData?.overall || progressData?.level2 || progressData;

          const total = overallData?.total ?? overallData?.totalControls ?? overallData?.total_controls ?? 0;
          const completed = overallData?.completed ?? overallData?.completedControls ?? overallData?.completed_controls ?? overallData?.done ?? 0;
          const percentage = overallData?.percentage ?? overallData?.progress ??
            (total > 0 ? Math.round((completed / total) * 100) : 0);

          console.log(`[CustomFrameworkDashboard] Parsed progress for ${fw.name}: total=${total}, completed=${completed}, percentage=${percentage}`);

          return {
            framework_id: fw.framework_id,
            name: fw.name,
            total,
            completed,
            percentage,
          };
        } catch (error) {
          console.error(`[CustomFrameworkDashboard] Error fetching progress for ${fw.name}:`, error);
          return {
            framework_id: fw.framework_id,
            name: fw.name,
            total: 0,
            completed: 0,
            percentage: 0,
          };
        }
      });

      // Fetch details for each framework (for tab panels)
      // Use project-specific endpoint to get implementation status
      const detailsMap = new Map<number, FrameworkDetails>();
      for (const fw of frameworksArray) {
        try {
          const detailsRes = await api.get(
            `/plugins/${pluginKey}/projects/${project.id}/frameworks/${fw.framework_id}`
          );

          console.log(`[CustomFrameworkDashboard] Details response for ${fw.name}:`, detailsRes.data);

          let detailsData = detailsRes.data?.data || detailsRes.data || {};

          console.log(`[CustomFrameworkDashboard] Unwrapped details data:`, detailsData);
          console.log(`[CustomFrameworkDashboard] Available keys:`, Object.keys(detailsData));

          // API returns { structure: [level1Items], ... }
          // Each level1 has { items: [level2Items] }
          // Each level2 (in three_level hierarchy) has { items: [level3Items] }
          const structureData = detailsData.structure || [];
          console.log(`[CustomFrameworkDashboard] Structure data (${structureData.length} level1 items):`, structureData);

          // For the categories overview, we show level1 items as cards
          // Each level1's children (level2 items) are shown as mini squares
          // For two_level hierarchy: level1 -> level2 (controls)
          // For three_level hierarchy: level1 -> level2 -> level3 (controls)
          const level2Items: Level2Item[] = structureData.map((level1: any) => {
            // Get level2 children (or use as leaf items for two-level)
            const level2Children = level1.items || [];

            // For three_level, level2 has level3 children
            // For two_level, level2 items are the leaf controls
            const level3Items = level2Children.flatMap((l2: any) => {
              if (l2.items && l2.items.length > 0) {
                // Three level: return level3 items
                return l2.items.map((l3: any) => ({
                  id: l3.id,
                  name: l3.name || l3.title,
                  description: l3.description,
                  status: l3.status || "Not Started",
                  owner_id: l3.owner_id,
                }));
              } else {
                // Two level: level2 item is the leaf control
                return [{
                  id: l2.id,
                  name: l2.name || l2.title,
                  description: l2.description,
                  status: l2.status || "Not Started",
                  owner_id: l2.owner_id,
                }];
              }
            });

            return {
              id: level1.id,
              name: level1.name || level1.title,
              description: level1.description,
              status: level1.status || "Not Started",
              owner_id: level1.owner_id,
              level3_items: level3Items,
            };
          });

          console.log(`[CustomFrameworkDashboard] Processed level2 items:`, level2Items);

          detailsMap.set(fw.framework_id, {
            framework_id: fw.framework_id,
            name: fw.name,
            level2_items: level2Items,
          });
        } catch {
          detailsMap.set(fw.framework_id, {
            framework_id: fw.framework_id,
            name: fw.name,
            level2_items: [],
          });
        }
      }
      setFrameworkDetails(detailsMap);

      const progress = await Promise.all(progressPromises);
      setProgressData(progress);
    } catch (err) {
      console.error("[CustomFrameworkDashboard] Error loading data:", err);
      setFrameworks([]);
      setProgressData([]);
      setFrameworkDetails(new Map());
    } finally {
      setLoading(false);
    }
  }, [project?.id, pluginKey]);

  // Use ref to avoid stale closure in event listener
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for custom framework changes from CustomFrameworkCards
  useEffect(() => {
    const handleCustomFrameworkChange = (event: CustomEvent) => {
      console.log("[CustomFrameworkDashboard] Received event:", event.detail);
      if (event.detail?.projectId === project?.id) {
        console.log("[CustomFrameworkDashboard] Reloading data...");
        loadDataRef.current();
      }
    };

    window.addEventListener("customFrameworkChanged", handleCustomFrameworkChange as EventListener);
    return () => {
      window.removeEventListener("customFrameworkChanged", handleCustomFrameworkChange as EventListener);
    };
  }, [project?.id]);

  // Helper functions matching the organizational dashboard
  const calculateProgress = (done: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return "#DC2626"; // Red
    if (percentage < 60) return "#EA580C"; // Orange
    if (percentage < 85) return "#F59E0B"; // Yellow
    return "#13715B"; // Green
  };

  const getProgressIcon = (percentage: number) => {
    if (percentage === 0) return <CircleDashed size={14} style={{ color: "#9CA3AF" }} />;
    if (percentage < 30) return <CircleDashed size={14} style={{ color: "#DC2626" }} />;
    if (percentage < 60) return <CircleDot size={14} style={{ color: "#EA580C" }} />;
    if (percentage < 85) return <CircleDotDashed size={14} style={{ color: "#F59E0B" }} />;
    if (percentage < 100) return <CircleDotDashed size={14} style={{ color: "#13715B" }} />;
    return <CircleCheck size={14} style={{ color: "#13715B" }} />;
  };

  const getAssignmentIcon = (done: number, total: number) => {
    if (total === 0) return <CircleDashed size={14} style={{ color: "#9CA3AF" }} />;
    const percentage = (done / total) * 100;
    if (percentage === 0) return <CircleDashed size={14} style={{ color: "#DC2626" }} />;
    if (percentage < 30) return <CircleDashed size={14} style={{ color: "#DC2626" }} />;
    if (percentage < 60) return <CircleDot size={14} style={{ color: "#EA580C" }} />;
    if (percentage < 85) return <CircleDotDashed size={14} style={{ color: "#F59E0B" }} />;
    if (percentage < 100) return <CircleDotDashed size={14} style={{ color: "#13715B" }} />;
    return <CircleCheck size={14} style={{ color: "#13715B" }} />;
  };

  // Render mini squares for status visualization
  const renderMiniSquares = (items: Level3Item[]) => {
    if (items.length === 0) {
      return (
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "2px",
            backgroundColor: "#E5E7EB",
            border: "1px solid #D1D5DB",
          }}
        />
      );
    }

    return items.map((item, index) => (
      <Box
        key={index}
        sx={{
          width: 12,
          height: 12,
          borderRadius: "2px",
          backgroundColor: getStatusColor(item.status || "Not Started"),
        }}
      />
    ));
  };

  // Handle navigation from dashboard cards to controls page
  const handleNavigateToControls = useCallback((fwId: number, fwName: string, categoryId?: number) => {
    // Store the selected custom framework in localStorage
    localStorage.setItem(CUSTOM_FRAMEWORK_SELECTED_KEY, JSON.stringify({
      frameworkId: fwId,
      frameworkName: fwName,
    }));

    // Store the category to expand (if provided)
    if (categoryId !== undefined) {
      localStorage.setItem(CUSTOM_FRAMEWORK_EXPANDED_CATEGORY_KEY, categoryId.toString());
    } else {
      localStorage.removeItem(CUSTOM_FRAMEWORK_EXPANDED_CATEGORY_KEY);
    }

    // Use parent's navigate function for SPA navigation (no page refresh)
    if (onNavigate) {
      onNavigate(fwId, fwName);
    }
  }, [onNavigate]);

  // Render categories overview for a framework
  const renderCategoriesOverview = (frameworkId: number) => {
    const details = frameworkDetails.get(frameworkId);
    const fw = frameworks.find(f => f.framework_id === frameworkId);

    if (!details || details.level2_items.length === 0) {
      return (
        <Box
          sx={{
            textAlign: "center",
            py: 4,
            backgroundColor: "#F9FAFB",
            borderRadius: 2,
            border: "1px solid #d0d5dd",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No categories available. View details in Controls and Requirements tab.
          </Typography>
        </Box>
      );
    }

    const level1Name = fw?.level_1_name || "Categories";

    const handleCardClick = (categoryId: number) => {
      if (fw) {
        handleNavigateToControls(fw.framework_id, fw.name, categoryId);
      }
    };

    return (
      <Stack spacing={2}>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 600,
            color: "#000000",
          }}
        >
          {details.name} {level1Name.toLowerCase()} overview
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(3, 1fr)",
            },
            gap: "16px",
          }}
        >
          {details.level2_items.map((category) => {
            const items = category.level3_items || [];
            const completedCount = items.filter(
              (item) =>
                item.status?.toLowerCase() === "implemented" ||
                item.status?.toLowerCase() === "done" ||
                item.status?.toLowerCase() === "completed"
            ).length;
            const assignedCount = items.filter(item => item.owner_id != null).length;

            return (
              <Box
                key={category.id}
                sx={{
                  border: "1px solid #d0d5dd",
                  borderRadius: "4px",
                  overflow: "hidden",
                  backgroundColor: "#FFFFFF",
                }}
              >
                {/* Header Section */}
                <Box
                  sx={{
                    backgroundColor: "#F1F3F4",
                    p: "10px 16px",
                    borderBottom: "1px solid #d0d5dd",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FolderOpen size={14} style={{ color: "#666666" }} />
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#000000",
                        lineHeight: "16px",
                        m: 0,
                      }}
                    >
                      {category.name}
                    </Typography>
                  </Box>
                  <Box
                    onClick={() => handleCardClick(category.id)}
                    sx={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      p: "4px",
                      borderRadius: "4px",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <ChevronRight size={16} style={{ color: "#666666" }} />
                  </Box>
                </Box>

                {/* Content Section */}
                <Box
                  sx={{
                    background: "linear-gradient(135deg, #FEFFFE 0%, #F8F9FA 100%)",
                    p: "16px",
                  }}
                >
                  {/* Mini squares grid */}
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "3px",
                      mb: 3,
                      maxWidth: "100%",
                      minHeight: "36px",
                    }}
                  >
                    {renderMiniSquares(items)}
                  </Box>

                  {/* Statistics */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: "#000000",
                          fontWeight: 600,
                        }}
                      >
                        {completedCount}/{items.length}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: "#666666",
                        }}
                      >
                        completed
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: "#000000",
                          fontWeight: 600,
                        }}
                      >
                        {assignedCount}/{items.length}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: "#666666",
                        }}
                      >
                        assigned
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Stack>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If showTabContent is true, only render categories overview for the specified framework
  if (showTabContent && propFrameworkId) {
    // Check if we have the details for this framework
    const hasDetails = frameworkDetails.has(propFrameworkId);

    console.log(`[CustomFrameworkDashboard] Tab content mode for frameworkId=${propFrameworkId}`, {
      loading,
      hasDetails,
      frameworkDetailsKeys: Array.from(frameworkDetails.keys()),
      frameworksCount: frameworks.length,
    });

    if (loading || !hasDetails) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100px",
          }}
        >
          <CircularProgress size={24} />
        </Box>
      );
    }

    return (
      <Box>
        {renderCategoriesOverview(propFrameworkId)}
      </Box>
    );
  }

  if (frameworks.length === 0) {
    return null; // Don't render anything if no custom frameworks
  }

  return (
    <Stack spacing={0}>
      {/* Visual separator and section header for custom frameworks */}
      <Box
        sx={{
          mt: 6,
          mb: 3,
          pt: 4,
          borderTop: "1px solid #E5E7EB",
        }}
      >
        <Box
          sx={{
            pb: 2,
            borderBottom: "2px solid #7C3AED",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 4,
              height: 20,
              backgroundColor: "#7C3AED",
              borderRadius: 1,
            }}
          />
          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 600,
              color: "#101828",
            }}
          >
            Custom Frameworks
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: "#667085",
              ml: 1,
            }}
          >
            Imported compliance frameworks
          </Typography>
        </Box>
      </Box>

      {/* Top row: 3 cards in a grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, 1fr)",
          },
          gap: "16px",
        }}
      >
        {/* Framework Progress Card */}
        <Box sx={cardStyles.cardContainer}>
          <Box sx={cardStyles.cardHeader}>
            <Typography sx={cardStyles.cardHeaderTitle}>
              Framework progress
            </Typography>
          </Box>
          <Box sx={cardStyles.cardContentWithGradient}>
            <Typography
              sx={{
                fontSize: 12,
                color: "#666666",
                mb: 6,
                lineHeight: "16px"
              }}
            >
              Track implementation progress across custom frameworks.
            </Typography>

            <Stack spacing={0}>
              {progressData.map((framework, index) => {
                const percent = calculateProgress(framework.completed, framework.total);

                return (
                  <Box key={framework.framework_id}>
                    {index > 0 && (
                      <Box
                        sx={{
                          height: "1px",
                          backgroundColor: "#E5E7EB",
                          mx: "-16px",
                          mb: 4,
                          mt: 1,
                        }}
                      />
                    )}

                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 500,
                        mb: 2,
                        color: "#000000",
                      }}
                    >
                      {framework.name}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto 1fr",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Typography sx={{ fontSize: 12, color: "#666666" }}>
                          Controls
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
                          <Typography sx={{ fontSize: 12, color: "#000000", fontWeight: 500 }}>
                            {framework.completed}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "#000000", fontWeight: 500 }}>
                            /
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "#999999", fontWeight: 500 }}>
                            {framework.total}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
                          {getProgressIcon(percent)}
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: percent === 100 ? "#13715B" : "#666666",
                              fontWeight: 500,
                            }}
                          >
                            {percent}%
                          </Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#F3F4F6",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: getProgressColor(percent),
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>

                    {index < progressData.length - 1 && <Box sx={{ mb: 4 }} />}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>

        {/* Assignment Status Card */}
        <Box sx={cardStyles.cardContainer}>
          <Box sx={cardStyles.cardHeader}>
            <Typography sx={cardStyles.cardHeaderTitle}>
              Assignment status
            </Typography>
          </Box>
          <Box sx={cardStyles.cardContentWithGradient}>
            <Typography
              sx={{
                fontSize: 12,
                color: "#666666",
                mb: 6,
                lineHeight: "16px"
              }}
            >
              Monitor completion status for custom frameworks.
            </Typography>

            <Stack spacing={0}>
              {progressData.map((framework, index) => (
                <Box key={framework.framework_id}>
                  {index > 0 && (
                    <Box
                      sx={{
                        height: "1px",
                        backgroundColor: "#E5E7EB",
                        mx: "-16px",
                        mb: 4,
                        mt: 1,
                      }}
                    />
                  )}

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 500,
                      mb: 2,
                      color: "#000000",
                    }}
                  >
                    {framework.name}
                  </Typography>

                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography sx={{ fontSize: 12, color: "#666666" }}>
                        Controls
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {getAssignmentIcon(framework.completed, framework.total)}
                        <Typography sx={{ fontSize: 12, color: "#000000", fontWeight: 500 }}>
                          {framework.completed}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#000000", fontWeight: 500 }}>
                          /
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#999999", fontWeight: 500 }}>
                          {framework.total}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#666666", fontWeight: 400, ml: 1 }}>
                          completed
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>

                  {index < progressData.length - 1 && <Box sx={{ mb: 4 }} />}
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        {/* Status Breakdown Card */}
        <Box sx={cardStyles.cardContainer}>
          <Box sx={cardStyles.cardHeader}>
            <Typography sx={cardStyles.cardHeaderTitle}>
              Status breakdown
            </Typography>
          </Box>
          <Box sx={cardStyles.cardContentWithGradient}>
            <Stack spacing={0}>
              {progressData.map((framework, index) => {
                const notStarted = framework.total - framework.completed;
                const completed = framework.completed;

                const statusItems = [
                  { label: "Not Started", value: notStarted, color: "#9CA3AF" },
                  { label: "Completed", value: completed, color: "#13715B" },
                ];

                return (
                  <Box key={framework.framework_id}>
                    {index > 0 && (
                      <Box
                        sx={{
                          height: "1px",
                          backgroundColor: "#E5E7EB",
                          mx: "-16px",
                          mb: 4,
                          mt: 1,
                        }}
                      />
                    )}

                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#000000",
                        mb: 2,
                      }}
                    >
                      {framework.name}
                    </Typography>

                    <Stack spacing={0.5}>
                      {statusItems.map((item, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: item.color,
                              }}
                            />
                            <Typography sx={{ fontSize: 12, color: "#666666" }}>
                              {item.label}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 12, color: "#000000", fontWeight: 500 }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>

                    {index < progressData.length - 1 && <Box sx={{ mb: 4 }} />}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Spacer */}
      <Box sx={{ height: "16px" }} />

      {/* Tab Bar for framework details */}
      {progressData.length > 0 && (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={activeTab}
              onChange={(_e, newValue) => setActiveTab(newValue)}
              TabIndicatorProps={{ style: { backgroundColor: "#13715B" } }}
              sx={tabListStyle}
            >
              {progressData.map((fw) => (
                <Tab
                  key={fw.framework_id}
                  label={fw.name}
                  sx={tabStyle}
                  disableRipple
                />
              ))}
            </Tabs>
          </Box>
          {/* 16px spacing after tab bar */}
          <Box sx={{ height: "16px" }} />

          {/* Tab Panels */}
          {progressData.map((framework, index) => (
            <Box
              key={framework.framework_id}
              sx={{ display: activeTab === index ? "block" : "none" }}
            >
              {renderCategoriesOverview(framework.framework_id)}
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  );
};

export default CustomFrameworkDashboard;
