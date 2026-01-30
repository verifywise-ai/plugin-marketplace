/**
 * Frameworks Table Component
 *
 * Reusable table component for displaying custom frameworks.
 * Follows VerifyWise standard table styling patterns from themes/tables.ts
 */

import React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  TablePagination,
} from "@mui/material";
import { Trash2, Eye, Building2, Layers } from "lucide-react";
import { colors } from "./theme";

// VerifyWise standard table styles (matching themes/tables.ts)
const tableStyles = {
  primary: {
    frame: {
      border: "1px solid #d0d5dd",
      borderRadius: "4px",
      boxShadow: "none",
      "& td, & th": {
        border: 0,
      },
    },
    header: {
      row: {
        textTransform: "uppercase" as const,
        borderBottom: "1px solid #d0d5dd",
        background: "linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)",
      },
      cell: {
        color: "#475467",
        fontSize: "13px",
        fontWeight: 400,
        padding: "12px 10px",
        whiteSpace: "nowrap" as const,
      },
    },
    body: {
      row: {
        textTransform: "none" as const,
        borderBottom: "1px solid #d0d5dd",
        backgroundColor: "white",
        transition: "background-color 0.3s ease-in-out",
        "&:last-child": {
          borderBottom: "none",
        },
        "&:hover td": {
          backgroundColor: "#f5f5f5",
        },
        "&:hover": {
          cursor: "pointer",
        },
      },
      cell: {
        fontSize: "13px",
        padding: "12px 10px",
        color: "#344054",
      },
    },
  },
  pagination: {
    fontSize: "12px",
    color: "#475467",
    borderTop: "1px solid #d0d5dd",
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
      fontSize: "12px",
      color: "#475467",
    },
    "& .MuiTablePagination-select": {
      fontSize: "12px",
    },
  },
};

interface CustomFramework {
  id: number;
  framework_id?: number; // Only present in project-framework associations
  name: string;
  description: string;
  hierarchy_type: string;
  level_1_name: string;
  level_2_name: string;
  level_3_name?: string;
  is_organizational: boolean;
  created_at: string;
  level1_count?: number;
  level2_count?: number;
  level3_count?: number;
}

interface FrameworksTableProps {
  frameworks: CustomFramework[];
  onViewDetails: (framework: CustomFramework) => void;
  onDelete: (framework: CustomFramework) => void;
  showPagination?: boolean;
  rowsPerPageOptions?: number[];
}

export const FrameworksTable: React.FC<FrameworksTableProps> = ({
  frameworks,
  onViewDetails,
  onDelete,
  showPagination = true,
  rowsPerPageOptions = [5, 10, 25],
}) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const displayedFrameworks = showPagination
    ? frameworks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : frameworks;

  return (
    <TableContainer component={Paper} sx={tableStyles.primary.frame}>
      <Table>
        <TableHead sx={{ background: tableStyles.primary.header.row.background }}>
          <TableRow sx={tableStyles.primary.header.row}>
            <TableCell sx={tableStyles.primary.header.cell}>Framework</TableCell>
            <TableCell sx={tableStyles.primary.header.cell}>Type</TableCell>
            <TableCell sx={tableStyles.primary.header.cell}>Hierarchy</TableCell>
            <TableCell sx={tableStyles.primary.header.cell}>Structure</TableCell>
            <TableCell sx={tableStyles.primary.header.cell}>Created</TableCell>
            <TableCell sx={{ ...tableStyles.primary.header.cell, textAlign: "right", minWidth: "60px" }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedFrameworks.map((fw) => (
            <TableRow key={fw.id} sx={tableStyles.primary.body.row}>
              {/* Framework Name & Description */}
              <TableCell sx={tableStyles.primary.body.cell}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#101828",
                      lineHeight: 1.4,
                    }}
                  >
                    {fw.name}
                  </Typography>
                  {fw.description && (
                    <Typography
                      sx={{
                        fontSize: "12px",
                        color: "#667085",
                        mt: 0.25,
                        lineHeight: 1.4,
                      }}
                    >
                      {fw.description.length > 60
                        ? `${fw.description.substring(0, 60)}...`
                        : fw.description}
                    </Typography>
                  )}
                </Box>
              </TableCell>

              {/* Type (Organizational/Project) */}
              <TableCell sx={tableStyles.primary.body.cell}>
                <Chip
                  icon={<Building2 size={12} />}
                  label={fw.is_organizational ? "Organizational" : "Project"}
                  size="small"
                  sx={{
                    fontSize: "11px",
                    fontWeight: 500,
                    height: 24,
                    backgroundColor: fw.is_organizational ? "#ECFDF3" : "#F2F4F7",
                    color: fw.is_organizational ? "#027A48" : "#344054",
                    border: fw.is_organizational
                      ? "1px solid #A6F4C5"
                      : "1px solid #E4E7EC",
                    "& .MuiChip-icon": {
                      color: fw.is_organizational ? "#027A48" : "#667085",
                    },
                  }}
                />
              </TableCell>

              {/* Hierarchy */}
              <TableCell sx={tableStyles.primary.body.cell}>
                <Chip
                  icon={<Layers size={12} />}
                  label={fw.hierarchy_type === "three_level" ? "3 Levels" : "2 Levels"}
                  size="small"
                  sx={{
                    fontSize: "11px",
                    fontWeight: 500,
                    height: 24,
                    backgroundColor: "#F2F4F7",
                    color: "#344054",
                    border: "1px solid #E4E7EC",
                    "& .MuiChip-icon": { color: "#667085" },
                  }}
                />
              </TableCell>

              {/* Structure */}
              <TableCell sx={tableStyles.primary.body.cell}>
                <Typography sx={{ fontSize: "13px", color: "#344054" }}>
                  {fw.level1_count || 0} {fw.level_1_name}s, {fw.level2_count || 0}{" "}
                  {fw.level_2_name}s
                  {fw.hierarchy_type === "three_level" && fw.level3_count
                    ? `, ${fw.level3_count} ${fw.level_3_name}s`
                    : ""}
                </Typography>
              </TableCell>

              {/* Created Date */}
              <TableCell sx={tableStyles.primary.body.cell}>
                <Typography sx={{ fontSize: "13px", color: "#344054" }}>
                  {new Date(fw.created_at).toLocaleDateString()}
                </Typography>
              </TableCell>

              {/* Actions */}
              <TableCell sx={{ ...tableStyles.primary.body.cell, textAlign: "right" }}>
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(fw);
                      }}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "4px",
                        "&:hover": { backgroundColor: "#F2F4F7" },
                      }}
                    >
                      <Eye size={14} color="#667085" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(fw);
                      }}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "4px",
                        "&:hover": {
                          backgroundColor: "#FEF3F2",
                          "& svg": { color: colors.error },
                        },
                      }}
                    >
                      <Trash2 size={14} color="#667085" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {showPagination && frameworks.length > rowsPerPageOptions[0] && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={frameworks.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={tableStyles.pagination}
        />
      )}
    </TableContainer>
  );
};

export default FrameworksTable;
