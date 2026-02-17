import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Drawer,
  Stack,
  Divider,
} from "@mui/material";
import {
  RefreshCw,
  Download,
  Eye,
  X,
  Check,
  AlertCircle,
  Clock,
  Trash2,
} from "lucide-react";

interface JiraObject {
  id: string;
  key: string;
  name: string;
  attributes: Record<string, any>;
  created: string;
  updated: string;
}

interface UseCaseData {
  id: string;
  objectKey: string;
  label: string;
  objectType?: {
    id: string;
    name: string;
  };
  attributes: Record<string, any>;
  created: string;
  updated: string;
}

interface UseCase {
  id: number;
  jira_object_id: string;
  uc_id: string;
  data: UseCaseData;
  last_synced_at: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

interface SyncStatus {
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_message?: string;
  sync_enabled?: boolean;
  sync_interval_hours?: number;
}

// apiServices type from VerifyWise
interface ApiServices {
  get: (endpoint: string, params?: any) => Promise<{ data: any; status: number }>;
  post: (endpoint: string, data?: any, config?: any) => Promise<{ data: any; status: number }>;
  patch: (endpoint: string, data?: any, config?: any) => Promise<{ data: any; status: number }>;
  put: (endpoint: string, data?: any, config?: any) => Promise<{ data: any; status: number }>;
  delete: (endpoint: string, config?: any) => Promise<{ data: any; status: number }>;
}

interface JiraAssetsUseCasesTabProps {
  apiServices?: ApiServices;
  pluginApiCall?: (method: string, path: string, body?: any) => Promise<any>;
}

export const JiraAssetsUseCasesTab: React.FC<JiraAssetsUseCasesTabProps> = ({
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

  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [jiraObjects, setJiraObjects] = useState<JiraObject[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const [isLoadingObjects, setIsLoadingObjects] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Detail drawer state
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load use cases
  const loadUseCases = useCallback(async () => {
    if (!hasApiAccess) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await pluginApiCall("GET", "/use-cases");
      if (Array.isArray(response)) {
        setUseCases(response);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load use cases");
    } finally {
      setIsLoading(false);
    }
  }, [hasApiAccess, pluginApiCall]);

  // Load sync status
  const loadSyncStatus = useCallback(async () => {
    if (!hasApiAccess) return;

    try {
      const response = await pluginApiCall("GET", "/sync/status");
      setSyncStatus(response);
    } catch (err) {
      console.error("Failed to load sync status:", err);
    }
  }, [hasApiAccess, pluginApiCall]);

  // Initial load
  useEffect(() => {
    loadUseCases();
    loadSyncStatus();
  }, [loadUseCases, loadSyncStatus]);

  // Manual sync
  const handleSync = async () => {
    if (!hasApiAccess) return;

    setIsSyncing(true);
    setError(null);

    try {
      const response = await pluginApiCall("POST", "/sync");
      if (response?.success) {
        await loadUseCases();
        await loadSyncStatus();
      } else {
        setError(response?.status || "Sync failed");
      }
    } catch (err: any) {
      setError(err.message || "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  // Open import modal
  const handleOpenImport = async () => {
    if (!hasApiAccess) return;

    setImportModalOpen(true);
    setIsLoadingObjects(true);
    setSelectedObjects(new Set());
    setJiraObjects([]);

    try {
      // Get config to find object type
      const configResponse = await pluginApiCall("GET", "/config");
      const objectTypeId = configResponse?.selected_object_type_id;

      if (!objectTypeId) {
        setError("No object type configured. Please configure the plugin first.");
        setIsLoadingObjects(false);
        return;
      }

      // Get objects from JIRA
      const objectsResponse = await pluginApiCall("GET", `/object-types/${objectTypeId}/objects`);
      if (Array.isArray(objectsResponse)) {
        // Filter out already imported objects
        const importedIds = new Set(useCases.map((uc) => uc.jira_object_id));
        const newObjects = objectsResponse.filter((obj: JiraObject) => !importedIds.has(obj.id));
        setJiraObjects(newObjects);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load JIRA objects");
    } finally {
      setIsLoadingObjects(false);
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

  // Import selected objects (always as non-organizational)
  const handleImport = async () => {
    if (!pluginApiCall || selectedObjects.size === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      const response = await pluginApiCall("POST", "/import", {
        object_ids: Array.from(selectedObjects),
      });

      if (response?.success) {
        setImportModalOpen(false);
        await loadUseCases();
      } else {
        setError(response?.error || "Import failed");
      }
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  // View use case details
  const handleViewDetails = (useCase: UseCase) => {
    setSelectedUseCase(useCase);
    setDrawerOpen(true);
  };


  // Helper to get display name from use case
  const getUseCaseName = (useCase: UseCase): string => {
    const data = typeof useCase.data === 'string' ? JSON.parse(useCase.data) : useCase.data;
    return data?.label || data?.attributes?.Name || useCase.uc_id;
  };

  // Delete use case
  const handleDelete = async (useCase: UseCase) => {
    if (!hasApiAccess) return;

    if (!window.confirm(`Are you sure you want to delete "${getUseCaseName(useCase)}"?`)) {
      return;
    }

    try {
      await pluginApiCall("DELETE", `/use-cases/${useCase.id}`);
      await loadUseCases();
      if (selectedUseCase?.id === useCase.id) {
        setDrawerOpen(false);
        setSelectedUseCase(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete use case");
    }
  };

  // Format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  // Get sync status chip
  const getSyncStatusChip = (status: string) => {
    switch (status) {
      case "synced":
        return <Chip label="Synced" size="small" color="success" sx={{ fontSize: "11px" }} />;
      case "updated":
        return <Chip label="Updated" size="small" color="info" sx={{ fontSize: "11px" }} />;
      case "deleted_in_jira":
        return <Chip label="Deleted in JIRA" size="small" color="error" sx={{ fontSize: "11px" }} />;
      default:
        return <Chip label={status} size="small" sx={{ fontSize: "11px" }} />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            JIRA AI Systems
          </Typography>
          <Typography variant="body2" color="text.secondary" fontSize={13}>
            AI Systems imported from Jira Service Management Assets
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={isSyncing ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
            onClick={handleSync}
            disabled={isSyncing}
            sx={{
              borderColor: "#d0d5dd",
              color: "#344054",
              textTransform: "none",
              fontSize: "13px",
            }}
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>

          <Button
            variant="contained"
            startIcon={<Download size={16} />}
            onClick={handleOpenImport}
            sx={{
              backgroundColor: "#13715B",
              textTransform: "none",
              fontSize: "13px",
              "&:hover": { backgroundColor: "#0f5a47" },
            }}
          >
            Import from JIRA
          </Button>
        </Box>
      </Box>

      {/* Sync Status Bar */}
      {syncStatus && (
        <Alert
          severity={syncStatus.last_sync_status === "success" ? "success" : syncStatus.last_sync_status === "failed" ? "warning" : "info"}
          sx={{ mb: 2, fontSize: "13px" }}
          icon={<Clock size={18} />}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span>
              Last sync: {syncStatus.last_sync_at ? formatDate(syncStatus.last_sync_at) : "Never"}
            </span>
            {syncStatus.sync_enabled && (
              <Chip
                label={`Auto-sync: Every ${syncStatus.sync_interval_hours}h`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: "11px" }}
              />
            )}
          </Box>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, fontSize: "13px" }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : useCases.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <AlertCircle size={48} color="#98a2b3" />
          <Typography variant="h6" sx={{ mt: 2, color: "#344054" }}>
            No JIRA AI Systems Imported
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click "Import from JIRA" to start importing AI Systems from your JSM Assets.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: "none", border: "1px solid #e4e7ec" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f9fafb" }}>
                <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>UC-ID</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>JIRA Key</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>Sync Status</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>Last Synced</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "12px" }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {useCases.map((uc) => {
                const data = typeof uc.data === 'string' ? JSON.parse(uc.data) : uc.data;
                return (
                  <TableRow key={uc.id} hover>
                    <TableCell sx={{ fontSize: "13px", fontFamily: "monospace" }}>{uc.uc_id}</TableCell>
                    <TableCell sx={{ fontSize: "13px" }}>{data?.label || data?.attributes?.Name || '-'}</TableCell>
                    <TableCell sx={{ fontSize: "13px", fontFamily: "monospace" }}>{data?.objectKey || '-'}</TableCell>
                    <TableCell>{getSyncStatusChip(uc.sync_status)}</TableCell>
                    <TableCell sx={{ fontSize: "12px", color: "#667085" }}>
                      {formatDate(uc.last_synced_at)}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(uc)}>
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(uc)} color="error">
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Import Modal */}
      <Dialog open={importModalOpen} onClose={() => setImportModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Import AI Systems from JIRA</Typography>
            <IconButton onClick={() => setImportModalOpen(false)}>
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {isLoadingObjects ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Loading objects from JIRA...</Typography>
            </Box>
          ) : jiraObjects.length === 0 ? (
            <Alert severity="info">
              No new objects to import. All JIRA objects have already been imported.
            </Alert>
          ) : (
            <>
              {/* Objects Table */}
              <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                      Select All ({jiraObjects.length} objects)
                    </Typography>
                  }
                />
                <Typography variant="body2" color="text.secondary">
                  {selectedObjects.size} selected
                </Typography>
              </Box>

              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>Key</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: "12px" }}>Updated</TableCell>
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
                        <TableCell sx={{ fontSize: "12px", color: "#667085" }}>
                          {formatDate(obj.updated)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setImportModalOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={isImporting || selectedObjects.size === 0}
            startIcon={isImporting ? <CircularProgress size={16} /> : <Check size={16} />}
            sx={{
              backgroundColor: "#13715B",
              textTransform: "none",
              "&:hover": { backgroundColor: "#0f5a47" },
            }}
          >
            {isImporting ? "Importing..." : `Import ${selectedObjects.size} Objects`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 480, p: 3 }}>
          {selectedUseCase && (() => {
            const data = typeof selectedUseCase.data === 'string'
              ? JSON.parse(selectedUseCase.data)
              : selectedUseCase.data;
            const name = data?.label || data?.attributes?.Name || selectedUseCase.uc_id;
            const objectKey = data?.objectKey || '-';

            return (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                  <Box>
                    <Typography variant="h6">{name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                      {selectedUseCase.uc_id} | {objectKey}
                    </Typography>
                  </Box>
                  <IconButton onClick={() => setDrawerOpen(false)}>
                    <X size={20} />
                  </IconButton>
                </Box>

                <Stack spacing={2}>
                  {/* Status Chips */}
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {getSyncStatusChip(selectedUseCase.sync_status)}
                  </Box>

                  <Divider />

                  {/* Metadata */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Sync Information
                    </Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Last Synced
                        </Typography>
                        <Typography variant="body2">{formatDate(selectedUseCase.last_synced_at)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          JIRA Created
                        </Typography>
                        <Typography variant="body2">{formatDate(data?.created)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          JIRA Updated
                        </Typography>
                        <Typography variant="body2">{formatDate(data?.updated)}</Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* JIRA Attributes */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      JIRA Attributes
                    </Typography>
                    <Stack spacing={1}>
                      {Object.entries(data?.attributes || {}).map(([key, value]) => (
                        <Box key={key}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {key}
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                            {Array.isArray(value) ? value.join(", ") : String(value ?? "N/A")}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  <Divider />

                  {/* Actions */}
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      onClick={() => handleDelete(selectedUseCase)}
                      startIcon={<Trash2 size={16} />}
                      sx={{ textTransform: "none" }}
                    >
                      Delete
                    </Button>
                  </Box>
                </Stack>
              </>
            );
          })()}
        </Box>
      </Drawer>
    </Box>
  );
};

export default JiraAssetsUseCasesTab;
