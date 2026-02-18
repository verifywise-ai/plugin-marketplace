/**
 * Azure AI Agents Plugin for VerifyWise
 *
 * Discovers AI agents (assistants) from Azure AI Foundry Agent Service
 * and returns them as AgentPrimitive objects for the Agent Discovery sync service.
 */

// ========== TYPE DEFINITIONS ==========

interface PluginContext {
  sequelize: any;
}

interface PluginRouteContext {
  tenantId: string;
  userId: number;
  organizationId: number;
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
  sequelize: any;
  configuration: Record<string, any>;
}

interface PluginRouteResponse {
  status?: number;
  data?: any;
  buffer?: any;
  filename?: string;
  contentType?: string;
  headers?: Record<string, string>;
}

interface PluginMetadata {
  name: string;
  version: string;
  author: string;
  description: string;
}

interface InstallResult {
  success: boolean;
  message: string;
  installedAt: string;
}

interface UninstallResult {
  success: boolean;
  message: string;
  uninstalledAt: string;
}

interface ConfigureResult {
  success: boolean;
  message: string;
  configuredAt: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  testedAt: string;
}

// ========== AZURE-SPECIFIC TYPES ==========

interface AzureAIAgentsConfig {
  project_endpoint?: string;
  api_key?: string;
  bearer_token?: string;
}

interface AzureAssistant {
  id: string;
  object: string;
  created_at: number;
  name: string | null;
  description: string | null;
  model: string;
  instructions: string | null;
  tools: Array<{ type: string; [key: string]: any }>;
  tool_resources: Record<string, any> | null;
  metadata: Record<string, any> | null;
  temperature: number | null;
  top_p: number | null;
}

interface AzureAssistantListResponse {
  object: string;
  data: AzureAssistant[];
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
}

interface AgentPrimitiveOutput {
  external_id: string;
  display_name: string;
  source_system: string;
  primitive_type: string;
  owner_id: string | null;
  permissions: string[];
  last_activity: string | null;
  metadata: Record<string, any>;
}

// ========== PERMISSION MAPPING ==========

const TOOL_PERMISSION_MAP: Record<string, string[]> = {
  code_interpreter: ["code:write", "ai:invoke"],
  file_search: ["data:read"],
  function: ["ai:invoke"],
  bing_grounding: ["data:read"],
  azure_ai_search: ["data:read"],
  microsoft_fabric: ["data:read", "data:write"],
  sharepoint_grounding: ["data:read"],
};

function mapToolsToPermissions(
  tools: Array<{ type: string; [key: string]: any }>
): string[] {
  const permissions = new Set<string>(["ai:invoke"]);

  for (const tool of tools) {
    const mapped = TOOL_PERMISSION_MAP[tool.type];
    if (mapped) {
      for (const perm of mapped) {
        permissions.add(perm);
      }
    }
  }

  return Array.from(permissions);
}

// ========== AZURE API INTEGRATION ==========

function buildAuthHeaders(config: AzureAIAgentsConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.api_key) {
    headers["api-key"] = config.api_key;
  } else if (config.bearer_token) {
    headers["Authorization"] = `Bearer ${config.bearer_token}`;
  }

  return headers;
}

async function fetchAllAssistants(
  config: AzureAIAgentsConfig
): Promise<AzureAssistant[]> {
  const baseEndpoint = config.project_endpoint!.replace(/\/+$/, "");
  const headers = buildAuthHeaders(config);
  const allAssistants: AzureAssistant[] = [];
  let after: string | undefined;
  let previousAfter: string | undefined;
  const MAX_AGENTS = 10_000;

  do {
    let url = `${baseEndpoint}/assistants?api-version=v1&limit=100&order=desc`;
    if (after) {
      url += `&after=${encodeURIComponent(after)}`;
    }

    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Azure API returned ${response.status}: ${errorText || "No error details"}`
      );
    }

    const body: AzureAssistantListResponse = await response.json();
    const assistants = body.data || [];
    allAssistants.push(...assistants);

    if (allAssistants.length >= MAX_AGENTS) {
      break;
    }

    if (body.has_more && body.last_id) {
      // Guard against infinite loop if the API returns the same cursor twice
      if (body.last_id === previousAfter) {
        break;
      }
      previousAfter = after;
      after = body.last_id;
    } else {
      break;
    }
  } while (true);

  return allAssistants.slice(0, MAX_AGENTS);
}

// ========== MAPPING ==========

function mapAssistantToAgentPrimitive(
  assistant: AzureAssistant
): AgentPrimitiveOutput {
  const tools = assistant.tools || [];
  const instructions = assistant.instructions || "";

  return {
    external_id: assistant.id,
    display_name:
      assistant.name || `Unnamed agent (${assistant.id})`,
    source_system: "azure-ai-agents",
    primitive_type: "assistant",
    owner_id: null,
    permissions: mapToolsToPermissions(tools),
    last_activity: assistant.created_at
      ? new Date(assistant.created_at * 1000).toISOString()
      : null,
    metadata: {
      model: assistant.model,
      description: assistant.description || null,
      instructions_preview: instructions.slice(0, 500) || null,
      tools: tools.map((t) => t.type),
      temperature: assistant.temperature,
      top_p: assistant.top_p,
      azure_metadata: assistant.metadata || {},
    },
  };
}

// ========== PLUGIN LIFECYCLE METHODS ==========

export async function install(
  _userId: number,
  _tenantId: string,
  config: AzureAIAgentsConfig,
  _context: PluginContext
): Promise<InstallResult> {
  try {
    if (config && config.project_endpoint && (config.api_key || config.bearer_token)) {
      const testResult = await testConnection(config);
      if (!testResult.success) {
        throw new Error(`Initial connection test failed: ${testResult.message}`);
      }

      return {
        success: true,
        message:
          "Azure AI Agents plugin installed and connected successfully. Agents will be discovered on the next sync.",
        installedAt: new Date().toISOString(),
      };
    }

    return {
      success: true,
      message:
        "Azure AI Agents plugin installed successfully. Configure your project endpoint and credentials to start discovering agents.",
      installedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Installation failed: ${error.message}`);
  }
}

export async function uninstall(
  _userId: number,
  _tenantId: string,
  _context: PluginContext
): Promise<UninstallResult> {
  return {
    success: true,
    message:
      "Azure AI Agents plugin uninstalled. Previously discovered agents remain in the agent inventory.",
    uninstalledAt: new Date().toISOString(),
  };
}

export async function configure(
  _userId: number,
  _tenantId: string,
  config: AzureAIAgentsConfig,
  _context: PluginContext
): Promise<ConfigureResult> {
  try {
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }

    const testResult = await testConnection(config);
    if (!testResult.success) {
      throw new Error(`Connection test failed: ${testResult.message}`);
    }

    return {
      success: true,
      message: "Azure AI Agents plugin configured successfully.",
      configuredAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Configuration failed: ${error.message}`);
  }
}

// ========== VALIDATION ==========

export function validateConfig(
  config: AzureAIAgentsConfig
): ValidationResult {
  const errors: string[] = [];

  if (!config) {
    errors.push("Configuration is required");
    return { valid: false, errors };
  }

  if (!config.project_endpoint) {
    errors.push("Project endpoint is required");
  } else {
    try {
      new URL(config.project_endpoint);
    } catch {
      errors.push("Project endpoint must be a valid URL");
    }
  }

  if (!config.api_key && !config.bearer_token) {
    errors.push("Either API key or bearer token is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ========== CONNECTION TEST ==========

export async function testConnection(
  config: AzureAIAgentsConfig,
  _context?: { sequelize: any; userId: number; tenantId: string }
): Promise<TestConnectionResult> {
  try {
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(validation.errors.join(", "));
    }

    const baseEndpoint = config.project_endpoint!.replace(/\/+$/, "");
    const url = `${baseEndpoint}/assistants?api-version=v1&limit=1`;
    const headers = buildAuthHeaders(config);

    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Server returned ${response.status}: ${errorText || "No error details"}`
      );
    }

    const body: AzureAssistantListResponse = await response.json();
    const count = body.data?.length ?? 0;
    const hasMore = body.has_more ? " (more available)" : "";

    return {
      success: true,
      message: `Connected to Azure AI Agents. Found ${count} assistant${count !== 1 ? "s" : ""}${hasMore}.`,
      testedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      testedAt: new Date().toISOString(),
    };
  }
}

// ========== ROUTE HANDLER ==========

async function handleDiscover(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const config = ctx.configuration as AzureAIAgentsConfig;

  if (
    !config ||
    !config.project_endpoint ||
    (!config.api_key && !config.bearer_token)
  ) {
    return {
      status: 400,
      data: {
        success: false,
        message:
          "Azure AI Agents plugin is not configured. Set a project endpoint and API key or bearer token.",
      },
    };
  }

  // Let Azure API errors propagate — the sync service catches thrown errors
  // and records them as failed syncs with the error message.
  const assistants = await fetchAllAssistants(config);
  const primitives = assistants.map(mapAssistantToAgentPrimitive);

  return {
    status: 200,
    data: primitives,
  };
}

// ========== PLUGIN ROUTER ==========

export const router: Record<
  string,
  (ctx: PluginRouteContext) => Promise<PluginRouteResponse>
> = {
  "GET /discover": handleDiscover,
};

// ========== PLUGIN METADATA ==========

export const metadata: PluginMetadata = {
  name: "Azure AI Agents",
  version: "1.0.0",
  author: "VerifyWise",
  description: "Discover AI agents from Azure AI Foundry Agent Service",
};
