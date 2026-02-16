/**
 * Jira Assets Integration Plugin for VerifyWise
 *
 * This plugin imports AI Systems from Jira Service Management (JSM) Assets
 * as use-cases in VerifyWise. Supports organizational and non-organizational
 * use-cases with scheduled auto-sync.
 */

// Type declaration for Node.js Buffer global
declare const Buffer: {
  from(str: string, encoding?: string): { toString(encoding?: string): string };
};

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

interface JiraAssetsConfig {
  jira_base_url?: string;
  workspace_id?: string;
  email?: string;
  api_token?: string;
  deployment_type?: "cloud" | "datacenter"; // Cloud vs Data Center/Server
  selected_schema_id?: string;
  selected_object_type_id?: string;
  sync_enabled?: boolean;
  sync_interval_hours?: number;
  attribute_mappings?: Record<string, string>; // JIRA attr name -> VW attr name
}

interface VWAttribute {
  name: string;
  type: string;
  defaultTypeId?: number;
  description: string;
  options?: string;
  uniqueAttribute?: boolean;
}

// VerifyWise AI System Attributes (loaded from config)
const VW_AI_SYSTEM_ATTRIBUTES: VWAttribute[] = [
  { name: "System Name / Identifier", type: "0", defaultTypeId: 0, description: "Unique identifier", uniqueAttribute: true },
  { name: "Description / Purpose", type: "0", defaultTypeId: 9, description: "Overview of objectives and business value" },
  { name: "Last Release Date", type: "0", defaultTypeId: 4, description: "Current version and release date" },
  { name: "Business Owner / Responsible Team", type: "2", description: "Accountable business function" },
  { name: "Technical Owner / Maintainer", type: "2", description: "Role/team maintaining models and runtime" },
  { name: "AI Officer", type: "2", description: "Named role for AIMS governance" },
  { name: "Model Owner / Maintainer", type: "2", description: "Accountable role for model artefacts" },
  { name: "Risk Owner", type: "2", description: "Named accountable person for residual risk" },
  { name: "Vendor / Developer Name (if third-party)", type: "0", defaultTypeId: 0, description: "Company providing the model/tool" },
  { name: "Lifecycle Status", type: "0", defaultTypeId: 10, description: "Current stage in lifecycle", options: "concept,prototype,pilot,production,retired" },
  { name: "Primary Function", type: "0", defaultTypeId: 10, description: "Model task taxonomy", options: "prediction,classification,recommendation,generation,clustering,anomaly_detection,optimization,other" },
  { name: "Use Case / Business Process Supported", type: "0", defaultTypeId: 9, description: "Specific process(es) where AI is embedded" },
  { name: "User Groups / Stakeholders", type: "0", defaultTypeId: 9, description: "Intended users and affected parties" },
  { name: "Decision Type", type: "0", defaultTypeId: 10, description: "Degree of automation", options: "automated,decision_support,human_in_the_loop,human_on_the_loop" },
  { name: "AI Function Type", type: "0", defaultTypeId: 10, description: "Model family", options: "machine_learning,deep_learning,rules_based,generative_ai,hybrid,other" },
  { name: "Input Data Sources & Types", type: "0", defaultTypeId: 9, description: "Data sources and classifications" },
  { name: "Contains Personal / Sensitive Data", type: "0", defaultTypeId: 2, description: "Indicator of personal/sensitive data" },
  { name: "Risk Level / Criticality", type: "0", defaultTypeId: 10, description: "Overall risk classification", options: "low,medium,high,critical" },
  { name: "Potential Harms or Impacts", type: "0", defaultTypeId: 9, description: "Documented harms and affected stakeholders" },
  { name: "Known Limitations", type: "0", defaultTypeId: 9, description: "Known failure modes and scope limits" },
  { name: "Applicable Regulations", type: "0", defaultTypeId: 9, description: "Regulatory frameworks - GDPR, EU AI Act, etc." },
  { name: "Deployment Environment", type: "0", defaultTypeId: 10, description: "Runtime environment", options: "cloud,on_premises,hybrid,edge" },
  { name: "Platform / Tooling", type: "0", defaultTypeId: 9, description: "Managed platforms and MLOps tools" },
  { name: "Model Type / Algorithm & Version", type: "0", defaultTypeId: 0, description: "Algorithm family and version" },
  { name: "Key Performance Metrics", type: "0", defaultTypeId: 9, description: "Primary KPIs with thresholds" },
  { name: "Explainability Method", type: "0", defaultTypeId: 10, description: "Explainability techniques", options: "shap,lime,attention_weights,feature_importance,counterfactuals,none,other" },
  { name: "Human Oversight Mechanisms", type: "0", defaultTypeId: 9, description: "HITL triggers and escalation paths" },
  { name: "Go-Live Date", type: "0", defaultTypeId: 4, description: "First production deployment date" },
  { name: "Documentation Links", type: "0", defaultTypeId: 7, description: "Links to model cards, data sheets" },
  { name: "Notes & Comments", type: "0", defaultTypeId: 9, description: "Free-text governance notes" },
];

interface JiraSchema {
  id: string;
  name: string;
  objectSchemaKey: string;
  description?: string;
}

interface JiraObjectType {
  id: string;
  name: string;
  description?: string;
  iconId?: string;
  objectCount?: number;
}

interface JiraAttribute {
  id: string;
  name: string;
  type: number;
  typeValue?: string;
  defaultType?: any;
  description?: string;
}

interface JiraObject {
  id: string;
  objectKey: string;
  label: string;
  objectType: {
    id: string;
    name: string;
  };
  attributes: Array<{
    objectAttributeValues: Array<{
      value: any;
      displayValue?: string;
    }>;
    objectTypeAttribute: {
      id: string;
      name: string;
    };
  }>;
  created: string;
  updated: string;
}

interface SyncResult {
  success: boolean;
  objectsFetched: number;
  objectsCreated: number;
  objectsUpdated: number;
  objectsDeleted: number;
  syncedAt: string;
  status: string;
}

// ========== JIRA ASSETS API CLIENT ==========

class JiraAssetsClient {
  private baseUrl: string;
  private workspaceId: string;
  private authHeader: string;
  private deploymentType: "cloud" | "datacenter";

  constructor(baseUrl: string, workspaceId: string, email: string, apiToken: string, deploymentType: "cloud" | "datacenter" = "cloud") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.workspaceId = workspaceId;
    this.deploymentType = deploymentType;
    const credentials = Buffer.from(`${email}:${apiToken}`).toString("base64");
    this.authHeader = `Basic ${credentials}`;
  }

  private async request<T>(endpoint: string, method: string = "GET", body?: any): Promise<T> {
    // Cloud: https://api.atlassian.com/jsm/assets/workspace/{workspaceId}/v1/{endpoint}
    // Data Center: {baseUrl}/rest/insight/1.0/{endpoint}
    const url = this.deploymentType === "cloud"
      ? `https://api.atlassian.com/jsm/assets/workspace/${this.workspaceId}/v1/${endpoint}`
      : `${this.baseUrl}/rest/insight/1.0/${endpoint}`;

    console.log(`[JiraAssetsClient] ${method} ${url} (deploymentType: ${this.deploymentType})`);

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": this.authHeader,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[JiraAssetsClient] Error ${response.status} for ${url}`);
      throw new Error(`JIRA API error ${response.status}: ${errorText || "No details"}`);
    }

    return response.json();
  }

  async getSchemas(): Promise<JiraSchema[]> {
    if (this.deploymentType === "datacenter") {
      // Data Center returns array directly
      const result = await this.request<JiraSchema[]>("objectschema/list");
      return Array.isArray(result) ? result : [];
    } else {
      // Cloud returns { values: [...] }
      const result = await this.request<{ values: JiraSchema[] }>("objectschema/list");
      return result.values || [];
    }
  }

  async getObjectTypes(schemaId: string): Promise<JiraObjectType[]> {
    if (this.deploymentType === "datacenter") {
      // Data Center: /objectschema/{id}/objecttypes/flat returns array directly
      const result = await this.request<JiraObjectType[]>(
        `objectschema/${schemaId}/objecttypes/flat`
      );
      return Array.isArray(result) ? result : [];
    } else {
      // Cloud returns { values: [...] }
      const result = await this.request<{ values: JiraObjectType[] }>(
        `objectschema/${schemaId}/objecttypes`
      );
      return result.values || [];
    }
  }

  async getAttributes(objectTypeId: string): Promise<JiraAttribute[]> {
    const result = await this.request<JiraAttribute[]>(
      `objecttype/${objectTypeId}/attributes`
    );
    return Array.isArray(result) ? result : [];
  }

  async getObjects(objectTypeId: string, maxResults: number = 1000): Promise<JiraObject[]> {
    if (this.deploymentType === "datacenter") {
      // Data Center uses IQL (Insight Query Language) endpoint
      const result = await this.request<{ objectEntries: JiraObject[] }>(
        `iql/objects?objectSchemaId=${this.workspaceId}&iql=objectTypeId=${objectTypeId}&resultPerPage=${maxResults}&includeAttributes=true`,
        "GET"
      );
      return result.objectEntries || [];
    } else {
      // Cloud uses AQL endpoint
      const result = await this.request<{ values: JiraObject[] }>(
        `object/aql`,
        "POST",
        {
          qlQuery: `objectType = "${objectTypeId}"`,
          maxResults,
          includeAttributes: true,
        }
      );
      return result.values || [];
    }
  }

  async getObjectById(objectId: string): Promise<JiraObject> {
    return this.request<JiraObject>(`object/${objectId}`);
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getSchemas();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// ========== PLUGIN LIFECYCLE METHODS ==========

export async function install(
  _userId: number,
  tenantId: string,
  _config: JiraAssetsConfig,
  context: PluginContext
): Promise<InstallResult> {
  try {
    const { sequelize } = context;

    // Create jira_assets_config table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${tenantId}".jira_assets_config (
        id SERIAL PRIMARY KEY,
        jira_base_url VARCHAR(500) NOT NULL,
        workspace_id VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        api_token_encrypted TEXT NOT NULL,
        api_token_iv VARCHAR(50) NOT NULL,
        deployment_type VARCHAR(20) DEFAULT 'cloud',
        selected_schema_id VARCHAR(100),
        selected_object_type_id VARCHAR(100),
        attribute_mappings JSONB NOT NULL DEFAULT '{}',
        sync_enabled BOOLEAN DEFAULT false,
        sync_interval_hours INTEGER DEFAULT 24,
        last_sync_at TIMESTAMP,
        last_sync_status VARCHAR(50),
        last_sync_message TEXT,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create jira_assets_use_cases table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${tenantId}".jira_assets_use_cases (
        id SERIAL PRIMARY KEY,
        jira_object_id VARCHAR(100) NOT NULL UNIQUE,
        jira_object_key VARCHAR(100) NOT NULL,
        uc_id VARCHAR(50) UNIQUE,
        name VARCHAR(500) NOT NULL,
        is_organizational BOOLEAN DEFAULT false,
        attributes JSONB NOT NULL DEFAULT '{}',
        mapped_attributes JSONB NOT NULL DEFAULT '{}',
        jira_created_at TIMESTAMP,
        jira_updated_at TIMESTAMP,
        last_synced_at TIMESTAMP,
        sync_status VARCHAR(50) DEFAULT 'synced',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for jira_assets_use_cases
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_jira_use_cases_jira_object_id
      ON "${tenantId}".jira_assets_use_cases(jira_object_id)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_jira_use_cases_is_organizational
      ON "${tenantId}".jira_assets_use_cases(is_organizational)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_jira_use_cases_sync_status
      ON "${tenantId}".jira_assets_use_cases(sync_status)
    `);

    // Create jira_assets_sync_history table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${tenantId}".jira_assets_sync_history (
        id SERIAL PRIMARY KEY,
        sync_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        objects_fetched INTEGER DEFAULT 0,
        objects_created INTEGER DEFAULT 0,
        objects_updated INTEGER DEFAULT 0,
        objects_deleted INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        triggered_by INTEGER
      )
    `);

    // Create jira_assets_org_links table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${tenantId}".jira_assets_org_links (
        id SERIAL PRIMARY KEY,
        jira_use_case_id INTEGER NOT NULL REFERENCES "${tenantId}".jira_assets_use_cases(id) ON DELETE CASCADE,
        org_project_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(jira_use_case_id)
      )
    `);

    // Create sequence for UC-ID generation
    await sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS "${tenantId}".jira_use_case_uc_id_seq START 1
    `);

    return {
      success: true,
      message: "Jira Assets plugin installed successfully. Configure your JIRA connection to start importing AI Systems.",
      installedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Installation failed: ${error.message}`);
  }
}

export async function uninstall(
  _userId: number,
  tenantId: string,
  context: PluginContext
): Promise<UninstallResult> {
  try {
    const { sequelize } = context;

    // Count records before deletion
    let totalUseCases = 0;
    try {
      const countResult: any = await sequelize.query(
        `SELECT COUNT(*) as count FROM "${tenantId}".jira_assets_use_cases`
      );
      totalUseCases = parseInt(countResult[0][0].count);
    } catch {
      // Table may not exist
    }

    // Drop tables in correct order (dependent tables first)
    await sequelize.query(`DROP TABLE IF EXISTS "${tenantId}".jira_assets_org_links CASCADE`);
    await sequelize.query(`DROP TABLE IF EXISTS "${tenantId}".jira_assets_sync_history CASCADE`);
    await sequelize.query(`DROP TABLE IF EXISTS "${tenantId}".jira_assets_use_cases CASCADE`);
    await sequelize.query(`DROP TABLE IF EXISTS "${tenantId}".jira_assets_config CASCADE`);

    // Drop sequence
    await sequelize.query(`DROP SEQUENCE IF EXISTS "${tenantId}".jira_use_case_uc_id_seq`);

    return {
      success: true,
      message: `Jira Assets plugin uninstalled successfully. Removed ${totalUseCases} imported use-cases.`,
      uninstalledAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Uninstallation failed: ${error.message}`);
  }
}

export async function configure(
  _userId: number,
  _tenantId: string,
  config: JiraAssetsConfig,
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
      message: "Jira Assets plugin configured successfully. You can now import AI Systems.",
      configuredAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Configuration failed: ${error.message}`);
  }
}

// ========== VALIDATION METHODS ==========

export function validateConfig(config: JiraAssetsConfig): ValidationResult {
  const errors: string[] = [];

  if (!config) {
    errors.push("Configuration is required");
    return { valid: false, errors };
  }

  if (!config.jira_base_url) {
    errors.push("JIRA Base URL is required");
  } else {
    try {
      new URL(config.jira_base_url);
    } catch {
      errors.push("JIRA Base URL must be a valid URL");
    }
  }

  if (!config.workspace_id) {
    errors.push("Workspace ID is required");
  }

  if (!config.email) {
    errors.push("Email is required");
  }

  if (!config.api_token) {
    errors.push("API Token is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ========== INTEGRATION METHODS ==========

export async function testConnection(config: JiraAssetsConfig): Promise<TestConnectionResult> {
  try {
    if (!config.jira_base_url || !config.workspace_id || !config.email || !config.api_token) {
      throw new Error("All connection parameters are required");
    }

    const client = new JiraAssetsClient(
      config.jira_base_url,
      config.workspace_id,
      config.email,
      config.api_token,
      config.deployment_type || "cloud"
    );

    const result = await client.testConnection();
    if (!result.success) {
      throw new Error(result.error || "Failed to connect to JIRA Assets");
    }

    return {
      success: true,
      message: "Successfully connected to JIRA Assets",
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

// ========== SYNC LOGIC ==========

async function syncObjects(
  tenantId: string,
  config: JiraAssetsConfig,
  context: PluginContext,
  syncType: "manual" | "scheduled",
  triggeredBy?: number
): Promise<SyncResult> {
  const { sequelize } = context;
  const startedAt = new Date();
  let syncHistoryId: number | null = null;

  try {
    if (!config.jira_base_url || !config.workspace_id || !config.email || !config.api_token) {
      throw new Error("JIRA connection not configured");
    }

    if (!config.selected_object_type_id) {
      throw new Error("No object type selected for sync");
    }

    // Create sync history record
    const historyResult: any = await sequelize.query(
      `INSERT INTO "${tenantId}".jira_assets_sync_history
       (sync_type, status, started_at, triggered_by)
       VALUES (:syncType, 'started', :startedAt, :triggeredBy)
       RETURNING id`,
      {
        replacements: { syncType, startedAt, triggeredBy },
        type: "SELECT",
      }
    );
    syncHistoryId = historyResult[0]?.id;

    const client = new JiraAssetsClient(
      config.jira_base_url,
      config.workspace_id,
      config.email,
      config.api_token,
      config.deployment_type || "cloud"
    );

    // Fetch objects from JIRA
    const jiraObjects = await client.getObjects(config.selected_object_type_id);
    const objectsFetched = jiraObjects.length;

    // Get existing records
    const existingRecords: any[] = await sequelize.query(
      `SELECT jira_object_id, jira_updated_at FROM "${tenantId}".jira_assets_use_cases WHERE is_active = true`,
      { type: "SELECT" }
    );
    const existingMap = new Map(existingRecords.map((r) => [r.jira_object_id, r]));

    let objectsCreated = 0;
    let objectsUpdated = 0;
    let objectsDeleted = 0;
    const now = new Date();

    // Process each JIRA object
    for (const jiraObj of jiraObjects) {
      const existing = existingMap.get(jiraObj.id);
      const attributes = transformAttributes(jiraObj.attributes);
      const name = jiraObj.label || attributes.Name || jiraObj.objectKey;

      if (!existing) {
        // Create new record
        const ucId = await generateUcId(tenantId, sequelize);
        await sequelize.query(
          `INSERT INTO "${tenantId}".jira_assets_use_cases
           (jira_object_id, jira_object_key, uc_id, name, attributes, jira_created_at, jira_updated_at, last_synced_at, sync_status)
           VALUES (:jiraObjectId, :jiraObjectKey, :ucId, :name, :attributes, :jiraCreatedAt, :jiraUpdatedAt, :lastSyncedAt, 'synced')`,
          {
            replacements: {
              jiraObjectId: jiraObj.id,
              jiraObjectKey: jiraObj.objectKey,
              ucId,
              name,
              attributes: JSON.stringify(attributes),
              jiraCreatedAt: jiraObj.created ? new Date(jiraObj.created) : null,
              jiraUpdatedAt: jiraObj.updated ? new Date(jiraObj.updated) : null,
              lastSyncedAt: now,
            },
          }
        );
        objectsCreated++;
      } else {
        // Update existing record
        const jiraUpdatedAt = jiraObj.updated ? new Date(jiraObj.updated) : null;
        const existingUpdatedAt = existing.jira_updated_at ? new Date(existing.jira_updated_at) : null;

        if (!existingUpdatedAt || !jiraUpdatedAt || jiraUpdatedAt > existingUpdatedAt) {
          await sequelize.query(
            `UPDATE "${tenantId}".jira_assets_use_cases
             SET name = :name, attributes = :attributes, jira_updated_at = :jiraUpdatedAt,
                 last_synced_at = :lastSyncedAt, sync_status = 'updated', updated_at = CURRENT_TIMESTAMP
             WHERE jira_object_id = :jiraObjectId`,
            {
              replacements: {
                name,
                attributes: JSON.stringify(attributes),
                jiraUpdatedAt,
                lastSyncedAt: now,
                jiraObjectId: jiraObj.id,
              },
            }
          );
          objectsUpdated++;
        }
      }
      existingMap.delete(jiraObj.id);
    }

    // Mark deleted objects (those remaining in existingMap)
    const remainingIds = Array.from(existingMap.keys());
    for (const jiraObjectId of remainingIds) {
      await sequelize.query(
        `UPDATE "${tenantId}".jira_assets_use_cases
         SET sync_status = 'deleted_in_jira', is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE jira_object_id = :jiraObjectId`,
        { replacements: { jiraObjectId } }
      );
      objectsDeleted++;
    }

    // Update sync history
    if (syncHistoryId) {
      await sequelize.query(
        `UPDATE "${tenantId}".jira_assets_sync_history
         SET status = 'completed', objects_fetched = :objectsFetched, objects_created = :objectsCreated,
             objects_updated = :objectsUpdated, objects_deleted = :objectsDeleted, completed_at = :completedAt
         WHERE id = :id`,
        {
          replacements: {
            objectsFetched,
            objectsCreated,
            objectsUpdated,
            objectsDeleted,
            completedAt: new Date(),
            id: syncHistoryId,
          },
        }
      );
    }

    // Update config with last sync info
    await sequelize.query(
      `UPDATE "${tenantId}".jira_assets_config
       SET last_sync_at = :lastSyncAt, last_sync_status = 'success', updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM "${tenantId}".jira_assets_config LIMIT 1)`,
      { replacements: { lastSyncAt: now } }
    );

    return {
      success: true,
      objectsFetched,
      objectsCreated,
      objectsUpdated,
      objectsDeleted,
      syncedAt: now.toISOString(),
      status: "success",
    };
  } catch (error: any) {
    // Update sync history with error
    if (syncHistoryId) {
      await sequelize.query(
        `UPDATE "${tenantId}".jira_assets_sync_history
         SET status = 'failed', error_message = :errorMessage, completed_at = :completedAt
         WHERE id = :id`,
        {
          replacements: {
            errorMessage: error.message,
            completedAt: new Date(),
            id: syncHistoryId,
          },
        }
      );
    }

    // Update config with last sync error
    await sequelize.query(
      `UPDATE "${tenantId}".jira_assets_config
       SET last_sync_at = :lastSyncAt, last_sync_status = 'failed', last_sync_message = :message, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM "${tenantId}".jira_assets_config LIMIT 1)`,
      { replacements: { lastSyncAt: new Date(), message: error.message } }
    );

    return {
      success: false,
      objectsFetched: 0,
      objectsCreated: 0,
      objectsUpdated: 0,
      objectsDeleted: 0,
      syncedAt: new Date().toISOString(),
      status: `failed: ${error.message}`,
    };
  }
}

// ========== HELPER FUNCTIONS ==========

function transformAttributes(attributes: JiraObject["attributes"]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const attr of attributes) {
    const name = attr.objectTypeAttribute?.name;
    if (!name) continue;

    const values = attr.objectAttributeValues || [];
    if (values.length === 0) {
      result[name] = null;
    } else if (values.length === 1) {
      result[name] = values[0].displayValue || values[0].value;
    } else {
      result[name] = values.map((v) => v.displayValue || v.value);
    }
  }

  return result;
}

/**
 * Apply attribute mappings to transform JIRA attributes to VerifyWise attributes
 * @param jiraAttributes - Raw JIRA attributes
 * @param mappings - Mapping from JIRA attr name to VW attr name
 * @returns Mapped attributes for VerifyWise AI System
 */
function applyAttributeMappings(
  jiraAttributes: Record<string, any>,
  mappings: Record<string, string>
): Record<string, any> {
  const mapped: Record<string, any> = {};

  for (const [jiraAttrName, vwAttrName] of Object.entries(mappings)) {
    if (vwAttrName && jiraAttrName in jiraAttributes) {
      mapped[vwAttrName] = jiraAttributes[jiraAttrName];
    }
  }

  return mapped;
}

async function generateUcId(tenantId: string, sequelize: any): Promise<string> {
  const result: any = await sequelize.query(
    `SELECT nextval('"${tenantId}".jira_use_case_uc_id_seq') as seq`
  );
  const seq = result[0][0].seq;
  return `UC-J${seq}`;
}

async function findOrganizationalProject(tenantId: string, sequelize: any): Promise<any | null> {
  try {
    const projects: any[] = await sequelize.query(
      `SELECT id, title FROM "${tenantId}".projects WHERE is_organizational = true LIMIT 1`,
      { type: "SELECT" }
    );
    return projects.length > 0 ? projects[0] : null;
  } catch {
    return null;
  }
}

// ========== PLUGIN METADATA ==========

export const metadata: PluginMetadata = {
  name: "Jira Assets Integration",
  version: "1.0.0",
  author: "VerifyWise",
  description: "Import AI Systems from Jira Service Management Assets as use-cases",
};

// ========== PLUGIN ROUTER ==========

/**
 * GET /config - Get current configuration
 */
async function handleGetConfig(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId } = ctx;

  try {
    const configs: any[] = await sequelize.query(
      `SELECT id, jira_base_url, workspace_id, email, deployment_type, selected_schema_id, selected_object_type_id,
              sync_enabled, sync_interval_hours, last_sync_at, last_sync_status, last_sync_message
       FROM "${tenantId}".jira_assets_config LIMIT 1`,
      { type: "SELECT" }
    );

    return {
      status: 200,
      data: configs.length > 0 ? configs[0] : null,
    };
  } catch (error: any) {
    if (error.message?.includes("does not exist")) {
      return { status: 200, data: null };
    }
    throw error;
  }
}

/**
 * POST /config - Save configuration
 */
async function handleSaveConfig(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, userId, body } = ctx;

  const validation = validateConfig(body);
  if (!validation.valid) {
    return {
      status: 400,
      data: { success: false, errors: validation.errors },
    };
  }

  // Simple encryption for API token (in production, use proper encryption)
  const iv = Math.random().toString(36).substring(2, 15);
  const encryptedToken = Buffer.from(body.api_token).toString("base64");

  // Check if config exists
  const existing: any[] = await sequelize.query(
    `SELECT id FROM "${tenantId}".jira_assets_config LIMIT 1`,
    { type: "SELECT" }
  );

  if (existing.length > 0) {
    await sequelize.query(
      `UPDATE "${tenantId}".jira_assets_config
       SET jira_base_url = :jiraBaseUrl, workspace_id = :workspaceId, email = :email,
           api_token_encrypted = :apiTokenEncrypted, api_token_iv = :apiTokenIv,
           deployment_type = :deploymentType,
           selected_schema_id = :selectedSchemaId, selected_object_type_id = :selectedObjectTypeId,
           sync_enabled = :syncEnabled, sync_interval_hours = :syncIntervalHours,
           updated_by = :updatedBy, updated_at = CURRENT_TIMESTAMP
       WHERE id = :id`,
      {
        replacements: {
          jiraBaseUrl: body.jira_base_url,
          workspaceId: body.workspace_id,
          email: body.email,
          apiTokenEncrypted: encryptedToken,
          apiTokenIv: iv,
          deploymentType: body.deployment_type || "cloud",
          selectedSchemaId: body.selected_schema_id || null,
          selectedObjectTypeId: body.selected_object_type_id || null,
          syncEnabled: body.sync_enabled || false,
          syncIntervalHours: body.sync_interval_hours || 24,
          updatedBy: userId,
          id: existing[0].id,
        },
      }
    );
  } else {
    await sequelize.query(
      `INSERT INTO "${tenantId}".jira_assets_config
       (jira_base_url, workspace_id, email, api_token_encrypted, api_token_iv, deployment_type,
        selected_schema_id, selected_object_type_id, sync_enabled, sync_interval_hours, created_by)
       VALUES (:jiraBaseUrl, :workspaceId, :email, :apiTokenEncrypted, :apiTokenIv, :deploymentType,
               :selectedSchemaId, :selectedObjectTypeId, :syncEnabled, :syncIntervalHours, :createdBy)`,
      {
        replacements: {
          jiraBaseUrl: body.jira_base_url,
          workspaceId: body.workspace_id,
          email: body.email,
          apiTokenEncrypted: encryptedToken,
          apiTokenIv: iv,
          deploymentType: body.deployment_type || "cloud",
          selectedSchemaId: body.selected_schema_id || null,
          selectedObjectTypeId: body.selected_object_type_id || null,
          syncEnabled: body.sync_enabled || false,
          syncIntervalHours: body.sync_interval_hours || 24,
          createdBy: userId,
        },
      }
    );
  }

  return {
    status: 200,
    data: { success: true, message: "Configuration saved successfully" },
  };
}

/**
 * POST /test-connection - Test JIRA connection
 */
async function handleTestConnection(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { body } = ctx;

  const result = await testConnection(body);
  return {
    status: result.success ? 200 : 400,
    data: result,
  };
}

/**
 * GET /schemas - Get available schemas
 */
async function handleGetSchemas(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { configuration } = ctx;

  if (!configuration?.jira_base_url || !configuration?.workspace_id) {
    return {
      status: 400,
      data: { error: "JIRA not configured" },
    };
  }

  try {
    // Decrypt API token
    const apiToken = Buffer.from(configuration.api_token_encrypted || "", "base64").toString("utf-8") ||
                     configuration.api_token;

    const client = new JiraAssetsClient(
      configuration.jira_base_url,
      configuration.workspace_id,
      configuration.email,
      apiToken,
      configuration.deployment_type || "cloud"
    );

    const schemas = await client.getSchemas();
    return { status: 200, data: schemas };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /schemas/:schemaId/object-types - Get object types for a schema
 */
async function handleGetObjectTypes(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { configuration, params } = ctx;
  const schemaId = params.schemaId;

  if (!configuration?.jira_base_url || !configuration?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  try {
    const apiToken = Buffer.from(configuration.api_token_encrypted || "", "base64").toString("utf-8") ||
                     configuration.api_token;

    const client = new JiraAssetsClient(
      configuration.jira_base_url,
      configuration.workspace_id,
      configuration.email,
      apiToken,
      configuration.deployment_type || "cloud"
    );

    const objectTypes = await client.getObjectTypes(schemaId);
    return { status: 200, data: objectTypes };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /object-types/:objectTypeId/attributes - Get attributes for an object type
 */
async function handleGetAttributes(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { configuration, params } = ctx;
  const objectTypeId = params.objectTypeId;

  if (!configuration?.jira_base_url || !configuration?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  try {
    const apiToken = Buffer.from(configuration.api_token_encrypted || "", "base64").toString("utf-8") ||
                     configuration.api_token;

    const client = new JiraAssetsClient(
      configuration.jira_base_url,
      configuration.workspace_id,
      configuration.email,
      apiToken,
      configuration.deployment_type || "cloud"
    );

    const attributes = await client.getAttributes(objectTypeId);
    return { status: 200, data: attributes };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /object-types/:objectTypeId/objects - Get objects of a type
 */
async function handleGetObjects(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { configuration, params } = ctx;
  const objectTypeId = params.objectTypeId;

  if (!configuration?.jira_base_url || !configuration?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  try {
    const apiToken = Buffer.from(configuration.api_token_encrypted || "", "base64").toString("utf-8") ||
                     configuration.api_token;

    const client = new JiraAssetsClient(
      configuration.jira_base_url,
      configuration.workspace_id,
      configuration.email,
      apiToken,
      configuration.deployment_type || "cloud"
    );

    const objects = await client.getObjects(objectTypeId);

    // Transform objects for UI
    const transformed = objects.map((obj) => ({
      id: obj.id,
      key: obj.objectKey,
      name: obj.label,
      attributes: transformAttributes(obj.attributes),
      created: obj.created,
      updated: obj.updated,
    }));

    return { status: 200, data: transformed };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /org-project - Get organizational project
 */
async function handleGetOrgProject(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId } = ctx;

  const orgProject = await findOrganizationalProject(tenantId, sequelize);
  return { status: 200, data: orgProject };
}

/**
 * POST /import - Import selected JIRA objects
 */
async function handleImportObjects(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, body, configuration } = ctx;

  const { object_ids, is_organizational } = body;

  if (!object_ids || !Array.isArray(object_ids) || object_ids.length === 0) {
    return { status: 400, data: { error: "No objects selected for import" } };
  }

  if (!configuration?.jira_base_url || !configuration?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  try {
    const apiToken = Buffer.from(configuration.api_token_encrypted || "", "base64").toString("utf-8") ||
                     configuration.api_token;

    const client = new JiraAssetsClient(
      configuration.jira_base_url,
      configuration.workspace_id,
      configuration.email,
      apiToken,
      configuration.deployment_type || "cloud"
    );

    // Get attribute mappings
    const attributeMappings = configuration.attribute_mappings || {};

    // Check for organizational project if needed
    let orgProject: any = null;
    if (is_organizational) {
      orgProject = await findOrganizationalProject(tenantId, sequelize);
      if (!orgProject) {
        return { status: 400, data: { error: "No organizational project exists. Create one first or import as non-organizational." } };
      }
    }

    const now = new Date();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const objectId of object_ids) {
      try {
        // Check if already imported
        const existing: any[] = await sequelize.query(
          `SELECT id FROM "${tenantId}".jira_assets_use_cases WHERE jira_object_id = :objectId`,
          { replacements: { objectId }, type: "SELECT" }
        );

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Fetch object from JIRA
        const jiraObj = await client.getObjectById(objectId);
        const attributes = transformAttributes(jiraObj.attributes);
        const mappedAttributes = applyAttributeMappings(attributes, attributeMappings);
        const name = jiraObj.label || attributes.Name || jiraObj.objectKey;
        const ucId = await generateUcId(tenantId, sequelize);

        // Insert use case with both raw and mapped attributes
        const insertResult: any = await sequelize.query(
          `INSERT INTO "${tenantId}".jira_assets_use_cases
           (jira_object_id, jira_object_key, uc_id, name, is_organizational, attributes, mapped_attributes,
            jira_created_at, jira_updated_at, last_synced_at, sync_status)
           VALUES (:jiraObjectId, :jiraObjectKey, :ucId, :name, :isOrganizational, :attributes, :mappedAttributes,
                   :jiraCreatedAt, :jiraUpdatedAt, :lastSyncedAt, 'synced')
           RETURNING id`,
          {
            replacements: {
              jiraObjectId: jiraObj.id,
              jiraObjectKey: jiraObj.objectKey,
              ucId,
              name,
              isOrganizational: is_organizational,
              attributes: JSON.stringify(attributes),
              mappedAttributes: JSON.stringify(mappedAttributes),
              jiraCreatedAt: jiraObj.created ? new Date(jiraObj.created) : null,
              jiraUpdatedAt: jiraObj.updated ? new Date(jiraObj.updated) : null,
              lastSyncedAt: now,
            },
            type: "SELECT",
          }
        );

        // Create org link if organizational
        if (is_organizational && orgProject && insertResult[0]?.id) {
          await sequelize.query(
            `INSERT INTO "${tenantId}".jira_assets_org_links (jira_use_case_id, org_project_id)
             VALUES (:jiraUseCaseId, :orgProjectId)`,
            {
              replacements: {
                jiraUseCaseId: insertResult[0].id,
                orgProjectId: orgProject.id,
              },
            }
          );
        }

        imported++;
      } catch (err: any) {
        errors.push(`Failed to import ${objectId}: ${err.message}`);
      }
    }

    return {
      status: 200,
      data: {
        success: true,
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * POST /sync - Manual sync
 */
async function handleManualSync(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, userId, configuration } = ctx;

  if (!configuration?.jira_base_url || !configuration?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  // Decrypt API token
  const apiToken = Buffer.from(configuration.api_token_encrypted || "", "base64").toString("utf-8") ||
                   configuration.api_token;

  const config: JiraAssetsConfig = {
    jira_base_url: configuration.jira_base_url,
    workspace_id: configuration.workspace_id,
    email: configuration.email,
    api_token: apiToken,
    selected_schema_id: configuration.selected_schema_id,
    selected_object_type_id: configuration.selected_object_type_id,
  };

  const result = await syncObjects(tenantId, config, { sequelize }, "manual", userId);

  return {
    status: result.success ? 200 : 500,
    data: result,
  };
}

/**
 * GET /sync/status - Get current sync status
 */
async function handleGetSyncStatus(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId } = ctx;

  try {
    const configs: any[] = await sequelize.query(
      `SELECT last_sync_at, last_sync_status, last_sync_message, sync_enabled, sync_interval_hours
       FROM "${tenantId}".jira_assets_config LIMIT 1`,
      { type: "SELECT" }
    );

    if (configs.length === 0) {
      return { status: 200, data: null };
    }

    return { status: 200, data: configs[0] };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /sync/history - Get sync history
 */
async function handleGetSyncHistory(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, query } = ctx;
  const limit = query.limit || 20;

  try {
    const history: any[] = await sequelize.query(
      `SELECT * FROM "${tenantId}".jira_assets_sync_history
       ORDER BY started_at DESC LIMIT :limit`,
      { replacements: { limit }, type: "SELECT" }
    );

    return { status: 200, data: history };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /use-cases - Get all imported use cases
 */
async function handleGetUseCases(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, query } = ctx;
  const includeInactive = query.includeInactive === "true";

  try {
    let whereClause = includeInactive ? "" : "WHERE is_active = true";

    const useCases: any[] = await sequelize.query(
      `SELECT uc.*, ol.org_project_id
       FROM "${tenantId}".jira_assets_use_cases uc
       LEFT JOIN "${tenantId}".jira_assets_org_links ol ON ol.jira_use_case_id = uc.id
       ${whereClause}
       ORDER BY uc.created_at DESC`,
      { type: "SELECT" }
    );

    return { status: 200, data: useCases };
  } catch (error: any) {
    if (error.message?.includes("does not exist")) {
      return { status: 200, data: [] };
    }
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /use-cases/:id - Get a specific use case
 */
async function handleGetUseCase(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const id = params.id;

  try {
    const useCases: any[] = await sequelize.query(
      `SELECT uc.*, ol.org_project_id
       FROM "${tenantId}".jira_assets_use_cases uc
       LEFT JOIN "${tenantId}".jira_assets_org_links ol ON ol.jira_use_case_id = uc.id
       WHERE uc.id = :id`,
      { replacements: { id }, type: "SELECT" }
    );

    if (useCases.length === 0) {
      return { status: 404, data: { error: "Use case not found" } };
    }

    return { status: 200, data: useCases[0] };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * PATCH /use-cases/:id - Update a use case
 */
async function handleUpdateUseCase(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params, body } = ctx;
  const id = params.id;

  try {
    // Get current use case
    const existing: any[] = await sequelize.query(
      `SELECT * FROM "${tenantId}".jira_assets_use_cases WHERE id = :id`,
      { replacements: { id }, type: "SELECT" }
    );

    if (existing.length === 0) {
      return { status: 404, data: { error: "Use case not found" } };
    }

    const current = existing[0];

    // Handle is_organizational change
    if (body.is_organizational !== undefined && body.is_organizational !== current.is_organizational) {
      if (body.is_organizational) {
        // Changing to organizational - need org project
        const orgProject = await findOrganizationalProject(tenantId, sequelize);
        if (!orgProject) {
          return { status: 400, data: { error: "No organizational project exists" } };
        }

        // Create org link
        await sequelize.query(
          `INSERT INTO "${tenantId}".jira_assets_org_links (jira_use_case_id, org_project_id)
           VALUES (:jiraUseCaseId, :orgProjectId)
           ON CONFLICT (jira_use_case_id) DO UPDATE SET org_project_id = :orgProjectId`,
          { replacements: { jiraUseCaseId: id, orgProjectId: orgProject.id } }
        );
      } else {
        // Changing to non-organizational - remove org link
        await sequelize.query(
          `DELETE FROM "${tenantId}".jira_assets_org_links WHERE jira_use_case_id = :id`,
          { replacements: { id } }
        );
      }

      await sequelize.query(
        `UPDATE "${tenantId}".jira_assets_use_cases
         SET is_organizational = :isOrganizational, updated_at = CURRENT_TIMESTAMP
         WHERE id = :id`,
        { replacements: { isOrganizational: body.is_organizational, id } }
      );
    }

    return { status: 200, data: { success: true } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * DELETE /use-cases/:id - Delete a use case
 */
async function handleDeleteUseCase(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const id = params.id;

  try {
    // Soft delete by setting is_active to false
    await sequelize.query(
      `UPDATE "${tenantId}".jira_assets_use_cases
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = :id`,
      { replacements: { id } }
    );

    return { status: 200, data: { success: true } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /org-links - Get all organizational links
 */
async function handleGetOrgLinks(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId } = ctx;

  try {
    const links: any[] = await sequelize.query(
      `SELECT ol.*, uc.uc_id, uc.name, uc.jira_object_key, uc.last_synced_at
       FROM "${tenantId}".jira_assets_org_links ol
       JOIN "${tenantId}".jira_assets_use_cases uc ON uc.id = ol.jira_use_case_id
       WHERE uc.is_active = true
       ORDER BY ol.created_at DESC`,
      { type: "SELECT" }
    );

    return { status: 200, data: links };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /vw-attributes - Get VerifyWise AI System attributes for mapping
 */
async function handleGetVWAttributes(_ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  return {
    status: 200,
    data: VW_AI_SYSTEM_ATTRIBUTES,
  };
}

/**
 * GET /mappings - Get current attribute mappings
 */
async function handleGetMappings(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId } = ctx;

  try {
    const configs: any[] = await sequelize.query(
      `SELECT attribute_mappings FROM "${tenantId}".jira_assets_config LIMIT 1`,
      { type: "SELECT" }
    );

    return {
      status: 200,
      data: configs.length > 0 ? configs[0].attribute_mappings || {} : {},
    };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * POST /mappings - Save attribute mappings
 */
async function handleSaveMappings(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, userId, body } = ctx;

  const mappings = body.mappings || {};

  try {
    // Check if config exists
    const existing: any[] = await sequelize.query(
      `SELECT id FROM "${tenantId}".jira_assets_config LIMIT 1`,
      { type: "SELECT" }
    );

    if (existing.length === 0) {
      return {
        status: 400,
        data: { error: "Please configure JIRA connection first" },
      };
    }

    await sequelize.query(
      `UPDATE "${tenantId}".jira_assets_config
       SET attribute_mappings = :mappings, updated_by = :updatedBy, updated_at = CURRENT_TIMESTAMP
       WHERE id = :id`,
      {
        replacements: {
          mappings: JSON.stringify(mappings),
          updatedBy: userId,
          id: existing[0].id,
        },
      }
    );

    // Re-apply mappings to all existing use cases
    const useCases: any[] = await sequelize.query(
      `SELECT id, attributes FROM "${tenantId}".jira_assets_use_cases WHERE is_active = true`,
      { type: "SELECT" }
    );

    for (const uc of useCases) {
      const attrs = typeof uc.attributes === 'string' ? JSON.parse(uc.attributes) : uc.attributes;
      const mapped = applyAttributeMappings(attrs, mappings);

      await sequelize.query(
        `UPDATE "${tenantId}".jira_assets_use_cases
         SET mapped_attributes = :mappedAttributes, updated_at = CURRENT_TIMESTAMP
         WHERE id = :id`,
        {
          replacements: {
            mappedAttributes: JSON.stringify(mapped),
            id: uc.id,
          },
        }
      );
    }

    return {
      status: 200,
      data: { success: true, message: `Mappings saved and applied to ${useCases.length} use cases` },
    };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * Plugin router - maps routes to handler functions
 */
export const router: Record<string, (ctx: PluginRouteContext) => Promise<PluginRouteResponse>> = {
  // Configuration
  "GET /config": handleGetConfig,
  "POST /config": handleSaveConfig,
  "POST /test-connection": handleTestConnection,

  // Attribute Mappings
  "GET /vw-attributes": handleGetVWAttributes,
  "GET /mappings": handleGetMappings,
  "POST /mappings": handleSaveMappings,

  // Schema & Object Type selection
  "GET /schemas": handleGetSchemas,
  "GET /schemas/:schemaId/object-types": handleGetObjectTypes,
  "GET /object-types/:objectTypeId/attributes": handleGetAttributes,
  "GET /object-types/:objectTypeId/objects": handleGetObjects,

  // Organizational project
  "GET /org-project": handleGetOrgProject,

  // Import & Sync
  "POST /import": handleImportObjects,
  "POST /sync": handleManualSync,
  "GET /sync/status": handleGetSyncStatus,
  "GET /sync/history": handleGetSyncHistory,

  // Use Cases
  "GET /use-cases": handleGetUseCases,
  "GET /use-cases/:id": handleGetUseCase,
  "PATCH /use-cases/:id": handleUpdateUseCase,
  "DELETE /use-cases/:id": handleDeleteUseCase,

  // Organizational links
  "GET /org-links": handleGetOrgLinks,
};
