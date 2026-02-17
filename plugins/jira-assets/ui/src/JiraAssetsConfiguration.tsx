import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Switch,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
} from "@mui/material";
import { RefreshCw, Download } from "lucide-react";

interface Schema {
  id: string;
  name: string;
  objectSchemaKey: string;
}

interface ObjectType {
  id: string;
  name: string;
  objectCount?: number;
}

interface JiraObject {
  id: string;
  key: string;
  name: string;
  attributes: Record<string, any>;
  created: string;
  updated: string;
}

interface ImportedUseCase {
  id: number;
  jira_object_id: string;
  uc_id: string;
  data: any;
  last_synced_at: string;
  sync_status: string;
}

// apiServices type from VerifyWise
interface ApiServices {
  get: (endpoint: string, params?: any) => Promise<{ data: any; status: number }>;
  post: (endpoint: string, data?: any, config?: any) => Promise<{ data: any; status: number }>;
  patch: (endpoint: string, data?: any, config?: any) => Promise<{ data: any; status: number }>;
  put: (endpoint: string, data?: any, config?: any) => Promise<{ data: any; status: number }>;
  delete: (endpoint: string, config?: any) => Promise<{ data: any; status: number }>;
}

interface JiraAssetsConfigurationProps {
  configData?: Record<string, any>;
  onConfigChange?: (key: string, value: any) => void;
  onSaveConfiguration?: () => void;
  onTestConnection?: () => void;
  isSavingConfig?: boolean;
  isTestingConnection?: boolean;
  apiServices?: ApiServices;
  pluginApiCall?: (method: string, path: string, body?: any) => Promise<any>;
}

export const JiraAssetsConfiguration: React.FC<JiraAssetsConfigurationProps> = ({
  configData = {},
  onConfigChange,
  onSaveConfiguration,
  onTestConnection,
  isSavingConfig = false,
  isTestingConnection = false,
  apiServices,
  pluginApiCall: pluginApiCallProp,
}) => {
  // Create pluginApiCall helper using apiServices
  const pluginApiCall = useCallback(async (method: string, path: string, body?: any) => {
    if (pluginApiCallProp) {
      return pluginApiCallProp(method, path, body);
    }
    if (!apiServices) {
      throw new Error("No API service available");
    }

    const url = `/plugins/jira-assets${path.startsWith("/") ? path : `/${path}`}`;
    let response;

    switch (method.toUpperCase()) {
      case "GET":
        response = await apiServices.get(url);
        break;
      case "POST":
        response = await apiServices.post(url, body);
        break;
      case "PUT":
        response = await apiServices.put(url, body);
        break;
      case "PATCH":
        response = await apiServices.patch(url, body);
        break;
      case "DELETE":
        response = await apiServices.delete(url);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    return response.data?.data ?? response.data;
  }, [apiServices, pluginApiCallProp]);

  // Check if API is available
  const hasApiAccess = !!(apiServices || pluginApiCallProp);

  const [localConfig, setLocalConfig] = useState<Record<string, any>>({
    deployment_type: "cloud",
    sync_enabled: false,
    sync_interval_hours: 24,
    ...configData,
  });
  const [configLoaded, setConfigLoaded] = useState(false);

  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [isLoadingObjectTypes, setIsLoadingObjectTypes] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Import state
  const [jiraObjects, setJiraObjects] = useState<JiraObject[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const [isLoadingObjects, setIsLoadingObjects] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Imported use cases state
  const [importedUseCases, setImportedUseCases] = useState<ImportedUseCase[]>([]);
  const [isLoadingUseCases, setIsLoadingUseCases] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load config from plugin's own endpoint on mount (only once)
  useEffect(() => {
    if (configLoaded || !apiServices) return;

    const loadConfig = async () => {
      try {
        const url = "/plugins/jira-assets/config";
        const response = await apiServices.get(url);
        const data = response.data?.data ?? response.data;
        if (data) {
          setLocalConfig((prev) => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error("Failed to load JIRA config:", error);
      } finally {
        setConfigLoaded(true);
      }
    };
    loadConfig();
  }, [apiServices, configLoaded]);

  const handleChange = useCallback((key: string, value: any) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    if (onConfigChange) {
      onConfigChange(key, value);
    }
  }, [onConfigChange]);

  // Load schemas when connection is configured
  const loadSchemas = useCallback(async () => {
    if (!hasApiAccess || !localConfig.jira_base_url || !localConfig.workspace_id) return;

    setIsLoadingSchemas(true);
    try {
      const response = await pluginApiCall("GET", "/schemas");
      if (response && Array.isArray(response)) {
        setSchemas(response);
      }
    } catch (error) {
      console.error("Failed to load schemas:", error);
    } finally {
      setIsLoadingSchemas(false);
    }
  }, [hasApiAccess, pluginApiCall, localConfig.jira_base_url, localConfig.workspace_id]);

  // Load object types when schema is selected
  const loadObjectTypes = useCallback(async (schemaId: string) => {
    if (!hasApiAccess || !schemaId) return;

    setIsLoadingObjectTypes(true);
    try {
      const response = await pluginApiCall("GET", `/schemas/${schemaId}/object-types`);
      console.log("[JiraConfig] loadObjectTypes response:", response, "isArray:", Array.isArray(response));
      if (response && Array.isArray(response)) {
        setObjectTypes(response);
      } else {
        console.warn("[JiraConfig] Object types response is not an array:", typeof response);
      }
    } catch (error) {
      console.error("Failed to load object types:", error);
    } finally {
      setIsLoadingObjectTypes(false);
    }
  }, [hasApiAccess, pluginApiCall]);

  // Load JIRA objects for import
  const loadJiraObjects = useCallback(async () => {
    if (!hasApiAccess || !localConfig.selected_object_type_id) return;

    setIsLoadingObjects(true);
    setImportMessage(null);
    try {
      const response = await pluginApiCall("GET", `/object-types/${localConfig.selected_object_type_id}/objects`);
      if (response && Array.isArray(response)) {
        // Filter out already imported objects
        const importedIds = new Set(importedUseCases.map((uc) => uc.jira_object_id));
        const newObjects = response.filter((obj: JiraObject) => !importedIds.has(obj.id));
        setJiraObjects(newObjects);
      }
    } catch (error: any) {
      setImportMessage({ type: "error", text: error.message || "Failed to load JIRA objects" });
    } finally {
      setIsLoadingObjects(false);
    }
  }, [hasApiAccess, pluginApiCall, localConfig.selected_object_type_id, importedUseCases]);

  // Load imported use cases
  const loadImportedUseCases = useCallback(async () => {
    if (!hasApiAccess) return;

    setIsLoadingUseCases(true);
    try {
      const response = await pluginApiCall("GET", "/use-cases");
      if (response && Array.isArray(response)) {
        setImportedUseCases(response);
      }
    } catch (error) {
      console.error("Failed to load imported use cases:", error);
    } finally {
      setIsLoadingUseCases(false);
    }
  }, [hasApiAccess, pluginApiCall]);

  // Import selected objects
  const handleImport = async () => {
    if (!hasApiAccess || selectedObjects.size === 0) return;

    setIsImporting(true);
    setImportMessage(null);
    try {
      const response = await pluginApiCall("POST", "/import", {
        object_ids: Array.from(selectedObjects),
      });

      if (response?.success) {
        setImportMessage({ type: "success", text: `Successfully imported ${response.imported} objects` });
        setSelectedObjects(new Set());
        // Reload both lists
        await loadImportedUseCases();
        await loadJiraObjects();
      } else {
        setImportMessage({ type: "error", text: response?.error || "Import failed" });
      }
    } catch (error: any) {
      setImportMessage({ type: "error", text: error.message || "Import failed" });
    } finally {
      setIsImporting(false);
    }
  };

  // Sync now - fetch latest data from JIRA
  const handleSyncNow = async () => {
    if (!hasApiAccess) return;

    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const response = await pluginApiCall("POST", "/sync");
      if (response?.success) {
        setSyncMessage({
          type: "success",
          text: `Sync completed: ${response.created || 0} created, ${response.updated || 0} updated, ${response.deleted || 0} deleted`,
        });
        // Reload the imported use cases to show updated data
        await loadImportedUseCases();
      } else {
        setSyncMessage({ type: "error", text: response?.error || "Sync failed" });
      }
    } catch (error: any) {
      setSyncMessage({ type: "error", text: error.message || "Sync failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle object selection
  const toggleObjectSelection = (objectId: string) => {
    setSelectedObjects((prev) => {
      const next = new Set(prev);
      if (next.has(objectId)) {
        next.delete(objectId);
      } else {
        next.add(objectId);
      }
      return next;
    });
  };

  // Select all objects
  const toggleSelectAll = () => {
    if (selectedObjects.size === jiraObjects.length) {
      setSelectedObjects(new Set());
    } else {
      setSelectedObjects(new Set(jiraObjects.map((obj) => obj.id)));
    }
  };

  // Test connection handler
  const handleTestConnection = async () => {
    if (!hasApiAccess) {
      if (onTestConnection) onTestConnection();
      return;
    }

    setConnectionStatus("testing");
    setConnectionMessage("");

    try {
      // Note: test-connection goes through the main controller which expects { configuration: {...} }
      const response = await pluginApiCall("POST", "/test-connection", {
        configuration: {
          jira_base_url: localConfig.jira_base_url,
          workspace_id: localConfig.workspace_id,
          email: localConfig.email,
          api_token: localConfig.api_token,
          deployment_type: localConfig.deployment_type || "cloud",
        },
      });

      if (response?.success) {
        setConnectionStatus("success");
        setConnectionMessage(response.message || "Connection successful. Click 'Save Configuration' to proceed to Step 2.");
      } else {
        setConnectionStatus("error");
        setConnectionMessage(response?.message || "Connection failed");
      }
    } catch (error: any) {
      setConnectionStatus("error");
      setConnectionMessage(error.message || "Connection test failed");
    }
  };

  // Save configuration to plugin's own endpoint
  const handleSaveConfig = async () => {
    if (!apiServices) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await apiServices.post("/plugins/jira-assets/config", {
        jira_base_url: localConfig.jira_base_url,
        workspace_id: localConfig.workspace_id,
        email: localConfig.email,
        api_token: localConfig.api_token || undefined, // Only send if user entered a new one
        deployment_type: localConfig.deployment_type || "cloud",
        selected_schema_id: localConfig.selected_schema_id || undefined,
        selected_object_type_id: localConfig.selected_object_type_id || undefined,
        sync_enabled: localConfig.sync_enabled || false,
        sync_interval_hours: localConfig.sync_interval_hours || 24,
      });

      const data = response.data?.data ?? response.data;
      if (data?.success) {
        setSaveMessage({ type: "success", text: "Configuration saved successfully!" });
        // Update localConfig with has_api_token flag so schemas can load
        setLocalConfig((prev) => ({ ...prev, has_api_token: true }));
        // Reload config to get full updated data
        setConfigLoaded(false);
        // Note: loadSchemas will be triggered by useEffect when has_api_token becomes true
      } else {
        setSaveMessage({ type: "error", text: data?.errors?.join(", ") || data?.message || "Failed to save configuration" });
      }
    } catch (error: any) {
      setSaveMessage({ type: "error", text: error.message || "Failed to save configuration" });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle schema selection
  const handleSchemaChange = (schemaId: string) => {
    handleChange("selected_schema_id", schemaId);
    handleChange("selected_object_type_id", "");
    setObjectTypes([]);
    if (schemaId) {
      loadObjectTypes(schemaId);
    }
  };

  // Load schemas on mount only if already configured (has_api_token indicates saved config)
  useEffect(() => {
    console.log("[JiraConfig] Schema load check:", {
      has_api_token: localConfig.has_api_token,
      jira_base_url: localConfig.jira_base_url,
      workspace_id: localConfig.workspace_id,
      schemas_length: schemas.length,
    });
    if (localConfig.has_api_token && localConfig.jira_base_url && localConfig.workspace_id && schemas.length === 0) {
      console.log("[JiraConfig] Calling loadSchemas()");
      loadSchemas();
    }
  }, [localConfig.has_api_token, localConfig.jira_base_url, localConfig.workspace_id, loadSchemas, schemas.length]);

  // Load object types if schema is already selected (only if config is saved)
  useEffect(() => {
    if (localConfig.has_api_token && localConfig.selected_schema_id && objectTypes.length === 0) {
      loadObjectTypes(localConfig.selected_schema_id);
    }
  }, [localConfig.has_api_token, localConfig.selected_schema_id, loadObjectTypes, objectTypes.length]);

  // Load imported use cases on mount
  useEffect(() => {
    if (hasApiAccess && configLoaded) {
      loadImportedUseCases();
    }
  }, [hasApiAccess, configLoaded, loadImportedUseCases]);

  const syncIntervalOptions = [
    { value: 1, label: "Every hour" },
    { value: 6, label: "Every 6 hours" },
    { value: 12, label: "Every 12 hours" },
    { value: 24, label: "Every 24 hours" },
    { value: 48, label: "Every 48 hours" },
  ];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" fontSize={13} sx={{ mb: 3 }}>
        Connect to your Jira Service Management Assets to import AI Systems as use-cases.
      </Typography>

      {/* Step 1: Connection Settings */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: "#344054" }}>
        Step 1: Connection Settings
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ mb: 0.75, color: "#344054" }}>
            Deployment Type *
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={localConfig.deployment_type || "cloud"}
              onChange={(e) => handleChange("deployment_type", e.target.value)}
              sx={{ fontSize: "13px", backgroundColor: "white" }}
            >
              <MenuItem value="cloud" sx={{ fontSize: "13px" }}>
                JIRA Cloud (Atlassian-hosted)
              </MenuItem>
              <MenuItem value="datacenter" sx={{ fontSize: "13px" }}>
                JIRA Data Center / Server (Self-hosted)
              </MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            Select Cloud for *.atlassian.net, or Data Center for self-hosted JIRA
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ mb: 0.75, color: "#344054" }}>
            JIRA Base URL *
          </Typography>
          <TextField
            fullWidth
            placeholder={localConfig.deployment_type === "datacenter" ? "https://jira.your-company.com" : "https://your-company.atlassian.net"}
            value={localConfig.jira_base_url || ""}
            onChange={(e) => handleChange("jira_base_url", e.target.value)}
            size="small"
            sx={{ "& .MuiOutlinedInput-root": { fontSize: "13px", backgroundColor: "white" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ mb: 0.75, color: "#344054" }}>
            {localConfig.deployment_type === "datacenter" ? "Insight Object Schema ID" : "Workspace ID"} *
          </Typography>
          <TextField
            fullWidth
            placeholder={localConfig.deployment_type === "datacenter" ? "Enter object schema ID (e.g., 1)" : "Enter your JSM Assets workspace ID"}
            value={localConfig.workspace_id || ""}
            onChange={(e) => handleChange("workspace_id", e.target.value)}
            size="small"
            helperText={localConfig.deployment_type === "datacenter"
              ? "For Data Center: Use object schema ID from Insight settings"
              : "Found in Assets settings or the URL when viewing Assets"}
            sx={{ "& .MuiOutlinedInput-root": { fontSize: "13px", backgroundColor: "white" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ mb: 0.75, color: "#344054" }}>
            {localConfig.deployment_type === "datacenter" ? "Username" : "Email"} *
          </Typography>
          <TextField
            fullWidth
            type={localConfig.deployment_type === "datacenter" ? "text" : "email"}
            placeholder={localConfig.deployment_type === "datacenter" ? "your-username" : "your-email@company.com"}
            value={localConfig.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            size="small"
            sx={{ "& .MuiOutlinedInput-root": { fontSize: "13px", backgroundColor: "white" } }}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ mb: 0.75, color: "#344054" }}>
            {localConfig.deployment_type === "datacenter" ? "Password / Token" : "API Token"} {!localConfig.has_api_token && "*"}
          </Typography>
          <TextField
            fullWidth
            type="password"
            placeholder={
              localConfig.has_api_token && !localConfig.api_token
                ? "••••••••••••••••  (saved - enter new value to change)"
                : localConfig.deployment_type === "datacenter"
                  ? "Enter your password or personal access token"
                  : "Enter your Atlassian API token"
            }
            value={localConfig.api_token || ""}
            onChange={(e) => handleChange("api_token", e.target.value)}
            size="small"
            helperText={
              localConfig.has_api_token && !localConfig.api_token
                ? "API token is saved. Leave empty to keep current token, or enter a new value to update."
                : localConfig.deployment_type === "datacenter"
                  ? "Use your JIRA password or personal access token"
                  : "Generate at id.atlassian.com/manage-profile/security/api-tokens"
            }
            sx={{ "& .MuiOutlinedInput-root": { fontSize: "13px", backgroundColor: "white" } }}
          />
        </Box>
      </Stack>

      {/* Connection Status */}
      {connectionStatus !== "idle" && (
        <Box sx={{ mt: 2 }}>
          <Alert
            severity={connectionStatus === "success" ? "success" : connectionStatus === "error" ? "error" : "info"}
            sx={{ fontSize: "13px" }}
          >
            {connectionStatus === "testing" ? "Testing connection..." : connectionMessage}
          </Alert>
        </Box>
      )}

      {/* Test Connection Button */}
      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          onClick={handleTestConnection}
          disabled={
            isTestingConnection ||
            connectionStatus === "testing" ||
            !localConfig.jira_base_url ||
            !localConfig.workspace_id ||
            !localConfig.email ||
            (!localConfig.api_token && !localConfig.has_api_token)
          }
          sx={{
            borderColor: "#13715B",
            color: "#13715B",
            textTransform: "none",
            fontSize: "13px",
            fontWeight: 500,
            "&:hover": { borderColor: "#0f5a47", backgroundColor: "rgba(19, 113, 91, 0.04)" },
            "&:disabled": { borderColor: "#d0d5dd", color: "#98a2b3" },
          }}
        >
          {isTestingConnection || connectionStatus === "testing" ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Step 2: Schema & Object Type Selection */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: "#344054" }}>
        Step 2: Select Schema & Object Type
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ mb: 0.75, color: "#344054" }}>
            Schema
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={localConfig.selected_schema_id || ""}
              onChange={(e) => handleSchemaChange(e.target.value)}
              disabled={isLoadingSchemas || schemas.length === 0}
              displayEmpty
              sx={{ fontSize: "13px", backgroundColor: "white" }}
            >
              <MenuItem value="" sx={{ fontSize: "13px" }}>
                {isLoadingSchemas ? "Loading schemas..." : "Select a schema"}
              </MenuItem>
              {schemas.map((schema) => (
                <MenuItem key={schema.id} value={schema.id} sx={{ fontSize: "13px" }}>
                  {schema.name} ({schema.objectSchemaKey})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ mb: 0.75, color: "#344054" }}>
            Object Type (AI Systems)
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={localConfig.selected_object_type_id || ""}
              onChange={(e) => handleChange("selected_object_type_id", e.target.value)}
              disabled={isLoadingObjectTypes || objectTypes.length === 0 || !localConfig.selected_schema_id}
              displayEmpty
              sx={{ fontSize: "13px", backgroundColor: "white" }}
            >
              <MenuItem value="" sx={{ fontSize: "13px" }}>
                {isLoadingObjectTypes ? "Loading object types..." : "Select an object type"}
              </MenuItem>
              {objectTypes.map((ot) => (
                <MenuItem key={ot.id} value={ot.id} sx={{ fontSize: "13px" }}>
                  {ot.name}
                  {ot.objectCount !== undefined && (
                    <Chip label={`${ot.objectCount} objects`} size="small" sx={{ ml: 1, fontSize: "11px" }} />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* Step 3: Sync Settings */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: "#344054" }}>
        Step 3: Sync Settings
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={localConfig.sync_enabled || false}
                onChange={(e) => handleChange("sync_enabled", e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "#13715B" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#13715B" },
                }}
              />
            }
            label={
              <Typography variant="body2" fontSize={13} sx={{ color: "#344054" }}>
                Enable automatic sync
              </Typography>
            }
          />
        </Box>

        {localConfig.sync_enabled && (
          <Box>
            <Typography variant="body2" fontWeight={500} fontSize={13} sx={{ mb: 0.75, color: "#344054" }}>
              Sync Interval
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={localConfig.sync_interval_hours || 24}
                onChange={(e) => handleChange("sync_interval_hours", e.target.value)}
                sx={{ fontSize: "13px", backgroundColor: "white" }}
              >
                {syncIntervalOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} sx={{ fontSize: "13px" }}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Stack>

      {/* Last Sync Info */}
      {localConfig.last_sync_at && (
        <Box sx={{ mt: 2 }}>
          <Alert
            severity={localConfig.last_sync_status === "success" ? "success" : "warning"}
            sx={{ fontSize: "13px" }}
          >
            Last sync: {new Date(localConfig.last_sync_at).toLocaleString()} -{" "}
            {localConfig.last_sync_status === "success" ? "Successful" : localConfig.last_sync_message}
          </Alert>
        </Box>
      )}

      {/* Save Message */}
      {saveMessage && (
        <Box sx={{ mt: 2 }}>
          <Alert severity={saveMessage.type} sx={{ fontSize: "13px" }} onClose={() => setSaveMessage(null)}>
            {saveMessage.text}
          </Alert>
        </Box>
      )}

      {/* Save Button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSaveConfig}
          disabled={isSaving || !localConfig.jira_base_url || !localConfig.workspace_id || !localConfig.email || (!localConfig.api_token && !localConfig.has_api_token)}
          sx={{
            backgroundColor: "#13715B",
            textTransform: "none",
            fontSize: "13px",
            fontWeight: 500,
            "&:hover": { backgroundColor: "#0f5a47" },
            "&:disabled": { backgroundColor: "#d0d5dd" },
          }}
        >
          {isSaving ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1, color: "white" }} />
              Saving...
            </>
          ) : (
            "Save Configuration"
          )}
        </Button>
      </Box>

      {/* Only show import section if config is saved and object type is selected */}
      {localConfig.has_api_token && localConfig.selected_object_type_id && (
        <>
          <Divider sx={{ my: 3 }} />

          {/* Step 4: Import Objects */}
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: "#344054" }}>
            Step 4: Import JIRA Objects
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={isLoadingObjects ? <CircularProgress size={16} /> : <Download size={16} />}
              onClick={loadJiraObjects}
              disabled={isLoadingObjects || importedUseCases.length > 0}
              sx={{
                borderColor: "#13715B",
                color: "#13715B",
                textTransform: "none",
                fontSize: "13px",
                "&:hover": { borderColor: "#0f5a47", backgroundColor: "rgba(19, 113, 91, 0.04)" },
                "&:disabled": { borderColor: "#d0d5dd", color: "#98a2b3" },
              }}
            >
              {isLoadingObjects ? "Loading..." : "Fetch Objects from JIRA"}
            </Button>
          </Box>

          {importMessage && (
            <Alert severity={importMessage.type} sx={{ mb: 2, fontSize: "13px" }} onClose={() => setImportMessage(null)}>
              {importMessage.text}
            </Alert>
          )}

          {jiraObjects.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedObjects.size === jiraObjects.length && jiraObjects.length > 0}
                      indeterminate={selectedObjects.size > 0 && selectedObjects.size < jiraObjects.length}
                      onChange={toggleSelectAll}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" fontSize={13}>
                      Select All ({jiraObjects.length} available)
                    </Typography>
                  }
                />
                <Button
                  variant="contained"
                  onClick={handleImport}
                  disabled={isImporting || selectedObjects.size === 0}
                  startIcon={isImporting ? <CircularProgress size={16} /> : <Download size={16} />}
                  sx={{
                    backgroundColor: "#13715B",
                    textTransform: "none",
                    fontSize: "13px",
                    "&:hover": { backgroundColor: "#0f5a47" },
                  }}
                >
                  {isImporting ? "Importing..." : `Import ${selectedObjects.size} Selected`}
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: 300, boxShadow: "none", border: "1px solid #e4e7ec" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f9fafb" }}>
                      <TableCell padding="checkbox" />
                      <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>Key</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>Name</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jiraObjects.map((obj) => (
                      <TableRow
                        key={obj.id}
                        hover
                        selected={selectedObjects.has(obj.id)}
                        onClick={() => toggleObjectSelection(obj.id)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectedObjects.has(obj.id)} size="small" />
                        </TableCell>
                        <TableCell sx={{ fontSize: "13px", fontFamily: "monospace" }}>{obj.key}</TableCell>
                        <TableCell sx={{ fontSize: "13px" }}>{obj.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {jiraObjects.length === 0 && !isLoadingObjects && (
            <Alert severity="info" sx={{ mb: 3, fontSize: "13px" }}>
              Click "Fetch Objects from JIRA" to load available objects for import.
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Imported Use Cases */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ color: "#344054" }}>
              Imported Use Cases ({importedUseCases.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={isSyncing ? <CircularProgress size={14} sx={{ color: "white" }} /> : <RefreshCw size={14} />}
              onClick={handleSyncNow}
              disabled={isSyncing || isLoadingUseCases}
              sx={{
                backgroundColor: "#13715B",
                textTransform: "none",
                fontSize: "12px",
                "&:hover": { backgroundColor: "#0f5a47" },
                "&:disabled": { backgroundColor: "#d0d5dd" },
              }}
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </Box>

          {/* Sync Message */}
          {syncMessage && (
            <Alert severity={syncMessage.type} sx={{ mb: 2, fontSize: "13px" }} onClose={() => setSyncMessage(null)}>
              {syncMessage.text}
            </Alert>
          )}

          {isLoadingUseCases ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : importedUseCases.length === 0 ? (
            <Alert severity="info" sx={{ fontSize: "13px" }}>
              No objects imported yet. Fetch objects from JIRA and import them above.
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 400, boxShadow: "none", border: "1px solid #e4e7ec" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: "12px", backgroundColor: "#f9fafb", py: 1 }}>UC-ID</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "12px", backgroundColor: "#f9fafb", py: 1 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "12px", backgroundColor: "#f9fafb", py: 1 }}>JIRA Key</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "12px", backgroundColor: "#f9fafb", py: 1 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importedUseCases.map((uc) => {
                    const data = typeof uc.data === 'string' ? JSON.parse(uc.data) : uc.data;
                    const name = data?.label || data?.attributes?.Name || '-';
                    const objectKey = data?.objectKey || '-';
                    return (
                      <TableRow key={uc.id} hover>
                        <TableCell sx={{ fontSize: "13px", fontFamily: "monospace", py: 1 }}>{uc.uc_id}</TableCell>
                        <TableCell sx={{ fontSize: "13px", py: 1 }}>{name}</TableCell>
                        <TableCell sx={{ fontSize: "13px", fontFamily: "monospace", py: 1 }}>{objectKey}</TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Chip
                            label={uc.sync_status}
                            size="small"
                            color={uc.sync_status === "synced" ? "success" : uc.sync_status === "updated" ? "info" : "default"}
                            sx={{ fontSize: "11px" }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
};

export default JiraAssetsConfiguration;
