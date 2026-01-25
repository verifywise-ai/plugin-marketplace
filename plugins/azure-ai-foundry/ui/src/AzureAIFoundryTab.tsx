import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  TablePagination,
  Chip,
  Grid,
} from "@mui/material";
import type { GridProps } from "@mui/material";
import { RefreshCw, XCircle, Eye, ChevronsUpDown } from "lucide-react";
import {
  colors,
  typography,
  borderRadius,
  cardStyles,
  tableStyles,
  chipStyles,
  buttonStyles,
  modalStyles,
} from "./theme";

interface SelectorVerticalProps {
  className?: string;
  [key: string]: unknown;
}

const SelectorVertical = (props: SelectorVerticalProps) => (
  <ChevronsUpDown size={16} {...props} />
);

// ==================== Azure AI Foundry Types ====================
interface AzureModel {
  id: number;
  deployment_name: string;
  model_name: string;
  model_format: string | null;
  model_version: string | null;
  provisioning_state: string | null;
  sku_name: string | null;
  sku_capacity: number | null;
  capabilities: Record<string, string>;
  rate_limits: Array<{ key: string; count: number; renewalPeriod: number }>;
  rai_policy_name: string | null;
  created_by: string | null;
  azure_created_at: string | null;
  azure_modified_at: string | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

interface AzureAIFoundryTabProps {
  apiServices?: {
    get: (url: string, options?: unknown) => Promise<{ data: unknown }>;
    post: (url: string, data?: unknown) => Promise<{ data: unknown }>;
  };
}

// Default API implementation
const defaultApi = {
  get: async (url: string) => {
    const response = await fetch(`/api${url}`);
    return { data: await response.json() };
  },
  post: async (url: string, data?: unknown) => {
    const response = await fetch(`/api${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return { data: await response.json() };
  },
};

// ==================== Main Component ====================
export const AzureAIFoundryTab: React.FC<AzureAIFoundryTabProps> = ({
  apiServices,
}) => {
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AzureModel | null>(null);
  const [models, setModels] = useState<AzureModel[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Use provided API services or default
  const api = useRef(apiServices || defaultApi).current;

  const summaryStats = useMemo(() => {
    const stateCounts = models.reduce(
      (acc, model) => {
        const state = (model.provisioning_state || "").toLowerCase();
        if (state === "succeeded") acc.succeeded += 1;
        else if (state === "updating") acc.updating += 1;
        else if (state === "failed") acc.failed += 1;
        return acc;
      },
      { succeeded: 0, updating: 0, failed: 0 }
    );

    // Count model types
    const gptModels = models.filter((m) =>
      m.model_name?.toLowerCase().includes("gpt")
    ).length;
    const embeddingModels = models.filter(
      (m) =>
        m.model_name?.toLowerCase().includes("embedding") ||
        m.model_name?.toLowerCase().includes("ada")
    ).length;

    return {
      total: models.length,
      succeeded: stateCounts.succeeded,
      updating: stateCounts.updating,
      failed: stateCounts.failed,
      gptModels,
      embeddingModels,
    };
  }, [models]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const fetchModels = async () => {
    setLoading(true);
    setWarning(null);

    try {
      const response = await api.get("/plugins/azure-ai-foundry/models");

      const responseData = response.data as {
        data?: {
          configured?: boolean;
          connected?: boolean;
          models?: AzureModel[];
          error?: string;
          message?: string;
        };
      };

      if (responseData?.data) {
        const pluginData = responseData.data;
        if ("models" in pluginData && Array.isArray(pluginData.models)) {
          if (!pluginData.configured) {
            setWarning(
              "Configure the Azure AI Foundry plugin to start syncing model deployments."
            );
          } else if (pluginData.connected === false) {
            setWarning(
              pluginData.message || "Azure AI Foundry is not reachable."
            );
          } else if (pluginData.error) {
            setWarning(pluginData.error);
          }
          setModels(pluginData.models);
        } else {
          setModels([]);
        }
      } else {
        setModels([]);
      }
    } catch {
      setWarning("Unable to reach the Azure AI Foundry backend.");
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setWarning(null);

    try {
      await api.post("/plugins/azure-ai-foundry/sync");
    } catch (error: unknown) {
      console.error("Error syncing Azure AI Foundry data:", error);
      const err = error as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) {
        setWarning(`Sync failed: ${err.response.data.message}`);
      } else {
        setWarning(
          "Failed to sync with Azure AI Foundry. Showing cached data."
        );
      }
    }
    // Always fetch models after sync attempt (to show latest data or cached)
    await fetchModels();
  };

  const handleModelClick = (model: AzureModel) => {
    setSelectedModel(model);
  };

  const handleCloseModal = () => {
    setSelectedModel(null);
  };

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    },
    []
  );

  const getRange = useMemo(() => {
    if (!models.length) {
      return "0 - 0";
    }
    const start = page * rowsPerPage + 1;
    const end = Math.min(page * rowsPerPage + rowsPerPage, models.length);
    return `${start} - ${end}`;
  }, [page, rowsPerPage, models.length]);

  const getProvisioningStateChip = (state: string | null) => {
    const normalizedState = (state || "unknown").toLowerCase();
    let chipStyle = chipStyles.neutral;

    if (normalizedState === "succeeded") {
      chipStyle = chipStyles.success;
    } else if (normalizedState === "updating" || normalizedState === "creating") {
      chipStyle = chipStyles.warning;
    } else if (normalizedState === "failed" || normalizedState === "deleting") {
      chipStyle = chipStyles.error;
    }

    return (
      <Chip
        label={state || "Unknown"}
        size="small"
        sx={{
          ...chipStyles.base,
          ...chipStyle,
        }}
      />
    );
  };

  const displayData = models.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading && models.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading Azure AI Foundry data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: "100%", overflowX: "hidden" }}>
      {/* Warning Alert */}
      {warning && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {warning}
        </Alert>
      )}

      {/* Header with Sync Button */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 2,
          width: "100%",
        }}
      >
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={16} />}
          onClick={handleRefresh}
          disabled={loading}
          sx={{
            ...buttonStyles.base,
            ...buttonStyles.sizes.medium,
            ...buttonStyles.primary.outlined,
            textTransform: "none",
          }}
        >
          Sync
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <Card sx={{ flex: "1 1 200px", minWidth: 150, ...cardStyles.base }}>
          <CardContent>
            <Typography
              variant="body2"
              sx={{ color: colors.textTertiary, fontSize: typography.sizes.md }}
            >
              Total deployments
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: typography.weights.semibold,
                color: colors.textPrimary,
              }}
            >
              {summaryStats.total}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: "1 1 200px", minWidth: 150, ...cardStyles.base }}>
          <CardContent>
            <Typography
              variant="body2"
              sx={{ color: colors.textTertiary, fontSize: typography.sizes.md }}
            >
              Succeeded
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: typography.weights.semibold,
                color: colors.textPrimary,
              }}
            >
              {summaryStats.succeeded}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: "1 1 200px", minWidth: 150, ...cardStyles.base }}>
          <CardContent>
            <Typography
              variant="body2"
              sx={{ color: colors.textTertiary, fontSize: typography.sizes.md }}
            >
              GPT models
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: typography.weights.semibold,
                color: colors.textPrimary,
              }}
            >
              {summaryStats.gptModels}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: "1 1 200px", minWidth: 150, ...cardStyles.base }}>
          <CardContent>
            <Typography
              variant="body2"
              sx={{ color: colors.textTertiary, fontSize: typography.sizes.md }}
            >
              Embeddings
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: typography.weights.semibold,
                color: colors.textPrimary,
              }}
            >
              {summaryStats.embeddingModels}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Table Section */}
      <Box sx={{ mt: 3, mb: 2 }}>
        {models.length === 0 && !loading ? (
          <Box sx={{ textAlign: "center", py: 4, color: colors.textTertiary }}>
            <Typography sx={{ fontSize: typography.sizes.md }}>
              No Azure AI Foundry deployments have been synced yet. Configure
              the integration and click Sync to pull the latest models.
            </Typography>
          </Box>
        ) : (
          <TableContainer
            sx={{
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
            }}
          >
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ backgroundColor: colors.backgroundSecondary }}>
                <TableRow>
                  {[
                    "Deployment name",
                    "Model",
                    "Version",
                    "Status",
                    "SKU",
                    "Capacity",
                    "Last synced",
                    "Actions",
                  ].map((header) => (
                    <TableCell key={header} sx={tableStyles.header}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayData.map((model) => (
                  <TableRow
                    key={model.id}
                    sx={{ ...tableStyles.row, cursor: "pointer" }}
                    onClick={() => handleModelClick(model)}
                  >
                    <TableCell sx={tableStyles.cell}>
                      {model.deployment_name}
                    </TableCell>
                    <TableCell sx={tableStyles.cell}>
                      {model.model_name}
                    </TableCell>
                    <TableCell sx={tableStyles.cell}>
                      {model.model_version || "N/A"}
                    </TableCell>
                    <TableCell sx={tableStyles.cell}>
                      {getProvisioningStateChip(model.provisioning_state)}
                    </TableCell>
                    <TableCell sx={tableStyles.cell}>
                      {model.sku_name || "N/A"}
                    </TableCell>
                    <TableCell sx={tableStyles.cell}>
                      {model.sku_capacity ?? "N/A"}
                    </TableCell>
                    <TableCell sx={tableStyles.cell}>
                      {formatDate(model.last_synced_at)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View details">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModelClick(model);
                          }}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {models.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontSize: typography.sizes.md,
                        color: colors.textTertiary,
                      }}
                    >
                      Showing {getRange} of {models.length} deployment(s)
                    </TableCell>
                    <TablePagination
                      count={models.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      rowsPerPageOptions={[5, 10, 15, 25]}
                      onRowsPerPageChange={handleRowsPerPageChange}
                      labelRowsPerPage="Rows per page"
                      labelDisplayedRows={({ page: currentPage, count }) =>
                        `Page ${currentPage + 1} of ${Math.max(
                          1,
                          Math.ceil(count / rowsPerPage)
                        )}`
                      }
                      slotProps={{
                        select: {
                          IconComponent: SelectorVertical,
                        },
                      }}
                      sx={{ fontSize: typography.sizes.md }}
                    />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Model Details Modal */}
      {selectedModel && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            ...modalStyles.overlay,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={handleCloseModal}
        >
          <Card
            sx={{ ...modalStyles.content }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    ...modalStyles.title,
                    fontSize: typography.sizes.xl,
                  }}
                >
                  {selectedModel.deployment_name}
                </Typography>
                <IconButton
                  onClick={handleCloseModal}
                  sx={{ color: colors.textTertiary }}
                >
                  <XCircle size={20} />
                </IconButton>
              </Box>

              <Grid container spacing={2}>
                <Grid
                  {...({
                    item: true,
                    xs: 12,
                    sm: 6,
                  } as GridProps & { item: boolean; xs: number; sm: number })}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    Model information
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>Model:</strong> {selectedModel.model_name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Version:</strong>{" "}
                      {selectedModel.model_version || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Format:</strong>{" "}
                      {selectedModel.model_format || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong>{" "}
                      {selectedModel.provisioning_state || "N/A"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid
                  {...({
                    item: true,
                    xs: 12,
                    sm: 6,
                  } as GridProps & { item: boolean; xs: number; sm: number })}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    Deployment details
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>SKU:</strong> {selectedModel.sku_name || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Capacity:</strong>{" "}
                      {selectedModel.sku_capacity ?? "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>RAI policy:</strong>{" "}
                      {selectedModel.rai_policy_name || "N/A"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Created by:</strong>{" "}
                      {selectedModel.created_by || "N/A"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid
                  {...({
                    item: true,
                    xs: 12,
                  } as GridProps & { item: boolean; xs: number })}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    Capabilities
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {Object.entries(selectedModel.capabilities || {}).length >
                    0 ? (
                      Object.entries(selectedModel.capabilities).map(
                        ([key, value]) => (
                          <Chip
                            key={key}
                            label={`${key}: ${value}`}
                            size="small"
                            sx={{
                              backgroundColor: "#E0EAFF",
                              color: "#0F172A",
                              borderRadius: "4px",
                            }}
                          />
                        )
                      )
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ color: colors.textTertiary }}
                      >
                        No capabilities data available
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid
                  {...({
                    item: true,
                    xs: 12,
                  } as GridProps & { item: boolean; xs: number })}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    Rate limits
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {selectedModel.rate_limits &&
                    selectedModel.rate_limits.length > 0 ? (
                      selectedModel.rate_limits.map((limit, index) => (
                        <Typography variant="body2" key={index}>
                          <strong>{limit.key}:</strong> {limit.count} per{" "}
                          {limit.renewalPeriod}s
                        </Typography>
                      ))
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ color: colors.textTertiary }}
                      >
                        No rate limits data available
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid
                  {...({
                    item: true,
                    xs: 12,
                  } as GridProps & { item: boolean; xs: number })}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    Timestamps
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>Azure created:</strong>{" "}
                      {formatDate(selectedModel.azure_created_at)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Azure modified:</strong>{" "}
                      {formatDate(selectedModel.azure_modified_at)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Last synced:</strong>{" "}
                      {formatDate(selectedModel.last_synced_at)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default AzureAIFoundryTab;
