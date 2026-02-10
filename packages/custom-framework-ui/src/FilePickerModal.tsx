/**
 * FilePickerModal - Modal for selecting existing files from File Manager
 *
 * Styled to match the system framework's FilePickerModal component.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Checkbox,
  CircularProgress,
  Stack,
  Chip,
  InputAdornment,
  TextField,
  Modal,
  Button,
} from "@mui/material";
import {
  FileText as FileIcon,
  Image as ImageIcon,
  File as DefaultFileIcon,
  Search,
  X as CloseIcon,
} from "lucide-react";

interface FileData {
  id: number;
  fileName: string;
  size?: number;
  type?: string;
  uploadDate?: string;
  uploader?: string;
}

interface FilePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (files: FileData[]) => void;
  excludeFileIds?: number[];
  multiSelect?: boolean;
  title?: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename?.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return <FileIcon size={20} color="#E53935" />;
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext))
    return <ImageIcon size={20} color="#1E88E5" />;
  if (["doc", "docx", "txt", "rtf"].includes(ext))
    return <FileIcon size={20} color="#00ACC1" />;
  if (["xls", "xlsx", "csv"].includes(ext))
    return <FileIcon size={20} color="#43A047" />;
  return <DefaultFileIcon size={20} color="#757575" />;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Helper to get auth token from localStorage
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

export const FilePickerModal: React.FC<FilePickerModalProps> = ({
  open,
  onClose,
  onSelect,
  excludeFileIds = [],
  multiSelect = true,
  title = "Attach Existing Files as Evidence",
}) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

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

      // Map and filter files
      const mappedFiles = allFiles
        .filter((f: any) => {
          if (f.approval_workflow_id && f.review_status !== "approved") return false;
          return true;
        })
        .map((f: any) => ({
          id: f.id,
          fileName: f.filename || f.fileName,
          size: f.size,
          type: f.type || f.mimetype,
          uploadDate: f.upload_date || f.uploaded_time || f.uploadDate,
          uploader: f.uploader_name
            ? `${f.uploader_name}${f.uploader_surname ? ` ${f.uploader_surname}` : ""}`.trim()
            : f.uploader || undefined,
        }));

      // Remove duplicates
      const uniqueFiles = mappedFiles.filter(
        (file: FileData, index: number, self: FileData[]) =>
          index === self.findIndex((f) => f.id === file.id)
      );

      setFiles(uniqueFiles);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      setError("Failed to load files. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchFiles();
      setSelectedIds(new Set());
      setSearchTerm("");
    }
  }, [open, fetchFiles]);

  const filteredFiles = files.filter((file) => {
    if (excludeFileIds.includes(file.id)) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      file.fileName?.toLowerCase().includes(term) ||
      file.uploader?.toLowerCase().includes(term)
    );
  });

  const handleToggle = (fileId: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (multiSelect) {
        if (newSet.has(fileId)) {
          newSet.delete(fileId);
        } else {
          newSet.add(fileId);
        }
      } else {
        newSet.clear();
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f.id));
    onSelect(selectedFiles);
    onClose();
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "720px",
          maxHeight: "calc(100vh - 48px)",
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          overflow: "hidden",
          outline: "none",
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
                {title}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: "#475467",
                  lineHeight: "20px",
                }}
              >
                Select files from your organization to attach as evidence
              </Typography>
            </Stack>
            <Box
              component="span"
              role="button"
              tabIndex={0}
              onClick={onClose}
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
              <CloseIcon size={20} />
            </Box>
          </Stack>
        </Stack>

        {/* Content */}
        <Box
          sx={{
            padding: "20px",
            margin: "0 24px",
            border: "1px solid #E0E4E9",
            borderRadius: "16px",
            backgroundColor: "#FFFFFF",
            zIndex: 1,
            position: "relative",
            maxHeight: "calc(90vh - 280px)",
            overflow: "auto",
          }}
        >
          <Stack spacing={2.5}>
            {/* Search */}
            <TextField
              fullWidth
              size="small"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="#98A2B3" />
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

            {/* Header row */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              {multiSelect && filteredFiles.length > 0 ? (
                <Typography
                  onClick={handleSelectAll}
                  sx={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#4C7BF4",
                    cursor: "pointer",
                    "&:hover": { color: "#3D62C3" },
                  }}
                >
                  {selectedIds.size === filteredFiles.length ? "Deselect all" : "Select all"}
                </Typography>
              ) : (
                <Box />
              )}
              <Stack direction="row" alignItems="center" spacing={1}>
                {selectedIds.size > 0 && (
                  <Chip
                    label={`${selectedIds.size} selected`}
                    size="small"
                    sx={{
                      backgroundColor: "#EEF4FF",
                      color: "#3B5BDB",
                      fontSize: 11,
                      fontWeight: 500,
                      height: 24,
                      "& .MuiChip-label": { px: 1.5 },
                    }}
                  />
                )}
                <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                  {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
                </Typography>
              </Stack>
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
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={5}>
                  <CircularProgress size={24} sx={{ color: "#4C7BF4" }} />
                </Box>
              ) : error ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                  <Typography sx={{ fontSize: 13, color: "#DC2626" }}>{error}</Typography>
                </Box>
              ) : filteredFiles.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4, px: 3 }}>
                  <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>
                    {searchTerm ? "No files match your search" : "No files available"}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#9CA3AF" }}>
                    {!searchTerm && "Upload files to File Manager first"}
                  </Typography>
                </Box>
              ) : (
                <Stack divider={<Box sx={{ borderBottom: "1px solid #F3F4F6" }} />}>
                  {filteredFiles.map((file) => (
                    <Box
                      key={file.id}
                      onClick={() => handleToggle(file.id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        cursor: "pointer",
                        backgroundColor: selectedIds.has(file.id) ? "#F0F7FF" : "transparent",
                        "&:hover": {
                          backgroundColor: selectedIds.has(file.id) ? "#E3EFFD" : "#F9FAFB",
                        },
                        transition: "background-color 0.12s ease",
                      }}
                    >
                      <Checkbox
                        checked={selectedIds.has(file.id)}
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
                        {getFileIcon(file.fileName)}
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
                              {formatFileSize(file.size)}
                            </Typography>
                          )}
                          {file.size && file.uploader && (
                            <Typography sx={{ fontSize: 11, color: "#D1D5DB" }}>•</Typography>
                          )}
                          {file.uploader && (
                            <Typography sx={{ fontSize: 11, color: "#6B7280" }}>
                              {file.uploader}
                            </Typography>
                          )}
                          {(file.size || file.uploader) && file.uploadDate && (
                            <Typography sx={{ fontSize: 11, color: "#D1D5DB" }}>•</Typography>
                          )}
                          {file.uploadDate && (
                            <Typography sx={{ fontSize: 11, color: "#6B7280" }}>
                              {formatDate(file.uploadDate)}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>

        {/* Footer */}
        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1}
          sx={{
            background: "linear-gradient(180deg, #F3F5F8 0%, #F8FAFB 100%)",
            borderTop: "1px solid #E0E4E9",
            padding: "12px 24px",
            paddingTop: "32px",
            marginTop: "-20px",
            zIndex: 0,
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              minWidth: "80px",
              height: "34px",
              border: "1px solid #D0D5DD",
              color: "#344054",
              textTransform: "none",
              fontSize: 13,
              "&:hover": {
                backgroundColor: "#F9FAFB",
                border: "1px solid #D0D5DD",
              },
            }}
          >
            Cancel
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="contained"
              onClick={handleConfirm}
              sx={{
                minWidth: "80px",
                height: "34px",
                backgroundColor: "#13715B",
                textTransform: "none",
                fontSize: 13,
                "&:hover": { backgroundColor: "#0F5A47" },
              }}
            >
              Attach ({selectedIds.size})
            </Button>
          )}
        </Stack>
      </Box>
    </Modal>
  );
};

export default FilePickerModal;
