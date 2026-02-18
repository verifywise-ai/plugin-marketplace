/**
 * JIRA Use Case Settings
 * Shows all JIRA attributes in a two-column grid (matching native ProjectSettings)
 */

import React, { useEffect, useState } from "react";
import {
  Stack,
  Typography,
  Box,
  Chip,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { Database } from "lucide-react";

interface ApiServices {
  get: (url: string, config?: any) => Promise<{ data: any }>;
}

interface JiraUseCaseSettingsProps {
  project: {
    id?: number;
  } | null;
  apiServices?: ApiServices;
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value) || "-";
};

// Styles matching ProjectSettings exactly
const useStyles = () => {
  const theme = useTheme();
  const borderLight = (theme.palette as any).border?.light || "#E5E7EB";
  const borderDark = (theme.palette as any).border?.dark || "#D0D5DD";

  return {
    root: {
      display: "flex",
      flexDirection: "column" as const,
      gap: theme.spacing(4),
      fontSize: 13,
      width: "100%",
      margin: "0 auto",
    },
    card: {
      background: theme.palette.background.paper,
      border: `1.5px solid ${borderLight}`,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(5, 6),
      marginBottom: theme.spacing(4),
      boxShadow: "none",
      width: "100%",
    },
    sectionTitle: {
      fontWeight: 600,
      fontSize: 16,
      marginBottom: theme.spacing(10),
      color: theme.palette.text.primary,
    },
    // Two-column grid matching native ProjectSettings
    gridContainer: {
      display: "grid",
      gridTemplateColumns: "220px 1fr",
      rowGap: "25px",
      columnGap: "250px",
      alignItems: "start",
      mt: 2,
    },
    labelCell: {
      fontSize: 13,
      fontWeight: 500,
      color: theme.palette.text.primary,
    },
    // Clean value display box
    valueBox: {
      width: 400,
      padding: "10px 14px",
      backgroundColor: (theme.palette as any).background?.fill || "#F9FAFB",
      border: `1px solid ${borderDark}`,
      borderRadius: theme.shape.borderRadius,
      fontSize: 13,
      color: theme.palette.text.secondary,
      wordBreak: "break-word" as const,
      minHeight: "40px",
      display: "flex",
      alignItems: "center",
    },
    // Multiline value box
    valueBoxMultiline: {
      width: 400,
      padding: "10px 14px",
      backgroundColor: (theme.palette as any).background?.fill || "#F9FAFB",
      border: `1px solid ${borderDark}`,
      borderRadius: theme.shape.borderRadius,
      fontSize: 13,
      color: theme.palette.text.secondary,
      wordBreak: "break-word" as const,
      whiteSpace: "pre-wrap" as const,
      lineHeight: 1.5,
    },
  };
};

export const JiraUseCaseSettings: React.FC<JiraUseCaseSettingsProps> = ({ project, apiServices }) => {
  const styles = useStyles();
  const [jiraData, setJiraData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project?.id) {
      setLoading(false);
      return;
    }

    const fetchJiraData = async () => {
      try {
        setLoading(true);
        if (apiServices) {
          const response = await apiServices.get(`/plugins/jira-assets/use-cases/${project.id}`);
          const data = response.data?.data || response.data;
          // Only use the _jira_data field - the raw JIRA object
          setJiraData(data?._jira_data || null);
        } else {
          const response = await fetch(`/api/plugins/jira-assets/use-cases/${project.id}`);
          if (!response.ok) {
            throw new Error("Failed to fetch JIRA data");
          }
          const data = await response.json();
          // Only use the _jira_data field - the raw JIRA object
          setJiraData(data?._jira_data || null);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJiraData();
  }, [project?.id, apiServices]);

  if (!project) {
    return <Typography>No use case found</Typography>;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">Error loading JIRA data: {error}</Typography>;
  }

  // Just use the attributes object - the actual JIRA custom fields
  const attributes = jiraData?.attributes || {};
  const allFields = Object.entries(attributes).map(([key, value]) => ({ key, value }));

  // Render a row in the two-column grid (label left, value right)
  const renderRow = (label: string, value: any) => {
    const formattedValue = formatValue(value);
    const isMultiline = formattedValue.length > 80;

    return (
      <React.Fragment key={label}>
        {/* Label cell */}
        <Box>
          <Typography sx={styles.labelCell}>{label}</Typography>
        </Box>
        {/* Value cell */}
        <Box sx={isMultiline ? styles.valueBoxMultiline : styles.valueBox}>
          {formattedValue}
        </Box>
      </React.Fragment>
    );
  };

  return (
    <Stack sx={styles.root}>
      {/* JIRA Source Badge */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Chip
          icon={<Database size={14} />}
          label="JIRA Assets Object"
          size="small"
          sx={{
            backgroundColor: "#E3F2FD",
            color: "#1565C0",
            "& .MuiChip-icon": { color: "#1565C0" },
          }}
        />
        <Typography sx={{ fontSize: 13, color: "#6B7280" }}>
          This use case is imported from JIRA and is read-only
        </Typography>
      </Box>

      {/* All Attributes - Two Column Grid */}
      <Box sx={styles.card}>
        <Typography sx={styles.sectionTitle}>
          JIRA Attributes ({allFields.length})
        </Typography>
        {allFields.length > 0 ? (
          <Box sx={styles.gridContainer}>
            {allFields.map(({ key, value }) => renderRow(key, value))}
          </Box>
        ) : (
          <Typography sx={{ color: "#6B7280", fontStyle: "italic" }}>
            No attributes available
          </Typography>
        )}
      </Box>
    </Stack>
  );
};

export default JiraUseCaseSettings;
