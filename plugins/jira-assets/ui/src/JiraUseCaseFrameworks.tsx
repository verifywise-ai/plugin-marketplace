/**
 * Frameworks tab for JIRA-imported use cases
 * Shows message that frameworks are managed via JIRA attributes
 */

import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { Shield, Info } from "lucide-react";

interface JiraUseCaseFrameworksProps {
  project: {
    id: number;
    project_title?: string;
    framework?: Array<{
      project_framework_id: number;
      framework_id: number;
      name: string;
    }>;
  };
  apiServices?: any;
}

export const JiraUseCaseFrameworks: React.FC<JiraUseCaseFrameworksProps> = ({ project }) => {
  const installedFrameworks = project.framework || [];

  // If frameworks are installed, show them
  if (installedFrameworks.length > 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: "#374151", mb: 2 }}>
          Frameworks
        </Typography>
        <Stack spacing={1.5}>
          {installedFrameworks.map((pf) => (
            <Box
              key={pf.project_framework_id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 2,
                backgroundColor: "#F0FDF4",
                border: "1px solid #BBF7D0",
                borderRadius: 1,
              }}
            >
              <Shield size={18} color="#16A34A" />
              <Typography sx={{ fontSize: 14, color: "#166534" }}>
                {pf.name}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  // No frameworks - show info message
  return (
    <Box sx={{ p: 4 }}>
      <Stack alignItems="center" spacing={3}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Shield size={40} color="#9ca3af" />
        </Box>

        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: "#374151", mb: 1 }}>
            Frameworks
          </Typography>
          <Typography sx={{ fontSize: 14, color: "#6b7280", maxWidth: 450 }}>
            This use case was imported from JIRA Assets. Framework and regulation
            tracking is managed through your JIRA "Applicable Regulations" attribute.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1.5,
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 2,
            p: 2,
            maxWidth: 450,
          }}
        >
          <Info size={18} color="#3B82F6" style={{ flexShrink: 0, marginTop: 2 }} />
          <Typography sx={{ fontSize: 13, color: "#1E40AF" }}>
            To assign frameworks to this AI system, update the "Applicable Regulations"
            field in JIRA Assets. Changes will sync automatically.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default JiraUseCaseFrameworks;
