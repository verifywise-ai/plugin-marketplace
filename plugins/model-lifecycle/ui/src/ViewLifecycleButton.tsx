/**
 * ViewLifecycleButton - Icon button that navigates to model lifecycle detail page
 * Renders beside the gear icon in model inventory table
 */

import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ViewLifecycleButtonProps {
  modelId: number;
  modelName?: string;
}

const ViewLifecycleButton: React.FC<ViewLifecycleButtonProps> = ({
  modelId,
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/model-inventory/models/${modelId}`);
  };

  return (
    <Tooltip title="View Lifecycle" arrow placement="top">
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          color: "#667085",
          "&:hover": {
            color: "#13715B",
            backgroundColor: "rgba(19, 113, 91, 0.08)",
          },
        }}
      >
        <Layers size={16} />
      </IconButton>
    </Tooltip>
  );
};

export default ViewLifecycleButton;
