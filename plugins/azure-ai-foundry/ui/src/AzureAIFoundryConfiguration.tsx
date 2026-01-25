import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
} from "@mui/material";

interface AzureAIFoundryConfigurationProps {
  configData?: Record<string, string>;
  onConfigChange?: (key: string, value: string) => void;
  onSaveConfiguration?: () => void;
  onTestConnection?: () => void;
  isSavingConfig?: boolean;
  isTestingConnection?: boolean;
}

export const AzureAIFoundryConfiguration: React.FC<AzureAIFoundryConfigurationProps> = ({
  configData = {},
  onConfigChange,
  onSaveConfiguration,
  onTestConnection,
  isSavingConfig = false,
  isTestingConnection = false,
}) => {
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({
    ...configData,
  });

  // Sync local config when configData changes
  useEffect(() => {
    setLocalConfig({ ...configData });
  }, [configData]);

  const handleChange = (key: string, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    if (onConfigChange) {
      onConfigChange(key, value);
    }
  };

  const configFields = [
    {
      key: "project_endpoint",
      label: "Project endpoint",
      placeholder: "https://your-resource.services.ai.azure.com/api/projects/your-project",
      type: "url",
      helperText: "The endpoint URL for your Azure AI Foundry project",
    },
    {
      key: "api_key",
      label: "API key",
      placeholder: "Enter your API key",
      type: "password",
      helperText: "Your Azure AI Foundry API key",
    },
  ];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" fontSize={13} sx={{ mb: 3 }}>
        Configure your Azure AI Foundry connection to sync model deployments.
      </Typography>

      <Stack spacing={2.5}>
        {configFields.map((field) => (
          <Box key={field.key}>
            <Typography
              variant="body2"
              fontWeight={500}
              fontSize={13}
              sx={{ mb: 0.75, color: "#344054" }}
            >
              {field.label}
            </Typography>
            <TextField
              fullWidth
              type={field.type}
              placeholder={field.placeholder}
              value={localConfig[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "13px",
                  backgroundColor: "white",
                },
              }}
            />
            {field.helperText && (
              <Typography
                variant="caption"
                sx={{ mt: 0.5, display: "block", color: "#667085", fontSize: "12px" }}
              >
                {field.helperText}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>

      {/* Test connection and save buttons */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
        {onTestConnection && (
          <Button
            variant="outlined"
            onClick={onTestConnection}
            disabled={isTestingConnection || isSavingConfig || !localConfig.project_endpoint || !localConfig.api_key}
            sx={{
              borderColor: "#13715B",
              color: "#13715B",
              textTransform: "none",
              fontSize: "13px",
              fontWeight: 500,
              height: "34px",
              "&:hover": {
                borderColor: "#0f5a47",
                backgroundColor: "rgba(19, 113, 91, 0.04)",
              },
              "&:disabled": {
                borderColor: "#d0d5dd",
                color: "#98a2b3",
              },
            }}
          >
            {isTestingConnection ? "Testing..." : "Test connection"}
          </Button>
        )}
        {onSaveConfiguration && (
          <Button
            variant="contained"
            onClick={onSaveConfiguration}
            disabled={isSavingConfig || isTestingConnection || !localConfig.project_endpoint || !localConfig.api_key}
            sx={{
              backgroundColor: "#13715B",
              textTransform: "none",
              fontSize: "13px",
              fontWeight: 500,
              height: "34px",
              "&:hover": {
                backgroundColor: "#0f5a47",
              },
              "&:disabled": {
                backgroundColor: "#d0d5dd",
              },
            }}
          >
            {isSavingConfig ? "Saving..." : "Save configuration"}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default AzureAIFoundryConfiguration;
