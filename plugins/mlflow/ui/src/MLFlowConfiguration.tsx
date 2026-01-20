import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Checkbox,
  Button,
  Stack,
} from "@mui/material";

interface MLFlowConfigurationProps {
  configData?: Record<string, string>;
  onConfigChange?: (key: string, value: string) => void;
  onSaveConfiguration?: () => void;
  onTestConnection?: () => void;
  isSavingConfig?: boolean;
  isTestingConnection?: boolean;
}

export const MLFlowConfiguration: React.FC<MLFlowConfigurationProps> = ({
  configData = {},
  onConfigChange,
  onSaveConfiguration,
  onTestConnection,
  isSavingConfig = false,
  isTestingConnection = false,
}) => {
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({
    auth_method: "none",
    verify_ssl: "true",
    timeout: "30",
    ...configData,
  });

  // Send default values to parent on mount
  useEffect(() => {
    if (onConfigChange) {
      const defaults: Record<string, string> = {
        auth_method: "none",
        verify_ssl: "true",
        timeout: "30",
      };
      // Only send defaults that aren't already in configData
      Object.entries(defaults).forEach(([key, value]) => {
        if (!configData[key]) {
          onConfigChange(key, value);
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (key: string, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    if (onConfigChange) {
      onConfigChange(key, value);
    }
  };

  const configFields = [
    {
      key: "tracking_server_url",
      label: "Tracking Server URL",
      placeholder: "http://localhost:5000",
      type: "url",
    },
    {
      key: "auth_method",
      label: "Authentication Method",
      placeholder: "none",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "basic", label: "Basic Auth" },
        { value: "token", label: "Token" },
      ],
    },
    {
      key: "username",
      label: "Username",
      placeholder: "Enter username",
      type: "text",
      showIf: (data: Record<string, string>) => data.auth_method === "basic",
    },
    {
      key: "password",
      label: "Password",
      placeholder: "Enter password",
      type: "password",
      showIf: (data: Record<string, string>) => data.auth_method === "basic",
    },
    {
      key: "api_token",
      label: "API Token",
      placeholder: "Enter API token",
      type: "password",
      showIf: (data: Record<string, string>) => data.auth_method === "token",
    },
    {
      key: "verify_ssl",
      label: "Verify SSL",
      placeholder: "true",
      type: "checkbox",
    },
    {
      key: "timeout",
      label: "Request Timeout (seconds)",
      placeholder: "30",
      type: "number",
    },
  ];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" fontSize={13} sx={{ mb: 3 }}>
        Configure your MLFlow tracking server connection settings.
      </Typography>

      <Stack spacing={2.5}>
        {configFields.map((field: any) => {
          // Skip field if showIf condition is false
          if (field.showIf && !field.showIf(localConfig)) {
            return null;
          }

          // Render based on field type
          if (field.type === "select") {
            return (
              <Box key={field.key}>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  fontSize={13}
                  sx={{ mb: 0.75, color: "#344054" }}
                >
                  {field.label}
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={localConfig[field.key] || field.placeholder || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    sx={{
                      fontSize: "13px",
                      backgroundColor: "white",
                    }}
                  >
                    {field.options?.map((option: any) => (
                      <MenuItem key={option.value} value={option.value} sx={{ fontSize: "13px" }}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            );
          }

          if (field.type === "checkbox") {
            return (
              <Box key={field.key}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localConfig[field.key] === "true"}
                      onChange={(e) => handleChange(field.key, e.target.checked ? "true" : "false")}
                      sx={{
                        color: "#13715B",
                        "&.Mui-checked": {
                          color: "#13715B",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ color: "#344054" }}>
                      {field.label}
                    </Typography>
                  }
                />
              </Box>
            );
          }

          // Default: Text, URL, Password, Number fields
          return (
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
            </Box>
          );
        })}
      </Stack>

      {/* Test Connection and Save Buttons */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
        {onTestConnection && (
          <Button
            variant="outlined"
            onClick={onTestConnection}
            disabled={isTestingConnection || isSavingConfig}
            sx={{
              borderColor: "#13715B",
              color: "#13715B",
              textTransform: "none",
              fontSize: "13px",
              fontWeight: 500,
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
            {isTestingConnection ? "Testing..." : "Test Connection"}
          </Button>
        )}
        {onSaveConfiguration && (
          <Button
            variant="contained"
            onClick={onSaveConfiguration}
            disabled={isSavingConfig || isTestingConnection}
            sx={{
              backgroundColor: "#13715B",
              textTransform: "none",
              fontSize: "13px",
              fontWeight: 500,
              "&:hover": {
                backgroundColor: "#0f5a47",
              },
              "&:disabled": {
                backgroundColor: "#d0d5dd",
              },
            }}
          >
            {isSavingConfig ? "Saving..." : "Save Configuration"}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default MLFlowConfiguration;
