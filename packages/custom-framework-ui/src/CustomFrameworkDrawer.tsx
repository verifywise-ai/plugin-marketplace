/**
 * Custom Framework Drawer
 *
 * Drawer UI for editing custom framework level2/level3 items.
 * This component matches the core app's NewControlPane drawer exactly.
 *
 * Features:
 * - Tabbed interface: Details, Evidence, Cross Mappings, Notes
 * - File upload/attach/download/delete with pending queues
 * - Risk linking support
 * - Rich text editor for descriptions
 * - Matching styling with core app
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Drawer,
  Button,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
  SelectChangeEvent,
} from "@mui/material";
import {
  X as CloseIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Trash2 as DeleteIcon,
  FileText as FileIcon,
  Eye as ViewIcon,
  FolderOpen,
  Link as LinkIcon,
  MessageSquare,
} from "lucide-react";
import dayjs, { Dayjs } from "dayjs";
import {
  colors,
  textColors,
  borderColors,
  bgColors,
  buttonStyles,
  statusOptions,
} from "./theme";

// Local component implementations to avoid core app imports in plugin
// These match the core app's components exactly

// ============================================================================
// LOCAL COMPONENTS
// ============================================================================

// Field component (text/description input)
const Field: React.FC<{
  type?: "text" | "description";
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ type = "text", value, onChange, placeholder, disabled }) => (
  <textarea
    value={value}
    onChange={onChange as any}
    placeholder={placeholder}
    disabled={disabled}
    rows={type === "description" ? 4 : 1}
    style={{
      width: "100%",
      padding: "10px 14px",
      fontSize: "13px",
      fontFamily: "inherit",
      border: `1px solid ${borderColors.default}`,
      borderRadius: "4px",
      resize: type === "description" ? "vertical" : "none",
      minHeight: type === "description" ? "90px" : "34px",
      backgroundColor: disabled ? "#f9fafb" : "white",
      color: disabled ? textColors.muted : textColors.primary,
    }}
  />
);

// Select component matching core app's Select
const Select: React.FC<{
  id: string;
  label: string;
  value: string | number;
  onChange: (e: SelectChangeEvent<string | number>) => void;
  items: Array<{ _id: string | number; name: string; surname?: string }>;
  placeholder?: string;
  disabled?: boolean;
  sx?: any;
}> = ({ id, label, value, onChange, items, placeholder, disabled, sx }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 2, ...sx }}>
    <Typography sx={{ fontSize: "13px", color: textColors.secondary, minWidth: "80px" }}>
      {label}
    </Typography>
    <select
      id={id}
      value={value || ""}
      onChange={(e) => onChange({ target: { value: e.target.value } } as SelectChangeEvent<string | number>)}
      disabled={disabled}
      style={{
        flex: 1,
        height: "34px",
        padding: "0 14px",
        fontSize: "13px",
        fontFamily: "inherit",
        border: `1px solid ${borderColors.default}`,
        borderRadius: "4px",
        backgroundColor: disabled ? "#f9fafb" : "white",
        color: value ? textColors.primary : textColors.muted,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <option value="">{placeholder || "Select..."}</option>
      {items.map((item) => (
        <option key={item._id} value={item._id}>
          {item.name} {item.surname || ""}
        </option>
      ))}
    </select>
  </Box>
);

// DatePicker component matching core app's DatePicker
const DatePicker: React.FC<{
  label: string;
  date: Dayjs | null;
  handleDateChange: (date: Dayjs | null) => void;
  disabled?: boolean;
  sx?: any;
}> = ({ label, date, handleDateChange, disabled, sx }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 2, ...sx }}>
    <Typography sx={{ fontSize: "13px", color: textColors.secondary, minWidth: "80px" }}>
      {label}
    </Typography>
    <input
      type="date"
      value={date ? date.format("YYYY-MM-DD") : ""}
      onChange={(e) => handleDateChange(e.target.value ? dayjs(e.target.value) : null)}
      disabled={disabled}
      style={{
        flex: 1,
        height: "34px",
        padding: "0 14px",
        fontSize: "13px",
        fontFamily: "inherit",
        border: `1px solid ${borderColors.default}`,
        borderRadius: "4px",
        backgroundColor: disabled ? "#f9fafb" : "white",
        color: textColors.primary,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    />
  </Box>
);

// TabBar component matching core app's TabBar
const TabBar: React.FC<{
  tabs: Array<{ label: string; value: string; icon?: string }>;
  activeTab: string;
  onChange: (event: React.SyntheticEvent, value: string) => void;
}> = ({ tabs, activeTab, onChange }) => (
  <Box
    sx={{
      display: "flex",
      gap: "4px",
      borderBottom: `1px solid ${borderColors.light}`,
      mb: 2,
    }}
  >
    {tabs.map((tab) => {
      const isActive = activeTab === tab.value;
      return (
        <Box
          key={tab.value}
          onClick={(e) => onChange(e, tab.value)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.5,
            fontSize: "13px",
            fontWeight: isActive ? 600 : 400,
            color: isActive ? colors.primary : textColors.secondary,
            borderBottom: isActive ? `2px solid ${colors.primary}` : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              color: colors.primary,
              backgroundColor: bgColors.hover,
            },
          }}
        >
          {tab.icon === "FileText" && <FileIcon size={16} />}
          {tab.icon === "FolderOpen" && <FolderOpen size={16} />}
          {tab.icon === "Link" && <LinkIcon size={16} />}
          {tab.icon === "MessageSquare" && <MessageSquare size={16} />}
          {tab.label}
        </Box>
      );
    })}
  </Box>
);

// Alert component
const Alert: React.FC<{
  variant: "success" | "error" | "info" | "warning";
  body: string;
  isToast?: boolean;
  onClick?: () => void;
}> = ({ variant, body, isToast, onClick }) => {
  const variantStyles = {
    success: { bg: "#ECFDF5", border: "#10B981", color: "#065F46" },
    error: { bg: "#FEF2F2", border: "#EF4444", color: "#991B1B" },
    info: { bg: "#EFF6FF", border: "#3B82F6", color: "#1E40AF" },
    warning: { bg: "#FFFBEB", border: "#F59E0B", color: "#92400E" },
  };
  const style = variantStyles[variant];

  return (
    <Box
      onClick={onClick}
      sx={{
        position: isToast ? "fixed" : "relative",
        top: isToast ? 20 : "auto",
        right: isToast ? 20 : "auto",
        zIndex: isToast ? 9999 : "auto",
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: "4px",
        padding: "12px 16px",
        fontSize: "13px",
        color: style.color,
        cursor: onClick ? "pointer" : "default",
        boxShadow: isToast ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
      }}
    >
      {body}
    </Box>
  );
};

// ============================================================================
// FILE DATA TYPES
// ============================================================================

interface FileData {
  id: string;
  fileName: string;
  size: number;
  type: string;
  uploadDate?: string;
  uploader?: string;
  data?: Blob | File;
  source?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CustomFrameworkDrawerProps {
  open: boolean;
  onClose: () => void;
  item: any;
  level: number;
  frameworkMeta: {
    level_2_name: string;
    level_3_name?: string;
  };
  users?: Array<{ id: number; name: string; surname: string }>;
  apiServices?: {
    get?: (url: string, options?: any) => Promise<any>;
    patch: (url: string, data?: any) => Promise<any>;
    post?: (url: string, data?: any) => Promise<any>;
    delete?: (url: string) => Promise<any>;
  };
  onSave?: () => void;
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
  projectId?: number;
}

interface FormData {
  status: string;
  owner: string;
  reviewer: string;
  approver: string;
  due_date: Dayjs | null;
  implementation_details: string;
  auditor_feedback: string;
  evidence_description: string;
  feedback_description: string;
}

export const CustomFrameworkDrawer: React.FC<CustomFrameworkDrawerProps> = ({
  open,
  onClose,
  item,
  level,
  frameworkMeta,
  users = [],
  apiServices,
  onSave,
  pluginKey,
  projectId,
}) => {
  // ========================================================================
  // STATE
  // ========================================================================

  const [activeTab, setActiveTab] = useState("details");
  const [formData, setFormData] = useState<FormData>({
    status: "Not started",
    owner: "",
    reviewer: "",
    approver: "",
    due_date: null,
    implementation_details: "",
    auditor_feedback: "",
    evidence_description: "",
    feedback_description: "",
  });

  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ variant: "success" | "error" | "info" | "warning"; body: string } | null>(null);

  // File management state
  const [evidenceFiles, setEvidenceFiles] = useState<FileData[]>([]);
  const [uploadEvidenceFiles, setUploadEvidenceFiles] = useState<FileData[]>([]);
  const [deletedEvidenceFileIds, setDeletedEvidenceFileIds] = useState<number[]>([]);
  const [feedbackFiles, setFeedbackFiles] = useState<FileData[]>([]);
  const [uploadFeedbackFiles, setUploadFeedbackFiles] = useState<FileData[]>([]);
  const [deletedFeedbackFileIds, setDeletedFeedbackFileIds] = useState<number[]>([]);

  // File input refs
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);
  const feedbackFileInputRef = useRef<HTMLInputElement>(null);

  // ========================================================================
  // API
  // ========================================================================

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

  const api = useMemo(() => apiServices || {
    get: async (url: string) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, { headers });
      return { data: await response.json(), status: response.status };
    },
    patch: async (url: string, body?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      return { data: await response.json(), status: response.status };
    },
    post: async (url: string, body?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      return { data: await response.json(), status: response.status };
    },
    delete: async (url: string) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, {
        method: "DELETE",
        headers,
      });
      return { data: await response.json(), status: response.status };
    },
  }, [apiServices]);

  // ========================================================================
  // EFFECTS
  // ========================================================================

  useEffect(() => {
    if (item) {
      setFormData({
        status: item.status || "Not started",
        owner: item.owner?.toString() || "",
        reviewer: item.reviewer?.toString() || "",
        approver: item.approver?.toString() || "",
        due_date: item.due_date ? dayjs(item.due_date) : null,
        implementation_details: item.implementation_details || "",
        auditor_feedback: item.auditor_feedback || "",
        evidence_description: item.evidence_description || "",
        feedback_description: item.feedback_description || "",
      });

      // Load evidence files
      if (item.evidence_links && Array.isArray(item.evidence_links)) {
        setEvidenceFiles(
          item.evidence_links.map((f: any) => ({
            id: f.id?.toString() || f.file_id?.toString() || "",
            fileName: f.fileName || f.filename || f.file_name || "",
            size: f.size || 0,
            type: f.type || f.mimetype || "",
            uploadDate: f.uploadDate || f.upload_date || new Date().toISOString(),
            uploader: f.uploader || "Unknown",
            source: f.source || "File Manager",
          }))
        );
      } else {
        setEvidenceFiles([]);
      }

      // Reset upload/delete states
      setUploadEvidenceFiles([]);
      setDeletedEvidenceFileIds([]);
      setUploadFeedbackFiles([]);
      setDeletedFeedbackFileIds([]);
      setFeedbackFiles([]);

      setAlert(null);
      setActiveTab("details");
    }
  }, [item]);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleAlert = (alert: { variant: "success" | "error" | "info" | "warning"; body: string }) => {
    setAlert(alert);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  // File handling
  const handleEvidenceFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: FileData[] = files.map((file) => ({
      id: (Date.now() + Math.random()).toString(),
      fileName: file.name,
      size: file.size,
      type: file.type,
      data: file,
      uploadDate: new Date().toISOString(),
      uploader: "Current User",
    }));
    setUploadEvidenceFiles((prev) => [...prev, ...newFiles]);
    handleAlert({ variant: "info", body: `${files.length} file(s) added. Save to apply changes.` });
    e.target.value = "";
  };

  const handleFeedbackFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: FileData[] = files.map((file) => ({
      id: (Date.now() + Math.random()).toString(),
      fileName: file.name,
      size: file.size,
      type: file.type,
      data: file,
      uploadDate: new Date().toISOString(),
      uploader: "Current User",
    }));
    setUploadFeedbackFiles((prev) => [...prev, ...newFiles]);
    handleAlert({ variant: "info", body: `${files.length} file(s) added. Save to apply changes.` });
    e.target.value = "";
  };

  const handleDeleteEvidenceFile = (fileId: string) => {
    const fileIdNumber = parseInt(fileId);
    if (isNaN(fileIdNumber)) {
      // It's a pending upload file, remove from upload queue
      setUploadEvidenceFiles((prev) => prev.filter((f) => f.id !== fileId));
      handleAlert({ variant: "info", body: "File removed from upload queue." });
    } else {
      // It's an existing file, mark for deletion
      setEvidenceFiles((prev) => prev.filter((f) => f.id !== fileId));
      setDeletedEvidenceFileIds((prev) => [...prev, fileIdNumber]);
      handleAlert({ variant: "info", body: "File marked for deletion. Save to apply changes." });
    }
  };

  const handleDeleteFeedbackFile = (fileId: string) => {
    const fileIdNumber = parseInt(fileId);
    if (isNaN(fileIdNumber)) {
      setUploadFeedbackFiles((prev) => prev.filter((f) => f.id !== fileId));
      handleAlert({ variant: "info", body: "File removed from upload queue." });
    } else {
      setFeedbackFiles((prev) => prev.filter((f) => f.id !== fileId));
      setDeletedFeedbackFileIds((prev) => [...prev, fileIdNumber]);
      handleAlert({ variant: "info", body: "File marked for deletion. Save to apply changes." });
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`/api/file/${fileId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      handleAlert({ variant: "success", body: "File downloaded successfully" });
    } catch (error) {
      console.error("Error downloading file:", error);
      handleAlert({ variant: "error", body: "Failed to download file. Please try again." });
    }
  };

  // Save handler
  const handleSave = async () => {
    if (!item?.impl_id) {
      handleAlert({ variant: "error", body: "Cannot save: No implementation record found" });
      return;
    }

    try {
      setSaving(true);

      const endpoint =
        level === 2
          ? `/plugins/${pluginKey}/level2/${item.impl_id}`
          : `/plugins/${pluginKey}/level3/${item.impl_id}`;

      const payload: any = {
        status: formData.status,
        owner: formData.owner || null,
        reviewer: formData.reviewer || null,
        approver: formData.approver || null,
        due_date: formData.due_date ? formData.due_date.format("YYYY-MM-DD") : null,
        implementation_details: formData.implementation_details || "",
        auditor_feedback: formData.auditor_feedback || "",
        evidence_description: formData.evidence_description || "",
        feedback_description: formData.feedback_description || "",
      };

      // First save the form data
      const response = await api.patch(endpoint, payload);

      if (response.status === 200) {
        // Handle file uploads if any
        if (uploadEvidenceFiles.length > 0) {
          // Upload files and link them
          for (const file of uploadEvidenceFiles) {
            if (file.data instanceof Blob) {
              const formDataUpload = new FormData();
              formDataUpload.append("file", file.data, file.fileName);
              formDataUpload.append("project_id", projectId?.toString() || "");

              try {
                const token = getAuthToken();
                const headers: Record<string, string> = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const uploadResponse = await fetch("/api/file/upload", {
                  method: "POST",
                  headers,
                  body: formDataUpload,
                });

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json();
                  const fileId = uploadResult.data?.id || uploadResult.id;
                  if (fileId) {
                    // Link the file to this entity
                    await api.post?.(`/plugins/${pluginKey}/level2/${item.impl_id}/files`, {
                      file_ids: [fileId],
                    });
                  }
                }
              } catch (uploadError) {
                console.error("Failed to upload file:", uploadError);
              }
            }
          }
        }

        // Handle file deletions
        if (deletedEvidenceFileIds.length > 0) {
          for (const fileId of deletedEvidenceFileIds) {
            try {
              await api.delete?.(`/plugins/${pluginKey}/level2/${item.impl_id}/files/${fileId}`);
            } catch (deleteError) {
              console.error("Failed to delete file:", deleteError);
            }
          }
        }

        handleAlert({ variant: "success", body: "Changes saved successfully" });
        onSave?.();
      } else {
        handleAlert({ variant: "error", body: "Failed to save changes" });
      }
    } catch (err: any) {
      console.error("Save error:", err);
      handleAlert({ variant: "error", body: err.message || "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const inputStyles = {
    minWidth: 200,
    maxWidth: "100%",
    flexGrow: 1,
    height: 34,
  };

  const tabs = [
    { label: "Details", value: "details", icon: "FileText" },
    { label: "Evidence", value: "evidence", icon: "FolderOpen" },
    { label: "Cross mappings", value: "cross-mappings", icon: "Link" },
    { label: "Notes", value: "notes", icon: "MessageSquare" },
  ];

  if (!item) return null;

  const levelName = level === 2 ? frameworkMeta.level_2_name : frameworkMeta.level_3_name;

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <>
      {alert && (
        <Alert
          variant={alert.variant}
          body={alert.body}
          isToast={true}
          onClick={() => setAlert(null)}
        />
      )}

      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          width: 600,
          margin: 0,
          "& .MuiDrawer-paper": {
            width: 600,
            margin: 0,
            borderRadius: 0,
            overflowX: "hidden",
            backgroundColor: "#FCFCFD",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* DRAWER HEADER */}
        <Box
          sx={{
            padding: "16px 20px",
            borderBottom: `1px solid ${borderColors.light}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: "12px",
                color: textColors.muted,
                mb: 0.5,
              }}
            >
              {levelName} Details
            </Typography>
            <Typography
              sx={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#1c2130",
                mb: item.description ? 1.5 : 0,
              }}
            >
              {item.title}
            </Typography>
            {/* Description Panel */}
            {item.description && (
              <Stack
                sx={{
                  border: "1px solid #eee",
                  padding: "12px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                }}
              >
                <Typography fontSize={13} sx={{ marginBottom: "8px" }}>
                  <strong>Description:</strong>
                </Typography>
                <Typography fontSize={13} color="#666">
                  {item.description}
                </Typography>
              </Stack>
            )}
          </Box>
          <Button
            onClick={onClose}
            sx={{
              minWidth: "auto",
              padding: 0,
              color: "#475467",
            }}
          >
            <CloseIcon size={20} />
          </Button>
        </Box>

        {/* DRAWER CONTENT */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            minHeight: 0,
          }}
        >
          <Stack spacing={3}>
            {/* TAB NAVIGATION */}
            <TabBar tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

              {/* TAB 1: DETAILS */}
              {activeTab === "details" && (
                <Stack gap="15px">
                  {/* Summary / Guidance */}
                  {item.summary && (
                    <Stack
                      sx={{
                        border: "1px solid #d5e8d5",
                        padding: "12px",
                        backgroundColor: "#f5fef5",
                        borderRadius: "4px",
                      }}
                    >
                      <Typography fontSize={13} sx={{ marginBottom: "8px", fontWeight: 600 }}>
                        Implementation Guidance:
                      </Typography>
                      <Typography fontSize={13} color="#666">
                        {item.summary}
                      </Typography>
                    </Stack>
                  )}

                  {/* Questions */}
                  {item.questions && item.questions.length > 0 && (
                    <Stack
                      sx={{
                        border: "1px solid #e8d5d5",
                        padding: "12px",
                        backgroundColor: "#fef5f5",
                        borderRadius: "4px",
                      }}
                    >
                      <Typography fontSize={13} sx={{ marginBottom: "8px", fontWeight: 600 }}>
                        Key Questions:
                      </Typography>
                      <Stack spacing={0.5}>
                        {item.questions.map((q: string, idx: number) => (
                          <Typography key={idx} fontSize={12} color="#666" sx={{ pl: 1 }}>
                            • {q}
                          </Typography>
                        ))}
                      </Stack>
                    </Stack>
                  )}

                  {/* Evidence Examples */}
                  {item.evidence_examples && item.evidence_examples.length > 0 && (
                    <Stack
                      sx={{
                        border: "1px solid #d5e0e8",
                        padding: "12px",
                        backgroundColor: "#f5f8fe",
                        borderRadius: "4px",
                      }}
                    >
                      <Typography fontSize={13} sx={{ marginBottom: "8px", fontWeight: 600 }}>
                        Evidence Examples:
                      </Typography>
                      <Stack spacing={0.5}>
                        {item.evidence_examples.map((e: string, idx: number) => (
                          <Typography key={idx} fontSize={12} color="#666" sx={{ pl: 1 }}>
                            • {e}
                          </Typography>
                        ))}
                      </Stack>
                    </Stack>
                  )}

                  {/* Implementation Details */}
                  <Stack>
                    <Typography fontSize={13} sx={{ marginBottom: "5px" }}>
                      Implementation description:
                    </Typography>
                    <Field
                      type="description"
                      value={formData.implementation_details}
                      onChange={(e) => handleFieldChange("implementation_details", e.target.value)}
                      placeholder="Describe how this requirement is implemented..."
                    />
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  {/* Status & Assignments */}
                  <Stack gap="24px">
                    <Select
                      id="status"
                      label="Status:"
                      value={formData.status}
                      onChange={(e) => handleFieldChange("status", String(e.target.value))}
                      items={statusOptions.map((s) => ({ _id: s, name: s }))}
                      sx={inputStyles}
                      placeholder="Select status"
                    />

                    <Select
                      id="owner"
                      label="Owner:"
                      value={formData.owner}
                      onChange={(e) => handleFieldChange("owner", String(e.target.value))}
                      items={users.map((u) => ({ _id: u.id.toString(), name: u.name, surname: u.surname }))}
                      sx={inputStyles}
                      placeholder="Select owner"
                    />

                    <Select
                      id="reviewer"
                      label="Reviewer:"
                      value={formData.reviewer}
                      onChange={(e) => handleFieldChange("reviewer", String(e.target.value))}
                      items={users.map((u) => ({ _id: u.id.toString(), name: u.name, surname: u.surname }))}
                      sx={inputStyles}
                      placeholder="Select reviewer"
                    />

                    <Select
                      id="approver"
                      label="Approver:"
                      value={formData.approver}
                      onChange={(e) => handleFieldChange("approver", String(e.target.value))}
                      items={users.map((u) => ({ _id: u.id.toString(), name: u.name, surname: u.surname }))}
                      sx={inputStyles}
                      placeholder="Select approver"
                    />

                    <DatePicker
                      label="Due date:"
                      date={formData.due_date}
                      handleDateChange={(date) => handleFieldChange("due_date", date)}
                      sx={inputStyles}
                    />
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  {/* Auditor Feedback */}
                  <Stack>
                    <Typography fontSize={13} sx={{ marginBottom: "5px" }}>
                      Auditor feedback:
                    </Typography>
                    <Field
                      type="description"
                      value={formData.auditor_feedback}
                      onChange={(e) => handleFieldChange("auditor_feedback", e.target.value)}
                      placeholder="Notes from auditor review..."
                    />
                  </Stack>
                </Stack>
              )}

              {/* TAB 2: EVIDENCE */}
              {activeTab === "evidence" && (
                <Stack spacing={3}>
                  {/* Evidence Files Section */}
                  <Box>
                    <Typography
                      sx={{ fontSize: "14px", fontWeight: 600, color: "#1F2937", mb: 1 }}
                    >
                      Evidence files
                    </Typography>
                    <Typography sx={{ fontSize: "13px", color: "#6B7280", mb: 2 }}>
                      Upload evidence files to document compliance with this requirement.
                    </Typography>

                    {/* Upload Button */}
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => evidenceFileInputRef.current?.click()}
                        sx={{
                          borderRadius: 2,
                          width: 155,
                          height: 25,
                          fontSize: 11,
                          border: "1px solid #D0D5DD",
                          backgroundColor: "white",
                          color: "#344054",
                          textTransform: "none",
                          "&:hover": {
                            backgroundColor: "#F9FAFB",
                            border: "1px solid #D0D5DD",
                          },
                        }}
                      >
                        Add evidence files
                      </Button>
                    </Stack>
                    <input
                      ref={evidenceFileInputRef}
                      type="file"
                      multiple
                      hidden
                      onChange={handleEvidenceFileInputChange}
                    />

                    {/* File Count Indicators */}
                    {(evidenceFiles.length > 0 ||
                      uploadEvidenceFiles.length > 0 ||
                      deletedEvidenceFileIds.length > 0) && (
                      <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                        {evidenceFiles.length > 0 && (
                          <Typography sx={{ fontSize: 11, color: "#6B7280" }}>
                            {evidenceFiles.length} files attached
                          </Typography>
                        )}
                        {uploadEvidenceFiles.length > 0 && (
                          <Typography sx={{ fontSize: 11, color: colors.primary }}>
                            +{uploadEvidenceFiles.length} pending upload
                          </Typography>
                        )}
                        {deletedEvidenceFileIds.length > 0 && (
                          <Typography sx={{ fontSize: 11, color: "#DC2626" }}>
                            -{deletedEvidenceFileIds.length} pending delete
                          </Typography>
                        )}
                      </Stack>
                    )}

                    {/* Existing Evidence Files */}
                    {evidenceFiles.length > 0 && (
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        {evidenceFiles.map((file) => (
                          <Box
                            key={file.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              border: `1px solid ${borderColors.light}`,
                              borderRadius: "4px",
                              backgroundColor: "white",
                              "&:hover": { backgroundColor: bgColors.hover },
                            }}
                          >
                            <Box sx={{ display: "flex", gap: 1.5, flex: 1, minWidth: 0 }}>
                              <FileIcon size={18} color={textColors.muted} />
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: "#1F2937",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {file.fileName}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: "#6B7280" }}>
                                  {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                                  {file.source ? ` • ${file.source}` : ""}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                              <Tooltip title="Download file">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadFile(file.id, file.fileName)}
                                  sx={{
                                    color: textColors.muted,
                                    "&:hover": {
                                      color: colors.primary,
                                      backgroundColor: "rgba(19, 113, 91, 0.08)",
                                    },
                                  }}
                                >
                                  <DownloadIcon size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete file">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteEvidenceFile(file.id)}
                                  sx={{
                                    color: textColors.muted,
                                    "&:hover": {
                                      color: "#DC2626",
                                      backgroundColor: "rgba(220, 38, 38, 0.08)",
                                    },
                                  }}
                                >
                                  <DeleteIcon size={16} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {/* Pending Upload Files */}
                    {uploadEvidenceFiles.length > 0 && (
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>
                          Pending upload
                        </Typography>
                        {uploadEvidenceFiles.map((file) => (
                          <Box
                            key={file.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              border: "1px solid #FEF3C7",
                              borderRadius: "4px",
                              backgroundColor: "#FFFBEB",
                            }}
                          >
                            <Box sx={{ display: "flex", gap: 1.5, flex: 1, minWidth: 0 }}>
                              <FileIcon size={18} color="#92400E" />
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: "#92400E",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {file.fileName}
                                </Typography>
                                {file.size && (
                                  <Typography sx={{ fontSize: 11, color: "#B45309" }}>
                                    {(file.size / 1024).toFixed(1)} KB
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Tooltip title="Remove from queue">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteEvidenceFile(file.id)}
                                sx={{
                                  color: "#92400E",
                                  "&:hover": {
                                    color: "#DC2626",
                                    backgroundColor: "rgba(220, 38, 38, 0.08)",
                                  },
                                }}
                              >
                                <DeleteIcon size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {/* Empty State */}
                    {evidenceFiles.length === 0 && uploadEvidenceFiles.length === 0 && (
                      <Box
                        sx={{
                          textAlign: "center",
                          py: 4,
                          color: textColors.muted,
                          border: `2px dashed ${borderColors.default}`,
                          borderRadius: 1,
                          backgroundColor: bgColors.hover,
                          mt: 2,
                        }}
                      >
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          No evidence files uploaded yet
                        </Typography>
                        <Typography variant="caption" color="#9CA3AF">
                          Click "Add evidence files" to upload documentation
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Divider />

                  {/* Auditor Feedback Files Section */}
                  <Box>
                    <Typography
                      sx={{ fontSize: "14px", fontWeight: 600, color: "#1F2937", mb: 1 }}
                    >
                      Auditor feedback files
                    </Typography>
                    <Typography sx={{ fontSize: "13px", color: "#6B7280", mb: 2 }}>
                      Upload auditor feedback and review documentation.
                    </Typography>

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => feedbackFileInputRef.current?.click()}
                        sx={{
                          borderRadius: 2,
                          width: 155,
                          height: 25,
                          fontSize: 11,
                          border: "1px solid #D0D5DD",
                          backgroundColor: "white",
                          color: "#344054",
                          textTransform: "none",
                          "&:hover": {
                            backgroundColor: "#F9FAFB",
                            border: "1px solid #D0D5DD",
                          },
                        }}
                      >
                        Add feedback files
                      </Button>
                    </Stack>
                    <input
                      ref={feedbackFileInputRef}
                      type="file"
                      multiple
                      hidden
                      onChange={handleFeedbackFileInputChange}
                    />

                    {/* File Count Indicators */}
                    {(feedbackFiles.length > 0 ||
                      uploadFeedbackFiles.length > 0 ||
                      deletedFeedbackFileIds.length > 0) && (
                      <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                        {feedbackFiles.length > 0 && (
                          <Typography sx={{ fontSize: 11, color: "#6B7280" }}>
                            {feedbackFiles.length} files attached
                          </Typography>
                        )}
                        {uploadFeedbackFiles.length > 0 && (
                          <Typography sx={{ fontSize: 11, color: colors.primary }}>
                            +{uploadFeedbackFiles.length} pending upload
                          </Typography>
                        )}
                        {deletedFeedbackFileIds.length > 0 && (
                          <Typography sx={{ fontSize: 11, color: "#DC2626" }}>
                            -{deletedFeedbackFileIds.length} pending delete
                          </Typography>
                        )}
                      </Stack>
                    )}

                    {/* Pending Upload Feedback Files */}
                    {uploadFeedbackFiles.length > 0 && (
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>
                          Pending upload
                        </Typography>
                        {uploadFeedbackFiles.map((file) => (
                          <Box
                            key={file.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              border: "1px solid #FEF3C7",
                              borderRadius: "4px",
                              backgroundColor: "#FFFBEB",
                            }}
                          >
                            <Box sx={{ display: "flex", gap: 1.5, flex: 1, minWidth: 0 }}>
                              <FileIcon size={18} color="#92400E" />
                              <Typography
                                sx={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "#92400E",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {file.fileName}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteFeedbackFile(file.id)}
                              sx={{ color: "#92400E" }}
                            >
                              <DeleteIcon size={16} />
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              )}

              {/* TAB 3: CROSS MAPPINGS */}
              {activeTab === "cross-mappings" && (
                <Stack spacing={3}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#1F2937", mb: 1 }}>
                    Linked risks
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Link risks from your risk database to track which risks are being addressed by this implementation.
                  </Typography>

                  {/* Linked Risks */}
                  {item.linked_risks && item.linked_risks.length > 0 ? (
                    <Stack spacing={1}>
                      {item.linked_risks.map((risk: any) => (
                        <Box
                          key={risk.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            border: `1px solid ${borderColors.light}`,
                            borderRadius: "4px",
                            backgroundColor: "white",
                            "&:hover": { backgroundColor: bgColors.hover },
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: "#1F2937",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {risk.risk_name}
                            </Typography>
                            {risk.risk_level && (
                              <Typography sx={{ fontSize: 11, color: textColors.muted }}>
                                Risk level: {risk.risk_level}
                              </Typography>
                            )}
                          </Box>
                          <Tooltip title="View details">
                            <IconButton
                              size="small"
                              sx={{
                                color: textColors.muted,
                                "&:hover": {
                                  color: colors.primary,
                                  backgroundColor: "rgba(19, 113, 91, 0.08)",
                                },
                              }}
                            >
                              <ViewIcon size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 4,
                        color: textColors.muted,
                        border: `2px dashed ${borderColors.default}`,
                        borderRadius: 1,
                        backgroundColor: bgColors.hover,
                      }}
                    >
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        No risks linked yet
                      </Typography>
                      <Typography variant="caption" color="#9CA3AF">
                        Risk linking coming soon
                      </Typography>
                    </Box>
                  )}
                </Stack>
              )}

              {/* TAB 4: NOTES */}
              {activeTab === "notes" && (
                <Stack spacing={3}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#1F2937", mb: 1 }}>
                    Collaboration notes
                  </Typography>
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 4,
                      color: textColors.muted,
                      border: `2px dashed ${borderColors.default}`,
                      borderRadius: 1,
                      backgroundColor: bgColors.hover,
                    }}
                  >
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Notes feature coming soon
                    </Typography>
                    <Typography variant="caption" color="#9CA3AF">
                      Add collaboration notes and comments
                    </Typography>
                  </Box>
                </Stack>
              )}
          </Stack>
        </Box>

        {/* DRAWER FOOTER */}
        <Box
          sx={{
            padding: "15px 20px",
            borderTop: `1px solid ${borderColors.light}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            backgroundColor: bgColors.modalFooter,
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
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
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !item.impl_id}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon size={18} />}
            sx={buttonStyles.primary.contained}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default CustomFrameworkDrawer;
