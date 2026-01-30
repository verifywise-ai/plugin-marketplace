/**
 * Custom Framework Config
 *
 * Main configuration/management panel for the Custom Framework Import plugin.
 * Accessible from Settings > Custom Frameworks
 * Uses VerifyWise design system for consistency
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { RefreshCw, FileJson } from "lucide-react";
import {
  colors,
  textColors,
  fontSizes,
  cardStyles,
  emptyStateStyles,
  borderColors,
  bgColors,
} from "./theme";
import { FrameworksTable } from "./FrameworksTable";
import { FrameworkDetailDrawer } from "./FrameworkDetailDrawer";

interface CustomFramework {
  id: number;
  framework_id?: number;
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

interface CustomFrameworkConfigProps {
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    delete?: (url: string) => Promise<any>;
  };
  pluginEnabled?: boolean;
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
}

export const CustomFrameworkConfig: React.FC<CustomFrameworkConfigProps> = ({
  apiServices,
  pluginEnabled = true,
  pluginKey,
}) => {
  const [frameworks, setFrameworks] = useState<CustomFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailFrameworkId, setDetailFrameworkId] = useState<number | null>(null);

  const handleViewDetails = (framework: CustomFramework) => {
    setDetailFrameworkId(framework.id);
    setDetailDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDetailDrawerOpen(false);
    setDetailFrameworkId(null);
  };

  // Helper to get auth token from localStorage (redux-persist)
  const getAuthToken = (): string | null => {
    try {
      const persistedRoot = localStorage.getItem("persist:root");
      if (persistedRoot) {
        const parsed = JSON.parse(persistedRoot);
        if (parsed.auth) {
          const authState = JSON.parse(parsed.auth);
          return authState.authToken || null;
        }
      }
    } catch {
      // Silently fail
    }
    return null;
  };

  const api = apiServices || {
    get: async (url: string) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, { headers });
      return { data: await response.json(), status: response.status };
    },
  };

  const loadFrameworks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch ALL frameworks from all installed framework plugins
      const response = await api.get(
        `/plugins/${pluginKey}/frameworks?all=true`
      );
      const data = response.data.data || response.data;
      setFrameworks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load frameworks");
    } finally {
      setLoading(false);
    }
  }, [pluginKey]);

  useEffect(() => {
    loadFrameworks();
  }, [loadFrameworks]);

  // Auto-dismiss error messages after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!pluginEnabled) {
    return (
      <Box sx={cardStyles.default}>
        <Alert severity="info" sx={{ border: "none" }}>
          Custom Framework Import plugin is not enabled. Enable it to import
          and manage custom compliance frameworks.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 8 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: fontSizes.large,
              fontWeight: 600,
              color: textColors.primary,
            }}
          >
            Custom Frameworks
          </Typography>
          <Typography
            sx={{
              fontSize: fontSizes.medium,
              color: textColors.muted,
              mt: 0.5,
            }}
          >
            Manage custom compliance frameworks from installed plugins
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            onClick={loadFrameworks}
            disabled={loading}
            sx={{
              border: `1px solid ${borderColors.default}`,
              borderRadius: "4px",
              width: 32,
              height: 32,
              "&:hover": { backgroundColor: bgColors.hover },
            }}
          >
            <RefreshCw size={16} color={textColors.muted} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, fontSize: fontSizes.medium }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Frameworks Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={24} sx={{ color: colors.primary }} />
        </Box>
      ) : frameworks.length === 0 ? (
        <Box sx={{ ...cardStyles.gradient, ...emptyStateStyles.container }}>
          <FileJson
            size={48}
            color={textColors.muted}
            style={{ marginBottom: 16 }}
          />
          <Typography sx={emptyStateStyles.title}>
            No Custom Frameworks
          </Typography>
          <Typography sx={emptyStateStyles.description}>
            Install a framework plugin from the marketplace to get started
          </Typography>
        </Box>
      ) : (
        <FrameworksTable frameworks={frameworks} onViewDetails={handleViewDetails} />
      )}

      {/* Framework Detail Drawer */}
      <FrameworkDetailDrawer
        open={detailDrawerOpen}
        onClose={handleCloseDrawer}
        frameworkId={detailFrameworkId}
        apiServices={apiServices}
        pluginKey={pluginKey}
      />
    </Box>
  );
};
