import React, { useState } from "react";
import { Button, Box, Typography, Card, CardContent, CardActions } from "@mui/material";
import { Plus, FileJson, Database } from "lucide-react";
import {
  colors,
  textColors,
  fontSizes,
  borderColors,
  bgColors,
  buttonStyles,
} from "./theme";
import { FrameworkImportModal } from "./FrameworkImportModal";

interface FrameworkImportButtonProps {
  onImportComplete?: () => void;
  apiServices?: any;
  variant?: "button" | "card";
}

export const FrameworkImportButton: React.FC<FrameworkImportButtonProps> = ({
  onImportComplete,
  apiServices,
  variant = "button",
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleImportComplete = () => {
    onImportComplete?.();
    setModalOpen(false);
  };

  if (variant === "card") {
    return (
      <>
        <Card
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            border: `2px dashed ${borderColors.default}`,
            bgcolor: bgColors.subtle,
            transition: "all 0.2s",
            cursor: "pointer",
            borderRadius: "8px",
            "&:hover": {
              borderColor: colors.primary,
              bgcolor: "#f0fdf4",
            },
          }}
          onClick={handleOpenModal}
        >
          <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: `${colors.primary}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Plus size={32} color={colors.primary} />
            </Box>
            <Typography sx={{ fontSize: fontSizes.large, fontWeight: 600, color: textColors.primary, mb: 1 }}>
              Import Custom Framework
            </Typography>
            <Typography sx={{ fontSize: fontSizes.medium, color: textColors.muted, textAlign: "center" }}>
              Add your own compliance framework from JSON or Excel
            </Typography>
          </CardContent>
          <CardActions sx={{ justifyContent: "center", pb: 3 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: textColors.muted }}>
                <FileJson size={14} />
                <Typography sx={{ fontSize: fontSizes.small }}>JSON</Typography>
              </Box>
              <Typography sx={{ fontSize: fontSizes.small, color: textColors.muted }}>or</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: textColors.muted }}>
                <Database size={14} />
                <Typography sx={{ fontSize: fontSizes.small }}>Excel</Typography>
              </Box>
            </Box>
          </CardActions>
        </Card>

        <FrameworkImportModal
          open={modalOpen}
          onClose={handleCloseModal}
          onImportComplete={handleImportComplete}
          apiServices={apiServices}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="contained"
        startIcon={<Plus size={18} />}
        onClick={handleOpenModal}
        sx={buttonStyles.primary.contained}
      >
        Import Custom Framework
      </Button>

      <FrameworkImportModal
        open={modalOpen}
        onClose={handleCloseModal}
        onImportComplete={handleImportComplete}
        apiServices={apiServices}
      />
    </>
  );
};
