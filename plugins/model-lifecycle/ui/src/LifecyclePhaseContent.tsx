import React from "react";
import { Stack, Typography, Box } from "@mui/material";
import { LifecyclePhase } from "./useModelLifecycle";
import LifecycleItemField from "./LifecycleItemField";

interface ApiServices {
  get: <T>(endpoint: string) => Promise<{ data: T }>;
  post: <T>(endpoint: string, data?: any, config?: any) => Promise<{ data: T }>;
  put: <T>(endpoint: string, data?: any) => Promise<{ data: T }>;
  delete: <T>(endpoint: string) => Promise<{ data: T }>;
}

interface LifecyclePhaseContentProps {
  phase: LifecyclePhase;
  modelId: number;
  onValueChanged?: () => void;
  apiServices?: ApiServices;
}

export default function LifecyclePhaseContent({
  phase,
  modelId,
  onValueChanged,
  apiServices,
}: LifecyclePhaseContentProps) {
  const items = Array.isArray(phase.items) ? phase.items : [];

  return (
    <Stack sx={{ flex: 1, overflowY: "auto", p: "24px", gap: "16px" }}>
      <Stack sx={{ gap: "4px" }}>
        <Typography sx={{ fontWeight: 600, fontSize: "16px", color: "#344054" }}>
          {phase.name}
        </Typography>
        {phase.description && (
          <Typography sx={{ fontSize: "13px", color: "#667085" }}>
            {phase.description}
          </Typography>
        )}
      </Stack>

      <Box sx={{ borderTop: "1px solid #E0E4E9" }} />

      {items.length > 0 ? (
        <Stack
          spacing={0}
          divider={<Box sx={{ borderTop: "1px solid #E0E4E9" }} />}
        >
          {items.map((item) => (
            <Stack key={item.id} sx={{ py: "16px", gap: "10px" }}>
              <Stack direction="row" alignItems="center" sx={{ gap: "8px" }}>
                <Typography sx={{ fontWeight: 500, color: "#344054", fontSize: "13px" }}>
                  {item.name}
                </Typography>
                {item.is_required && (
                  <Typography sx={{ color: "#F04438", fontSize: "11px" }}>
                    Required
                  </Typography>
                )}
              </Stack>
              {item.description && (
                <Typography sx={{ color: "#667085", display: "block", fontSize: "12px" }}>
                  {item.description}
                </Typography>
              )}
              <LifecycleItemField
                modelId={modelId}
                item={item}
                onValueChanged={onValueChanged}
                apiServices={apiServices}
              />
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography sx={{ textAlign: "center", color: "#667085", py: 4 }}>
          No items configured for this phase
        </Typography>
      )}
    </Stack>
  );
}
