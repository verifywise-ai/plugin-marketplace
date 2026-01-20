import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import { Download, Upload, CheckCircle, XCircle, X } from "lucide-react";
import * as ExcelJS from "exceljs";

interface RiskImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
  };
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ row: number; field: string; message: string }>;
  importedAt: string;
}

export const RiskImportModal: React.FC<RiskImportModalProps> = ({
  open,
  onClose,
  onImportComplete,
  apiServices,
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Default API services if not provided
  const api = apiServices || {
    get: async (url: string, options?: any) => {
      const response = await fetch(`/api${url}`, options);
      return { data: await response.blob() };
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

  // Download Excel template
  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get("plugins/risk-import/template", {
        responseType: "blob",
      });

      const blob = new Blob([response.data as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "risk_import_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error downloading template:", err);
      setError(`Failed to download template: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      setError("Please upload an Excel file (.xlsx)");
      return;
    }

    setUploadedFile(file);
    setError(null);
    setImportResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        setError("Excel file is empty or invalid");
        setExcelData([]);
        return;
      }

      const data: any[] = [];
      const headers: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell({ includeEmpty: true }, (cell) => {
            const headerText = cell.value?.toString() || "";
            const key = headerText
              .replace(/\s*\([^)]*\)/g, '')
              .replace(/\s*\*/g, '')
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "_");
            headers.push(key);
          });
        } else {
          const rowData: any = {};
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const key = headers[colNumber - 1];
            if (key) {
              rowData[key] = cell.value;
            }
          });

          const hasData = Object.values(rowData).some(val => val !== null && val !== undefined && val !== "");
          if (hasData) {
            data.push(rowData);
          }
        }
      });

      setExcelData(data);
    } catch (err: any) {
      console.error("Error parsing Excel file:", err);
      setError(`Error parsing Excel file: ${err.message}`);
      setExcelData([]);
    }
  }, []);

  // Handle import
  const handleImport = async () => {
    if (excelData.length === 0) {
      setError("No data to import. Please upload a valid Excel file.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setImportResult(null);

      const response = await api.post("/plugins/risk-import/import", {
        csvData: excelData,
      });

      if (response.data?.data) {
        setImportResult(response.data.data);

        if (response.data.data.success && onImportComplete) {
          setTimeout(() => {
            onImportComplete();
            onClose();
          }, 1000);
        }
      }
    } catch (err: any) {
      console.error("Error importing risks:", err);
      setError(err.response?.data?.message || "Failed to import risks");
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setUploadedFile(null);
    setExcelData([]);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "4px",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: "16px", color: "#101828" }}>
            Import risks from Excel
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "#667085", mt: 0.5 }}>
            Download the template, fill it with your risk data, and upload to create risks in bulk
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ color: "#98A2B3", mt: -0.5 }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Import Result */}
        {importResult && (
          <Alert
            severity={importResult.success ? "success" : "warning"}
            sx={{ mb: 2 }}
            icon={importResult.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
          >
            <Typography sx={{ fontWeight: 600, fontSize: "13px", mb: 0.5 }}>
              Import {importResult.success ? "Completed" : "Completed with Errors"}
            </Typography>
            <Typography sx={{ fontSize: "13px" }}>
              Successfully imported: {importResult.imported} risk(s)
              {importResult.failed > 0 && ` | Failed: ${importResult.failed} risk(s)`}
            </Typography>

            {importResult.errors && importResult.errors.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "12px", mb: 1 }}>
                  Error Details:
                </Typography>
                <TableContainer sx={{ maxHeight: 150, border: "1px solid #e5e7eb", borderRadius: "4px" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: "11px", fontWeight: 600, py: 0.5 }}>Row</TableCell>
                        <TableCell sx={{ fontSize: "11px", fontWeight: 600, py: 0.5 }}>Field</TableCell>
                        <TableCell sx={{ fontSize: "11px", fontWeight: 600, py: 0.5 }}>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.errors.slice(0, 5).map((err, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontSize: "11px", py: 0.5 }}>{err.row}</TableCell>
                          <TableCell sx={{ fontSize: "11px", py: 0.5 }}>{err.field}</TableCell>
                          <TableCell sx={{ fontSize: "11px", py: 0.5 }}>{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Alert>
        )}

        {/* Step 1: Download Template */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "13px", color: "#344054", mb: 0.5 }}>
            Step 1: Download Excel Template
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "#667085", mb: 1.5 }}>
            Download the template with dropdown menus for enum fields and sample data.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download size={14} />}
            onClick={handleDownloadTemplate}
            disabled={loading}
            sx={{
              textTransform: "none",
              fontSize: "13px",
              borderColor: "#d0d5dd",
              color: "#344054",
              "&:hover": {
                borderColor: "#98A2B3",
                backgroundColor: "#f9fafb",
              },
            }}
          >
            Download Template
          </Button>
        </Box>

        {/* Step 2: Upload Excel */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "13px", color: "#344054", mb: 0.5 }}>
            Step 2: Upload Filled Excel File
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "#667085", mb: 1.5 }}>
            Upload your Excel file with risk data.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              component="label"
              startIcon={<Upload size={14} />}
              sx={{
                textTransform: "none",
                fontSize: "13px",
                borderColor: "#d0d5dd",
                color: "#344054",
                "&:hover": {
                  borderColor: "#98A2B3",
                  backgroundColor: "#f9fafb",
                },
              }}
            >
              Choose File
              <input
                type="file"
                hidden
                accept=".xlsx"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
            </Button>

            {uploadedFile ? (
              <Chip
                label={uploadedFile.name}
                onDelete={handleReset}
                size="small"
                sx={{
                  fontSize: "12px",
                  backgroundColor: "#f0fdf4",
                  color: "#15803d",
                  border: "1px solid #bbf7d0",
                  "& .MuiChip-deleteIcon": {
                    color: "#15803d",
                    fontSize: "16px",
                  },
                }}
              />
            ) : (
              <Typography sx={{ fontSize: "13px", color: "#98A2B3" }}>
                or drag and drop .xlsx file here
              </Typography>
            )}
          </Box>
        </Box>

        {/* Preview Table */}
        {excelData.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "13px", color: "#344054", mb: 1 }}>
              Preview ({excelData.length} risk{excelData.length > 1 ? "s" : ""} found)
            </Typography>
            <TableContainer sx={{ border: "1px solid #e5e7eb", borderRadius: "4px", maxHeight: 280 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ backgroundColor: "#f9fafb", fontWeight: 600, fontSize: "11px", color: "#667085", textTransform: "uppercase", py: 1.5 }}>ID</TableCell>
                    <TableCell sx={{ backgroundColor: "#f9fafb", fontWeight: 600, fontSize: "11px", color: "#667085", textTransform: "uppercase", py: 1.5 }}>Risk Name</TableCell>
                    <TableCell sx={{ backgroundColor: "#f9fafb", fontWeight: 600, fontSize: "11px", color: "#667085", textTransform: "uppercase", py: 1.5 }}>Description</TableCell>
                    <TableCell sx={{ backgroundColor: "#f9fafb", fontWeight: 600, fontSize: "11px", color: "#667085", textTransform: "uppercase", py: 1.5 }}>Owner</TableCell>
                    <TableCell sx={{ backgroundColor: "#f9fafb", fontWeight: 600, fontSize: "11px", color: "#667085", textTransform: "uppercase", py: 1.5 }}>Phase</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {excelData.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx} sx={{ "&:hover": { backgroundColor: "#f9fafb" } }}>
                      <TableCell sx={{ fontSize: "13px", color: "#344054", py: 1.5 }}>{idx + 1}</TableCell>
                      <TableCell sx={{ fontSize: "13px", color: "#344054", py: 1.5 }}>{row.risk_name || "-"}</TableCell>
                      <TableCell sx={{ fontSize: "13px", color: "#667085", py: 1.5, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.risk_description || "-"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "13px", color: "#344054", py: 1.5 }}>{row.risk_owner || "-"}</TableCell>
                      <TableCell sx={{ fontSize: "13px", color: "#344054", py: 1.5 }}>{row.ai_lifecycle_phase || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {excelData.length > 10 && (
              <Typography sx={{ mt: 1, fontSize: "12px", color: "#98A2B3" }}>
                Showing first 10 of {excelData.length} risks
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e5e7eb" }}>
        <Button
          onClick={handleClose}
          sx={{
            textTransform: "none",
            fontSize: "13px",
            color: "#344054",
            border: "1px solid #d0d5dd",
            "&:hover": {
              backgroundColor: "#f9fafb",
              borderColor: "#98A2B3",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={loading || excelData.length === 0}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{
            textTransform: "none",
            fontSize: "13px",
            backgroundColor: "#13715B",
            "&:hover": {
              backgroundColor: "#0f5a47",
            },
            "&:disabled": {
              backgroundColor: "#e5e7eb",
              color: "#98A2B3",
            },
          }}
        >
          {loading ? "Importing..." : `Import ${excelData.length || 0} risk${excelData.length !== 1 ? "s" : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RiskImportModal;
