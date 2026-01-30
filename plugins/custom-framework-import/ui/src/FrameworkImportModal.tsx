/**
 * Framework Import Modal
 *
 * Multi-step wizard for importing custom compliance frameworks.
 * Supports JSON, Excel, and template library import methods.
 * Matches VerifyWise StandardModal design pattern.
 */

import React, { useState, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Modal,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  InputAdornment,
  Tabs,
  Tab,
  Stack,
} from "@mui/material";
import {
  Download,
  Upload,
  CheckCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  Edit3,
} from "lucide-react";
import {
  frameworkTemplates,
  templateCategories,
  FrameworkTemplate,
} from "./frameworkTemplates";
import * as ExcelJS from "exceljs";

interface FrameworkImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
  };
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
}

interface ParsedFramework {
  name: string;
  description: string;
  version: string;
  is_organizational: boolean;
  hierarchy: {
    type: "two_level" | "three_level";
    level1_name: string;
    level2_name: string;
    level3_name?: string;
  };
  structure: any[];
}

const steps = ["Choose Method", "Configure", "Preview & Import"];

export const FrameworkImportModal: React.FC<FrameworkImportModalProps> = ({
  open,
  onClose,
  onImportComplete,
  apiServices,
  pluginKey = "custom-framework-import",
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [importMethod, setImportMethod] = useState<
    "json" | "excel" | "template"
  >("template");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  // JSON import state
  const [jsonText, setJsonText] = useState("");
  const [parsedFramework, setParsedFramework] =
    useState<ParsedFramework | null>(null);

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<{
    info: any;
    structure: any[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template selection state
  const [selectedTemplate, setSelectedTemplate] =
    useState<FrameworkTemplate | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [templateCategory, setTemplateCategory] = useState("all");
  const [customizingTemplate, setCustomizingTemplate] = useState(false);
  const [customizedJson, setCustomizedJson] = useState("");

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
    get: async (url: string, options?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, {
        ...options,
        headers,
      });
      if (options?.responseType === "blob") {
        return { data: await response.blob(), status: response.status };
      }
      return { data: await response.json(), status: response.status };
    },
    post: async (url: string, data?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
      return { data: await response.json(), status: response.status };
    },
  };

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setImportMethod("template");
    setJsonText("");
    setParsedFramework(null);
    setExcelFile(null);
    setExcelData(null);
    setError(null);
    setImportResult(null);
    setSelectedTemplate(null);
    setTemplateSearchQuery("");
    setTemplateCategory("all");
    setCustomizingTemplate(false);
    setCustomizedJson("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(
        `/plugins/${pluginKey}/template`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "custom_framework_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(`Failed to download template: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleParseJson = useCallback(() => {
    try {
      setError(null);
      const parsed = JSON.parse(jsonText);
      setParsedFramework(parsed);
      setActiveStep(2);
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    }
  }, [jsonText]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // Parse Framework Info sheet
      const infoSheet = workbook.getWorksheet("Framework Info");
      if (!infoSheet) {
        throw new Error('Sheet "Framework Info" not found');
      }

      const info: Record<string, string> = {};
      infoSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const field = row.getCell(1).value?.toString() || "";
          const value = row.getCell(2).value?.toString() || "";
          if (field) {
            info[field] = value;
          }
        }
      });

      // Parse Structure sheet
      const structureSheet = workbook.getWorksheet("Structure");
      if (!structureSheet) {
        throw new Error('Sheet "Structure" not found');
      }

      const structure: any[] = [];
      const headers: string[] = [];

      structureSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell, colNumber) => {
            headers[colNumber] =
              cell.value
                ?.toString()
                .toLowerCase()
                .replace(/\s+/g, "_")
                .replace(/[*()]/g, "")
                .replace(/_+$/, "") || "";
          });
        } else {
          const rowData: Record<string, any> = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
              rowData[header] = cell.value?.toString() || "";
            }
          });
          if (rowData.level && rowData.title) {
            structure.push(rowData);
          }
        }
      });

      setExcelData({ info, structure });

      // Convert to parsed framework format for preview
      const framework = convertExcelToFramework(info, structure);
      setParsedFramework(framework);
      setActiveStep(2);
    } catch (err: any) {
      setError(`Failed to parse Excel file: ${err.message}`);
    }
  };

  const convertExcelToFramework = (
    info: Record<string, string>,
    structure: any[]
  ): ParsedFramework => {
    const framework: ParsedFramework = {
      name: info.name || "Unnamed Framework",
      description: info.description || "",
      version: info.version || "1.0.0",
      is_organizational: info.is_organizational === "true",
      hierarchy: {
        type:
          (info.hierarchy_type as "two_level" | "three_level") || "two_level",
        level1_name: info.level1_name || "Category",
        level2_name: info.level2_name || "Control",
        level3_name: info.level3_name || undefined,
      },
      structure: [],
    };

    let currentLevel1: any = null;
    let currentLevel2: any = null;

    for (const row of structure) {
      const level = parseInt(row.level);

      if (level === 1) {
        if (currentLevel1) {
          framework.structure.push(currentLevel1);
        }
        currentLevel1 = {
          title: row.title,
          description: row.description || undefined,
          order_no: parseInt(row.order) || 1,
          items: [],
        };
        currentLevel2 = null;
      } else if (level === 2 && currentLevel1) {
        currentLevel2 = {
          title: row.title,
          description: row.description || undefined,
          order_no: parseInt(row.order) || 1,
          summary: row.summary || undefined,
          questions: row.questions_comma_separated
            ? row.questions_comma_separated
                .split(",")
                .map((q: string) => q.trim())
            : undefined,
          evidence_examples: row.evidence_examples_comma_separated
            ? row.evidence_examples_comma_separated
                .split(",")
                .map((e: string) => e.trim())
            : undefined,
          items: [],
        };
        currentLevel1.items.push(currentLevel2);
      } else if (level === 3 && currentLevel2) {
        currentLevel2.items.push({
          title: row.title,
          description: row.description || undefined,
          order_no: parseInt(row.order) || 1,
          summary: row.summary || undefined,
        });
      }
    }

    if (currentLevel1) {
      framework.structure.push(currentLevel1);
    }

    return framework;
  };

  const handleSelectTemplate = (template: FrameworkTemplate) => {
    setSelectedTemplate(template);
    setCustomizedJson(JSON.stringify(template.framework, null, 2));
  };

  const handleUseTemplate = (customize: boolean) => {
    if (!selectedTemplate) return;

    if (customize) {
      setCustomizingTemplate(true);
      setActiveStep(1);
    } else {
      setParsedFramework(selectedTemplate.framework);
      setActiveStep(2);
    }
  };

  const handleParseCustomizedTemplate = () => {
    try {
      setError(null);
      const parsed = JSON.parse(customizedJson);
      setParsedFramework(parsed);
      setActiveStep(2);
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  const handleImport = async () => {
    if (!parsedFramework) return;

    try {
      setLoading(true);
      setError(null);

      let response;
      if (importMethod === "excel" && excelData) {
        response = await api.post(
          `/plugins/${pluginKey}/import-excel`,
          excelData
        );
      } else {
        response = await api.post(
          `/plugins/${pluginKey}/import`,
          parsedFramework
        );
      }

      const result = response.data.data || response.data;

      if (result.success === false) {
        setError(result.message || "Import failed");
        if (result.errors) {
          setError(`${result.message}\n\nErrors:\n${result.errors.join("\n")}`);
        }
        return;
      }

      setImportResult(result);

      if (onImportComplete) {
        setTimeout(() => {
          onImportComplete();
          handleClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const countItems = (
    structure: any[]
  ): { level1: number; level2: number; level3: number } => {
    let level1 = 0;
    let level2 = 0;
    let level3 = 0;

    for (const l1 of structure || []) {
      level1++;
      for (const l2 of l1.items || []) {
        level2++;
        level3 += (l2.items || []).length;
      }
    }

    return { level1, level2, level3 };
  };

  const getFilteredTemplates = () => {
    return frameworkTemplates.filter((template) => {
      const matchesCategory =
        templateCategory === "all" || template.category === templateCategory;
      const matchesSearch =
        !templateSearchQuery ||
        template.name
          .toLowerCase()
          .includes(templateSearchQuery.toLowerCase()) ||
        template.description
          .toLowerCase()
          .includes(templateSearchQuery.toLowerCase()) ||
        template.tags.some((tag) =>
          tag.toLowerCase().includes(templateSearchQuery.toLowerCase())
        );
      return matchesCategory && matchesSearch;
    });
  };

  const renderMethodSelection = () => (
    <Box>
      {/* Template Library */}
      <Box
        onClick={() => setImportMethod("template")}
        sx={{
          cursor: "pointer",
          border: importMethod === "template" ? "2px solid #13715B" : "1px solid #E0E4E9",
          borderRadius: "8px",
          backgroundColor: importMethod === "template" ? "#F0FAF8" : "#FFFFFF",
          padding: "16px",
          marginBottom: "12px",
          transition: "all 0.15s",
          "&:hover": {
            borderColor: "#13715B",
            backgroundColor: "#F9FAFB",
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#101828" }}>
              Template Library
            </Typography>
            <Chip
              label="Recommended"
              size="small"
              sx={{
                backgroundColor: "#ECFDF3",
                color: "#027A48",
                fontWeight: 500,
                fontSize: 11,
                height: 22,
              }}
            />
          </Box>
          {importMethod === "template" && <CheckCircle size={18} color="#13715B" />}
        </Box>
        <Typography sx={{ fontSize: 13, color: "#667085", mb: 1.5, lineHeight: 1.5 }}>
          Choose from pre-built compliance frameworks like ISO 27001, SOC 2, NIST, and more
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip label="Quick Setup" size="small" sx={{ backgroundColor: "#F2F4F7", color: "#344054", fontSize: 11, height: 22 }} />
          <Chip label="Best Practices" size="small" sx={{ backgroundColor: "#F2F4F7", color: "#344054", fontSize: 11, height: 22 }} />
        </Box>
      </Box>

      {/* JSON Import */}
      <Box
        onClick={() => setImportMethod("json")}
        sx={{
          cursor: "pointer",
          border: importMethod === "json" ? "2px solid #13715B" : "1px solid #E0E4E9",
          borderRadius: "8px",
          backgroundColor: importMethod === "json" ? "#F0FAF8" : "#FFFFFF",
          padding: "16px",
          marginBottom: "12px",
          transition: "all 0.15s",
          "&:hover": {
            borderColor: "#13715B",
            backgroundColor: "#F9FAFB",
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#101828" }}>
            JSON Import
          </Typography>
          {importMethod === "json" && <CheckCircle size={18} color="#13715B" />}
        </Box>
        <Typography sx={{ fontSize: 13, color: "#667085", mb: 1.5, lineHeight: 1.5 }}>
          Paste or upload a JSON file with your custom framework structure
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip label="Full Control" size="small" sx={{ backgroundColor: "#F2F4F7", color: "#344054", fontSize: 11, height: 22 }} />
          <Chip label="Custom Structure" size="small" sx={{ backgroundColor: "#F2F4F7", color: "#344054", fontSize: 11, height: 22 }} />
        </Box>
      </Box>

      {/* Excel Template */}
      <Box
        onClick={() => setImportMethod("excel")}
        sx={{
          cursor: "pointer",
          border: importMethod === "excel" ? "2px solid #13715B" : "1px solid #E0E4E9",
          borderRadius: "8px",
          backgroundColor: importMethod === "excel" ? "#F0FAF8" : "#FFFFFF",
          padding: "16px",
          marginBottom: "12px",
          transition: "all 0.15s",
          "&:hover": {
            borderColor: "#13715B",
            backgroundColor: "#F9FAFB",
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#101828" }}>
            Excel Template
          </Typography>
          {importMethod === "excel" && <CheckCircle size={18} color="#13715B" />}
        </Box>
        <Typography sx={{ fontSize: 13, color: "#667085", mb: 1.5, lineHeight: 1.5 }}>
          Download our Excel template, fill it out with your framework data, and upload
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip label="Spreadsheet Format" size="small" sx={{ backgroundColor: "#F2F4F7", color: "#344054", fontSize: 11, height: 22 }} />
          <Chip label="Easy Editing" size="small" sx={{ backgroundColor: "#F2F4F7", color: "#344054", fontSize: 11, height: 22 }} />
        </Box>
      </Box>
    </Box>
  );

  const renderTemplateSelection = () => (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Search */}
      <TextField
        size="small"
        placeholder="Search templates..."
        value={templateSearchQuery}
        onChange={(e) => setTemplateSearchQuery(e.target.value)}
        fullWidth
        sx={{
          mb: 2,
          "& .MuiOutlinedInput-root": {
            fontSize: 13,
            backgroundColor: "#FFFFFF",
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} color="#667085" />
            </InputAdornment>
          ),
        }}
      />

      {/* Category Tabs */}
      <Tabs
        value={templateCategory}
        onChange={(_, value) => setTemplateCategory(value)}
        sx={{
          mb: 2,
          minHeight: 36,
          "& .MuiTab-root": {
            fontSize: 12,
            minHeight: 36,
            textTransform: "none",
            color: "#667085",
            "&.Mui-selected": { color: "#13715B" },
          },
          "& .MuiTabs-indicator": { backgroundColor: "#13715B" },
        }}
      >
        {templateCategories.map((cat) => (
          <Tab key={cat.id} label={cat.name} value={cat.id} />
        ))}
      </Tabs>

      {/* Template List */}
      <Box sx={{ flex: 1, overflow: "auto", pr: 1 }}>
        {getFilteredTemplates().map((template) => (
          <Box
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            sx={{
              cursor: "pointer",
              border: selectedTemplate?.id === template.id
                ? "2px solid #13715B"
                : "1px solid #E0E4E9",
              borderRadius: "8px",
              backgroundColor: selectedTemplate?.id === template.id ? "#F0FAF8" : "#FFFFFF",
              padding: "16px",
              marginBottom: "12px",
              transition: "all 0.15s",
              "&:hover": {
                borderColor: "#13715B",
                backgroundColor: "#F9FAFB",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <Typography
                sx={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#101828",
                }}
              >
                {template.name}
              </Typography>
              {selectedTemplate?.id === template.id && (
                <CheckCircle size={18} color="#13715B" />
              )}
            </Box>
            <Typography
              sx={{
                fontSize: "13px",
                color: "#667085",
                marginBottom: "12px",
                lineHeight: 1.5,
              }}
            >
              {template.description}
            </Typography>
            <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Chip
                label={template.framework.hierarchy.type === "three_level" ? "3 Levels" : "2 Levels"}
                size="small"
                sx={{
                  backgroundColor: "#F2F4F7",
                  color: "#344054",
                  fontSize: "11px",
                  height: "22px",
                }}
              />
              <Chip
                label={template.framework.is_organizational ? "Organizational" : "Project"}
                size="small"
                sx={{
                  backgroundColor: "#F2F4F7",
                  color: "#344054",
                  fontSize: "11px",
                  height: "22px",
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>

    </Box>
  );

  const renderConfigureStep = () => {
    // Template customization
    if (importMethod === "template" && customizingTemplate) {
      return (
        <Box>
          <Alert
            severity="info"
            sx={{
              mb: 2,
              fontSize: 12,
              "& .MuiAlert-message": { fontSize: 12 },
            }}
          >
            Customize the framework JSON below. You can modify the name,
            description, structure, and any other fields.
          </Alert>
          <TextField
            multiline
            rows={12}
            fullWidth
            value={customizedJson}
            onChange={(e) => setCustomizedJson(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: "monospace",
                fontSize: 11,
                backgroundColor: "#FAFAFA",
              },
            }}
          />
        </Box>
      );
    }

    // Template selection (step 1 for template method)
    if (importMethod === "template") {
      return renderTemplateSelection();
    }

    // JSON input
    if (importMethod === "json") {
      return (
        <Box>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 500,
              color: "#344054",
              mb: 1,
            }}
          >
            Paste your framework JSON:
          </Typography>
          <TextField
            multiline
            rows={12}
            fullWidth
            placeholder={`{
  "name": "My Framework",
  "description": "Framework description",
  "version": "1.0.0",
  "is_organizational": false,
  "hierarchy": {
    "type": "two_level",
    "level1_name": "Category",
    "level2_name": "Control"
  },
  "structure": [...]
}`}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: "monospace",
                fontSize: 11,
                backgroundColor: "#FAFAFA",
              },
            }}
          />
        </Box>
      );
    }

    // Excel upload
    return (
      <Box>
        <Alert
          severity="info"
          sx={{
            mb: 2,
            fontSize: 12,
            "& .MuiAlert-message": { fontSize: 12 },
          }}
        >
          Download the Excel template, fill it out with your framework data,
          then upload it below.
        </Alert>

        <Button
          variant="outlined"
          size="small"
          startIcon={<Download size={16} />}
          onClick={handleDownloadTemplate}
          disabled={loading}
          sx={{
            mb: 3,
            fontSize: 12,
            height: 34,
            borderColor: "#D0D5DD",
            color: "#344054",
            textTransform: "none",
            "&:hover": {
              borderColor: "#98A2B3",
              backgroundColor: "#F9FAFB",
            },
          }}
        >
          Download Template
        </Button>

        <Box
          sx={{
            border: `2px dashed ${excelFile ? "#13715B" : "#E0E4E9"}`,
            borderRadius: "8px",
            p: 4,
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: excelFile ? "#F0FAF8" : "#FAFAFA",
            transition: "all 0.2s",
            "&:hover": {
              borderColor: "#13715B",
              backgroundColor: "#F9FAFB",
            },
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <Upload size={32} color={excelFile ? "#13715B" : "#98A2B3"} />
          <Typography
            sx={{
              fontSize: 13,
              color: excelFile ? "#13715B" : "#667085",
              mt: 1.5,
              fontWeight: excelFile ? 500 : 400,
            }}
          >
            {excelFile ? excelFile.name : "Click to upload or drag and drop"}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "#98A2B3" }}>
            .xlsx or .xls files only
          </Typography>
        </Box>
      </Box>
    );
  };

  const renderPreviewStep = () => {
    if (!parsedFramework) return null;

    const counts = countItems(parsedFramework.structure);

    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {importResult ? (
          <Alert
            severity="success"
            icon={<CheckCircle size={20} />}
            sx={{ fontSize: 13 }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
              Framework imported successfully!
            </Typography>
            <Typography sx={{ fontSize: 12 }}>
              Created {importResult.itemsCreated} items. Framework ID:{" "}
              {importResult.frameworkId}
            </Typography>
          </Alert>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Framework Summary Card */}
            <Box
              sx={{
                p: 2,
                mb: 2,
                border: "1px solid #E0E4E9",
                borderRadius: "8px",
                backgroundColor: "#FFFFFF",
                flexShrink: 0,
              }}
            >
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#101828",
                  mb: 0.5,
                }}
              >
                {parsedFramework.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  color: "#667085",
                  mb: 2,
                }}
              >
                {parsedFramework.description}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={`v${parsedFramework.version}`}
                  size="small"
                  sx={{ fontSize: 11, height: 22, backgroundColor: "#F2F4F7" }}
                />
                <Chip
                  label={parsedFramework.is_organizational ? "Organizational" : "Project-level"}
                  size="small"
                  sx={{
                    fontSize: 11,
                    height: 22,
                    backgroundColor: parsedFramework.is_organizational ? "#ECFDF3" : "#F2F4F7",
                    color: parsedFramework.is_organizational ? "#027A48" : "#344054",
                  }}
                />
                <Chip
                  label={parsedFramework.hierarchy.type === "three_level" ? "3 Levels" : "2 Levels"}
                  size="small"
                  sx={{ fontSize: 11, height: 22, backgroundColor: "#F2F4F7" }}
                />
              </Stack>

              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography sx={{ fontSize: 11, color: "#667085" }}>
                    {parsedFramework.hierarchy.level1_name}s
                  </Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#101828" }}>
                    {counts.level1}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: "#667085" }}>
                    {parsedFramework.hierarchy.level2_name}s
                  </Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#101828" }}>
                    {counts.level2}
                  </Typography>
                </Box>
                {parsedFramework.hierarchy.type === "three_level" && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: "#667085" }}>
                      {parsedFramework.hierarchy.level3_name}s
                    </Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#101828" }}>
                      {counts.level3}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* Structure Preview */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#344054",
                  mb: 1,
                  flexShrink: 0,
                }}
              >
                Structure Preview
              </Typography>
              <TableContainer
                component={Paper}
                sx={{
                  flex: 1,
                  border: "1px solid #E0E4E9",
                  borderRadius: "8px",
                  boxShadow: "none",
                }}
              >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600, backgroundColor: "#F9FAFB", width: 60 }}>
                      Level
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600, backgroundColor: "#F9FAFB" }}>
                      Title
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedFramework.structure.slice(0, 5).map((l1, i) => (
                    <React.Fragment key={i}>
                      <TableRow sx={{ backgroundColor: "#F9FAFB" }}>
                        <TableCell sx={{ fontSize: 11 }}>
                          <Chip
                            label="L1"
                            size="small"
                            sx={{
                              backgroundColor: "#ECFDF3",
                              color: "#027A48",
                              fontSize: 10,
                              height: 18,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>
                          {l1.title}
                        </TableCell>
                      </TableRow>
                      {(l1.items || []).slice(0, 2).map((l2: any, j: number) => (
                        <TableRow key={`${i}-${j}`}>
                          <TableCell sx={{ fontSize: 11, pl: 3 }}>
                            <Chip
                              label="L2"
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: 10, height: 18 }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {l2.title}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              </TableContainer>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return true;
      case 1:
        if (importMethod === "template") {
          if (customizingTemplate) {
            return customizedJson.trim().length > 0;
          }
          return selectedTemplate !== null;
        }
        return importMethod === "json"
          ? jsonText.trim().length > 0
          : excelData !== null;
      case 2:
        return parsedFramework !== null && !importResult;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (activeStep === 1) {
      if (importMethod === "json") {
        handleParseJson();
        return;
      }
      if (importMethod === "template" && customizingTemplate) {
        handleParseCustomizedTemplate();
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (activeStep === 1 && importMethod === "template" && customizingTemplate) {
      setCustomizingTemplate(false);
      return;
    }
    setActiveStep((prev) => prev - 1);
  };

  return (
    <Modal
      open={open}
      onClose={(_event, reason) => {
        if (reason !== "backdropClick") {
          handleClose();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <Stack
        sx={{
          width: "800px",
          height: "650px",
          maxWidth: "calc(100vw - 48px)",
          maxHeight: "calc(100vh - 48px)",
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          overflow: "hidden",
          "&:focus": { outline: "none" },
        }}
      >
        {/* Header */}
        <Stack
          sx={{
            background: "linear-gradient(180deg, #F8FAFB 0%, #F3F5F8 100%)",
            borderBottom: "1px solid #E0E4E9",
            padding: "16px 24px",
            paddingBottom: "36px",
            marginBottom: "-20px",
            zIndex: 0,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack spacing={0.5}>
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#101828",
                  lineHeight: "28px",
                }}
              >
                Import Custom Framework
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: "#475467",
                  lineHeight: "20px",
                }}
              >
                Create a new compliance framework from templates, JSON, or Excel
              </Typography>
            </Stack>
            <Box
              component="span"
              role="button"
              tabIndex={0}
              onClick={handleClose}
              sx={{
                cursor: "pointer",
                color: "#98A2B3",
                display: "flex",
                alignItems: "center",
                padding: "4px",
                borderRadius: "4px",
                "&:hover": { backgroundColor: "#F2F4F7" },
              }}
            >
              <X size={20} />
            </Box>
          </Stack>
        </Stack>

        {/* Content */}
        <Box
          sx={{
            padding: "20px",
            flex: 1,
            overflow: "hidden",
            border: "1px solid #E0E4E9",
            borderRadius: "16px",
            backgroundColor: "#FFFFFF",
            zIndex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Stepper */}
          <Box sx={{ pb: 5, flexShrink: 0 }}>
            <Stepper
              activeStep={activeStep}
              sx={{
                "& .MuiStepConnector-line": {
                  borderTopWidth: 2,
                },
                "& .MuiStepConnector-root.Mui-active .MuiStepConnector-line": {
                  borderColor: "#13715B",
                },
                "& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line": {
                  borderColor: "#13715B",
                },
              }}
            >
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel
                    sx={{
                      "& .MuiStepLabel-label": {
                        fontSize: "13px",
                        fontWeight: activeStep === index ? 600 : 400,
                        color: activeStep >= index ? "#101828" : "#667085",
                      },
                      "& .MuiStepIcon-root": {
                        color: activeStep >= index ? "#13715B" : "#E0E4E9",
                        fontSize: 24,
                      },
                      "& .MuiStepIcon-text": {
                        fill: "#FFFFFF",
                        fontSize: "12px",
                        fontWeight: 500,
                      },
                      "& .MuiStepConnector-line": {
                        borderColor: activeStep > index ? "#13715B" : "#E0E4E9",
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Step Content */}
          <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2, fontSize: 12, flexShrink: 0 }}
                onClose={() => setError(null)}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12 }}>
                  {error}
                </pre>
              </Alert>
            )}

            <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {activeStep === 0 && renderMethodSelection()}
              {activeStep === 1 && renderConfigureStep()}
              {activeStep === 2 && renderPreviewStep()}
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{
            background: "linear-gradient(180deg, #F3F5F8 0%, #F8FAFB 100%)",
            borderTop: "1px solid #E0E4E9",
            padding: "12px 24px",
            paddingTop: "32px",
            marginTop: "-20px",
            zIndex: 0,
          }}
        >
          {/* Left side - Back button */}
          <Box>
            {activeStep > 0 && !importResult && (
              <Button
                onClick={handleBack}
                startIcon={<ChevronLeft size={16} />}
                disabled={loading}
                sx={{
                  fontSize: 13,
                  height: 34,
                  color: "#344054",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#F2F4F7" },
                }}
              >
                Back
              </Button>
            )}
          </Box>

          {/* Right side - Context-sensitive buttons */}
          <Stack direction="row" spacing={1.5}>
            {/* Step 0: Next */}
            {activeStep === 0 && (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ChevronRight size={16} />}
                disabled={loading}
                sx={{
                  fontSize: 13,
                  height: 34,
                  backgroundColor: "#13715B",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#0F5A47" },
                }}
              >
                Next
              </Button>
            )}

            {/* Step 1 with template selected: Customize + Use Template */}
            {activeStep === 1 && importMethod === "template" && selectedTemplate && !customizingTemplate && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Edit3 size={14} />}
                  onClick={() => handleUseTemplate(true)}
                  disabled={loading}
                  sx={{
                    fontSize: 13,
                    height: 34,
                    borderColor: "#D0D5DD",
                    color: "#344054",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#98A2B3",
                      backgroundColor: "#F9FAFB",
                    },
                  }}
                >
                  Customize
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleUseTemplate(false)}
                  disabled={loading}
                  sx={{
                    fontSize: 13,
                    height: 34,
                    backgroundColor: "#13715B",
                    textTransform: "none",
                    "&:hover": { backgroundColor: "#0F5A47" },
                  }}
                >
                  Use Template
                </Button>
              </>
            )}

            {/* Step 1 with JSON/Excel or customizing template or no template selected: Next */}
            {activeStep === 1 && (importMethod !== "template" || customizingTemplate || !selectedTemplate) && (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ChevronRight size={16} />}
                disabled={!canProceed() || loading}
                sx={{
                  fontSize: 13,
                  height: 34,
                  backgroundColor: "#13715B",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#0F5A47" },
                  "&.Mui-disabled": {
                    backgroundColor: "#E5E7EB",
                    color: "#9CA3AF",
                  },
                }}
              >
                Next
              </Button>
            )}

            {/* Step 2: Import Framework */}
            {activeStep === 2 && !importResult && (
              <Button
                variant="contained"
                onClick={handleImport}
                startIcon={
                  loading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Upload size={16} />
                  )
                }
                disabled={loading || !parsedFramework}
                sx={{
                  fontSize: 13,
                  height: 34,
                  backgroundColor: "#13715B",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#0F5A47" },
                  "&.Mui-disabled": {
                    backgroundColor: "#E5E7EB",
                    color: "#9CA3AF",
                  },
                }}
              >
                {loading ? "Importing..." : "Import Framework"}
              </Button>
            )}

            {/* After import: Done */}
            {importResult && (
              <Button
                variant="contained"
                onClick={handleClose}
                sx={{
                  fontSize: 13,
                  height: 34,
                  backgroundColor: "#13715B",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#0F5A47" },
                }}
              >
                Done
              </Button>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Modal>
  );
};
