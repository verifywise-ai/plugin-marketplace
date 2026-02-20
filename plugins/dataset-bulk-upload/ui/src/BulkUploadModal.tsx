import React, { useState, useCallback } from "react";
import {
  Box,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  IconButton,
} from "@mui/material";
import { X } from "lucide-react";
import FileDropZone from "./FileDropZone";
import FilePreviewAndMetadata from "./FilePreviewAndMetadata";
import UploadProgress, { FileUploadResult } from "./UploadProgress";
import { useFileAnalysis } from "./useFileAnalysis";

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  apiServices?: {
    post: <T>(endpoint: string, data: any, config?: any) => Promise<{ data: T }>;
  };
  userName?: string;
}

const STEPS = ["Select Files", "Review Metadata", "Upload"];

export default function BulkUploadModal({
  open,
  onClose,
  onSuccess,
  apiServices,
  userName,
}: BulkUploadModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<FileUploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const {
    analyses,
    analyzing,
    error: analysisError,
    analyzeFiles,
    updateMetadata,
    toggleSkip,
    applyBatchDefaults,
    reset: resetAnalysis,
  } = useFileAnalysis();

  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
  }, []);

  const startUpload = useCallback(async () => {
    const filesToUpload = analyses.filter((a) => !a.skipped);
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    const results: FileUploadResult[] = filesToUpload.map((a) => ({
      fileName: a.fileName,
      status: "pending" as const,
    }));
    setUploadResults([...results]);

    for (let i = 0; i < filesToUpload.length; i++) {
      const analysis = filesToUpload[i];

      results[i] = { ...results[i], status: "uploading" };
      setUploadResults([...results]);

      try {
        const formData = new FormData();
        formData.append("file", analysis.file);
        formData.append("metadata", JSON.stringify(analysis.metadata));

        const response = await apiServices?.post<{
          data: { datasetId: number; fileId: number };
        }>("/dataset-bulk-upload/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const responseData = (response?.data as any)?.data;
        results[i] = {
          ...results[i],
          status: "success",
          datasetId: responseData?.datasetId,
          fileId: responseData?.fileId,
        };
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.data?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Upload failed";
        results[i] = {
          ...results[i],
          status: "error",
          error: errorMessage,
        };
      }

      setUploadResults([...results]);
    }

    setIsUploading(false);
  }, [analyses, apiServices]);

  const handleNext = useCallback(async () => {
    if (activeStep === 0) {
      await analyzeFiles(files, userName || "");
      setActiveStep(1);
    } else if (activeStep === 1) {
      setActiveStep(2);
      await startUpload();
    }
  }, [activeStep, files, analyzeFiles, userName, startUpload]);

  const handleBack = useCallback(() => {
    setActiveStep((prev) => prev - 1);
  }, []);

  const handleClose = useCallback(() => {
    setActiveStep(0);
    setFiles([]);
    setUploadResults([]);
    setIsUploading(false);
    resetAnalysis();

    const hasSuccess = uploadResults.some((r) => r.status === "success");
    if (hasSuccess) {
      onSuccess?.();
    }
    onClose();
  }, [onClose, onSuccess, uploadResults, resetAnalysis]);

  const isNextDisabled =
    (activeStep === 0 && files.length === 0) ||
    (activeStep === 1 && analyses.filter((a) => !a.skipped).length === 0) ||
    analyzing;

  const isUploadComplete =
    activeStep === 2 && !isUploading && uploadResults.length > 0;

  const renderStepContent = () => {
    if (activeStep === 0) {
      return <FileDropZone files={files} onFilesChange={handleFilesChange} />;
    }

    if (activeStep === 1 && analyzing) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 4,
          }}
        >
          <CircularProgress size={32} sx={{ color: "#13715B" }} />
          <Typography sx={{ mt: 1, fontSize: 13, color: "#475467" }}>
            Analyzing files...
          </Typography>
        </Box>
      );
    }

    if (activeStep === 1 && !analyzing && analysisError) {
      return (
        <Typography sx={{ fontSize: 13, color: "#F04438" }}>
          {analysisError}
        </Typography>
      );
    }

    if (activeStep === 1 && !analyzing && analyses.length > 0) {
      return (
        <FilePreviewAndMetadata
          analyses={analyses}
          onUpdateMetadata={updateMetadata}
          onToggleSkip={toggleSkip}
          onApplyBatchDefaults={applyBatchDefaults}
        />
      );
    }

    if (activeStep === 2) {
      return (
        <UploadProgress
          results={uploadResults}
          totalFiles={analyses.filter((a) => !a.skipped).length}
        />
      );
    }

    return null;
  };

  return (
    <Dialog
      open={open}
      onClose={isUploading ? undefined : handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxHeight: "85vh" } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ fontWeight: 600, fontSize: 16 }}>
          Dataset Bulk Upload
        </Typography>
        <IconButton onClick={handleClose} disabled={isUploading} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {activeStep > 0 && activeStep < 2 && (
          <Button onClick={handleBack} sx={{ textTransform: "none" }}>
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {activeStep < 2 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isNextDisabled}
            sx={{
              textTransform: "none",
              backgroundColor: "#13715B",
              "&:hover": { backgroundColor: "#0e5a48" },
            }}
          >
            {activeStep === 1 ? "Upload" : "Next"}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleClose}
            disabled={!isUploadComplete}
            sx={{
              textTransform: "none",
              backgroundColor: "#13715B",
              "&:hover": { backgroundColor: "#0e5a48" },
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
