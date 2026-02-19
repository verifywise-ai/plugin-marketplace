/**
 * Frameworks tab for JIRA-imported use cases
 * Shows installed frameworks and allows adding new ones
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Alert,
} from "@mui/material";
import { Plus, FileText, CheckCircle } from "lucide-react";

interface Framework {
  id: number;
  name: string;
  description?: string;
}

interface ProjectFramework {
  project_framework_id: number;
  framework_id: number;
  name: string;
}

interface ApiServices {
  get: <T>(endpoint: string, params?: Record<string, any>) => Promise<{ data: T; status: number }>;
  post: <T>(endpoint: string, data?: any) => Promise<{ data: T; status: number }>;
}

interface JiraUseCaseFrameworksProps {
  project: {
    id: number;
    project_title?: string;
    framework?: ProjectFramework[];
  };
  apiServices?: ApiServices;
}

export const JiraUseCaseFrameworks: React.FC<JiraUseCaseFrameworksProps> = ({ project, apiServices }) => {
  const [loading, setLoading] = useState(true);
  const [availableFrameworks, setAvailableFrameworks] = useState<Framework[]>([]);
  const [installing, setInstalling] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get installed frameworks from project props
  const installedFrameworks = project.framework || [];

  useEffect(() => {
    fetchAvailableFrameworks();
  }, []);

  const fetchAvailableFrameworks = async () => {
    if (!apiServices) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiServices.get<{ data?: Framework[] } | Framework[]>('/frameworks');
      const data = response.data;
      setAvailableFrameworks((data as any).data || data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load frameworks");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFramework = async (frameworkId: number) => {
    if (!apiServices) return;

    setInstalling(frameworkId);
    setError(null);
    try {
      await apiServices.post('/frameworks/toProject', {
        frameworkId,
        projectId: project.id,
      });
      // Reload page to get updated project data
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to add framework");
      setInstalling(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  // If frameworks are installed, show them
  if (installedFrameworks.length > 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontSize: "16px", fontWeight: 600 }}>
          Installed Frameworks
        </Typography>

        <Stack spacing={2}>
          {installedFrameworks.map((pf) => (
            <Card key={pf.project_framework_id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                <CheckCircle size={20} color="#16a34a" />
                <Typography sx={{ flex: 1, fontWeight: 500 }}>
                  {pf.name}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Show available frameworks that aren't installed */}
        {availableFrameworks.filter(f => !installedFrameworks.some(pf => pf.framework_id === f.id)).length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 4, mb: 2, fontSize: "16px", fontWeight: 600 }}>
              Add More Frameworks
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {availableFrameworks
                .filter(f => !installedFrameworks.some(pf => pf.framework_id === f.id))
                .map((framework) => (
                  <Button
                    key={framework.id}
                    variant="outlined"
                    size="small"
                    startIcon={installing === framework.id ? <CircularProgress size={16} /> : <Plus size={16} />}
                    disabled={installing !== null}
                    onClick={() => handleAddFramework(framework.id)}
                    sx={{ textTransform: "none" }}
                  >
                    {framework.name}
                  </Button>
                ))}
            </Stack>
          </>
        )}
      </Box>
    );
  }

  // No frameworks installed - show empty state with add options
  return (
    <Box sx={{ p: 4 }}>
      <Stack alignItems="center" spacing={3}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FileText size={40} color="#9ca3af" />
        </Box>

        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: "#374151", mb: 1 }}>
            No frameworks installed
          </Typography>
          <Typography sx={{ fontSize: 14, color: "#6b7280", maxWidth: 400 }}>
            This use case doesn't have any compliance frameworks yet.
            Add a framework to start tracking controls and assessments.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ width: "100%", maxWidth: 400 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#374151", mb: 2, textAlign: "center" }}>
            Available Frameworks
          </Typography>

          <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1}>
            {availableFrameworks.map((framework) => (
              <Button
                key={framework.id}
                variant="outlined"
                startIcon={installing === framework.id ? <CircularProgress size={16} /> : <Plus size={16} />}
                disabled={installing !== null}
                onClick={() => handleAddFramework(framework.id)}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                {framework.name}
              </Button>
            ))}
          </Stack>

          {availableFrameworks.length === 0 && (
            <Typography sx={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
              No frameworks available.
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default JiraUseCaseFrameworks;
