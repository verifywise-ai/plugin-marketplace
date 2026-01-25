/**
 * Azure AI Foundry Plugin for VerifyWise
 *
 * This plugin provides Azure AI Foundry integration for importing and managing
 * AI model deployments from Microsoft Azure.
 */

// ========== TYPE DEFINITIONS ==========

interface PluginContext {
  sequelize: any;
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

interface SyncResult {
  success: boolean;
  modelCount: number;
  syncedAt: string;
  status: string;
}

interface AzureAIFoundryConfig {
  project_endpoint?: string;
  api_key?: string;
  subscription_id?: string;
  resource_group?: string;
  resource_name?: string;
}

// Response from Azure AI Foundry Project API (v1)
interface AzureProjectDeployment {
  name: string;
  type: string;
  modelName: string;
  modelVersion: string;
  modelPublisher: string;
  capabilities: Record<string, string>;
  sku: {
    name: string;
    capacity: number;
  };
}

// Response from Azure Resource Manager API (Cognitive Services)
interface AzureARMDeployment {
  name: string;
  properties: {
    model: {
      format: string;
      name: string;
      version: string;
    };
    provisioningState: string;
    capabilities: Record<string, string>;
    rateLimits?: Array<{
      key: string;
      count: number;
      renewalPeriod: number;
    }>;
    raiPolicyName?: string;
  };
  sku: {
    name: string;
    capacity: number;
  };
  systemData?: {
    createdAt: string;
    createdBy: string;
    lastModifiedAt: string;
  };
}

// ========== PLUGIN LIFECYCLE METHODS ==========

/**
 * Install the Azure AI Foundry plugin
 * Creates azure_ai_model_records table
 */
export async function install(
  _userId: number,
  tenantId: string,
  config: AzureAIFoundryConfig,
  context: PluginContext
): Promise<InstallResult> {
  try {
    const { sequelize } = context;

    // Create azure_ai_model_records table for storing synced models
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${tenantId}".azure_ai_model_records (
        id SERIAL PRIMARY KEY,
        deployment_name VARCHAR(255) NOT NULL,
        model_name VARCHAR(255) NOT NULL,
        model_format VARCHAR(255),
        model_version VARCHAR(255),
        provisioning_state VARCHAR(255),
        sku_name VARCHAR(255),
        sku_capacity INTEGER,
        capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
        rate_limits JSONB NOT NULL DEFAULT '[]'::jsonb,
        rai_policy_name VARCHAR(255),
        created_by VARCHAR(255),
        azure_created_at TIMESTAMP,
        azure_modified_at TIMESTAMP,
        last_synced_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT azure_ai_model_records_deployment_unique UNIQUE (deployment_name)
      )
    `);

    // Test connection and perform initial sync if config provided
    if (config && config.project_endpoint && config.api_key) {
      const testResult = await testConnection(config);
      if (!testResult.success) {
        throw new Error(`Initial connection test failed: ${testResult.message}`);
      }

      const syncResult = await syncModels(tenantId, config, context);
      if (!syncResult.success) {
        throw new Error(`Initial sync failed: ${syncResult.status}`);
      }

      return {
        success: true,
        message: `Azure AI Foundry plugin installed successfully. Synced ${syncResult.modelCount} model deployments.`,
        installedAt: new Date().toISOString(),
      };
    }

    return {
      success: true,
      message: "Azure AI Foundry plugin installed successfully. Configure your project endpoint and API key to start syncing models.",
      installedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Installation failed: ${error.message}`);
  }
}

/**
 * Uninstall the Azure AI Foundry plugin
 * Drops azure_ai_model_records table
 */
export async function uninstall(
  _userId: number,
  tenantId: string,
  context: PluginContext
): Promise<UninstallResult> {
  try {
    const { sequelize } = context;

    // Count records before deletion
    const modelsCount: any = await sequelize.query(
      `SELECT COUNT(*) as count FROM "${tenantId}".azure_ai_model_records`
    );

    const totalRecords = parseInt(modelsCount[0][0].count);

    // Drop azure_ai_model_records table
    await sequelize.query(`DROP TABLE IF EXISTS "${tenantId}".azure_ai_model_records CASCADE`);

    return {
      success: true,
      message: `Azure AI Foundry plugin uninstalled successfully. Removed ${totalRecords} model records.`,
      uninstalledAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Uninstallation failed: ${error.message}`);
  }
}

/**
 * Configure the Azure AI Foundry plugin
 * Called when a user saves plugin configuration
 */
export async function configure(
  _userId: number,
  tenantId: string,
  config: AzureAIFoundryConfig,
  context: PluginContext
): Promise<ConfigureResult> {
  try {
    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }

    // Test connection with new configuration
    const testResult = await testConnection(config);
    if (!testResult.success) {
      throw new Error(`Connection test failed: ${testResult.message}`);
    }

    // Trigger sync with the new configuration
    const syncResult = await syncModels(tenantId, config, context);
    if (!syncResult.success) {
      throw new Error(`Sync failed: ${syncResult.status}`);
    }

    return {
      success: true,
      message: `Azure AI Foundry plugin configured successfully. Synced ${syncResult.modelCount} model deployments.`,
      configuredAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Configuration failed: ${error.message}`);
  }
}

// ========== VALIDATION METHODS ==========

/**
 * Validate plugin configuration
 */
export function validateConfig(config: AzureAIFoundryConfig): ValidationResult {
  const errors: string[] = [];

  if (!config) {
    errors.push("Configuration is required");
    return { valid: false, errors };
  }

  // Required: Project endpoint
  if (!config.project_endpoint) {
    errors.push("Project endpoint is required");
  } else {
    // Validate URL format
    try {
      new URL(config.project_endpoint);
    } catch {
      errors.push("Project endpoint must be a valid URL");
    }
  }

  // Required: API key
  if (!config.api_key) {
    errors.push("API key is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ========== INTEGRATION METHODS ==========

/**
 * Test connection to Azure AI Foundry
 */
export async function testConnection(
  config: AzureAIFoundryConfig
): Promise<TestConnectionResult> {
  try {
    if (!config.project_endpoint || !config.api_key) {
      throw new Error("Project endpoint and API key are required");
    }

    // Remove trailing slash and /api/projects/* path if present to get base endpoint
    const baseEndpoint = config.project_endpoint.replace(/\/+$/, "");
    const url = `${baseEndpoint}/deployments?api-version=v1`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "api-key": config.api_key,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText || 'No error details provided'}`);
    }

    await response.json();

    return {
      success: true,
      message: "Successfully connected to Azure AI Foundry",
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

/**
 * Get models from the local database
 * Called via the generic execute endpoint
 */
export async function getModels(
  tenantId: string,
  _config: AzureAIFoundryConfig,
  context: PluginContext
): Promise<{ configured: boolean; models: any[] }> {
  try {
    const { sequelize } = context;

    // Query azure_ai_model_records table
    const models = await sequelize.query(
      `SELECT * FROM "${tenantId}".azure_ai_model_records ORDER BY created_at DESC`,
      {
        type: "SELECT",
      }
    );

    return {
      configured: true,
      models: models || [],
    };
  } catch (error: any) {
    // If table doesn't exist, plugin is not configured
    if (error.message?.includes("does not exist")) {
      return {
        configured: false,
        models: [],
      };
    }
    throw error;
  }
}

/**
 * Sync models from Azure AI Foundry
 * Uses the Project Deployments API
 */
export async function syncModels(
  tenantId: string,
  config: AzureAIFoundryConfig,
  context: PluginContext
): Promise<SyncResult> {
  try {
    if (!config.project_endpoint || !config.api_key) {
      throw new Error("Project endpoint and API key are required");
    }

    const { sequelize } = context;

    // Use the project deployments API
    const baseEndpoint = config.project_endpoint.replace(/\/+$/, "");
    const url = `${baseEndpoint}/deployments?api-version=v1`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "api-key": config.api_key,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch deployments: ${response.status}`);
    }

    const data = await response.json();
    const deployments: AzureProjectDeployment[] = data.value || [];

    if (!deployments.length) {
      // No deployments found - this is not an error, just empty
      return {
        success: true,
        modelCount: 0,
        syncedAt: new Date().toISOString(),
        status: "success - no deployments found",
      };
    }

    // Transform and persist deployments
    await persistProjectDeployments(deployments, tenantId, sequelize);

    return {
      success: true,
      modelCount: deployments.length,
      syncedAt: new Date().toISOString(),
      status: "success",
    };
  } catch (error: any) {
    return {
      success: false,
      modelCount: 0,
      syncedAt: new Date().toISOString(),
      status: `failed: ${error.message}`,
    };
  }
}

/**
 * Sync models using Azure Resource Manager API (requires subscription details)
 * This is used when subscription_id, resource_group, and resource_name are provided
 */
export async function syncModelsViaARM(
  tenantId: string,
  config: AzureAIFoundryConfig,
  accessToken: string,
  context: PluginContext
): Promise<SyncResult> {
  try {
    if (!config.subscription_id || !config.resource_group || !config.resource_name) {
      throw new Error("Subscription ID, resource group, and resource name are required for ARM API");
    }

    const { sequelize } = context;

    const url = `https://management.azure.com/subscriptions/${config.subscription_id}/resourceGroups/${config.resource_group}/providers/Microsoft.CognitiveServices/accounts/${config.resource_name}/deployments?api-version=2023-05-01`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch deployments: ${response.status}`);
    }

    const data = await response.json();
    const deployments: AzureARMDeployment[] = data.value || [];

    if (!deployments.length) {
      return {
        success: true,
        modelCount: 0,
        syncedAt: new Date().toISOString(),
        status: "success - no deployments found",
      };
    }

    // Transform and persist deployments
    await persistARMDeployments(deployments, tenantId, sequelize);

    return {
      success: true,
      modelCount: deployments.length,
      syncedAt: new Date().toISOString(),
      status: "success",
    };
  } catch (error: any) {
    return {
      success: false,
      modelCount: 0,
      syncedAt: new Date().toISOString(),
      status: `failed: ${error.message}`,
    };
  }
}

// ========== HELPER FUNCTIONS ==========

/**
 * Persist model records from Project API to database
 */
async function persistProjectDeployments(
  deployments: AzureProjectDeployment[],
  tenantId: string,
  sequelize: any
): Promise<void> {
  if (!deployments.length) {
    return;
  }

  const now = new Date();
  const records = deployments.map((deployment) => ({
    deployment_name: deployment.name,
    model_name: deployment.modelName || deployment.name,
    model_format: deployment.modelPublisher || null,
    model_version: deployment.modelVersion || null,
    provisioning_state: "Succeeded", // Project API only returns successful deployments
    sku_name: deployment.sku?.name || null,
    sku_capacity: deployment.sku?.capacity || null,
    capabilities: deployment.capabilities || {},
    rate_limits: [],
    rai_policy_name: null,
    created_by: null,
    azure_created_at: null,
    azure_modified_at: null,
    last_synced_at: now,
  }));

  const keys = Object.keys(records[0]);
  const placeholders = records.map((_, index) => {
    const valuePlaceholders = keys.map((key) => `:${key}_${index}`).join(", ");
    return `(${valuePlaceholders})`;
  });

  const replacements: Record<string, any> = {};
  records.forEach((record, index) => {
    keys.forEach((key) => {
      const value = (record as any)[key];
      // Serialize JSONB fields
      if (key === 'capabilities' || key === 'rate_limits') {
        replacements[`${key}_${index}`] = JSON.stringify(value);
      } else {
        replacements[`${key}_${index}`] = value;
      }
    });
  });

  const updateColumns = keys.filter((k) => k !== "deployment_name");

  await sequelize.query(
    `INSERT INTO "${tenantId}".azure_ai_model_records (${keys.join(", ")})
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (deployment_name) DO UPDATE
     SET ${updateColumns.map((k) => `${k} = EXCLUDED.${k}`).join(", ")}`,
    { replacements }
  );
}

/**
 * Persist model records from ARM API to database
 */
async function persistARMDeployments(
  deployments: AzureARMDeployment[],
  tenantId: string,
  sequelize: any
): Promise<void> {
  if (!deployments.length) {
    return;
  }

  const now = new Date();
  const records = deployments.map((deployment) => ({
    deployment_name: deployment.name,
    model_name: deployment.properties?.model?.name || deployment.name,
    model_format: deployment.properties?.model?.format || null,
    model_version: deployment.properties?.model?.version || null,
    provisioning_state: deployment.properties?.provisioningState || null,
    sku_name: deployment.sku?.name || null,
    sku_capacity: deployment.sku?.capacity || null,
    capabilities: deployment.properties?.capabilities || {},
    rate_limits: deployment.properties?.rateLimits || [],
    rai_policy_name: deployment.properties?.raiPolicyName || null,
    created_by: deployment.systemData?.createdBy || null,
    azure_created_at: deployment.systemData?.createdAt ? new Date(deployment.systemData.createdAt) : null,
    azure_modified_at: deployment.systemData?.lastModifiedAt ? new Date(deployment.systemData.lastModifiedAt) : null,
    last_synced_at: now,
  }));

  const keys = Object.keys(records[0]);
  const placeholders = records.map((_, index) => {
    const valuePlaceholders = keys.map((key) => `:${key}_${index}`).join(", ");
    return `(${valuePlaceholders})`;
  });

  const replacements: Record<string, any> = {};
  records.forEach((record, index) => {
    keys.forEach((key) => {
      const value = (record as any)[key];
      // Serialize JSONB fields
      if (key === 'capabilities' || key === 'rate_limits') {
        replacements[`${key}_${index}`] = JSON.stringify(value);
      } else {
        replacements[`${key}_${index}`] = value;
      }
    });
  });

  const updateColumns = keys.filter((k) => k !== "deployment_name");

  await sequelize.query(
    `INSERT INTO "${tenantId}".azure_ai_model_records (${keys.join(", ")})
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (deployment_name) DO UPDATE
     SET ${updateColumns.map((k) => `${k} = EXCLUDED.${k}`).join(", ")}`,
    { replacements }
  );
}

// ========== PLUGIN METADATA ==========

export const metadata: PluginMetadata = {
  name: "Azure AI Foundry",
  version: "1.0.0",
  author: "VerifyWise",
  description: "Azure AI Foundry integration for AI model management",
};
