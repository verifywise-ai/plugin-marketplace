/**
 * ModelLifecycleConfig - Admin UI for managing lifecycle phases and items.
 * Self-contained plugin version using standard MUI components.
 */

import React, { useState, useCallback } from "react";
import {
  Stack,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Box,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  Select,
  MenuItem,
  Switch,
  Chip,
} from "@mui/material";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { LifecycleItem, useLifecycleConfig } from "./useModelLifecycle";

interface ApiServices {
  get: <T>(endpoint: string) => Promise<{ data: T }>;
  post: <T>(endpoint: string, data?: any) => Promise<{ data: T }>;
  put: <T>(endpoint: string, data?: any) => Promise<{ data: T }>;
  delete: <T>(endpoint: string) => Promise<{ data: T }>;
}

interface ModelLifecycleConfigProps {
  apiServices?: ApiServices;
}

const ITEM_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "documents", label: "Documents" },
  { value: "people", label: "People" },
  { value: "classification", label: "Classification" },
  { value: "checklist", label: "Checklist" },
  { value: "approval", label: "Approval" },
];

export default function ModelLifecycleConfig({ apiServices }: ModelLifecycleConfigProps) {
  const { phases, loading, refresh, setPhases } = useLifecycleConfig(apiServices, true);
  const [saving, setSaving] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // New phase form
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseDesc, setNewPhaseDesc] = useState("");

  // New item form
  const [addingItemForPhase, setAddingItemForPhase] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState("text");
  const [newItemRequired, setNewItemRequired] = useState(false);

  // Delete confirmation
  const [deletePhaseId, setDeletePhaseId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  // Inline editing
  const [editingPhaseId, setEditingPhaseId] = useState<number | null>(null);
  const [editingPhaseName, setEditingPhaseName] = useState("");

  // Expanded phases
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  const toggleExpanded = useCallback((phaseId: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }, []);

  // Phase operations
  const handleCreatePhase = useCallback(async () => {
    if (!newPhaseName.trim() || !apiServices) return;
    setSaving(true);
    try {
      await apiServices.post("/model-lifecycle/phases", {
        name: newPhaseName.trim(),
        description: newPhaseDesc.trim() || undefined,
      });
      setNewPhaseName("");
      setNewPhaseDesc("");
      refresh();
    } catch { /* error */ } finally { setSaving(false); }
  }, [newPhaseName, newPhaseDesc, refresh, apiServices]);

  const confirmDeletePhase = useCallback(async () => {
    if (deletePhaseId === null || !apiServices) return;
    setSaving(true);
    try {
      await apiServices.delete(`/model-lifecycle/phases/${deletePhaseId}`);
      refresh();
    } catch { /* error */ } finally { setSaving(false); setDeletePhaseId(null); }
  }, [deletePhaseId, refresh, apiServices]);

  const handleMovePhase = useCallback(
    async (phaseId: number, direction: "up" | "down") => {
      const idx = phases.findIndex((p) => p.id === phaseId);
      if (idx < 0 || !apiServices) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= phases.length) return;

      const ordered = [...phases];
      [ordered[idx], ordered[newIdx]] = [ordered[newIdx], ordered[idx]];
      const orderedIds = ordered.map((p) => p.id);

      setSaving(true);
      try {
        await apiServices.put("/model-lifecycle/phases/reorder", { orderedIds });
        refresh();
      } catch { /* error */ } finally { setSaving(false); }
    },
    [phases, refresh, apiServices]
  );

  const handleRenamePhaseSave = useCallback(
    async (phaseId: number, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || !apiServices) { setEditingPhaseId(null); return; }
      const oldName = phases.find((p) => p.id === phaseId)?.name ?? "";
      if (trimmed === oldName) { setEditingPhaseId(null); return; }

      setPhases((prev) =>
        prev.map((p) => (p.id === phaseId ? { ...p, name: trimmed } : p))
      );
      setEditingPhaseId(null);
      try {
        await apiServices.put(`/model-lifecycle/phases/${phaseId}`, { name: trimmed });
      } catch {
        setPhases((prev) =>
          prev.map((p) => (p.id === phaseId ? { ...p, name: oldName } : p))
        );
      }
    },
    [phases, setPhases, apiServices]
  );

  const handleTogglePhaseActive = useCallback(
    async (phaseId: number, isActive: boolean) => {
      if (!apiServices) return;
      setPhases((prev) =>
        prev.map((p) => (p.id === phaseId ? { ...p, is_active: isActive } : p))
      );
      try {
        await apiServices.put(`/model-lifecycle/phases/${phaseId}`, { is_active: isActive });
      } catch {
        setPhases((prev) =>
          prev.map((p) => (p.id === phaseId ? { ...p, is_active: !isActive } : p))
        );
      }
    },
    [setPhases, apiServices]
  );

  // Item operations
  const handleCreateItem = useCallback(
    async (phaseId: number) => {
      if (!newItemName.trim() || !apiServices) return;
      setSaving(true);
      try {
        await apiServices.post(`/model-lifecycle/phases/${phaseId}/items`, {
          name: newItemName.trim(),
          item_type: newItemType,
          is_required: newItemRequired,
        });
        setNewItemName("");
        setNewItemType("text");
        setNewItemRequired(false);
        setAddingItemForPhase(null);
        refresh();
      } catch { /* error */ } finally { setSaving(false); }
    },
    [newItemName, newItemType, newItemRequired, refresh, apiServices]
  );

  const confirmDeleteItem = useCallback(async () => {
    if (deleteItemId === null || !apiServices) return;
    setSaving(true);
    try {
      await apiServices.delete(`/model-lifecycle/items/${deleteItemId}`);
      refresh();
    } catch { /* error */ } finally { setSaving(false); setDeleteItemId(null); }
  }, [deleteItemId, refresh, apiServices]);

  const handleToggleItemRequired = useCallback(
    async (itemId: number, isRequired: boolean) => {
      if (!apiServices) return;
      setPhases((prev) =>
        prev.map((p) => ({
          ...p,
          items: p.items?.map((i) =>
            i.id === itemId ? { ...i, is_required: isRequired } : i
          ),
        }))
      );
      try {
        await apiServices.put(`/model-lifecycle/items/${itemId}`, { is_required: isRequired });
      } catch {
        setPhases((prev) =>
          prev.map((p) => ({
            ...p,
            items: p.items?.map((i) =>
              i.id === itemId ? { ...i, is_required: !isRequired } : i
            ),
          }))
        );
      }
    },
    [setPhases, apiServices]
  );

  const handleMoveItem = useCallback(
    async (phaseId: number, items: LifecycleItem[], itemId: number, direction: "up" | "down") => {
      const idx = items.findIndex((i) => i.id === itemId);
      if (idx < 0 || !apiServices) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= items.length) return;

      const ordered = [...items];
      [ordered[idx], ordered[newIdx]] = [ordered[newIdx], ordered[idx]];
      const orderedIds = ordered.map((i) => i.id);

      setSaving(true);
      try {
        await apiServices.put(`/model-lifecycle/phases/${phaseId}/items/reorder`, { orderedIds });
        refresh();
      } catch { /* error */ } finally { setSaving(false); }
    },
    [refresh, apiServices]
  );

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => setConfigOpen(true)}
        sx={{ textTransform: "none", borderColor: "#D0D5DD", color: "#344054" }}
      >
        Configure Model Lifecycle
      </Button>

      <Dialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: "85vh" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 600, fontSize: "16px", color: "#344054" }}>
            Configure Model Lifecycle
          </Typography>
          <IconButton onClick={() => setConfigOpen(false)} size="small" aria-label="Close">
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loading && phases.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack sx={{ gap: "16px" }}>
              {phases.map((phase, phaseIdx) => (
                <Accordion
                  key={phase.id}
                  expanded={expandedPhases.has(phase.id)}
                  onChange={() => toggleExpanded(phase.id)}
                  disableGutters
                  sx={{
                    border: "1px solid #E0E4E9",
                    borderRadius: "4px !important",
                    "&:before": { display: "none" },
                    boxShadow: "none",
                    overflow: "hidden",
                    opacity: phase.is_active ? 1 : 0.6,
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <ChevronRight
                        size={16}
                        color="#667085"
                        style={{
                          transform: expandedPhases.has(phase.id) ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    }
                    sx={{
                      backgroundColor: "#F9FAFB",
                      px: "16px",
                      py: "12px",
                      "& .MuiAccordionSummary-expandIconWrapper": {
                        transform: "none !important",
                        order: -1,
                        mr: "10px",
                      },
                      "& .MuiAccordionSummary-content": {
                        margin: 0,
                        alignItems: "center",
                        gap: "10px",
                      },
                    }}
                  >
                    {editingPhaseId === phase.id ? (
                      <Stack
                        direction="row"
                        alignItems="center"
                        sx={{ flex: 1, gap: "6px", mr: "8px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TextField
                          value={editingPhaseName}
                          onChange={(e) => setEditingPhaseName(e.target.value)}
                          onBlur={() => handleRenamePhaseSave(phase.id, editingPhaseName)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenamePhaseSave(phase.id, editingPhaseName);
                            else if (e.key === "Escape") setEditingPhaseId(null);
                          }}
                          autoFocus
                          size="small"
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleRenamePhaseSave(phase.id, editingPhaseName)}
                          aria-label="Save phase name"
                        >
                          <Check size={16} />
                        </IconButton>
                      </Stack>
                    ) : (
                      <Stack
                        direction="row"
                        alignItems="center"
                        sx={{ flex: 1, gap: "6px", "&:hover .phase-edit-icon": { opacity: 1 } }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, fontSize: "13px", cursor: "text" }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingPhaseId(phase.id);
                            setEditingPhaseName(phase.name);
                          }}
                        >
                          {phase.name}
                        </Typography>
                        <IconButton
                          className="phase-edit-icon"
                          size="small"
                          sx={{ opacity: 0, transition: "opacity 0.2s", p: "2px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPhaseId(phase.id);
                            setEditingPhaseName(phase.name);
                          }}
                          aria-label="Edit phase name"
                        >
                          <Pencil size={14} />
                        </IconButton>
                      </Stack>
                    )}
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={phase.is_active}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleTogglePhaseActive(phase.id, e.target.checked);
                          }}
                        />
                      }
                      label={<Typography variant="caption">Active</Typography>}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ mr: 0 }}
                    />
                    <IconButton
                      size="small"
                      disabled={phaseIdx === 0}
                      onClick={(e) => { e.stopPropagation(); handleMovePhase(phase.id, "up"); }}
                      aria-label="Move phase up"
                      sx={{ opacity: phaseIdx === 0 ? 0.4 : 1 }}
                    >
                      <ArrowUp size={16} />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={phaseIdx === phases.length - 1}
                      onClick={(e) => { e.stopPropagation(); handleMovePhase(phase.id, "down"); }}
                      aria-label="Move phase down"
                      sx={{ opacity: phaseIdx === phases.length - 1 ? 0.4 : 1 }}
                    >
                      <ArrowDown size={16} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setDeletePhaseId(phase.id); }}
                      sx={{ color: "#F04438" }}
                      aria-label="Delete phase"
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </AccordionSummary>

                  <AccordionDetails sx={{ px: "16px", py: "16px" }}>
                    <Stack spacing={0}>
                      {(phase.items ?? []).map((item, itemIdx) => (
                        <Stack
                          key={item.id}
                          direction="row"
                          alignItems="center"
                          sx={{
                            gap: "16px",
                            py: "10px",
                            borderBottom: "1px solid #E0E4E9",
                          }}
                        >
                          <Typography variant="body2" sx={{ flex: 1, fontSize: "13px" }}>
                            {item.name}
                          </Typography>
                          <Chip label={item.item_type} size="small" variant="outlined" />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={item.is_required}
                                onChange={(e) => handleToggleItemRequired(item.id, e.target.checked)}
                              />
                            }
                            label={<Typography variant="caption">Req</Typography>}
                            sx={{ mr: 0 }}
                          />
                          <Stack
                            direction="row"
                            alignItems="center"
                            sx={{ gap: "6px", pl: "12px", borderLeft: "1px solid #E0E4E9" }}
                          >
                            <IconButton
                              size="small"
                              disabled={itemIdx === 0}
                              onClick={() => handleMoveItem(phase.id, phase.items ?? [], item.id, "up")}
                              aria-label="Move item up"
                              sx={{ opacity: itemIdx === 0 ? 0.4 : 1 }}
                            >
                              <ArrowUp size={16} />
                            </IconButton>
                            <IconButton
                              size="small"
                              disabled={itemIdx === (phase.items?.length ?? 0) - 1}
                              onClick={() => handleMoveItem(phase.id, phase.items ?? [], item.id, "down")}
                              aria-label="Move item down"
                              sx={{ opacity: itemIdx === (phase.items?.length ?? 0) - 1 ? 0.4 : 1 }}
                            >
                              <ArrowDown size={16} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteItemId(item.id)}
                              sx={{ color: "#F04438" }}
                              aria-label="Delete item"
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </Stack>
                        </Stack>
                      ))}

                      {addingItemForPhase === phase.id ? (
                        <Stack direction="row" sx={{ gap: "10px", pt: "16px" }} alignItems="center">
                          <TextField
                            placeholder="Item name"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            size="small"
                            sx={{ flex: 1 }}
                          />
                          <Select
                            value={newItemType}
                            onChange={(e) => setNewItemType(e.target.value)}
                            size="small"
                            sx={{ minWidth: 120 }}
                          >
                            {ITEM_TYPES.map((t) => (
                              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                            ))}
                          </Select>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={newItemRequired}
                                onChange={(e) => setNewItemRequired(e.target.checked)}
                              />
                            }
                            label={<Typography variant="caption">Req</Typography>}
                            sx={{ ml: "4px" }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleCreateItem(phase.id)}
                            disabled={!newItemName.trim() || saving}
                            sx={{ textTransform: "none" }}
                          >
                            Add
                          </Button>
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => { setAddingItemForPhase(null); setNewItemName(""); }}
                            sx={{ textTransform: "none" }}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      ) : (
                        <Button
                          variant="text"
                          size="small"
                          startIcon={<Plus size={16} />}
                          onClick={() => setAddingItemForPhase(phase.id)}
                          sx={{ alignSelf: "flex-start", mt: "16px", textTransform: "none" }}
                        >
                          Add item
                        </Button>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}

              {/* Add new phase */}
              <Box sx={{ border: "1px dashed #D0D5DD", borderRadius: "4px", p: "16px" }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: "12px" }}>
                  Add new phase
                </Typography>
                <Stack sx={{ gap: "12px" }}>
                  <TextField
                    placeholder="Phase name"
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    placeholder="Description (optional)"
                    value={newPhaseDesc}
                    onChange={(e) => setNewPhaseDesc(e.target.value)}
                    size="small"
                    multiline
                    rows={2}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Plus size={16} />}
                    onClick={handleCreatePhase}
                    disabled={!newPhaseName.trim() || saving}
                    sx={{ alignSelf: "flex-start", textTransform: "none" }}
                  >
                    Create phase
                  </Button>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: "16px", py: "12px" }}>
          <Button variant="text" onClick={() => setConfigOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete phase confirmation */}
      <Dialog open={deletePhaseId !== null} onClose={() => setDeletePhaseId(null)}>
        <DialogTitle>Delete phase</DialogTitle>
        <DialogContent>
          <Typography>Delete this phase and all its items? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePhaseId(null)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button onClick={confirmDeletePhase} color="error" variant="contained" disabled={saving} sx={{ textTransform: "none" }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete item confirmation */}
      <Dialog open={deleteItemId !== null} onClose={() => setDeleteItemId(null)}>
        <DialogTitle>Delete item</DialogTitle>
        <DialogContent>
          <Typography>Delete this item? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItemId(null)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button onClick={confirmDeleteItem} color="error" variant="contained" disabled={saving} sx={{ textTransform: "none" }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
