import React from "react";
import { Button } from "@mui/material";
import { Upload } from "lucide-react";

interface BulkUploadButtonProps {
  onTriggerModal?: (componentName: string) => void;
}

export default function BulkUploadButton({
  onTriggerModal,
}: BulkUploadButtonProps) {
  return (
    <Button
      variant="outlined"
      sx={{
        borderColor: "#13715B",
        color: "#13715B",
        gap: "8px",
        textTransform: "none",
        "&:hover": { borderColor: "#0e5a48", backgroundColor: "#f0faf7" },
      }}
      onClick={() => onTriggerModal?.("BulkUploadButton")}
    >
      <Upload size={16} />
      Bulk Upload
    </Button>
  );
}
