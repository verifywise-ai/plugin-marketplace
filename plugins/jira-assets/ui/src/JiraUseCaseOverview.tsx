/**
 * JIRA Use Case Overview
 * Uses EXACT same styling as native VWProjectOverview
 */

import React from "react";
import { Stack, Typography, Box, Chip, Divider } from "@mui/material";
import {
  Database,
  Key as KeyIcon,
  Box as BoxIcon,
  RefreshCw as SyncIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  AlertTriangle as AlertIcon,
  Activity as ActivityIcon,
  Zap as FunctionIcon,
  Target as TargetIcon,
} from "lucide-react";

interface JiraUseCaseOverviewProps {
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
    });
  } catch {
    return dateStr;
  }
};

// EXACT copy from /Clients/src/presentation/components/Cards/InfoCard/style.ts
const infoCardStyle = {
  border: `1px solid #d0d5dd`,
  borderRadius: 2,
  background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
  minWidth: 228,
  width: "100%",
  padding: "8px 36px 14px 14px",
  position: "relative",
};

const infoCardTitleStyle = {
  fontSize: 13,
  color: "#8594AC",
  pb: "2px",
  textWrap: "wrap",
};

const infoCardbodyStyle = {
  fontSize: 16,
  fontWeight: 600,
  color: "#2D3748",
};

// EXACT copy from /Clients/src/presentation/components/Cards/DescriptionCard/style.ts
const descCardbodyStyle = {
  fontSize: 13,
  color: "#2D3748",
  textAlign: "justify",
};

// EXACT same row/column styles as native Overview
const rowStyle = {
  display: "flex",
  flexDirection: "row" as const,
  gap: 10,
  mb: 10,
};

const columnStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
  width: "100%",
};

const projectRiskSection = {
  color: "#1A1919",
  fontWeight: 600,
  mb: "10px",
  fontSize: 16,
};

// InfoCard - EXACT copy from /Clients/src/presentation/components/Cards/InfoCard/index.tsx
function InfoCard({ title, body, icon }: { title: string; body: string; icon?: React.ReactNode }) {
  return (
    <Stack sx={infoCardStyle}>
      {icon && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "#8594AC",
            opacity: 0.7,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography sx={infoCardTitleStyle}>{title}</Typography>
      <Typography sx={infoCardbodyStyle}>{body}</Typography>
    </Stack>
  );
}

// DescriptionCard - EXACT copy from /Clients/src/presentation/components/Cards/DescriptionCard/index.tsx
function DescriptionCard({ title, body, icon }: { title: string; body: string; icon?: React.ReactNode }) {
  return (
    <Stack sx={infoCardStyle}>
      {icon && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "#8594AC",
            opacity: 0.7,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography sx={infoCardTitleStyle}>{title}</Typography>
      <Typography sx={descCardbodyStyle}>{body}</Typography>
    </Stack>
  );
}

export const JiraUseCaseOverview: React.FC<JiraUseCaseOverviewProps> = ({
  project,
}) => {
  if (!project) {
    return <Typography>No JIRA use case found</Typography>;
  }

  const jiraData = project._jira_data;
  const attributes = jiraData?.attributes || {};

  // Extract key attributes for display
  const description =
    attributes["Description / Purpose"] ||
    attributes["Description"] ||
    attributes["Purpose"] ||
    "No description available";
  const riskLevel = attributes["Risk Level / Criticality"] || "-";
  const lifecycleStatus = attributes["Lifecycle Status"] || "-";
  const primaryFunction = attributes["Primary Function"] || "-";

  return (
    <Stack sx={{ width: "100%" }}>
      {/* Main Content - EXACT same structure as VWProjectOverview */}
      <Stack className="vw-project-overview" sx={{ width: "100%" }}>
        {/* JIRA Source Badge */}
        <Box sx={{ mb: 10 }}>
          <Chip
            icon={<Database size={14} />}
            label="Imported from JIRA Assets"
            size="small"
            sx={{
              backgroundColor: "#E3F2FD",
              color: "#1565C0",
              "& .MuiChip-icon": { color: "#1565C0" },
            }}
          />
        </Box>

        {/* First row - matches native: Owner, Status, Last updated, Last updated by */}
        <Stack className="vw-project-overview-row" sx={rowStyle}>
          <InfoCard
            title="JIRA Object Key"
            body={jiraData?.objectKey || "-"}
            icon={<KeyIcon size={16} />}
          />
          <InfoCard
            title="Object Type"
            body={jiraData?.objectType?.name || "-"}
            icon={<BoxIcon size={16} />}
          />
          <InfoCard
            title="Sync Status"
            body={(project._sync_status || "Synced").charAt(0).toUpperCase() + (project._sync_status || "synced").slice(1)}
            icon={<SyncIcon size={16} />}
          />
        </Stack>

        {/* Second row - dates */}
        <Stack className="vw-project-overview-row" sx={rowStyle}>
          <InfoCard
            title="Created in JIRA"
            body={formatDate(jiraData?.created)}
            icon={<CalendarIcon size={16} />}
          />
          <InfoCard
            title="Last Updated in JIRA"
            body={formatDate(jiraData?.updated)}
            icon={<ClockIcon size={16} />}
          />
        </Stack>

        {/* Key Attributes Section - matches native Goal/Team row pattern */}
        <Stack sx={{ mb: 10 }}>
          <Typography sx={projectRiskSection}>Key Attributes</Typography>
          <Stack className="vw-project-overview-row" sx={rowStyle}>
            <InfoCard
              title="Risk Level / Criticality"
              body={riskLevel}
              icon={<AlertIcon size={16} />}
            />
            <InfoCard
              title="Lifecycle Status"
              body={lifecycleStatus}
              icon={<ActivityIcon size={16} />}
            />
            <InfoCard
              title="Primary Function"
              body={primaryFunction}
              icon={<FunctionIcon size={16} />}
            />
          </Stack>
        </Stack>

        {/* Description Section - matches native DescriptionCard pattern */}
        <Stack className="vw-project-overview-row" sx={rowStyle}>
          <DescriptionCard
            title="Description / Purpose"
            body={description}
            icon={<TargetIcon size={16} />}
          />
        </Stack>

        <Divider />

        {/* Note about no framework/risk data for JIRA objects */}
        <Stack sx={{ gap: 10, mt: 10 }}>
          <Typography sx={projectRiskSection}>Framework & Risk Status</Typography>
          <Box
            sx={{
              ...infoCardStyle,
              minHeight: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                color: "#8594AC",
                textAlign: "center",
              }}
            >
              JIRA-imported use cases don't have native framework or risk
              tracking.
              <br />
              Use the Settings tab to view all JIRA attributes.
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default JiraUseCaseOverview;
