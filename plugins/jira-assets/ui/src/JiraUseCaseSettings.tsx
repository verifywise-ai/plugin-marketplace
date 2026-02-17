/**
 * JIRA Use Case Settings
 * Shows all JIRA object attributes with the EXACT same styling as native ProjectSettings
 */

import React from "react";
import {
  Stack,
  Typography,
  Box,
  Chip,
  useTheme,
} from "@mui/material";
import { Database } from "lucide-react";

interface JiraUseCaseSettingsProps {
  project: {
    project_title?: string;
    uc_id?: string;
    _jira_data?: {
      id?: string;
      label?: string;
      objectKey?: string;
      objectType?: { name?: string };
      created?: string;
      updated?: string;
      attributes?: Record<string, any>;
      _links?: {
        self?: string;
      };
    };
    _sync_status?: string;
  } | null;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value) || "-";
};

// Exact same styles as ProjectSettings/styles.ts
const useStyles = () => {
  const theme = useTheme();

  return {
    root: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: theme.spacing(4),
      fontSize: 13,
      width: '100%',
      margin: '0 auto',
    },
    card: {
      background: theme.palette.background.paper,
      border: `1.5px solid ${(theme.palette as any).border?.light || '#E5E7EB'}`,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(5, 6),
      marginBottom: theme.spacing(4),
      boxShadow: 'none',
      width: '100%',
    },
    sectionTitle: {
      fontWeight: 600,
      fontSize: 16,
      marginBottom: theme.spacing(2),
      color: theme.palette.text.primary,
    },
    gridContainer: {
      display: "grid",
      gridTemplateColumns: "220px 1fr",
      rowGap: "25px",
      columnGap: "250px",
      alignItems: "center",
      mt: 2,
    },
    labelTitle: {
      fontSize: 13,
      fontWeight: 500,
    },
    labelDescription: {
      fontSize: 12,
      color: "#888",
      mt: 0.5,
    },
    valueField: {
      backgroundColor: "#F9FAFB",
      border: "1px solid #E5E7EB",
      borderRadius: "4px",
      padding: "8px 14px",
      fontSize: 13,
      color: "#344054",
      minHeight: "34px",
      display: "flex",
      alignItems: "center",
      width: 400,
    },
    multilineValue: {
      backgroundColor: "#F9FAFB",
      border: "1px solid #E5E7EB",
      borderRadius: "4px",
      padding: "8px 14px",
      fontSize: 13,
      color: "#344054",
      minHeight: "60px",
      width: 400,
      whiteSpace: "pre-wrap" as const,
      wordBreak: "break-word" as const,
    },
  };
};

export const JiraUseCaseSettings: React.FC<JiraUseCaseSettingsProps> = ({ project }) => {
  const styles = useStyles();

  if (!project) {
    return <Typography>No JIRA use case found</Typography>;
  }

  const jiraData = project._jira_data;
  const attributes = jiraData?.attributes || {};

  // Render a read-only field row (matching ProjectSettings grid row pattern)
  const renderFieldRow = (label: string, description: string | null, value: any, isMultiline = false) => (
    <>
      <Box>
        <Typography sx={styles.labelTitle}>{label}</Typography>
        {description && (
          <Typography sx={styles.labelDescription}>{description}</Typography>
        )}
      </Box>
      <Box sx={isMultiline ? styles.multilineValue : styles.valueField}>
        {formatValue(value)}
      </Box>
    </>
  );

  // Categorize JIRA attributes for organized display
  const identificationAttrs = [
    "System Name / Identifier",
    "Name",
    "Description / Purpose",
    "Description",
    "Purpose",
  ];

  const ownershipAttrs = [
    "Business Owner / Responsible Team",
    "Technical Owner / Maintainer",
    "AI Officer",
    "Model Owner / Maintainer",
    "Risk Owner",
    "Vendor / Developer Name (if third-party)",
  ];

  const classificationAttrs = [
    "Lifecycle Status",
    "Primary Function",
    "Use Case / Business Process Supported",
    "User Groups / Stakeholders",
    "Decision Type",
    "AI Function Type",
  ];

  const riskAttrs = [
    "Risk Level / Criticality",
    "Potential Harms or Impacts",
    "Known Limitations",
    "Applicable Regulations",
  ];

  const technicalAttrs = [
    "Input Data Sources & Types",
    "Contains Personal / Sensitive Data",
    "Deployment Environment",
    "Platform / Tooling",
    "Model Type / Algorithm & Version",
    "Key Performance Metrics",
    "Explainability Method",
    "Human Oversight Mechanisms",
  ];

  const categorizedAttrs = [
    ...identificationAttrs,
    ...ownershipAttrs,
    ...classificationAttrs,
    ...riskAttrs,
    ...technicalAttrs,
  ];

  const otherAttrs = Object.keys(attributes).filter(
    (key) => !categorizedAttrs.includes(key)
  );

  // Render attribute rows for a category
  const renderCategoryRows = (attrKeys: string[]) => {
    return attrKeys
      .filter((key) => attributes[key] !== undefined)
      .map((key) => {
        const value = attributes[key];
        const isMultiline = String(value || "").length > 80;
        return (
          <React.Fragment key={key}>
            {renderFieldRow(key, null, value, isMultiline)}
          </React.Fragment>
        );
      });
  };

  return (
    <Stack>
      <Box sx={styles.root}>
        {/* JIRA Source Badge */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
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

        {/* Use Case Overview Card - matches native ProjectSettings */}
        <Box sx={styles.card}>
          <Typography sx={styles.sectionTitle}>Use Case Overview</Typography>
          <Box sx={styles.gridContainer}>
            {renderFieldRow(
              "Use case title",
              "Imported from JIRA Assets",
              project.project_title
            )}
            {renderFieldRow(
              "Use case ID",
              "Generated identifier for this use case",
              project.uc_id
            )}
            {renderFieldRow(
              "JIRA object key",
              "Original key in JIRA Assets",
              jiraData?.objectKey
            )}
            {renderFieldRow(
              "Sync status",
              "Current synchronization state",
              project._sync_status || "synced"
            )}
          </Box>
        </Box>

        {/* JIRA Details Card */}
        <Box sx={styles.card}>
          <Typography sx={styles.sectionTitle}>JIRA Details</Typography>
          <Box sx={styles.gridContainer}>
            {renderFieldRow(
              "Object type",
              "JIRA Assets object type",
              jiraData?.objectType?.name
            )}
            {renderFieldRow(
              "Created in JIRA",
              "When this object was created",
              formatDate(jiraData?.created)
            )}
            {renderFieldRow(
              "Last updated in JIRA",
              "When this object was last modified",
              formatDate(jiraData?.updated)
            )}
            {renderFieldRow(
              "JIRA Object ID",
              "Internal JIRA identifier",
              jiraData?.id
            )}
          </Box>
        </Box>

        {/* Identification & Description Card */}
        {identificationAttrs.some((key) => attributes[key] !== undefined) && (
          <Box sx={styles.card}>
            <Typography sx={styles.sectionTitle}>Identification & Description</Typography>
            <Box sx={styles.gridContainer}>
              {renderCategoryRows(identificationAttrs)}
            </Box>
          </Box>
        )}

        {/* Ownership & Governance Card */}
        {ownershipAttrs.some((key) => attributes[key] !== undefined) && (
          <Box sx={styles.card}>
            <Typography sx={styles.sectionTitle}>Ownership & Governance</Typography>
            <Box sx={styles.gridContainer}>
              {renderCategoryRows(ownershipAttrs)}
            </Box>
          </Box>
        )}

        {/* Classification & Function Card */}
        {classificationAttrs.some((key) => attributes[key] !== undefined) && (
          <Box sx={styles.card}>
            <Typography sx={styles.sectionTitle}>Classification & Function</Typography>
            <Box sx={styles.gridContainer}>
              {renderCategoryRows(classificationAttrs)}
            </Box>
          </Box>
        )}

        {/* Risk & Compliance Card */}
        {riskAttrs.some((key) => attributes[key] !== undefined) && (
          <Box sx={styles.card}>
            <Typography sx={styles.sectionTitle}>Risk & Compliance</Typography>
            <Box sx={styles.gridContainer}>
              {renderCategoryRows(riskAttrs)}
            </Box>
          </Box>
        )}

        {/* Technical Details Card */}
        {technicalAttrs.some((key) => attributes[key] !== undefined) && (
          <Box sx={styles.card}>
            <Typography sx={styles.sectionTitle}>Technical Details</Typography>
            <Box sx={styles.gridContainer}>
              {renderCategoryRows(technicalAttrs)}
            </Box>
          </Box>
        )}

        {/* Other Attributes Card */}
        {otherAttrs.length > 0 && (
          <Box sx={styles.card}>
            <Typography sx={styles.sectionTitle}>Other Attributes</Typography>
            <Box sx={styles.gridContainer}>
              {renderCategoryRows(otherAttrs)}
            </Box>
          </Box>
        )}

        {/* No attributes message */}
        {Object.keys(attributes).length === 0 && (
          <Box sx={styles.card}>
            <Typography sx={styles.sectionTitle}>JIRA Attributes</Typography>
            <Typography sx={{ color: "#6B7280", fontStyle: "italic" }}>
              No attributes available for this object
            </Typography>
          </Box>
        )}
      </Box>
    </Stack>
  );
};

export default JiraUseCaseSettings;
