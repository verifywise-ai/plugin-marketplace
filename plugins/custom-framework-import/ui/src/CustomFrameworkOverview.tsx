/**
 * Custom Framework Overview
 *
 * Shows custom framework completion status in the use-case overview page.
 * Matches the styling of GroupStatsCard used for EU AI Act and ISO 42001.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Stack,
  Typography,
  LinearProgress,
} from "@mui/material";

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

interface Project {
  id: number;
  project_title: string;
  is_organizational?: boolean;
}

interface CustomFrameworkOverviewProps {
  project: Project;
  columnStyle?: any;
  projectRiskSection?: any;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
  };
}

// Styles matching GroupStatsCard
const GroupStatsCardFrame = {
  display: "flex",
  flexDirection: "row" as const,
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  minWidth: "300px",
  maxWidth: "100%",
  gap: "40px",
  backgroundColor: "white",
  padding: "10px 25px",
  border: "1px solid #d0d5dd",
  borderRadius: "4px",
  boxShadow: "none",
};

const GroupStatsCardRate = {
  color: "#2D3748",
  fontSize: 26,
};

const projectRiskSectionDefault = {
  color: "#1A1919",
  fontWeight: 600,
  mb: "10px",
  fontSize: 16,
};

const columnStyleDefault = {
  width: "100%",
};

// Progress bar color function matching the app's ProgressBar
const getProgressColor = (value: number): string => {
  if (value <= 10) return "#FF4500";
  if (value <= 20) return "#FF4500";
  if (value <= 30) return "#FFA500";
  if (value <= 40) return "#FFD700";
  if (value <= 50) return "#E9F14F";
  if (value <= 60) return "#CDDD24";
  if (value <= 70) return "#64E730";
  if (value <= 80) return "#32CD32";
  if (value <= 90) return "#228B22";
  return "#008000";
};

export const CustomFrameworkOverview: React.FC<CustomFrameworkOverviewProps> = ({
  project,
  columnStyle,
  projectRiskSection,
  apiServices,
}) => {
  const [frameworks, setFrameworks] = useState<CustomFramework[]>([]);
  const [progressData, setProgressData] = useState<FrameworkProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveColumnStyle = columnStyle || columnStyleDefault;
  const effectiveProjectRiskSection = projectRiskSection || projectRiskSectionDefault;

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

  const api = useMemo(() => apiServices || {
    get: async (url: string) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, { headers });
      return { data: await response.json(), status: response.status };
    },
  }, [apiServices]);

  const loadData = useCallback(async () => {
    if (!project?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch custom frameworks for this project
      const response = await api.get(
        `/plugins/custom-framework-import/projects/${project.id}/custom-frameworks`
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
            `/plugins/custom-framework-import/projects/${project.id}/frameworks/${fw.framework_id}/progress`
          );
          // Handle nested response: { data: { overall: { total, completed }, level2: {...} } }
          const progressData = progressRes.data?.data || progressRes.data || {};
          const overallData = progressData?.overall || progressData?.level2 || progressData;
          return {
            framework_id: fw.framework_id,
            name: fw.name,
            total: overallData?.total || 0,
            completed: overallData?.completed || 0,
            percentage: overallData?.percentage || 0,
          };
        } catch {
          return {
            framework_id: fw.framework_id,
            name: fw.name,
            total: 0,
            completed: 0,
            percentage: 0,
          };
        }
      });

      const progress = await Promise.all(progressPromises);
      setProgressData(progress);
    } catch (err) {
      console.error("[CustomFrameworkOverview] Error loading data:", err);
      setFrameworks([]);
      setProgressData([]);
    } finally {
      setLoading(false);
    }
  }, [project?.id, api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for custom framework changes
  useEffect(() => {
    const handleCustomFrameworkChange = (event: CustomEvent) => {
      if (event.detail?.projectId === project?.id) {
        loadData();
      }
    };

    window.addEventListener(
      "customFrameworkChanged" as any,
      handleCustomFrameworkChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "customFrameworkChanged" as any,
        handleCustomFrameworkChange as EventListener
      );
    };
  }, [loadData, project?.id]);

  // Don't render if loading or no frameworks
  if (loading || frameworks.length === 0) {
    return null;
  }

  return (
    <>
      {progressData.map((framework) => {
        const percentage = framework.total > 0
          ? Math.floor((framework.completed / framework.total) * 100)
          : 0;

        return (
          <Stack key={framework.framework_id} sx={effectiveColumnStyle}>
            <Typography sx={effectiveProjectRiskSection}>
              {framework.name} Completion Status
            </Typography>
            <Box sx={GroupStatsCardFrame}>
              <Stack
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  mt: "10px",
                }}
              >
                <Stack sx={{ gap: 1 }}>
                  {/* Progress Bar */}
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      height: 8,
                      borderRadius: 0,
                      backgroundColor: "#e0e0e0",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: getProgressColor(percentage),
                        borderRadius: 0,
                      },
                    }}
                  />
                  <Typography
                    sx={{
                      color: "#8594AC",
                      fontSize: 13,
                    }}
                  >
                    {`${framework.completed} Controls out of ${framework.total} is completed`}
                  </Typography>
                </Stack>
              </Stack>
              <Stack sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Typography sx={GroupStatsCardRate}>
                  {`${percentage}%`}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        );
      })}
    </>
  );
};

export default CustomFrameworkOverview;
