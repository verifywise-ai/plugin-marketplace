/**
 * Custom Framework Controls
 *
 * Renders a combined framework toggle that includes both built-in and custom frameworks.
 * This component takes over the entire Controls tab toggle section when custom frameworks exist.
 * Uses the same styling as the app's ButtonToggle component.
 */

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from "react";
import {
  Box,
  CircularProgress,
  Stack,
} from "@mui/material";
import { CustomFrameworkViewer } from "./CustomFrameworkViewer";
import { colors } from "./theme";

interface CustomFramework {
  id: number;
  framework_id: number;
  name: string;
  description: string;
  hierarchy_type: string;
  level_1_name: string;
  level_2_name: string;
  level_3_name?: string;
  is_organizational: boolean;
}

interface BuiltInFramework {
  id: string;
  name: string;
  description?: string;
}

interface Project {
  id: number;
  project_title: string;
  is_organizational: boolean;
}

interface CustomFrameworkControlsProps {
  project: Project;
  builtInFrameworks: BuiltInFramework[];
  selectedBuiltInFramework: number;
  onBuiltInFrameworkSelect: (index: number) => void;
  renderBuiltInContent: () => React.ReactNode;
  renderHeaderActions?: () => React.ReactNode;
  onRefresh?: () => void;
  children?: React.ReactNode;
  apiServices?: {
    get: (url: string, options?: any) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    patch: (url: string, data?: any) => Promise<any>;
  };
  /** Plugin key for API routing (defaults to 'custom-framework-import') */
  pluginKey?: string;
}

// Styles matching the app's ButtonToggle exactly
const toggleContainerStyle = (height: number) => ({
  position: "relative",
  display: "flex",
  border: "1px solid rgba(0, 0, 0, 0.12)",
  borderRadius: "4px",
  overflow: "hidden",
  height,
  bgcolor: "action.hover",
  width: "fit-content",
  padding: "2px",
  gap: "2px",
});

const toggleTabStyle = {
  cursor: "pointer",
  px: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "text.primary",
  fontSize: "13px",
  fontWeight: 400,
  userSelect: "none",
  width: "fit-content",
  minWidth: "120px",
  position: "relative",
  zIndex: 1,
  transition: "color 0.3s ease",
};

interface SliderPosition {
  left: number;
  width: number;
}

const sliderStyle = (position: SliderPosition) => ({
  position: "absolute",
  top: "2px",
  height: "calc(100% - 4px)",
  bgcolor: "background.paper",
  border: "1px solid rgba(0, 0, 0, 0.08)",
  borderRadius: "4px",
  transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  left: `${position.left}px`,
  width: `${position.width}px`,
  zIndex: 0,
});

export const CustomFrameworkControls: React.FC<CustomFrameworkControlsProps> = ({
  project,
  builtInFrameworks,
  selectedBuiltInFramework,
  onBuiltInFrameworkSelect,
  renderBuiltInContent,
  renderHeaderActions,
  onRefresh,
  children: _children,
  apiServices,
  pluginKey,
}) => {
  const [customFrameworks, setCustomFrameworks] = useState<CustomFramework[]>([]);
  const [selectedCustomFramework, setSelectedCustomFramework] = useState<number | null>(null);
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sliderPosition, setSliderPosition] = useState<SliderPosition>({ left: 2, width: 120 });

  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
  const selectedCustomFrameworkRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    selectedCustomFrameworkRef.current = selectedCustomFramework;
  }, [selectedCustomFramework]);

  // Reset tabRefs when framework counts change
  const totalFrameworkCount = builtInFrameworks.length + customFrameworks.length;
  useEffect(() => {
    tabRefs.current = new Array(totalFrameworkCount).fill(null);
  }, [totalFrameworkCount]);

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

  const api = useMemo(() => apiServices || {
    get: async (url: string) => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, { headers });
      return { data: await response.json(), status: response.status };
    },
    post: async (url: string, body?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      return { data: await response.json(), status: response.status };
    },
    patch: async (url: string, body?: any) => {
      const token = getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api${url}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      return { data: await response.json(), status: response.status };
    },
  }, [apiServices]);

  const loadFrameworks = useCallback(async (forceReload = false) => {
    if (!project?.id) {
      setLoading(false);
      return;
    }

    // Skip if already loaded and not forcing reload
    if (hasLoadedRef.current && !forceReload) {
      return;
    }

    try {
      // Only show loading spinner on initial load
      if (!hasLoadedRef.current) {
        setLoading(true);
      }

      const response = await api.get(
        `/plugins/${pluginKey}/projects/${project.id}/custom-frameworks?is_organizational=${project.is_organizational}`
      );

      let rawData = response.data;
      if (rawData && typeof rawData === "object" && "data" in rawData) {
        rawData = rawData.data;
      }
      if (rawData && typeof rawData === "object" && !Array.isArray(rawData) && "data" in rawData) {
        rawData = rawData.data;
      }

      const frameworksArray = Array.isArray(rawData) ? rawData : [];
      console.log("[CustomFrameworkControls] Loaded custom frameworks:", frameworksArray);

      // If the currently selected custom framework was removed, switch to built-in
      // Use ref to avoid dependency on selectedCustomFramework state
      const currentSelection = selectedCustomFrameworkRef.current;
      if (currentSelection !== null) {
        const stillExists = frameworksArray.some(
          (fw: CustomFramework) => fw.framework_id === currentSelection
        );
        if (!stillExists) {
          console.log("[CustomFrameworkControls] Selected framework was removed, switching to built-in");
          setIsCustomSelected(false);
          setSelectedCustomFramework(null);
        }
      }

      setCustomFrameworks(frameworksArray);
      hasLoadedRef.current = true;
    } catch (err) {
      console.log("[CustomFrameworkControls] Error loading frameworks:", err);
      setCustomFrameworks([]);
    } finally {
      setLoading(false);
    }
  }, [project?.id, api, pluginKey]);

  useEffect(() => {
    loadFrameworks();
  }, [loadFrameworks]);

  // Listen for custom framework changes from CustomFrameworkCards
  useEffect(() => {
    const handleCustomFrameworkChange = (event: CustomEvent) => {
      // Only reload if the event is for this project
      if (event.detail?.projectId === project?.id) {
        console.log("[CustomFrameworkControls] Received custom framework change event, reloading...");
        loadFrameworks(true); // Force reload when frameworks are added/removed
      }
    };

    window.addEventListener("customFrameworkChanged" as any, handleCustomFrameworkChange as EventListener);
    return () => {
      window.removeEventListener("customFrameworkChanged" as any, handleCustomFrameworkChange as EventListener);
    };
  }, [loadFrameworks, project?.id]);

  // Calculate active index for the slider
  const totalOptions = builtInFrameworks.length + customFrameworks.length;
  let activeIndex: number;
  if (isCustomSelected && selectedCustomFramework !== null) {
    const customIndex = customFrameworks.findIndex(
      (fw) => fw.framework_id === selectedCustomFramework
    );
    activeIndex = builtInFrameworks.length + customIndex;
  } else {
    activeIndex = selectedBuiltInFramework;
  }

  // Helper function to update slider position
  const updateSliderPosition = useCallback(() => {
    const activeTab = tabRefs.current[activeIndex];
    const container = containerRef.current;
    if (activeTab && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      setSliderPosition({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeIndex]);

  // Update slider position synchronously after DOM updates
  useLayoutEffect(() => {
    updateSliderPosition();
  }, [updateSliderPosition, customFrameworks.length, builtInFrameworks.length]);

  // Also update with a small delay for cases where refs aren't immediately available
  useEffect(() => {
    const timer = setTimeout(updateSliderPosition, 100);
    return () => clearTimeout(timer);
  }, [updateSliderPosition, customFrameworks.length, builtInFrameworks.length]);

  // Also update on window resize
  useEffect(() => {
    window.addEventListener("resize", updateSliderPosition);
    return () => window.removeEventListener("resize", updateSliderPosition);
  }, [updateSliderPosition]);

  // Auto-select first custom framework when there are no built-in frameworks
  useEffect(() => {
    if (
      builtInFrameworks.length === 0 &&
      customFrameworks.length > 0 &&
      !isCustomSelected
    ) {
      console.log("[CustomFrameworkControls] No built-in frameworks, auto-selecting first custom framework");
      setIsCustomSelected(true);
      setSelectedCustomFramework(customFrameworks[0].framework_id);
    }
  }, [builtInFrameworks.length, customFrameworks, isCustomSelected]);

  const handleBuiltInSelect = (index: number) => {
    setIsCustomSelected(false);
    setSelectedCustomFramework(null);
    onBuiltInFrameworkSelect(index);
  };

  const handleCustomSelect = (frameworkId: number) => {
    setIsCustomSelected(true);
    setSelectedCustomFramework(frameworkId);
  };

  // If still loading, show spinner
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} sx={{ color: colors.primary }} />
      </Box>
    );
  }

  // If no custom frameworks, render built-in toggle + content
  if (customFrameworks.length === 0) {
    return (
      <Stack spacing={3}>
        {/* Header row with toggle and optional actions */}
        {project && builtInFrameworks.length > 0 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            {/* Built-in framework toggle */}
            <Box
              ref={containerRef}
              data-joyride-id="framework-toggle"
              sx={toggleContainerStyle(34)}
            >
              {/* Sliding background */}
              <Box sx={sliderStyle(sliderPosition)} />

              {/* Built-in framework options */}
              {builtInFrameworks.map((framework, index) => (
                <Box
                  key={framework.id}
                  ref={(el: HTMLDivElement | null) => { tabRefs.current[index] = el; }}
                  onClick={() => onBuiltInFrameworkSelect(index)}
                  sx={toggleTabStyle}
                >
                  {framework.name}
                </Box>
              ))}
            </Box>

            {/* Optional header actions (e.g., "Manage frameworks" button) */}
            {renderHeaderActions && renderHeaderActions()}
          </Box>
        )}

        {/* Built-in content */}
        {renderBuiltInContent()}
      </Stack>
    );
  }

  const currentCustomFramework = customFrameworks.find(
    (fw) => fw.framework_id === selectedCustomFramework
  );

  return (
    <Stack spacing={3}>
      {/* Header row with toggle and optional actions */}
      {project && totalOptions > 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {/* Combined framework toggle - matching ButtonToggle styling */}
          <Box
            ref={containerRef}
            data-joyride-id="framework-toggle"
            sx={toggleContainerStyle(34)}
          >
            {/* Sliding background */}
            <Box sx={sliderStyle(sliderPosition)} />

            {/* Built-in framework options */}
            {builtInFrameworks.map((framework, index) => (
              <Box
                key={framework.id}
                ref={(el: HTMLDivElement | null) => { tabRefs.current[index] = el; }}
                onClick={() => handleBuiltInSelect(index)}
                sx={toggleTabStyle}
              >
                {framework.name}
              </Box>
            ))}

            {/* Custom framework options */}
            {customFrameworks.map((framework, index) => (
              <Box
                key={`custom-${framework.framework_id}`}
                ref={(el: HTMLDivElement | null) => { tabRefs.current[builtInFrameworks.length + index] = el; }}
                onClick={() => handleCustomSelect(framework.framework_id)}
                sx={toggleTabStyle}
              >
                {framework.name}
              </Box>
            ))}
          </Box>

          {/* Optional header actions (e.g., "Manage frameworks" button) */}
          {renderHeaderActions && renderHeaderActions()}
        </Box>
      )}

      {/* Content area */}
      {isCustomSelected && selectedCustomFramework && currentCustomFramework ? (
        <CustomFrameworkViewer
          key={`custom-framework-${selectedCustomFramework}`}
          frameworkId={selectedCustomFramework}
          projectId={project.id}
          frameworkName={currentCustomFramework.name}
          apiServices={api}
          onRefresh={() => {
            loadFrameworks();
            onRefresh?.();
          }}
          pluginKey={pluginKey}
        />
      ) : (
        renderBuiltInContent()
      )}
    </Stack>
  );
};

export default CustomFrameworkControls;
