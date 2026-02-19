import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from "@mui/material";
import { ArrowRight, X, Save, RefreshCw } from "lucide-react";

interface JiraAttribute {
  id: string;
  name: string;
  type: number;
}

interface VWAttribute {
  name: string;
  type: string;
  description: string;
  options?: string;
}

interface JiraAssetsAttributeMappingProps {
  pluginApiCall?: (method: string, path: string, body?: any) => Promise<any>;
  selectedObjectTypeId?: string;
}

export const JiraAssetsAttributeMapping: React.FC<JiraAssetsAttributeMappingProps> = ({
  pluginApiCall,
  selectedObjectTypeId,
}) => {
  const [jiraAttributes, setJiraAttributes] = useState<JiraAttribute[]>([]);
  const [vwAttributes, setVWAttributes] = useState<VWAttribute[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load JIRA attributes when object type is selected
  const loadJiraAttributes = useCallback(async () => {
    if (!pluginApiCall || !selectedObjectTypeId) return;

    try {
      const response = await pluginApiCall("GET", `/object-types/${selectedObjectTypeId}/attributes`);
      if (Array.isArray(response)) {
        setJiraAttributes(response);
      }
    } catch (err: any) {
      console.error("Failed to load JIRA attributes:", err);
    }
  }, [pluginApiCall, selectedObjectTypeId]);

  // Load VW attributes
  const loadVWAttributes = useCallback(async () => {
    if (!pluginApiCall) return;

    try {
      const response = await pluginApiCall("GET", "/vw-attributes");
      if (Array.isArray(response)) {
        setVWAttributes(response);
      }
    } catch (err: any) {
      console.error("Failed to load VW attributes:", err);
    }
  }, [pluginApiCall]);

  // Load current mappings
  const loadMappings = useCallback(async () => {
    if (!pluginApiCall) return;

    try {
      const response = await pluginApiCall("GET", "/mappings");
      if (response && typeof response === "object") {
        setMappings(response);
      }
    } catch (err: any) {
      console.error("Failed to load mappings:", err);
    }
  }, [pluginApiCall]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadVWAttributes(), loadMappings()])
      .finally(() => setIsLoading(false));
  }, [loadVWAttributes, loadMappings]);

  // Load JIRA attributes when object type changes
  useEffect(() => {
    if (selectedObjectTypeId) {
      loadJiraAttributes();
    }
  }, [selectedObjectTypeId, loadJiraAttributes]);

  // Handle mapping change
  const handleMappingChange = (jiraAttrName: string, vwAttrName: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      if (vwAttrName === "") {
        delete next[jiraAttrName];
      } else {
        next[jiraAttrName] = vwAttrName;
      }
      return next;
    });
  };

  // Clear a mapping
  const handleClearMapping = (jiraAttrName: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      delete next[jiraAttrName];
      return next;
    });
  };

  // Save mappings
  const handleSaveMappings = async () => {
    if (!pluginApiCall) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await pluginApiCall("POST", "/mappings", { mappings });
      if (response?.success) {
        setSuccess(response.message || "Mappings saved successfully");
      } else {
        setError(response?.error || "Failed to save mappings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save mappings");
    } finally {
      setIsSaving(false);
    }
  };

  // Get used VW attributes (to show which are already mapped)
  const usedVWAttributes = new Set(Object.values(mappings));

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!selectedObjectTypeId) {
    return (
      <Alert severity="info" sx={{ fontSize: "13px" }}>
        Please select a Schema and Object Type in Step 2 to configure attribute mappings.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" fontSize={13} sx={{ mb: 2 }}>
        Map JIRA attributes to VerifyWise AI System attributes. Mapped attributes will be stored
        alongside the original JIRA data for compliance and reporting.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, fontSize: "13px" }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2, fontSize: "13px" }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {jiraAttributes.length === 0 ? (
        <Alert severity="warning" sx={{ fontSize: "13px" }}>
          No JIRA attributes found. Please ensure the object type has attributes defined.
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ maxHeight: 400, mb: 2, boxShadow: "none", border: "1px solid #e4e7ec" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f9fafb" }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: "12px", width: "40%" }}>
                    JIRA Attribute
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "12px", width: "10%", textAlign: "center" }}>

                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "12px", width: "45%" }}>
                    VerifyWise Attribute
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "12px", width: "5%" }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {jiraAttributes.map((jiraAttr) => (
                  <TableRow key={jiraAttr.id} hover>
                    <TableCell sx={{ fontSize: "13px" }}>
                      {jiraAttr.name}
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <ArrowRight size={16} color="#98a2b3" />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={mappings[jiraAttr.name] || ""}
                          onChange={(e) => handleMappingChange(jiraAttr.name, e.target.value)}
                          displayEmpty
                          sx={{ fontSize: "13px" }}
                        >
                          <MenuItem value="" sx={{ fontSize: "13px", color: "#98a2b3" }}>
                            -- Not Mapped --
                          </MenuItem>
                          {vwAttributes.map((vwAttr) => (
                            <MenuItem
                              key={vwAttr.name}
                              value={vwAttr.name}
                              sx={{ fontSize: "13px" }}
                              disabled={usedVWAttributes.has(vwAttr.name) && mappings[jiraAttr.name] !== vwAttr.name}
                            >
                              {vwAttr.name}
                              {usedVWAttributes.has(vwAttr.name) && mappings[jiraAttr.name] !== vwAttr.name && (
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                  (already mapped)
                                </Typography>
                              )}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {mappings[jiraAttr.name] && (
                        <Tooltip title="Clear mapping">
                          <IconButton size="small" onClick={() => handleClearMapping(jiraAttr.name)}>
                            <X size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">
              {Object.keys(mappings).length} of {jiraAttributes.length} attributes mapped
            </Typography>
            <Button
              variant="contained"
              onClick={handleSaveMappings}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={16} /> : <Save size={16} />}
              sx={{
                backgroundColor: "#13715B",
                textTransform: "none",
                fontSize: "13px",
                fontWeight: 500,
                "&:hover": { backgroundColor: "#0f5a47" },
                "&:disabled": { backgroundColor: "#d0d5dd" },
              }}
            >
              {isSaving ? "Saving..." : "Save Mappings"}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default JiraAssetsAttributeMapping;
