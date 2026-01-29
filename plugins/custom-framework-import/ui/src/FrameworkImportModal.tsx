/**
 * Framework Import Modal
 *
 * Multi-step wizard for importing custom compliance frameworks.
 * Supports JSON, Excel, and template library import methods.
 * Uses VerifyWise design system for consistency.
 */

import React, { useState, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
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
  Grid,
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
  FileJson,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  Library,
  Search,
  Edit3,
} from "lucide-react";
import {
  colors,
  textColors,
  fontSizes,
  buttonStyles,
  tableStyles,
  borderColors,
  bgColors,
} from "./theme";
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

const steps = ["Choose Method", "Configure Framework", "Preview & Import"];

// Modal styling matching VerifyWise StandardModal
const modalStyles = {
  title: {
    fontSize: "15px",
    fontWeight: 600,
    color: textColors.primary,
  },
  description: {
    fontSize: fontSizes.medium,
    color: textColors.muted,
  },
  header: {
    background: bgColors.modalHeader,
    borderBottom: `1px solid ${borderColors.light}`,
    p: 2.5,
  },
  footer: {
    background: bgColors.modalFooter,
    borderTop: `1px solid ${borderColors.light}`,
    px: 3,
    py: 2,
  },
};

// Card styling for method selection
const methodCardStyle = (isSelected: boolean) => ({
  height: "100%",
  cursor: "pointer",
  border: isSelected
    ? `2px solid ${colors.primary}`
    : `1px solid ${borderColors.default}`,
  borderRadius: "8px",
  transition: "all 0.2s",
  "&:hover": {
    borderColor: colors.primary,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
});

export const FrameworkImportModal: React.FC<FrameworkImportModalProps> = ({
  open,
  onClose,
  onImportComplete,
  apiServices,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [importMethod, setImportMethod] = useState<
    "json" | "excel" | "template"
  >("json");
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

  const api = apiServices || {
    get: async (url: string, options?: any) => {
      const response = await fetch(`/api${url}`, {
        ...options,
        headers: { "Content-Type": "application/json" },
      });
      if (options?.responseType === "blob") {
        return { data: await response.blob() };
      }
      return { data: await response.json() };
    },
    post: async (url: string, data?: any) => {
      const response = await fetch(`/api${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { data: await response.json() };
    },
  };

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setImportMethod("json");
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
        "/plugins/custom-framework-import/template",
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
          "/plugins/custom-framework-import/import-excel",
          excelData
        );
      } else {
        response = await api.post(
          "/plugins/custom-framework-import/import",
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
    <Box sx={{ mt: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card
            sx={methodCardStyle(importMethod === "template")}
            onClick={() => setImportMethod("template")}
          >
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <Library
                size={40}
                color={colors.primary}
                style={{ marginBottom: 16 }}
              />
              <Typography
                sx={{
                  fontSize: fontSizes.large,
                  fontWeight: 600,
                  color: textColors.primary,
                  mb: 1,
                }}
              >
                Template Library
              </Typography>
              <Typography
                sx={{ fontSize: fontSizes.medium, color: textColors.muted }}
              >
                Choose from pre-built compliance frameworks
              </Typography>
              <Chip
                label="Recommended"
                size="small"
                sx={{
                  mt: 2,
                  backgroundColor: `${colors.primary}12`,
                  color: colors.primary,
                  fontWeight: 500,
                  fontSize: fontSizes.small,
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={methodCardStyle(importMethod === "json")}
            onClick={() => setImportMethod("json")}
          >
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <FileJson
                size={40}
                color={colors.info}
                style={{ marginBottom: 16 }}
              />
              <Typography
                sx={{
                  fontSize: fontSizes.large,
                  fontWeight: 600,
                  color: textColors.primary,
                  mb: 1,
                }}
              >
                JSON Import
              </Typography>
              <Typography
                sx={{ fontSize: fontSizes.medium, color: textColors.muted }}
              >
                Paste or upload a JSON file with your framework
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={methodCardStyle(importMethod === "excel")}
            onClick={() => setImportMethod("excel")}
          >
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <FileSpreadsheet
                size={40}
                color={colors.success}
                style={{ marginBottom: 16 }}
              />
              <Typography
                sx={{
                  fontSize: fontSizes.large,
                  fontWeight: 600,
                  color: textColors.primary,
                  mb: 1,
                }}
              >
                Excel Template
              </Typography>
              <Typography
                sx={{ fontSize: fontSizes.medium, color: textColors.muted }}
              >
                Download template, fill it out, and upload
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderTemplateSelection = () => (
    <Box sx={{ mt: 2 }}>
      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search templates..."
          value={templateSearchQuery}
          onChange={(e) => setTemplateSearchQuery(e.target.value)}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              fontSize: fontSizes.medium,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color={textColors.muted} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Category Tabs */}
      <Tabs
        value={templateCategory}
        onChange={(_, value) => setTemplateCategory(value)}
        sx={{
          mb: 2,
          borderBottom: `1px solid ${borderColors.default}`,
          "& .MuiTab-root": { fontSize: fontSizes.medium },
        }}
      >
        {templateCategories.map((cat) => (
          <Tab key={cat.id} label={cat.name} value={cat.id} />
        ))}
      </Tabs>

      {/* Template Grid */}
      <Box sx={{ maxHeight: 350, overflow: "auto" }}>
        <Grid container spacing={2}>
          {getFilteredTemplates().map((template) => (
            <Grid item xs={12} md={6} key={template.id}>
              <Card
                sx={{
                  cursor: "pointer",
                  border:
                    selectedTemplate?.id === template.id
                      ? `2px solid ${colors.primary}`
                      : `1px solid ${borderColors.default}`,
                  borderRadius: "8px",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: colors.primary,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  },
                }}
                onClick={() => handleSelectTemplate(template)}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: fontSizes.medium,
                        fontWeight: 600,
                        color: textColors.primary,
                      }}
                    >
                      {template.name}
                    </Typography>
                    {selectedTemplate?.id === template.id && (
                      <CheckCircle size={18} color={colors.primary} />
                    )}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: fontSizes.small,
                      color: textColors.muted,
                      mb: 1.5,
                      minHeight: 36,
                    }}
                  >
                    {template.description.length > 80
                      ? `${template.description.substring(0, 80)}...`
                      : template.description}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    <Chip
                      label={template.category}
                      size="small"
                      sx={{
                        backgroundColor: "#f3f4f6",
                        fontSize: "10px",
                        height: 20,
                      }}
                    />
                    <Chip
                      label={
                        template.framework.hierarchy.type === "three_level"
                          ? "3 Levels"
                          : "2 Levels"
                      }
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "10px", height: 20 }}
                    />
                    <Chip
                      label={
                        template.framework.is_organizational ? "Org" : "Project"
                      }
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "10px", height: 20 }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Selected Template Actions */}
      {selectedTemplate && (
        <Paper
          sx={{
            p: 2,
            mt: 3,
            backgroundColor: bgColors.subtle,
            border: `1px solid ${borderColors.default}`,
            borderRadius: "8px",
          }}
        >
          <Typography
            sx={{
              fontSize: fontSizes.medium,
              fontWeight: 600,
              color: textColors.primary,
              mb: 0.5,
            }}
          >
            Selected: {selectedTemplate.name}
          </Typography>
          <Typography
            sx={{ fontSize: fontSizes.small, color: textColors.muted, mb: 2 }}
          >
            {countItems(selectedTemplate.framework.structure).level1}{" "}
            {selectedTemplate.framework.hierarchy.level1_name}s,{" "}
            {countItems(selectedTemplate.framework.structure).level2}{" "}
            {selectedTemplate.framework.hierarchy.level2_name}s
            {selectedTemplate.framework.hierarchy.type === "three_level" &&
              `, ${countItems(selectedTemplate.framework.structure).level3} ${selectedTemplate.framework.hierarchy.level3_name}s`}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={() => handleUseTemplate(false)}
              sx={buttonStyles.primary.contained}
            >
              Use as is
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit3 size={16} />}
              onClick={() => handleUseTemplate(true)}
              sx={buttonStyles.primary.outlined}
            >
              Customize first
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );

  const renderConfigureStep = () => {
    // Template customization
    if (importMethod === "template" && customizingTemplate) {
      return (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2, fontSize: fontSizes.medium }}>
            Customize the framework JSON below. You can modify the name,
            description, structure, and any other fields.
          </Alert>
          <TextField
            multiline
            rows={15}
            fullWidth
            value={customizedJson}
            onChange={(e) => setCustomizedJson(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: "monospace",
                fontSize: "12px",
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
        <Box sx={{ mt: 2 }}>
          <Typography
            sx={{
              fontSize: fontSizes.medium,
              fontWeight: 500,
              color: textColors.secondary,
              mb: 1,
            }}
          >
            Paste your framework JSON below:
          </Typography>
          <TextField
            multiline
            rows={15}
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
  "structure": [
    {
      "title": "Category 1",
      "order_no": 1,
      "items": [
        {
          "title": "Control 1.1",
          "description": "Control description",
          "order_no": 1
        }
      ]
    }
  ]
}`}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                fontFamily: "monospace",
                fontSize: "12px",
              },
            }}
          />
        </Box>
      );
    }

    // Excel upload
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="info" sx={{ mb: 3, fontSize: fontSizes.medium }}>
          Download the Excel template, fill it out with your framework data,
          then upload it below.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            onClick={handleDownloadTemplate}
            disabled={loading}
            sx={buttonStyles.primary.outlined}
          >
            Download Template
          </Button>
        </Box>

        <Box
          sx={{
            border: `2px dashed ${borderColors.default}`,
            borderRadius: "8px",
            p: 4,
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            "&:hover": {
              borderColor: colors.primary,
              backgroundColor: bgColors.subtle,
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
          <Upload size={32} color={textColors.muted} />
          <Typography
            sx={{
              fontSize: fontSizes.medium,
              color: textColors.secondary,
              mt: 2,
            }}
          >
            {excelFile ? excelFile.name : "Click to upload or drag and drop"}
          </Typography>
          <Typography
            sx={{ fontSize: fontSizes.small, color: textColors.muted }}
          >
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
      <Box sx={{ mt: 2 }}>
        {importResult ? (
          <Alert
            severity="success"
            icon={<CheckCircle />}
            sx={{ mb: 3, fontSize: fontSizes.medium }}
          >
            <Typography
              sx={{ fontSize: fontSizes.medium, fontWeight: 600, mb: 0.5 }}
            >
              Framework imported successfully!
            </Typography>
            <Typography sx={{ fontSize: fontSizes.small }}>
              Created {importResult.itemsCreated} items. Framework ID:{" "}
              {importResult.frameworkId}
            </Typography>
          </Alert>
        ) : (
          <>
            <Card
              sx={{
                mb: 3,
                border: `1px solid ${borderColors.default}`,
                borderRadius: "8px",
              }}
            >
              <CardContent>
                <Typography
                  sx={{
                    fontSize: fontSizes.large,
                    fontWeight: 600,
                    color: textColors.primary,
                    mb: 1,
                  }}
                >
                  {parsedFramework.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: fontSizes.medium,
                    color: textColors.muted,
                    mb: 2,
                  }}
                >
                  {parsedFramework.description}
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  <Chip
                    label={`Version ${parsedFramework.version}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: fontSizes.small }}
                  />
                  <Chip
                    label={
                      parsedFramework.is_organizational
                        ? "Organizational"
                        : "Project-level"
                    }
                    size="small"
                    sx={{
                      backgroundColor: parsedFramework.is_organizational
                        ? `${colors.primary}12`
                        : "#f3f4f6",
                      color: parsedFramework.is_organizational
                        ? colors.primary
                        : textColors.secondary,
                      fontSize: fontSizes.small,
                    }}
                  />
                  <Chip
                    label={
                      parsedFramework.hierarchy.type === "three_level"
                        ? "3 Levels"
                        : "2 Levels"
                    }
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: fontSizes.small }}
                  />
                </Stack>

                <Stack direction="row" spacing={4}>
                  <Box>
                    <Typography
                      sx={{ fontSize: fontSizes.small, color: textColors.muted }}
                    >
                      {parsedFramework.hierarchy.level1_name}s
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "24px",
                        fontWeight: 600,
                        color: textColors.primary,
                      }}
                    >
                      {counts.level1}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      sx={{ fontSize: fontSizes.small, color: textColors.muted }}
                    >
                      {parsedFramework.hierarchy.level2_name}s
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "24px",
                        fontWeight: 600,
                        color: textColors.primary,
                      }}
                    >
                      {counts.level2}
                    </Typography>
                  </Box>
                  {parsedFramework.hierarchy.type === "three_level" && (
                    <Box>
                      <Typography
                        sx={{
                          fontSize: fontSizes.small,
                          color: textColors.muted,
                        }}
                      >
                        {parsedFramework.hierarchy.level3_name}s
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "24px",
                          fontWeight: 600,
                          color: textColors.primary,
                        }}
                      >
                        {counts.level3}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Typography
              sx={{
                fontSize: fontSizes.medium,
                fontWeight: 500,
                color: textColors.secondary,
                mb: 1,
              }}
            >
              Structure Preview (first 5 items)
            </Typography>
            <TableContainer component={Paper} sx={{ ...tableStyles.frame, maxHeight: 280 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={tableStyles.header.row}>
                    <TableCell sx={tableStyles.header.cell}>Level</TableCell>
                    <TableCell sx={tableStyles.header.cell}>Title</TableCell>
                    <TableCell sx={tableStyles.header.cell}>
                      Description
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedFramework.structure.slice(0, 5).map((l1, i) => (
                    <React.Fragment key={i}>
                      <TableRow
                        sx={{ ...tableStyles.body.row, backgroundColor: bgColors.subtle }}
                      >
                        <TableCell sx={tableStyles.body.cell}>
                          <Chip
                            label="L1"
                            size="small"
                            sx={{
                              backgroundColor: `${colors.primary}12`,
                              color: colors.primary,
                              fontSize: "10px",
                              height: 20,
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{ ...tableStyles.body.cell, fontWeight: 500 }}
                        >
                          {l1.title}
                        </TableCell>
                        <TableCell sx={tableStyles.body.cell}>
                          <Typography
                            sx={{
                              fontSize: fontSizes.small,
                              maxWidth: 280,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {l1.description || "-"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      {(l1.items || []).slice(0, 3).map((l2: any, j: number) => (
                        <TableRow key={`${i}-${j}`} sx={tableStyles.body.row}>
                          <TableCell sx={{ ...tableStyles.body.cell, pl: 3 }}>
                            <Chip
                              label="L2"
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "10px", height: 20 }}
                            />
                          </TableCell>
                          <TableCell sx={tableStyles.body.cell}>
                            {l2.title}
                          </TableCell>
                          <TableCell sx={tableStyles.body.cell}>
                            <Typography
                              sx={{
                                fontSize: fontSizes.small,
                                maxWidth: 280,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {l2.description || "-"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={modalStyles.header}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography sx={modalStyles.title}>
              Import Custom Framework
            </Typography>
            <Typography sx={modalStyles.description}>
              Create a new compliance framework from templates, JSON, or Excel
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              "&:hover": { backgroundColor: bgColors.hover },
            }}
          >
            <X size={20} color={textColors.muted} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Stepper
          activeStep={activeStep}
          sx={{
            mb: 2,
            "& .MuiStepLabel-label": { fontSize: fontSizes.medium },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, fontSize: fontSizes.medium }}
            onClose={() => setError(null)}
          >
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              {error}
            </pre>
          </Alert>
        )}

        {activeStep === 0 && renderMethodSelection()}
        {activeStep === 1 && renderConfigureStep()}
        {activeStep === 2 && renderPreviewStep()}
      </DialogContent>

      <DialogActions sx={modalStyles.footer}>
        <Button
          onClick={handleReset}
          disabled={loading}
          sx={{
            ...buttonStyles.primary.outlined,
            color: textColors.secondary,
            borderColor: borderColors.default,
            "&:hover": {
              borderColor: textColors.secondary,
              backgroundColor: bgColors.hover,
            },
          }}
        >
          Reset
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && !importResult && (
          <Button
            onClick={handleBack}
            startIcon={<ChevronLeft size={18} />}
            disabled={loading}
            sx={{
              ...buttonStyles.primary.outlined,
              color: textColors.secondary,
              borderColor: borderColors.default,
              "&:hover": {
                borderColor: textColors.secondary,
                backgroundColor: bgColors.hover,
              },
            }}
          >
            Back
          </Button>
        )}
        {activeStep < 2 && (
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<ChevronRight size={18} />}
            disabled={!canProceed() || loading}
            sx={buttonStyles.primary.contained}
          >
            Next
          </Button>
        )}
        {activeStep === 2 && !importResult && (
          <Button
            variant="contained"
            onClick={handleImport}
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <Upload size={18} />
              )
            }
            disabled={loading || !parsedFramework}
            sx={buttonStyles.primary.contained}
          >
            {loading ? "Importing..." : "Import Framework"}
          </Button>
        )}
        {importResult && (
          <Button
            variant="contained"
            onClick={handleClose}
            sx={buttonStyles.primary.contained}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
