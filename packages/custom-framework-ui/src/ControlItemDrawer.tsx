/**
 * Control Item Drawer
 *
 * Drawer for viewing and editing custom framework control items (Level 2 items).
 * Matches the UI pattern of ISO 27001/42001 drawer dialogs.
 * Features tabs: Details, Evidence, Cross-mappings, Notes
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Button,
  Divider,
  CircularProgress,
  Stack,
  Tabs,
  Tab,
  Tooltip,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  InputAdornment,
} from "@mui/material";
import {
  X as CloseIcon,
  Save as SaveIcon,
  FileText as FileIcon,
  Trash2 as DeleteIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  MessageSquare,
  FolderOpen,
  HelpCircle,
  AlertTriangle,
  Search as SearchIcon,
} from "lucide-react";
import {
  colors,
  textColors,
  statusOptions,
  StatusType,
  statusColors,
} from "./theme";

interface ControlItemDrawerProps {
  open: boolean;
  onClose: () => void;
  item: Level2Item | null;
  frameworkData: {
    level_1_name: string;
    level_2_name: string;
    level_3_name?: string;
    file_source?: string;
  } | null;
  projectId: number;
  onSave: () => void;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    patch: (url: string, data?: any) => Promise<any>;
  };
  isOrganizational?: boolean;
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
}

interface ProjectRisk {
  id: number;
  risk_name: string;
  risk_description?: string;
  risk_level?: string;
  severity?: string;
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
  auditor_feedback?: string;
  evidence_files?: EvidenceFile[];
  evidence_links?: EvidenceFile[];  // Backend returns this field name
  linked_risks?: LinkedRisk[];
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

interface EvidenceFile {
  id: number;
  fileName: string;
  size?: number;
  type?: string;
  uploadDate?: string;
}

interface LinkedRisk {
  id: number;
  risk_name: string;
  risk_level?: string;
  severity?: string;
}

interface User {
  id: number;
  name: string;
  surname: string;
}

export const ControlItemDrawer: React.FC<ControlItemDrawerProps> = ({
  open,
  onClose,
  item,
  frameworkData,
  projectId,
  onSave,
  apiServices,
  isOrganizational = false,
  pluginKey,
}) => {
  const [activeTab, setActiveTab] = useState("details");
  const [formData, setFormData] = useState({
    status: "Not started",
    owner: "",
    reviewer: "",
    approver: "",
    due_date: "",
    implementation_details: "",
    auditor_feedback: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evidence state
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [deletedFileIds, setDeletedFileIds] = useState<number[]>([]);
  const [pendingAttachFiles, setPendingAttachFiles] = useState<EvidenceFile[]>([]);

  // File picker modal state
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<EvidenceFile[]>([]);
  const [filePickerLoading, setFilePickerLoading] = useState(false);
  const [filePickerSearchQuery, setFilePickerSearchQuery] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());

  // Linked risks state
  const [linkedRisks, setLinkedRisks] = useState<LinkedRisk[]>([]);
  const [isLinkedRisksModalOpen, setIsLinkedRisksModalOpen] = useState(false);
  const [allProjectRisks, setAllProjectRisks] = useState<ProjectRisk[]>([]);
  const [risksToAdd, setRisksToAdd] = useState<number[]>([]);
  const [risksToRemove, setRisksToRemove] = useState<number[]>([]);
  const [riskSearchQuery, setRiskSearchQuery] = useState("");

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
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, { headers });
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
  };

  // Load users for owner/reviewer dropdowns
  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get("/users");
      const userData = response.data.data || response.data;
      if (Array.isArray(userData)) {
        setUsers(userData);
      }
    } catch (err) {
      console.log("[ControlItemDrawer] Error loading users:", err);
    }
  }, []);

  // Load available files from File Manager for attaching
  const loadAvailableFiles = useCallback(async () => {
    setFilePickerLoading(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Fetch from both endpoints like the main app does
      const [fileManagerResponse, filesResponse] = await Promise.all([
        fetch("/api/file-manager", { headers }),
        fetch("/api/files", { headers }),
      ]);

      let allFiles: any[] = [];

      if (fileManagerResponse.ok) {
        const result = await fileManagerResponse.json();
        const files = result.data?.files || result.files || [];
        allFiles = [...allFiles, ...files];
      }

      if (filesResponse.ok) {
        const result = await filesResponse.json();
        const files = Array.isArray(result) ? result : (result.data || []);
        allFiles = [...allFiles, ...files];
      }

      // Map to EvidenceFile format and filter by approval workflow
      const mappedFiles = allFiles
        .filter((f: any) => {
          // Hide files that have approval workflow but are not yet approved
          if (f.approval_workflow_id && f.review_status !== "approved") return false;
          return true;
        })
        .map((f: any) => ({
          id: f.id,
          fileName: f.filename || f.fileName,
          size: f.size,
          type: f.type || f.mimetype,
          uploadDate: f.upload_date || f.uploaded_time || f.uploadDate,
        }));

      // Remove duplicates by id
      const uniqueFiles = mappedFiles.filter(
        (file, index, self) => index === self.findIndex((f) => f.id === file.id)
      );

      setAvailableFiles(uniqueFiles);
    } catch (err) {
      console.log("[ControlItemDrawer] Error loading available files:", err);
    } finally {
      setFilePickerLoading(false);
    }
  }, []);

  // Load all project risks for linking
  const loadProjectRisks = useCallback(async () => {
    try {
      // For organizational frameworks, fetch all risks
      // For project frameworks, fetch project-specific risks
      const endpoint = isOrganizational
        ? "/projectRisks?filter=active"
        : projectId
          ? `/projectRisks/by-projId/${projectId}`
          : "/projectRisks?filter=active";

      const response = await api.get(endpoint);
      let risksData = response.data?.data || response.data;
      if (Array.isArray(risksData)) {
        setAllProjectRisks(risksData);
      }
    } catch (err) {
      console.log("[ControlItemDrawer] Error loading project risks:", err);
      setAllProjectRisks([]);
    }
  }, [isOrganizational, projectId]);

  useEffect(() => {
    if (open) {
      loadUsers();
      loadProjectRisks();
      setActiveTab("details");
    }
  }, [open, loadUsers, loadProjectRisks]);

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        status: item.status || "Not started",
        owner: item.owner?.toString() || "",
        reviewer: item.reviewer?.toString() || "",
        approver: item.approver?.toString() || "",
        due_date: item.due_date || "",
        implementation_details: item.implementation_details || "",
        auditor_feedback: item.auditor_feedback || "",
      });
      // Backend returns evidence_links, map to evidenceFiles state
      setEvidenceFiles(item.evidence_links || item.evidence_files || []);
      setLinkedRisks(item.linked_risks || []);
      setUploadFiles([]);
      setDeletedFileIds([]);
      setPendingAttachFiles([]);
      setRisksToAdd([]);
      setRisksToRemove([]);
      setRiskSearchQuery("");
    }
  }, [item]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: string) => (event: SelectChangeEvent<string>) => {
    handleFieldChange(field, event.target.value);
  };

  const handleSave = async () => {
    if (!item?.impl_id) {
      setError("Cannot save: Implementation ID not found");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Upload new evidence files first
      const uploadedFileIds: number[] = [];
      // Use framework-specific file source if available (e.g., "SOC 2 evidence")
      // Fallback to "File Manager" which is a valid enum value
      const fileSource = frameworkData?.file_source || "File Manager";
      for (const file of uploadFiles) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("source", fileSource);
          if (projectId) {
            formData.append("project_id", projectId.toString());
          }

          const token = getAuthToken();
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const uploadResponse = await fetch("/api/file-manager", {
            method: "POST",
            headers,
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            const fileId = uploadResult.data?.id || uploadResult.id;
            if (fileId) {
              uploadedFileIds.push(fileId);
            }
          } else {
            console.error("[ControlItemDrawer] File upload failed:", file.name);
          }
        } catch (uploadErr) {
          console.error("[ControlItemDrawer] Error uploading file:", uploadErr);
        }
      }

      // 2. Build updated evidence_links
      // Start with existing files (minus deleted ones)
      const existingLinks = evidenceFiles
        .filter(f => !deletedFileIds.includes(f.id))
        .map(f => ({
          id: f.id,
          fileName: f.fileName,
          size: f.size,
          type: f.type,
          uploadDate: f.uploadDate,
        }));

      // Add newly uploaded files
      const newLinks = uploadedFileIds.map((id, idx) => ({
        id,
        fileName: uploadFiles[idx]?.name || `file_${id}`,
        size: uploadFiles[idx]?.size,
        type: uploadFiles[idx]?.type,
        uploadDate: new Date().toISOString(),
      }));

      // Add pending attach files (existing files from File Manager)
      const attachedLinks = pendingAttachFiles.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        size: f.size,
        type: f.type,
        uploadDate: f.uploadDate,
      }));

      const evidence_links = [...existingLinks, ...newLinks, ...attachedLinks];

      // 3. Build payload
      const payload: any = {
        status: formData.status,
        implementation_details: formData.implementation_details,
        auditor_feedback: formData.auditor_feedback,
        evidence_links,
      };

      if (formData.owner) {
        payload.owner = parseInt(formData.owner);
      } else {
        payload.owner = null;
      }

      if (formData.reviewer) {
        payload.reviewer = parseInt(formData.reviewer);
      } else {
        payload.reviewer = null;
      }

      if (formData.approver) {
        payload.approver = parseInt(formData.approver);
      } else {
        payload.approver = null;
      }

      if (formData.due_date) {
        payload.due_date = formData.due_date;
      } else {
        payload.due_date = null;
      }

      // 4. Add risk linking
      if (risksToAdd.length > 0) {
        payload.risks_to_add = risksToAdd;
      }
      if (risksToRemove.length > 0) {
        payload.risks_to_remove = risksToRemove;
      }

      // 5. Note: We only unlink files from evidence_links, we don't delete them from file manager
      // The files are just removed from the evidence_links array above (filter by deletedFileIds)
      // This allows the same file to be used as evidence in multiple places

      // 6. Save to API
      const response = await api.patch(
        `/plugins/${pluginKey}/level2/${item.impl_id}`,
        payload
      );

      if (response.status === 200) {
        onSave();
        onClose();
      } else {
        setError("Failed to save changes");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Evidence handlers
  const handleAddFiles = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setUploadFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDeleteEvidenceFile = (fileId: number) => {
    setDeletedFileIds((prev) => [...prev, fileId]);
    setEvidenceFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleRemoveUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemovePendingAttachFile = (fileId: number) => {
    setPendingAttachFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // File picker handlers
  const handleOpenFilePicker = () => {
    setIsFilePickerOpen(true);
    loadAvailableFiles();
    setSelectedFileIds(new Set());
    setFilePickerSearchQuery("");
  };

  const handleFilePickerToggle = (fileId: number) => {
    setSelectedFileIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleFilePickerConfirm = () => {
    const filesToAttach = availableFiles.filter((f) => selectedFileIds.has(f.id));
    setPendingAttachFiles((prev) => [...prev, ...filesToAttach]);
    setIsFilePickerOpen(false);
    setSelectedFileIds(new Set());
  };

  // Get excluded file IDs (already attached or pending)
  const getExcludedFileIds = (): Set<number> => {
    const ids = new Set<number>();
    evidenceFiles.forEach((f) => ids.add(f.id));
    pendingAttachFiles.forEach((f) => ids.add(f.id));
    return ids;
  };

  // Filter available files for picker
  const filteredAvailableFiles = availableFiles.filter((file) => {
    if (getExcludedFileIds().has(file.id)) return false;
    if (!filePickerSearchQuery) return true;
    return file.fileName.toLowerCase().includes(filePickerSearchQuery.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    return statusColors[status as StatusType]?.color || "#94a3b8";
  };

  // Handle file download
  const handleDownloadFile = async (fileId: number, fileName: string) => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`/api/file-manager/${fileId}`, {
        headers,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        setError("Failed to download file");
      }
    } catch (err) {
      console.error("[ControlItemDrawer] Error downloading file:", err);
      setError("Failed to download file");
    }
  };

  // Risk selection helpers
  const getCurrentRiskIds = (): Set<number> => {
    const ids = new Set<number>();
    linkedRisks.forEach(r => ids.add(r.id));
    risksToAdd.forEach(id => ids.add(id));
    risksToRemove.forEach(id => ids.delete(id));
    return ids;
  };

  const isRiskSelected = (riskId: number): boolean => {
    const currentIds = getCurrentRiskIds();
    return currentIds.has(riskId);
  };

  const handleRiskToggle = (riskId: number) => {
    const wasOriginallyLinked = linkedRisks.some(r => r.id === riskId);
    const isCurrentlySelected = isRiskSelected(riskId);

    if (isCurrentlySelected) {
      // Deselect: either remove from risksToAdd or add to risksToRemove
      if (!wasOriginallyLinked) {
        setRisksToAdd(prev => prev.filter(id => id !== riskId));
      } else {
        setRisksToRemove(prev => [...prev, riskId]);
      }
    } else {
      // Select: either add to risksToAdd or remove from risksToRemove
      if (wasOriginallyLinked) {
        setRisksToRemove(prev => prev.filter(id => id !== riskId));
      } else {
        setRisksToAdd(prev => [...prev, riskId]);
      }
    }
  };

  const handleUnlinkRisk = (riskId: number) => {
    const wasOriginallyLinked = linkedRisks.some(r => r.id === riskId);
    if (wasOriginallyLinked) {
      setRisksToRemove(prev => [...prev, riskId]);
    } else {
      setRisksToAdd(prev => prev.filter(id => id !== riskId));
    }
  };

  // Get filtered risks for the modal
  const filteredRisks = allProjectRisks.filter(risk =>
    risk.risk_name.toLowerCase().includes(riskSearchQuery.toLowerCase())
  );

  // Get the display list of currently linked risks (including pending adds, excluding pending removes)
  const displayedLinkedRisks = [
    ...linkedRisks.filter(r => !risksToRemove.includes(r.id)),
    ...allProjectRisks
      .filter(r => risksToAdd.includes(r.id))
      .map(r => ({
        id: r.id,
        risk_name: r.risk_name,
        risk_level: r.risk_level,
        severity: r.severity,
      })),
  ];

  if (!item) return null;

  // Loading state
  if (loading) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        PaperProps={{
          sx: { width: 600, margin: 0, borderRadius: 0 },
        }}
      >
        <Stack
          sx={{
            width: 600,
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CircularProgress sx={{ color: colors.primary }} />
          <Typography sx={{ mt: 2, color: textColors.secondary }}>Loading...</Typography>
        </Stack>
      </Drawer>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor="right"
      PaperProps={{
        sx: {
          width: 600,
          margin: 0,
          borderRadius: 0,
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        },
      }}
    >
      <Stack sx={{ width: 600, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Stack
          sx={{
            width: 600,
            padding: "15px 20px",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography fontSize={15} fontWeight={700} color={textColors.primary}>
            {item.title}
          </Typography>
          <CloseIcon
            size={20}
            onClick={onClose}
            style={{ cursor: "pointer", color: textColors.muted }}
          />
        </Stack>

        <Divider />

        {/* Tabs */}
        <Box sx={{ padding: "0 20px" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                fontSize: 13,
                textTransform: "none",
                color: textColors.secondary,
                "&.Mui-selected": {
                  color: colors.primary,
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: colors.primary,
              },
            }}
          >
            <Tab
              value="details"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FileIcon size={14} />
                  Details
                </Box>
              }
            />
            <Tab
              value="evidence"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FolderOpen size={14} />
                  Evidence
                </Box>
              }
            />
            <Tab
              value="cross-mappings"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LinkIcon size={14} />
                  Cross mappings
                </Box>
              }
            />
            <Tab
              value="notes"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <MessageSquare size={14} />
                  Notes
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          {/* Details Tab */}
          {activeTab === "details" && (
            <Box sx={{ padding: "15px 20px" }}>
              <Stack gap="15px">
                {/* Description/Summary Panel */}
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

                {/* Key Questions Panel */}
                {item.questions && item.questions.length > 0 && (
                  <Stack
                    sx={{
                      border: "1px solid #e8d5d5",
                      padding: "12px",
                      backgroundColor: "#fef5f5",
                      borderRadius: "4px",
                    }}
                  >
                    <Typography
                      fontSize={13}
                      sx={{ marginBottom: "8px", fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <HelpCircle size={14} />
                      Key Questions:
                    </Typography>
                    <Stack spacing={1}>
                      {item.questions.map((question, idx) => (
                        <Typography
                          key={idx}
                          fontSize={12}
                          color="#666"
                          sx={{ pl: 1, position: "relative" }}
                        >
                          • {question}
                        </Typography>
                      ))}
                    </Stack>
                  </Stack>
                )}

                {/* Evidence Examples Panel */}
                {item.evidence_examples && item.evidence_examples.length > 0 && (
                  <Stack
                    sx={{
                      border: "1px solid #d5e8d5",
                      padding: "12px",
                      backgroundColor: "#f5fef5",
                      borderRadius: "4px",
                    }}
                  >
                    <Typography
                      fontSize={13}
                      sx={{ marginBottom: "8px", fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <FileIcon size={14} />
                      Evidence Examples:
                    </Typography>
                    <Stack spacing={1}>
                      {item.evidence_examples.map((example, idx) => (
                        <Typography
                          key={idx}
                          fontSize={12}
                          color="#666"
                          sx={{ pl: 1, position: "relative" }}
                        >
                          • {example}
                        </Typography>
                      ))}
                    </Stack>
                  </Stack>
                )}

                {/* Implementation Description */}
                <Stack>
                  <Typography fontSize={13} sx={{ marginBottom: "5px" }}>
                    Implementation Description:
                  </Typography>
                  <TextField
                    multiline
                    rows={3}
                    value={formData.implementation_details}
                    onChange={(e) => handleFieldChange("implementation_details", e.target.value)}
                    placeholder="Describe how this requirement is implemented"
                    size="small"
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: 13,
                      },
                    }}
                  />
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack gap="24px">
                {/* Status */}
                <FormControl fullWidth size="small">
                  <Typography fontSize={13} sx={{ marginBottom: "5px" }}>
                    Status:
                  </Typography>
                  <Select
                    value={formData.status}
                    onChange={handleSelectChange("status")}
                    sx={{ height: 34, fontSize: 13 }}
                  >
                    {statusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              bgcolor: getStatusColor(status),
                            }}
                          />
                          {status}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Owner */}
                <FormControl fullWidth size="small">
                  <Typography fontSize={13} sx={{ marginBottom: "5px" }}>
                    Owner:
                  </Typography>
                  <Select
                    value={formData.owner}
                    onChange={handleSelectChange("owner")}
                    displayEmpty
                    sx={{ height: 34, fontSize: 13 }}
                  >
                    <MenuItem value="">
                      <em style={{ color: "#9ca3af" }}>Select owner</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id.toString()}>
                        {user.name} {user.surname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Reviewer */}
                <FormControl fullWidth size="small">
                  <Typography fontSize={13} sx={{ marginBottom: "5px" }}>
                    Reviewer:
                  </Typography>
                  <Select
                    value={formData.reviewer}
                    onChange={handleSelectChange("reviewer")}
                    displayEmpty
                    sx={{ height: 34, fontSize: 13 }}
                  >
                    <MenuItem value="">
                      <em style={{ color: "#9ca3af" }}>Select reviewer</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id.toString()}>
                        {user.name} {user.surname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Approver */}
                <FormControl fullWidth size="small">
                  <Typography fontSize={13} sx={{ marginBottom: "5px" }}>
                    Approver:
                  </Typography>
                  <Select
                    value={formData.approver}
                    onChange={handleSelectChange("approver")}
                    displayEmpty
                    sx={{ height: 34, fontSize: 13 }}
                  >
                    <MenuItem value="">
                      <em style={{ color: "#9ca3af" }}>Select approver</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id.toString()}>
                        {user.name} {user.surname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Due Date */}
                <Stack>
                  <Typography fontSize={13} sx={{ marginBottom: "5px" }}>
                    Due date:
                  </Typography>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={formData.due_date}
                    onChange={(e) => handleFieldChange("due_date", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        height: 34,
                        fontSize: 13,
                      },
                    }}
                  />
                </Stack>

                {/* Auditor Feedback */}
                <Stack>
                  <Typography fontSize={13} sx={{ marginBottom: "5px" }}>
                    Auditor Feedback:
                  </Typography>
                  <TextField
                    multiline
                    rows={3}
                    value={formData.auditor_feedback}
                    onChange={(e) => handleFieldChange("auditor_feedback", e.target.value)}
                    placeholder="Enter any feedback from internal or external audits..."
                    size="small"
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: 13,
                      },
                    }}
                  />
                </Stack>
              </Stack>
            </Box>
          )}

          {/* Evidence Tab */}
          {activeTab === "evidence" && (
            <Box sx={{ padding: "15px 20px" }}>
              <Stack spacing={3}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Evidence files
                </Typography>
                <Typography variant="body2" color="#6B7280">
                  Upload evidence files to document compliance with this requirement.
                </Typography>

                {/* File Input */}
                <Box>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    style={{ display: "none" }}
                    id="evidence-file-input"
                    onChange={(e) => {
                      handleAddFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => document.getElementById("evidence-file-input")?.click()}
                        sx={{
                          borderRadius: 2,
                          minWidth: 155,
                          height: 25,
                          fontSize: 11,
                          border: "1px solid #D0D5DD",
                          backgroundColor: "white",
                          color: "#344054",
                          "&:hover": {
                            backgroundColor: "#F9FAFB",
                            border: "1px solid #D0D5DD",
                          },
                        }}
                      >
                        Add evidence files
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleOpenFilePicker}
                        sx={{
                          borderRadius: 2,
                          minWidth: 155,
                          height: 25,
                          fontSize: 11,
                          border: "1px solid #13715B",
                          backgroundColor: "#13715B",
                          color: "white",
                          textTransform: "none",
                          "&:hover": {
                            backgroundColor: "#0F5C49",
                            border: "1px solid #0F5C49",
                          },
                        }}
                      >
                        Attach existing files
                      </Button>
                    </Stack>

                    <Stack direction="row" spacing={2}>
                      <Typography sx={{ fontSize: 11, color: "#344054" }}>
                        {`${evidenceFiles.length || 0} files attached`}
                      </Typography>
                      {uploadFiles.length > 0 && (
                        <Typography sx={{ fontSize: 11, color: "#13715B" }}>
                          {`+${uploadFiles.length} pending upload`}
                        </Typography>
                      )}
                      {pendingAttachFiles.length > 0 && (
                        <Typography sx={{ fontSize: 11, color: "#0369A1" }}>
                          {`+${pendingAttachFiles.length} pending attach`}
                        </Typography>
                      )}
                      {deletedFileIds.length > 0 && (
                        <Typography sx={{ fontSize: 11, color: "#D32F2F" }}>
                          {`-${deletedFileIds.length} pending delete`}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Box>

                {/* Existing Files List */}
                {evidenceFiles.length > 0 && (
                  <Stack spacing={1}>
                    {evidenceFiles.map((file) => (
                      <Box
                        key={file.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          border: "1px solid #EAECF0",
                          borderRadius: "4px",
                          backgroundColor: "#FFFFFF",
                          "&:hover": {
                            backgroundColor: "#F9FAFB",
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", gap: 1.5, flex: 1, minWidth: 0 }}>
                          <FileIcon size={18} color="#475467" />
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
                            {file.size && (
                              <Typography sx={{ fontSize: 11, color: "#6B7280" }}>
                                {((file.size || 0) / 1024).toFixed(1)} KB
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Download file">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadFile(file.id, file.fileName)}
                              sx={{
                                color: "#475467",
                                "&:hover": {
                                  color: "#13715B",
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
                                color: "#475467",
                                "&:hover": {
                                  color: "#D32F2F",
                                  backgroundColor: "rgba(211, 47, 47, 0.08)",
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
                {uploadFiles.length > 0 && (
                  <Stack spacing={1}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>
                      Pending upload
                    </Typography>
                    {uploadFiles.map((file, index) => (
                      <Box
                        key={index}
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
                          <FileIcon size={18} color="#D97706" />
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
                              {file.name}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: "#B45309" }}>
                              {((file.size || 0) / 1024).toFixed(1)} KB
                            </Typography>
                          </Box>
                        </Box>
                        <Tooltip title="Remove from queue">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveUploadFile(index)}
                            sx={{
                              color: "#92400E",
                              "&:hover": {
                                color: "#D32F2F",
                                backgroundColor: "rgba(211, 47, 47, 0.08)",
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

                {/* Pending Attach Files (from File Manager) */}
                {pendingAttachFiles.length > 0 && (
                  <Stack spacing={1}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#0369A1" }}>
                      Pending attach from File Manager
                    </Typography>
                    {pendingAttachFiles.map((file) => (
                      <Box
                        key={file.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          border: "1px solid #BAE6FD",
                          borderRadius: "4px",
                          backgroundColor: "#F0F9FF",
                        }}
                      >
                        <Box sx={{ display: "flex", gap: 1.5, flex: 1, minWidth: 0 }}>
                          <FileIcon size={18} color="#0369A1" />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: "#0C4A6E",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {file.fileName}
                            </Typography>
                            {file.size && (
                              <Typography sx={{ fontSize: 11, color: "#0369A1" }}>
                                {((file.size || 0) / 1024).toFixed(1)} KB
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Tooltip title="Remove from queue">
                          <IconButton
                            size="small"
                            onClick={() => handleRemovePendingAttachFile(file.id)}
                            sx={{
                              color: "#0369A1",
                              "&:hover": {
                                color: "#D32F2F",
                                backgroundColor: "rgba(211, 47, 47, 0.08)",
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
                {evidenceFiles.length === 0 && uploadFiles.length === 0 && pendingAttachFiles.length === 0 && (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 4,
                      color: "#6B7280",
                      border: "2px dashed #D1D5DB",
                      borderRadius: 1,
                      backgroundColor: "#F9FAFB",
                    }}
                  >
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      No evidence files uploaded yet
                    </Typography>
                    <Typography variant="caption" color="#9CA3AF">
                      Click "Add evidence files" to upload or "Attach existing files" to link from File Manager
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          )}

          {/* Cross Mappings Tab */}
          {activeTab === "cross-mappings" && (
            <Box sx={{ padding: "15px 20px" }}>
              <Stack spacing={3}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Linked risks
                </Typography>
                <Typography variant="body2" color="#6B7280">
                  Link risks from your risk database to track which risks are addressed by this requirement.
                </Typography>

                {/* Add/Remove Button */}
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button
                    variant="contained"
                    onClick={() => setIsLinkedRisksModalOpen(true)}
                    sx={{
                      borderRadius: 2,
                      minWidth: 155,
                      height: 25,
                      fontSize: 11,
                      border: "1px solid #D0D5DD",
                      backgroundColor: "white",
                      color: "#344054",
                      "&:hover": {
                        backgroundColor: "#F9FAFB",
                        border: "1px solid #D0D5DD",
                      },
                    }}
                  >
                    Add/remove risks
                  </Button>

                  <Stack direction="row" spacing={2}>
                    <Typography sx={{ fontSize: 11, color: "#344054" }}>
                      {`${displayedLinkedRisks.length || 0} risks linked`}
                    </Typography>
                    {risksToAdd.length > 0 && (
                      <Typography sx={{ fontSize: 11, color: "#13715B" }}>
                        {`+${risksToAdd.length} pending save`}
                      </Typography>
                    )}
                    {risksToRemove.length > 0 && (
                      <Typography sx={{ fontSize: 11, color: "#D32F2F" }}>
                        {`-${risksToRemove.length} pending delete`}
                      </Typography>
                    )}
                  </Stack>
                </Stack>

                {/* Linked Risks List */}
                {displayedLinkedRisks.length > 0 && (
                  <Stack spacing={1}>
                    {displayedLinkedRisks.map((risk) => (
                      <Box
                        key={risk.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          border: risksToAdd.includes(risk.id)
                            ? "1px solid #FEF3C7"
                            : "1px solid #EAECF0",
                          borderRadius: "4px",
                          backgroundColor: risksToAdd.includes(risk.id)
                            ? "#FFFBEB"
                            : "#FFFFFF",
                          "&:hover": {
                            backgroundColor: risksToAdd.includes(risk.id)
                              ? "#FEF3C7"
                              : "#F9FAFB",
                          },
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: risksToAdd.includes(risk.id) ? "#92400E" : "#1F2937",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {risk.risk_name}
                            {risksToAdd.includes(risk.id) && (
                              <Typography component="span" sx={{ fontSize: 10, color: "#92400E", ml: 1 }}>
                                (pending)
                              </Typography>
                            )}
                          </Typography>
                          {risk.risk_level && (
                            <Typography sx={{ fontSize: 11, color: "#6B7280" }}>
                              Risk level: {risk.risk_level}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Unlink risk">
                            <IconButton
                              size="small"
                              onClick={() => handleUnlinkRisk(risk.id)}
                              sx={{
                                color: "#475467",
                                "&:hover": {
                                  color: "#D32F2F",
                                  backgroundColor: "rgba(211, 47, 47, 0.08)",
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

                {/* Empty State */}
                {displayedLinkedRisks.length === 0 && (
                  <Box
                    sx={{
                      border: "2px dashed #D0D5DD",
                      borderRadius: "4px",
                      padding: "20px",
                      textAlign: "center",
                      backgroundColor: "#FAFBFC",
                    }}
                  >
                    <AlertTriangle size={24} color="#9CA3AF" style={{ marginBottom: 8 }} />
                    <Typography sx={{ color: "#6B7280" }}>
                      No risks linked yet
                    </Typography>
                    <Typography variant="caption" color="#9CA3AF">
                      Click "Add/remove risks" to link risks to this control
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <Box sx={{ padding: "15px 20px" }}>
              <Stack spacing={3}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Notes
                </Typography>
                <Typography variant="body2" color="#6B7280">
                  Add notes and comments related to this control.
                </Typography>

                {/* Empty State */}
                <Box
                  sx={{
                    border: "2px dashed #D0D5DD",
                    borderRadius: "4px",
                    padding: "20px",
                    textAlign: "center",
                    backgroundColor: "#FAFBFC",
                  }}
                >
                  <MessageSquare size={24} color="#9CA3AF" style={{ marginBottom: 8 }} />
                  <Typography sx={{ color: "#6B7280" }}>
                    No notes yet
                  </Typography>
                  <Typography variant="caption" color="#9CA3AF">
                    Notes functionality will be available soon
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Box sx={{ padding: "0 20px", mb: 2 }}>
            <Box
              sx={{
                padding: "10px 12px",
                backgroundColor: "#FEE2E2",
                border: "1px solid #FECACA",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <AlertTriangle size={16} color="#DC2626" />
              <Typography fontSize={13} color="#DC2626">
                {error}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setError(null)}
                sx={{ ml: "auto", color: "#DC2626" }}
              >
                <CloseIcon size={14} />
              </IconButton>
            </Box>
          </Box>
        )}

        <Divider />

        {/* Footer */}
        <Stack
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            padding: "15px 20px",
          }}
        >
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon size={16} />}
            sx={{
              backgroundColor: colors.primary,
              border: `1px solid ${colors.primary}`,
              gap: 1,
              fontSize: 13,
              height: 32,
              "&:hover": {
                backgroundColor: colors.primaryHover,
              },
            }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      </Stack>

      {/* Linked Risks Modal */}
      <Dialog
        open={isLinkedRisksModalOpen}
        onClose={() => setIsLinkedRisksModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "8px",
            maxHeight: "80vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: 16,
            fontWeight: 600,
            borderBottom: "1px solid #E5E7EB",
            pb: 2,
          }}
        >
          Link risks from risk database
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <TextField
              placeholder="Search risks..."
              value={riskSearchQuery}
              onChange={(e) => setRiskSearchQuery(e.target.value)}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={16} color="#9CA3AF" />
                  </InputAdornment>
                ),
              }}
            />

            {allProjectRisks.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 4,
                  color: "#6B7280",
                }}
              >
                <Typography>No risks available to link</Typography>
                <Typography variant="caption" color="#9CA3AF">
                  Create risks in the Risk Management section first
                </Typography>
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: "1px solid #E5E7EB",
                  maxHeight: "400px",
                  overflow: "auto",
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ backgroundColor: "#F9FAFB" }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Select</Typography>
                      </TableCell>
                      <TableCell sx={{ backgroundColor: "#F9FAFB" }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Risk Name</Typography>
                      </TableCell>
                      <TableCell sx={{ backgroundColor: "#F9FAFB" }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Risk Level</Typography>
                      </TableCell>
                      <TableCell sx={{ backgroundColor: "#F9FAFB" }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Description</Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRisks.map((risk) => {
                      const isSelected = isRiskSelected(risk.id);
                      const isOriginallyLinked = linkedRisks.some(r => r.id === risk.id);
                      const isPendingAdd = risksToAdd.includes(risk.id);
                      const isPendingRemove = risksToRemove.includes(risk.id);

                      return (
                        <TableRow
                          key={risk.id}
                          hover
                          onClick={() => handleRiskToggle(risk.id)}
                          sx={{
                            cursor: "pointer",
                            backgroundColor: isPendingAdd
                              ? "#ECFDF5"
                              : isPendingRemove
                                ? "#FEF2F2"
                                : "inherit",
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleRiskToggle(risk.id)}
                              size="small"
                              sx={{
                                color: "#D1D5DB",
                                "&.Mui-checked": {
                                  color: "#13715B",
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 13, color: "#1F2937" }}>
                              {risk.risk_name}
                              {isPendingAdd && (
                                <Typography component="span" sx={{ fontSize: 10, color: "#059669", ml: 1 }}>
                                  (to be linked)
                                </Typography>
                              )}
                              {isPendingRemove && (
                                <Typography component="span" sx={{ fontSize: 10, color: "#DC2626", ml: 1 }}>
                                  (to be removed)
                                </Typography>
                              )}
                              {isOriginallyLinked && !isPendingRemove && (
                                <Typography component="span" sx={{ fontSize: 10, color: "#6B7280", ml: 1 }}>
                                  (linked)
                                </Typography>
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                              {risk.risk_level || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: "#6B7280",
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {risk.risk_description || "-"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredRisks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <Typography color="#9CA3AF">
                            No risks match your search
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #E5E7EB", p: 2 }}>
          <Button
            onClick={() => setIsLinkedRisksModalOpen(false)}
            sx={{
              color: "#344054",
              textTransform: "none",
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => setIsLinkedRisksModalOpen(false)}
            sx={{
              backgroundColor: "#13715B",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#0e5c47",
              },
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Picker Modal - Styled to match system framework FilePickerModal */}
      <Dialog
        open={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "12px",
            maxWidth: "720px",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: 16,
            fontWeight: 600,
            borderBottom: "1px solid #E5E7EB",
            pb: 2,
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
            Attach Existing Files
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#6B7280", mt: 0.5 }}>
            Select files from your organization to attach as evidence
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            {/* Search field */}
            <TextField
              placeholder="Search files..."
              value={filePickerSearchQuery}
              onChange={(e) => setFilePickerSearchQuery(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={16} color="#98A2B3" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#F9FAFB",
                  borderRadius: "8px",
                  fontSize: 13,
                  "& fieldset": { borderColor: "#E5E7EB" },
                  "&:hover fieldset": { borderColor: "#D1D5DB" },
                  "&.Mui-focused fieldset": { borderColor: "#4C7BF4", borderWidth: 1 },
                },
                "& .MuiInputBase-input::placeholder": { color: "#9CA3AF", opacity: 1 },
              }}
            />

            {/* Header row with select all and count */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              {filteredAvailableFiles.length > 0 ? (
                <Typography
                  onClick={() => {
                    if (selectedFileIds.size === filteredAvailableFiles.length) {
                      setSelectedFileIds(new Set());
                    } else {
                      setSelectedFileIds(new Set(filteredAvailableFiles.map((f) => f.id)));
                    }
                  }}
                  sx={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#4C7BF4",
                    cursor: "pointer",
                    "&:hover": { color: "#3D62C3" },
                  }}
                >
                  {selectedFileIds.size === filteredAvailableFiles.length ? "Deselect all" : "Select all"}
                </Typography>
              ) : (
                <Box />
              )}
              <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                {filteredAvailableFiles.length} file{filteredAvailableFiles.length !== 1 ? "s" : ""}
              </Typography>
            </Stack>

            {/* File List */}
            <Box
              sx={{
                maxHeight: "320px",
                overflowY: "auto",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                backgroundColor: "#FFFFFF",
              }}
            >
              {filePickerLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={5}>
                  <CircularProgress size={24} sx={{ color: "#4C7BF4" }} />
                </Box>
              ) : filteredAvailableFiles.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4, px: 3 }}>
                  <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>
                    {filePickerSearchQuery ? "No files match your search" : "No files available"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#9CA3AF" }}>
                    {!filePickerSearchQuery && "Upload files to File Manager first"}
                  </Typography>
                </Box>
              ) : (
                <Stack divider={<Box sx={{ borderBottom: "1px solid #F3F4F6" }} />}>
                  {filteredAvailableFiles.map((file) => {
                    const isSelected = selectedFileIds.has(file.id);
                    const ext = file.fileName?.split(".").pop()?.toLowerCase() || "";

                    // File type icon colors
                    let iconColor = "#757575";
                    if (["pdf"].includes(ext)) iconColor = "#E53935";
                    else if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) iconColor = "#1E88E5";
                    else if (["doc", "docx", "txt", "rtf"].includes(ext)) iconColor = "#00ACC1";
                    else if (["xls", "xlsx", "csv"].includes(ext)) iconColor = "#43A047";

                    return (
                      <Box
                        key={file.id}
                        onClick={() => handleFilePickerToggle(file.id)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          px: 2,
                          py: 1.5,
                          cursor: "pointer",
                          backgroundColor: isSelected ? "#F0F7FF" : "transparent",
                          "&:hover": {
                            backgroundColor: isSelected ? "#E3EFFD" : "#F9FAFB",
                          },
                          transition: "background-color 0.12s ease",
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          size="small"
                          sx={{
                            p: 0.5,
                            color: "#D1D5DB",
                            "&.Mui-checked": { color: "#4C7BF4" },
                          }}
                        />

                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "6px",
                            backgroundColor: "#F3F4F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <FileIcon size={20} color={iconColor} />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#111827",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              lineHeight: 1.4,
                            }}
                            title={file.fileName}
                          >
                            {file.fileName}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                            {file.size && (
                              <Typography sx={{ fontSize: 11, color: "#6B7280" }}>
                                {file.size < 1024
                                  ? `${file.size} B`
                                  : file.size < 1024 * 1024
                                    ? `${(file.size / 1024).toFixed(1)} KB`
                                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                              </Typography>
                            )}
                            {file.size && file.uploadDate && (
                              <Typography sx={{ fontSize: 11, color: "#D1D5DB" }}>•</Typography>
                            )}
                            {file.uploadDate && (
                              <Typography sx={{ fontSize: 11, color: "#6B7280" }}>
                                {new Date(file.uploadDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #E5E7EB", p: 2, justifyContent: "flex-end", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setIsFilePickerOpen(false)}
            sx={{
              minWidth: "80px",
              height: "34px",
              border: "1px solid #D0D5DD",
              color: "#344054",
              textTransform: "none",
              fontSize: 13,
              borderRadius: "6px",
              "&:hover": {
                backgroundColor: "#F9FAFB",
                border: "1px solid #D0D5DD",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleFilePickerConfirm}
            disabled={selectedFileIds.size === 0}
            sx={{
              minWidth: "80px",
              height: "34px",
              backgroundColor: "#13715B",
              textTransform: "none",
              fontSize: 13,
              borderRadius: "6px",
              "&:hover:not(.Mui-disabled)": {
                backgroundColor: "#0F5A47",
              },
              "&.Mui-disabled": {
                backgroundColor: "#E5E7EB",
                color: "#9CA3AF",
              },
            }}
          >
            Attach{selectedFileIds.size > 0 ? ` (${selectedFileIds.size})` : ""}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default ControlItemDrawer;
