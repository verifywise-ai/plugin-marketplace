import React from "react";
import { Box, Typography } from "@mui/material";
import { FileSpreadsheet } from "lucide-react";

interface RiskImportMenuItemProps {
  onTriggerModal?: (componentName: string) => void;
  onOpenImportModal?: () => void;
  onMenuClose?: () => void;
}

export const RiskImportMenuItem: React.FC<RiskImportMenuItemProps> = ({
  onTriggerModal,
  onOpenImportModal,
  onMenuClose,
}) => {
  const handleClick = () => {
    // Close the menu first
    if (onMenuClose) {
      onMenuClose();
    }
    // Open the import modal (prefer direct callback over trigger system)
    if (onOpenImportModal) {
      onOpenImportModal();
    } else if (onTriggerModal) {
      onTriggerModal("RiskImportModal");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <Box
      role="menuitem"
      tabIndex={0}
      aria-label="Import risks from Excel"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      sx={{
        background: "linear-gradient(135deg, rgba(252, 252, 252, 1) 0%, rgba(248, 248, 248, 1) 100%)",
        borderRadius: "4px",
        padding: "20px 16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 1.5,
        border: "1px solid rgba(0, 0, 0, 0.04)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        minHeight: "140px",
        "&:hover": {
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.06)",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(250, 250, 250, 1) 100%)",
        },
        "&:active": {
          transform: "scale(0.98)",
        },
        "&:focus": {
          outline: "2px solid #13715B",
          outlineOffset: "2px",
        },
      }}
    >
      <FileSpreadsheet size={24} color="#10b981" />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontSize: "13px",
          color: "rgba(0, 0, 0, 0.85)",
          textAlign: "center",
        }}
      >
        Import from Excel
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontSize: "11px",
          color: "rgba(0, 0, 0, 0.6)",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        Bulk import risks from Excel file
      </Typography>
    </Box>
  );
};

export default RiskImportMenuItem;
