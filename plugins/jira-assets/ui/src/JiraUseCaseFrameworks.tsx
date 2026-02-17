/**
 * Frameworks tab for JIRA-imported use cases
 * Shows installed frameworks or "No frameworks" state
 * Uses the project.framework array that's already loaded
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

interface ProjectFramework {
  project_framework_id: number;
  framework_id: number;
  name: string;
}

interface Framework {
  id: number;
  name: string;
  description?: string;
}

interface ApiServices {
  get: <T>(endpoint: string, params?: Record<string, any>) => Promise<{ data: T; status: number }>;
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
  const [error, setError] = useState<string | null>(null);

  // Get installed frameworks from project data
  const installedFrameworks = project.framework || [];

  useEffect(() => {
    fetchAvailableFrameworks();
  }, []);

  const fetchAvailableFrameworks = async () => {
    setLoading(true);
    setError(null);
    try {
      if (apiServices) {
        // Use authenticated apiServices from parent app
        const response = await apiServices.get<{ data?: Framework[] } | Framework[]>('/frameworks');
        const data = response.data;
        setAvailableFrameworks((data as any).data || data || []);
      } else {
        // Fallback - shouldn't happen but just in case
        setAvailableFrameworks([]);
      }
    } catch (err: any) {
      // Don't show error for frameworks - it's optional info
      console.warn("Could not load available frameworks:", err.message);
      setAvailableFrameworks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewControls = (frameworkId: number, frameworkName: string) => {
    // Navigate to the framework controls page
    const frameworkSlug = frameworkName.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `/project-view?projectId=${project.id}&tab=frameworks&framework=${frameworkSlug}`;
  };

  const handleAddFramework = () => {
    // Navigate to project settings where frameworks can be added
    window.location.href = `/project-view?projectId=${project.id}&tab=settings`;
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
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleViewControls(pf.framework_id, pf.name)}
                >
                  View Controls
                </Button>
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
            <Button
              variant="outlined"
              startIcon={<Plus size={16} />}
              onClick={handleAddFramework}
              sx={{ textTransform: "none" }}
            >
              Add Framework
            </Button>
          </>
        )}
      </Box>
    );
  }

  // No frameworks installed - show empty state
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

        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={handleAddFramework}
          sx={{
            mt: 2,
            textTransform: "none",
            backgroundColor: "#13715B",
            "&:hover": { backgroundColor: "#0f5a47" },
          }}
        >
          Add Framework
        </Button>

        {availableFrameworks.length > 0 && (
          <Typography sx={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
            {availableFrameworks.length} framework{availableFrameworks.length !== 1 ? 's' : ''} available: {availableFrameworks.map(f => f.name).join(', ')}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default JiraUseCaseFrameworks;
