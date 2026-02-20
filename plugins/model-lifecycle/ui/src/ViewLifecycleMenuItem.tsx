/**
 * ViewLifecycleMenuItem - Menu item for model row actions
 *
 * Injected into the gear dropdown menu for model rows.
 * Navigates to the model lifecycle detail page.
 */

import React from "react";
import { MenuItem } from "@mui/material";
import { GitBranch } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ViewLifecycleMenuItemProps {
  entityId: number | string;
  closeMenu?: (e: React.SyntheticEvent) => void;
}

const ViewLifecycleMenuItem: React.FC<ViewLifecycleMenuItemProps> = ({
  entityId,
  closeMenu,
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/model-inventory/models/${entityId}`);
    if (closeMenu) {
      closeMenu(e);
    }
  };

  return (
    <MenuItem
      onClick={handleClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <GitBranch size={16} />
      View Lifecycle
    </MenuItem>
  );
};

export default ViewLifecycleMenuItem;
