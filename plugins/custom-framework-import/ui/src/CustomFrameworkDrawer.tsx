import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Drawer,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  X,
  Save,
  FileText,
  Link as LinkIcon,
  ChevronDown,
  AlertCircle,
  HelpCircle,
  CheckSquare,
} from "lucide-react";
import {
  colors,
  textColors,
  fontSizes,
  borderColors,
  bgColors,
  buttonStyles,
  statusColors,
  statusOptions,
  StatusType,
} from "./theme";

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
    patch: (url: string, data?: any) => Promise<any>;
  };
  onSave?: () => void;
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
}) => {
  const [formData, setFormData] = useState<any>({});
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const api = apiServices || {
    patch: async (url: string, body?: any) => {
      const response = await fetch(`/api${url}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { data: await response.json() };
    },
  };

  useEffect(() => {
    if (item) {
      setFormData({
        status: item.status || "Not started",
        owner: item.owner || "",
        reviewer: item.reviewer || "",
        approver: item.approver || "",
        due_date: item.due_date ? item.due_date.split("T")[0] : "",
        implementation_details: item.implementation_details || "",
        auditor_feedback: item.auditor_feedback || "",
      });
      setError(null);
      setSuccess(false);
    }
  }, [item]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!item?.impl_id) {
      setError("Cannot save: No implementation record found");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const endpoint =
        level === 2
          ? `/plugins/custom-framework-import/level2/${item.impl_id}`
          : `/plugins/custom-framework-import/level3/${item.impl_id}`;

      const payload: any = { ...formData };

      // Convert empty strings to null for optional fields
      if (payload.owner === "") payload.owner = null;
      if (payload.reviewer === "") payload.reviewer = null;
      if (payload.approver === "") payload.approver = null;
      if (payload.due_date === "") payload.due_date = null;

      await api.patch(endpoint, payload);

      setSuccess(true);
      onSave?.();
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const statusConfig = statusColors[status as StatusType];
    return statusConfig?.color || "#94a3b8";
  };

  if (!item) return null;

  const levelName = level === 2 ? frameworkMeta.level_2_name : frameworkMeta.level_3_name;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: "100%", sm: 500 }, maxWidth: "100vw" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2.5,
          borderBottom: `1px solid ${borderColors.light}`,
          background: bgColors.modalHeader,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: fontSizes.small, color: textColors.muted }}>
            {levelName} Details
          </Typography>
          <Typography sx={{ fontSize: "15px", fontWeight: 600, color: textColors.primary, pr: 4 }}>
            {item.title}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ "&:hover": { bgcolor: bgColors.hover } }}>
          <X size={20} color={textColors.muted} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3, overflowY: "auto", flex: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Changes saved successfully
          </Alert>
        )}

        {/* Description */}
        {item.description && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Description
            </Typography>
            <Typography variant="body2">{item.description}</Typography>
          </Box>
        )}

        {/* Summary / Guidance */}
        {item.summary && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Implementation Guidance
            </Typography>
            <Typography variant="body2">{item.summary}</Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Status */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={formData.status}
            label="Status"
            onChange={(e) => handleChange("status", e.target.value)}
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
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Owner</InputLabel>
          <Select
            value={formData.owner}
            label="Owner"
            onChange={(e) => handleChange("owner", e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name} {user.surname}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Reviewer */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Reviewer</InputLabel>
          <Select
            value={formData.reviewer}
            label="Reviewer"
            onChange={(e) => handleChange("reviewer", e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name} {user.surname}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Approver */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Approver</InputLabel>
          <Select
            value={formData.approver}
            label="Approver"
            onChange={(e) => handleChange("approver", e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name} {user.surname}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Due Date */}
        <TextField
          fullWidth
          label="Due Date"
          type="date"
          value={formData.due_date}
          onChange={(e) => handleChange("due_date", e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />

        {/* Implementation Details */}
        <TextField
          fullWidth
          label="Implementation Details"
          multiline
          rows={4}
          value={formData.implementation_details}
          onChange={(e) => handleChange("implementation_details", e.target.value)}
          placeholder="Describe how this control is implemented..."
          sx={{ mb: 2 }}
        />

        {/* Auditor Feedback */}
        <TextField
          fullWidth
          label="Auditor Feedback"
          multiline
          rows={3}
          value={formData.auditor_feedback}
          onChange={(e) => handleChange("auditor_feedback", e.target.value)}
          placeholder="Notes from auditor review..."
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />

        {/* Questions (read-only guidance) */}
        {item.questions && item.questions.length > 0 && (
          <Accordion defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ChevronDown size={18} />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <HelpCircle size={18} color={colors.info} />
                <Typography variant="subtitle2">Guiding Questions</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List dense disablePadding>
                {item.questions.map((q: string, idx: number) => (
                  <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <CheckSquare size={14} color={textColors.muted} />
                    </ListItemIcon>
                    <ListItemText
                      primary={q}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Evidence Examples (read-only guidance) */}
        {item.evidence_examples && item.evidence_examples.length > 0 && (
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ChevronDown size={18} />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FileText size={18} color={colors.success} />
                <Typography variant="subtitle2">Evidence Examples</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {item.evidence_examples.map((e: string, idx: number) => (
                  <Chip
                    key={idx}
                    label={e}
                    size="small"
                    variant="outlined"
                    sx={{ bgcolor: "#f8fafc" }}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Linked Risks */}
        {item.linked_risks && item.linked_risks.length > 0 && (
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ChevronDown size={18} />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AlertCircle size={18} color={colors.warning} />
                <Typography variant="subtitle2">
                  Linked Risks ({item.linked_risks.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List dense disablePadding>
                {item.linked_risks.map((risk: any) => (
                  <ListItem key={risk.id} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <LinkIcon size={14} color={colors.warning} />
                    </ListItemIcon>
                    <ListItemText
                      primary={risk.risk_name}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Evidence Links */}
        {item.evidence_links && item.evidence_links.length > 0 && (
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ChevronDown size={18} />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FileText size={18} color={colors.primary} />
                <Typography variant="subtitle2">
                  Uploaded Evidence ({item.evidence_links.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List dense disablePadding>
                {item.evidence_links.map((evidence: any, idx: number) => (
                  <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <FileText size={14} color={colors.primary} />
                    </ListItemIcon>
                    <ListItemText
                      primary={evidence.fileName || `Evidence ${idx + 1}`}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: `1px solid ${borderColors.light}`,
          background: bgColors.modalFooter,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
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
          disabled={loading || !item.impl_id}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
          sx={buttonStyles.primary.contained}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </Box>
    </Drawer>
  );
};
