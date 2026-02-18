/**
 * Empty state for JIRA use case tabs that don't have native VW data
 */

import React from "react";
import { Stack, Typography, Box } from "@mui/material";
import { AlertCircle } from "lucide-react";

interface JiraUseCaseEmptyTabProps {
  project: any;
  tabName: string;
  message?: string;
}

export const JiraUseCaseEmptyTab: React.FC<JiraUseCaseEmptyTabProps> = ({
  tabName,
  message,
}) => {
  const defaultMessage = `${tabName} is not available for externally-imported use cases.`;

  return (
    <Stack
      sx={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
        p: 4,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: "#F3F4F6",
          mb: 2,
        }}
      >
        <AlertCircle size={32} color="#9CA3AF" />
      </Box>
      <Typography
        sx={{
          fontSize: 16,
          fontWeight: 500,
          color: "#374151",
          textAlign: "center",
          mb: 1,
        }}
      >
        {message || defaultMessage}
      </Typography>
      <Typography
        sx={{
          fontSize: 14,
          color: "#6B7280",
          textAlign: "center",
          maxWidth: 400,
        }}
      >
        This use case was imported from JIRA Assets. View the Overview or Settings tab for JIRA object details.
      </Typography>
    </Stack>
  );
};

// Pre-configured components for each tab
export const JiraUseCaseRisks: React.FC<{ project: any }> = (props) => (
  <JiraUseCaseEmptyTab {...props} tabName="Risk management" />
);

export const JiraUseCaseModels: React.FC<{ project: any }> = (props) => (
  <JiraUseCaseEmptyTab {...props} tabName="Model linking" />
);

export const JiraUseCaseFrameworks: React.FC<{ project: any }> = (props) => (
  <JiraUseCaseEmptyTab {...props} tabName="Framework management" />
);

export const JiraUseCaseCeMarking: React.FC<{ project: any }> = (props) => (
  <JiraUseCaseEmptyTab {...props} tabName="CE Marking" />
);

export const JiraUseCaseActivity: React.FC<{ project: any }> = (props) => (
  <JiraUseCaseEmptyTab {...props} tabName="Activity tracking" />
);

export const JiraUseCaseMonitoring: React.FC<{ project: any }> = (props) => (
  <JiraUseCaseEmptyTab {...props} tabName="Monitoring" />
);

export default JiraUseCaseEmptyTab;
