import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Button,
  Switch,
  TextField,
  MenuItem,
  Select as MuiSelect,
  InputLabel,
  FormControl,
} from "@mui/material";
import { ChevronDown, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { FileAnalysis, DatasetMetadata } from "./useFileAnalysis";

const DATASET_TYPES = ["Training", "Validation", "Testing", "Production", "Evaluation"];
const CLASSIFICATIONS = ["Public", "Internal", "Confidential", "Restricted"];

interface FilePreviewAndMetadataProps {
  analyses: FileAnalysis[];
  onUpdateMetadata: (index: number, updates: Partial<DatasetMetadata>) => void;
  onToggleSkip: (index: number) => void;
  onApplyBatchDefaults: (defaults: Partial<DatasetMetadata>) => void;
}

export default function FilePreviewAndMetadata({
  analyses,
  onUpdateMetadata,
  onToggleSkip,
  onApplyBatchDefaults,
}: FilePreviewAndMetadataProps) {
  const [expanded, setExpanded] = useState<number | false>(0);
  const [batchType, setBatchType] = useState("");
  const [batchClassification, setBatchClassification] = useState("");
  const [batchOwner, setBatchOwner] = useState("");

  const handleApplyBatch = () => {
    const defaults: Partial<DatasetMetadata> = {};
    if (batchType) defaults.type = batchType;
    if (batchClassification) defaults.classification = batchClassification;
    if (batchOwner) defaults.owner = batchOwner;
    if (Object.keys(defaults).length > 0) {
      onApplyBatchDefaults(defaults);
    }
  };

  return (
    <Stack spacing={2}>
      {/* Batch defaults */}
      <Box
        sx={{
          border: "1px solid #E0E4E9",
          borderRadius: "4px",
          p: 2,
          backgroundColor: "#F9FAFB",
        }}
      >
        <Typography
          sx={{ mb: 1.5, fontSize: 13, fontWeight: 600, color: "#344054" }}
        >
          Batch defaults (apply to all files)
        </Typography>
        <Stack direction="row" spacing={2} alignItems="flex-end">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Type</InputLabel>
            <MuiSelect
              value={batchType}
              label="Type"
              onChange={(e) => setBatchType(e.target.value)}
            >
              <MenuItem value="">—</MenuItem>
              {DATASET_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Classification</InputLabel>
            <MuiSelect
              value={batchClassification}
              label="Classification"
              onChange={(e) => setBatchClassification(e.target.value)}
            >
              <MenuItem value="">—</MenuItem>
              {CLASSIFICATIONS.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
          <TextField
            label="Owner"
            placeholder="Owner name"
            size="small"
            value={batchOwner}
            onChange={(e) => setBatchOwner(e.target.value)}
            sx={{ width: 140 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleApplyBatch}
            sx={{
              border: "1px solid #D0D5DD",
              color: "#344054",
              height: 40,
              fontSize: 13,
              fontWeight: 500,
              textTransform: "none",
            }}
          >
            Apply
          </Button>
        </Stack>
      </Box>

      {/* Per-file accordions */}
      {analyses.map((analysis, index) => (
        <Accordion
          key={analysis.fileName}
          expanded={expanded === index}
          onChange={(_, isExpanded) => setExpanded(isExpanded ? index : false)}
          sx={{
            opacity: analysis.skipped ? 0.5 : 1,
            border: "1px solid #E0E4E9",
            borderRadius: "4px !important",
            overflow: "hidden",
            boxShadow: "none",
            "&:before": { display: "none" },
            "&.Mui-expanded": { margin: 0 },
          }}
        >
          <AccordionSummary
            expandIcon={<ChevronDown size={18} color="#667085" />}
            sx={{ padding: "8px 16px" }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
              <FileSpreadsheet size={18} color="#13715B" />
              <Typography sx={{ fontWeight: 500, fontSize: 13, color: "#344054" }}>
                {analysis.fileName}
              </Typography>
              <Chip label={analysis.format} size="small" variant="outlined" sx={{ fontSize: 12, height: 24 }} />
              <Chip label={`${analysis.rowCount} rows`} size="small" variant="outlined" sx={{ fontSize: 12, height: 24 }} />
              <Chip label={`${analysis.headers.length} cols`} size="small" variant="outlined" sx={{ fontSize: 12, height: 24 }} />
              {analysis.pii.containsPii && (
                <Chip
                  icon={<AlertTriangle size={12} />}
                  label="PII detected"
                  size="small"
                  sx={{
                    fontSize: 12,
                    height: 24,
                    backgroundColor: "#FFF3CD",
                    color: "#856404",
                    border: "1px solid #FFEEBA",
                  }}
                />
              )}
              {analysis.skipped && (
                <Chip label="Skipped" size="small" variant="outlined" sx={{ fontSize: 12, height: 24 }} />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={analysis.skipped}
                    onChange={() => onToggleSkip(index)}
                    size="small"
                  />
                }
                label={
                  <Typography sx={{ fontSize: 13, fontWeight: 400, color: "#344054" }}>
                    Skip this file
                  </Typography>
                }
                sx={{ marginLeft: 0, marginRight: 0 }}
              />

              {!analysis.skipped && (
                <>
                  {/* Data preview */}
                  {analysis.previewRows.length > 0 && (
                    <Box>
                      <Typography sx={{ mb: 1, fontSize: 13, fontWeight: 600, color: "#344054" }}>
                        Data preview (first {Math.min(10, analysis.previewRows.length)} rows)
                      </Typography>
                      <TableContainer
                        sx={{
                          maxHeight: 300,
                          overflow: "auto",
                          border: "1px solid #E0E4E9",
                          borderRadius: "4px",
                        }}
                      >
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              {analysis.headers.map((header) => {
                                const isPiiCol = analysis.pii.piiColumns.includes(header);
                                return (
                                  <TableCell
                                    key={header}
                                    sx={{
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: "#667085",
                                      padding: "10px 12px",
                                      whiteSpace: "nowrap",
                                      background: isPiiCol ? "#FFF3CD" : "#F9FAFB",
                                      borderBottom: "1px solid #E0E4E9",
                                    }}
                                  >
                                    {header}
                                    {isPiiCol && (
                                      <AlertTriangle
                                        size={12}
                                        style={{ marginLeft: 4, verticalAlign: "middle" }}
                                        color="#856404"
                                      />
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {analysis.previewRows.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {analysis.headers.map((header) => (
                                  <TableCell
                                    key={header}
                                    sx={{
                                      fontSize: 13,
                                      padding: "10px 12px",
                                      whiteSpace: "nowrap",
                                      borderBottom: "1px solid #E0E4E9",
                                      color: "#344054",
                                    }}
                                  >
                                    {String(row[header] ?? "")}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  <Divider />

                  {/* Metadata form */}
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#344054" }}>
                    Dataset metadata
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Name"
                        placeholder="Dataset name"
                        size="small"
                        value={analysis.metadata.name}
                        onChange={(e) => onUpdateMetadata(index, { name: e.target.value })}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Version"
                        placeholder="e.g., 1.0"
                        size="small"
                        value={analysis.metadata.version}
                        onChange={(e) => onUpdateMetadata(index, { version: e.target.value })}
                        sx={{ flex: 1 }}
                      />
                    </Stack>

                    <TextField
                      label="Description"
                      placeholder="Describe the dataset and its purpose"
                      size="small"
                      multiline
                      rows={2}
                      value={analysis.metadata.description}
                      onChange={(e) => onUpdateMetadata(index, { description: e.target.value })}
                      fullWidth
                    />

                    <Stack direction="row" spacing={2}>
                      <FormControl size="small" sx={{ flex: 1 }}>
                        <InputLabel>Type</InputLabel>
                        <MuiSelect
                          value={analysis.metadata.type}
                          label="Type"
                          onChange={(e) => onUpdateMetadata(index, { type: e.target.value })}
                        >
                          {DATASET_TYPES.map((t) => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                          ))}
                        </MuiSelect>
                      </FormControl>
                      <FormControl size="small" sx={{ flex: 1 }}>
                        <InputLabel>Classification</InputLabel>
                        <MuiSelect
                          value={analysis.metadata.classification}
                          label="Classification"
                          onChange={(e) => onUpdateMetadata(index, { classification: e.target.value })}
                        >
                          {CLASSIFICATIONS.map((c) => (
                            <MenuItem key={c} value={c}>{c}</MenuItem>
                          ))}
                        </MuiSelect>
                      </FormControl>
                      <TextField
                        label="Format"
                        size="small"
                        value={analysis.metadata.format}
                        disabled
                        sx={{ flex: 1 }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Owner"
                        placeholder="e.g., Data Science Team"
                        size="small"
                        value={analysis.metadata.owner}
                        onChange={(e) => onUpdateMetadata(index, { owner: e.target.value })}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Source"
                        placeholder="e.g., Internal CRM"
                        size="small"
                        value={analysis.metadata.source}
                        onChange={(e) => onUpdateMetadata(index, { source: e.target.value })}
                        sx={{ flex: 1 }}
                      />
                    </Stack>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={analysis.metadata.contains_pii}
                          onChange={(e) =>
                            onUpdateMetadata(index, { contains_pii: e.target.checked })
                          }
                          size="small"
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: 13, fontWeight: 400, color: "#344054" }}>
                          Dataset contains personally identifiable information (PII)
                        </Typography>
                      }
                      sx={{ marginLeft: 0, marginRight: 0 }}
                    />

                    {analysis.metadata.contains_pii && (
                      <TextField
                        label="PII types"
                        placeholder="e.g., Names, Email addresses, Phone numbers"
                        size="small"
                        value={analysis.metadata.pii_types}
                        onChange={(e) => onUpdateMetadata(index, { pii_types: e.target.value })}
                        helperText="Comma-separated column names containing PII"
                        fullWidth
                      />
                    )}
                  </Stack>
                </>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
