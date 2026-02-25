import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from "@mui/material";
import {
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { colors } from "./theme";
import { ControlItemDrawer } from "./ControlItemDrawer";

interface CustomFrameworkViewerProps {
  frameworkId: number;
  projectId: number;
  frameworkName?: string;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    patch: (url: string, data?: any) => Promise<any>;
  };
  onRefresh?: () => void;
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
  /** Deep linking: ID of level2 item to scroll to and highlight */
  highlightLevel2Id?: number;
  /** Deep linking: ID of level3 item to scroll to and highlight */
  highlightLevel3Id?: number;
}

interface FrameworkData {
  projectFrameworkId: number;
  frameworkId: number;
  name: string;
  description: string;
  is_organizational: boolean;
  hierarchy_type: string;
  level_1_name: string;
  level_2_name: string;
  level_3_name?: string;
  file_source?: string;
  structure: Level1Item[];
}

interface Level1Item {
  id: number;
  title: string;
  description?: string;
  order_no: number;
  items: Level2Item[];
}

interface Level2Item {
  id: number;
  title: string;
  description?: string;
  summary?: string;
  questions?: string[];
  evidence_examples?: string[];
  order_no: number;
  impl_id?: number;
  status?: string;
  owner?: number;
  owner_name?: string;
  owner_surname?: string;
  reviewer?: number;
  reviewer_name?: string;
  reviewer_surname?: string;
  approver?: number;
  approver_name?: string;
  approver_surname?: string;
  due_date?: string;
  implementation_details?: string;
  evidence_links?: any[];
  linked_risks?: any[];
  items?: Level3Item[];
}

interface Level3Item {
  id: number;
  title: string;
  description?: string;
  order_no: number;
  impl_id?: number;
  status?: string;
  owner?: number;
  due_date?: string;
}

interface ProgressData {
  level2: {
    total: number;
    completed: number;
    assigned: number;
    percentage: number;
  };
  level3?: {
    total: number;
    completed: number;
    assigned: number;
    percentage: number;
  };
  overall: {
    total: number;
    completed: number;
    assigned: number;
    percentage: number;
  };
}

// localStorage key for expanded category (set by CustomFrameworkDashboard)
const CUSTOM_FRAMEWORK_EXPANDED_CATEGORY_KEY = "verifywise_custom_framework_expanded_category";

// Styles matching the app's ControlsTable
const tableStyles = {
  tableHead: {
    "& th": {
      backgroundColor: "#FAFAFA",
      fontWeight: 600,
      fontSize: "13px",
      color: "#1A1919",
      borderBottom: "1px solid #E5E7EB",
      padding: "12px 16px",
    },
  },
  headerCell: {
    backgroundColor: "#FAFAFA",
    fontWeight: 600,
    fontSize: "13px",
    color: "#1A1919",
  },
  cell: {
    fontSize: "13px",
    color: "#1A1919",
    padding: "12px 16px",
    borderBottom: "1px solid #E5E7EB",
  },
  descriptionCell: {
    fontSize: "13px",
    color: "#1A1919",
    padding: "12px 16px",
    borderBottom: "1px solid #E5E7EB",
    maxWidth: "400px",
  },
};

export const CustomFrameworkViewer: React.FC<CustomFrameworkViewerProps> = ({
  frameworkId,
  projectId,
  frameworkName,
  apiServices,
  onRefresh,
  pluginKey,
  highlightLevel2Id,
  highlightLevel3Id,
}) => {
  const [data, setData] = useState<FrameworkData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevel1, setExpandedLevel1] = useState<number | null>(0);
  const [flashingRow, setFlashingRow] = useState<number | null>(null);
  const [highlightedImplId, setHighlightedImplId] = useState<number | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Level2Item | null>(null);


  // Helper to get auth token from localStorage (redux-persist)
  const getAuthToken = (): string | null => {
    try {
      const persistedRoot = localStorage.getItem("persist:root");
      if (persistedRoot) {
        const parsed = JSON.parse(persistedRoot);
        if (parsed.auth) {
          const authState = JSON.parse(parsed.auth);
          return authState.authToken || null;
        }
      }
    } catch {
      // Silently fail
    }
    return null;
  };

  const api = apiServices || {
    get: async (url: string) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api${url}`, { headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return { data: await response.json(), status: response.status };
    },
    post: async (url: string, body?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api${url}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return { data: await response.json(), status: response.status };
    },
    patch: async (url: string, body?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api${url}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return { data: await response.json(), status: response.status };
    },
  };

  const loadFrameworkData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dataResponse, progressResponse] = await Promise.all([
        api.get(`/plugins/${pluginKey}/projects/${projectId}/frameworks/${frameworkId}`),
        api.get(`/plugins/${pluginKey}/projects/${projectId}/frameworks/${frameworkId}/progress`),
      ]);

      const frameworkData = dataResponse.data.data || dataResponse.data;
      const progressData = progressResponse.data.data || progressResponse.data;

      // Check if the responses contain error messages instead of actual data
      if (frameworkData.message && !frameworkData.structure) {
        throw new Error(frameworkData.message);
      }

      setData(frameworkData);

      // Only set progress if it has the expected structure
      if (progressData && progressData.level2 && progressData.overall) {
        setProgress(progressData);
      } else {
        // Set default progress if API returns unexpected structure
        setProgress(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load framework data");
    } finally {
      setLoading(false);
    }
  }, [frameworkId, projectId, pluginKey]);

  useEffect(() => {
    loadFrameworkData();
  }, [loadFrameworkData]);

  // Check localStorage for category to auto-expand (from dashboard navigation)
  useEffect(() => {
    if (!data?.structure) return;

    try {
      const storedCategoryId = localStorage.getItem(CUSTOM_FRAMEWORK_EXPANDED_CATEGORY_KEY);
      if (storedCategoryId) {
        const categoryId = parseInt(storedCategoryId, 10);
        // Find the index of the category in the structure
        const categoryIndex = data.structure.findIndex((level1) => level1.id === categoryId);
        if (categoryIndex !== -1) {
          setExpandedLevel1(categoryIndex);
          // Scroll to the expanded accordion after a delay (to allow expansion animation and DOM update)
          setTimeout(() => {
            // Find the accordion by data attribute (more reliable than refs)
            const accordionElement = document.querySelector(`[data-accordion-index="${categoryIndex}"]`);
            console.log("[CustomFrameworkViewer] Scrolling to accordion index:", categoryIndex, "element:", accordionElement);
            if (accordionElement) {
              accordionElement.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 500);
        }
        // Clear the localStorage after reading
        localStorage.removeItem(CUSTOM_FRAMEWORK_EXPANDED_CATEGORY_KEY);
      }
    } catch (err) {
      console.log("[CustomFrameworkViewer] Error reading stored category:", err);
    }
  }, [data?.structure]);

  // Deep linking: scroll to and highlight a specific level2/level3 item
  useEffect(() => {
    if (!data?.structure) return;

    const targetImplId = highlightLevel2Id || highlightLevel3Id;
    if (!targetImplId) return;

    console.log("[CustomFrameworkViewer] Deep linking to item:", { highlightLevel2Id, highlightLevel3Id });

    // Find the item in the structure
    let foundLevel1Index = -1;
    let foundImplId: number | null = null;

    for (let i = 0; i < data.structure.length; i++) {
      const level1 = data.structure[i];
      for (const level2 of level1.items) {
        // Check if this is the target level2 item
        if (highlightLevel2Id && level2.impl_id === highlightLevel2Id) {
          foundLevel1Index = i;
          foundImplId = level2.impl_id;
          break;
        }
        // Check level3 items if applicable
        if (highlightLevel3Id && level2.items) {
          for (const level3 of level2.items) {
            if (level3.impl_id === highlightLevel3Id) {
              foundLevel1Index = i;
              foundImplId = level3.impl_id;
              break;
            }
          }
        }
        if (foundImplId) break;
      }
      if (foundImplId) break;
    }

    if (foundLevel1Index !== -1 && foundImplId !== null) {
      console.log("[CustomFrameworkViewer] Found item in level1 index:", foundLevel1Index, "impl_id:", foundImplId);

      // Expand the accordion containing the item
      setExpandedLevel1(foundLevel1Index);

      // Highlight the item
      setHighlightedImplId(foundImplId);

      // Scroll to the item after expansion animation
      setTimeout(() => {
        const rowElement = document.querySelector(`[data-impl-id="${foundImplId}"]`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        // Remove highlight after a few seconds
        setTimeout(() => setHighlightedImplId(null), 3000);
      }, 500);
    }
  }, [data?.structure, highlightLevel2Id, highlightLevel3Id]);

  const handleRefresh = useCallback(() => {
    loadFrameworkData();
    onRefresh?.();
  }, [loadFrameworkData, onRefresh]);

  const handleItemClick = (item: Level2Item) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedItem(null);
  };

  const handleItemSave = (savedItemId?: number) => {
    // Flash the row to indicate success
    if (savedItemId) {
      setFlashingRow(savedItemId);
      setTimeout(() => setFlashingRow(null), 1500);
    }
    // Reload data after saving
    loadFrameworkData();
  };

  // Progress bar color based on percentage (matching app's ControlsTable)
  const getProgressColor = (value: number): string => {
    if (value <= 10) return "#FF4500";
    if (value <= 20) return "#FF4500";
    if (value <= 30) return "#FFA500";
    if (value <= 40) return "#FFD700";
    if (value <= 50) return "#E9F14F";
    if (value <= 60) return "#CDDD24";
    if (value <= 70) return "#64E730";
    if (value <= 80) return "#32CD32";
    if (value <= 90) return "#228B22";
    return "#008000";
  };

  const calculateLevel1Progress = (items: Level2Item[]): { completed: number; total: number; percentage: number } => {
    if (!items || items.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = items.filter((i) => i.status === "Implemented").length;
    const total = items.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const getOwnerName = (item: Level2Item): string => {
    if (item.owner_name || item.owner_surname) {
      return `${item.owner_name || ""} ${item.owner_surname || ""}`.trim();
    }
    return "Not assigned";
  };

  const getSubcontrolsCount = (item: Level2Item): number => {
    return item.items?.length || 0;
  };

  const calculateItemCompletion = (item: Level2Item): number => {
    if (!item.items || item.items.length === 0) {
      // If no subitems, base completion on status
      return item.status === "Implemented" ? 100 : 0;
    }
    const completed = item.items.filter((sub) => sub.status === "Implemented").length;
    return Math.round((completed / item.items.length) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button size="small" onClick={handleRefresh} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No framework data available
      </Alert>
    );
  }

  // Table columns for Level 2 items
  const columns = [
    { name: `${data.level_2_name} Name` },
    { name: "Owner" },
    { name: data.hierarchy_type === "three_level" ? `# of ${data.level_3_name}s` : "Status" },
    { name: "Completion" },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: "16px", fontWeight: 600, color: "#1A1919" }}>
            {data.name || frameworkName}
          </Typography>
          {data.description && (
            <Typography sx={{ fontSize: "13px", color: "#666666", mt: 0.5 }}>
              {data.description}
            </Typography>
          )}
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} size="small" sx={{ color: "#666666" }}>
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Progress Stats Card - Matching app's StatsCard */}
      {progress && progress.overall && (
        <Box
          sx={{
            border: "1px solid #EAECF0",
            borderRadius: "4px",
            p: 2,
            mb: 3,
            backgroundColor: "#FAFAFA",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#1A1919" }}>
              Compliance Progress
            </Typography>
            <Typography sx={{ fontSize: "24px", fontWeight: 600, color: colors.primary }}>
              {progress.overall.percentage ?? 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress.overall.percentage ?? 0}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "#E5E7EB",
              mb: 1,
              "& .MuiLinearProgress-bar": {
                backgroundColor: getProgressColor(progress.overall.percentage ?? 0),
                borderRadius: 4,
              },
            }}
          />
          <Typography sx={{ fontSize: "13px", color: "#666666" }}>
            {progress.overall.completed ?? 0} of {progress.overall.total ?? 0} {data.level_2_name}s completed
          </Typography>
        </Box>
      )}

      {/* Framework Structure - Accordions with Tables */}
      {data.structure?.map((level1, idx) => {
        const level1Progress = calculateLevel1Progress(level1.items);
        const isExpanded = expandedLevel1 === idx;

        return (
          <Accordion
            key={level1.id}
            data-accordion-index={idx}
            expanded={isExpanded}
            onChange={() => setExpandedLevel1(isExpanded ? null : idx)}
            sx={{
              mb: "9px",
              "&:before": { display: "none" },
              boxShadow: "none",
              border: "1px solid #EAECF0",
              borderRadius: "4px !important",
              overflow: "hidden",
            }}
            disableGutters
          >
            <AccordionSummary
              sx={{
                px: 2,
                backgroundColor: "#FAFAFA",
                flexDirection: "row-reverse",
                "& .MuiAccordionSummary-expandIconWrapper": {
                  transform: "rotate(-90deg)",
                  transition: "transform 0.3s",
                },
                "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
                  transform: "rotate(0deg)",
                },
                "& .MuiAccordionSummary-content": {
                  ml: 1,
                },
              }}
              expandIcon={<ChevronRight size={20} style={{ color: "#666666" }} />}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <Typography sx={{ fontSize: "13px", fontWeight: 500, color: "#1A1919" }}>
                  {level1.order_no}. {level1.title}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ width: 80 }}>
                    <LinearProgress
                      variant="determinate"
                      value={level1Progress.percentage}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#E5E7EB",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: getProgressColor(level1Progress.percentage),
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: "13px", color: "#666666", minWidth: 55 }}>
                    {level1Progress.completed}/{level1Progress.total}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table>
                  <TableHead sx={tableStyles.tableHead}>
                    <TableRow>
                      {columns.map((col, index) => (
                        <TableCell key={index} sx={tableStyles.headerCell}>
                          {col.name}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {level1.items?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={columns.length} sx={{ ...tableStyles.cell, textAlign: "center" }}>
                          <Typography sx={{ color: "#666", fontSize: "13px" }}>
                            No {data.level_2_name}s found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {level1.items
                      ?.sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0))
                      .map((level2) => {
                        const completion = calculateItemCompletion(level2);
                        const isFlashing = flashingRow === level2.id;
                        const isHighlighted = highlightedImplId === level2.impl_id;

                        return (
                          <TableRow
                            key={level2.id}
                            data-impl-id={level2.impl_id}
                            onClick={() => handleItemClick(level2)}
                            sx={{
                              cursor: "pointer",
                              backgroundColor: isHighlighted ? "#fff3cd" : isFlashing ? "#e3f5e6" : "transparent",
                              transition: "background-color 0.3s",
                              boxShadow: isHighlighted ? "inset 0 0 0 2px #ffc107" : "none",
                              "&:hover": {
                                backgroundColor: isHighlighted ? "#fff3cd" : isFlashing ? "#e3f5e6" : "#FBFBFB",
                              },
                            }}
                          >
                            <TableCell sx={tableStyles.descriptionCell}>
                              <Typography component="span" sx={{ fontSize: "13px" }}>
                                {level1.order_no}.{level2.order_no} {level2.title}{" "}
                                {level2.description && (
                                  <Typography
                                    component="span"
                                    sx={{ color: "grey", fontSize: "13px" }}
                                  >
                                    ({level2.description.length > 60
                                      ? `${level2.description.substring(0, 60)}...`
                                      : level2.description})
                                  </Typography>
                                )}
                              </Typography>
                            </TableCell>
                            <TableCell sx={tableStyles.cell}>
                              <Typography sx={{ fontSize: "13px" }}>
                                {getOwnerName(level2)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={tableStyles.cell}>
                              <Typography sx={{ fontSize: "13px" }}>
                                {data.hierarchy_type === "three_level"
                                  ? `${getSubcontrolsCount(level2)} ${data.level_3_name}s`
                                  : level2.status || "Not started"}
                              </Typography>
                            </TableCell>
                            <TableCell sx={tableStyles.cell}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Box sx={{ width: "100%", minWidth: 60 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={completion}
                                    sx={{
                                      height: 8,
                                      borderRadius: 4,
                                      backgroundColor: "#E5E7EB",
                                      "& .MuiLinearProgress-bar": {
                                        backgroundColor: getProgressColor(completion),
                                      },
                                    }}
                                  />
                                </Box>
                                <Typography sx={{ fontSize: "13px", minWidth: 35 }}>
                                  {completion}%
                                </Typography>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Control Item Drawer */}
      <ControlItemDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        item={selectedItem}
        frameworkData={data ? {
          level_1_name: data.level_1_name,
          level_2_name: data.level_2_name,
          level_3_name: data.level_3_name,
          file_source: data.file_source,
        } : null}
        projectId={projectId}
        onSave={() => handleItemSave(selectedItem?.id)}
        apiServices={api}
        isOrganizational={data?.is_organizational || false}
        pluginKey={pluginKey}
      />
    </Box>
  );
};
