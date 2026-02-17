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
      // Cloud: objecttypes endpoint returns array directly (not wrapped in values)
      const result = await this.request<any>(
        `objectschema/${schemaId}/objecttypes`
      );
      // Handle both array (direct) and { values: [...] } format
      if (Array.isArray(result)) {
        return result;
      }
      return result?.values || [];
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
      // Cloud - first fetch attribute definitions to get ID -> name mapping
      const attrDefs = await this.getAttributes(objectTypeId);
      const attrIdToName: Record<string, string> = {};
      for (const attr of attrDefs) {
        attrIdToName[attr.id] = attr.name;
      }

      // Then fetch objects with AQL
      const result = await this.request<any>(
        `object/aql`,
        "POST",
        {
          qlQuery: `objectTypeId = ${objectTypeId}`,
          resultPerPage: maxResults,
          includeAttributes: true,
        }
      );

      // AQL returns { values: [...] } or { objectEntries: [...] }
      const objects = result?.values || result?.objectEntries || [];

      // Inject attribute name mapping into each object for later transformation
      for (const obj of objects) {
        (obj as any)._attrIdToName = attrIdToName;
      }

      return objects;
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

    // Create jira_assets_use_cases table - links to native projects
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${tenantId}".jira_assets_use_cases (
        id SERIAL PRIMARY KEY,
        jira_object_id VARCHAR(100) NOT NULL UNIQUE,
        project_id INTEGER REFERENCES "${tenantId}".projects(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        last_synced_at TIMESTAMP,
        sync_status VARCHAR(50) DEFAULT 'synced',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add _source column to projects table for plugin identification
    // This allows the slot system to recognize plugin-sourced projects
    await sequelize.query(`
      ALTER TABLE "${tenantId}".projects
      ADD COLUMN IF NOT EXISTS _source VARCHAR(100)
    `);

    // Create indexes for jira_assets_use_cases
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_jira_use_cases_jira_object_id
      ON "${tenantId}".jira_assets_use_cases(jira_object_id)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_jira_use_cases_sync_status
      ON "${tenantId}".jira_assets_use_cases(sync_status)
    `);

    // Create sequence for UC-ID generation
    await sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS "${tenantId}".jira_use_case_uc_id_seq START 1
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
      // Delete all JIRA-imported projects (by UC-ID pattern)
      const deleteResult: any = await sequelize.query(
        `DELETE FROM "${tenantId}".projects WHERE uc_id LIKE 'UC-J%' OR uc_id LIKE 'jira-assets-%' RETURNING id`,
        { type: "SELECT" }
      );
      totalUseCases = deleteResult?.length || 0;
    } catch {
      // Table may not exist
    }

    // Drop tables in correct order (dependent tables first)
    await sequelize.query(`DROP TABLE IF EXISTS "${tenantId}".jira_assets_sync_history CASCADE`);
    await sequelize.query(`DROP TABLE IF EXISTS "${tenantId}".jira_assets_use_cases CASCADE`);
    await sequelize.query(`DROP TABLE IF EXISTS "${tenantId}".jira_assets_config CASCADE`);

    // Drop sequence
    await sequelize.query(`DROP SEQUENCE IF EXISTS "${tenantId}".jira_use_case_uc_id_seq`);

    // Remove _source column from projects table (clean up)
    await sequelize.query(`
      ALTER TABLE "${tenantId}".projects
      DROP COLUMN IF EXISTS _source
    `);

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

export async function testConnection(config: JiraAssetsConfig, context?: { sequelize?: any; tenantId?: string }): Promise<TestConnectionResult> {
  try {
    let apiToken = config.api_token;

    // If no api_token provided but we have context, try to load from saved config
    if (!apiToken && context?.sequelize && context?.tenantId) {
      try {
        const savedConfigs: any[] = await context.sequelize.query(
          `SELECT api_token_encrypted FROM "${context.tenantId}".jira_assets_config LIMIT 1`,
          { type: "SELECT" }
        );
        if (savedConfigs.length > 0 && savedConfigs[0].api_token_encrypted) {
          apiToken = Buffer.from(savedConfigs[0].api_token_encrypted, "base64").toString("utf-8");
        }
      } catch {
        // Table might not exist yet
      }
    }

    if (!config.jira_base_url || !config.workspace_id || !config.email || !apiToken) {
      throw new Error("All connection parameters are required");
    }

    const client = new JiraAssetsClient(
      config.jira_base_url,
      config.workspace_id,
      config.email,
      apiToken,
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

    // Get existing records with project_id
    const existingRecords: any[] = await sequelize.query(
      `SELECT jira_object_id, project_id, data FROM "${tenantId}".jira_assets_use_cases`,
      { type: "SELECT" }
    );
    const existingMap = new Map(existingRecords.map((r) => [r.jira_object_id, r]));

    let objectsCreated = 0;
    let objectsUpdated = 0;
    let objectsDeleted = 0;
    const now = new Date();

    // Process each JIRA object
    for (const jiraObj of jiraObjects) {
      const jiraObjectId = String(jiraObj.id);
      const existing = existingMap.get(jiraObjectId);

      // Build data object to store - use injected attrIdToName mapping
      const attrIdToName = (jiraObj as any)._attrIdToName || {};
      const transformedAttrs = transformAttributes(jiraObj.attributes || [], attrIdToName);

      // Extract name and description
      const name = jiraObj.label || transformedAttrs["Name"] || `JIRA-${jiraObj.objectKey}`;
      const description = transformedAttrs["Description / Purpose"] || transformedAttrs["Description"] || "";

      const data = {
        id: jiraObj.id,
        objectKey: jiraObj.objectKey,
        label: jiraObj.label,
        objectType: jiraObj.objectType,
        attributes: transformedAttrs,
        created: jiraObj.created,
        updated: jiraObj.updated,
      };

      if (!existing) {
        // Create native project entry with _source for plugin identification
        const ucId = await generateUcId(tenantId, sequelize);
        const projectResult: any[] = await sequelize.query(
          `INSERT INTO "${tenantId}".projects
           (uc_id, project_title, owner, start_date, goal, geography, last_updated, created_at, _source)
           VALUES (:ucId, :title, 1, :startDate, :goal, 1, :lastUpdated, :createdAt, 'jira-assets')
           RETURNING id`,
          {
            replacements: {
              ucId,
              title: name,
              startDate: now,
              goal: description || "Imported from JIRA Assets",
              lastUpdated: now,
              createdAt: now,
            },
            type: "SELECT",
          }
        );
        const projectId = projectResult[0].id;

        // Create JIRA link record
        await sequelize.query(
          `INSERT INTO "${tenantId}".jira_assets_use_cases
           (jira_object_id, project_id, data, last_synced_at, sync_status)
           VALUES (:jiraObjectId, :projectId, :data, :lastSyncedAt, 'synced')`,
          {
            replacements: {
              jiraObjectId,
              projectId,
              data: JSON.stringify(data),
              lastSyncedAt: now,
            },
          }
        );
        objectsCreated++;
      } else {
        // Update native project
        await sequelize.query(
          `UPDATE "${tenantId}".projects
           SET project_title = :title, goal = :goal, last_updated = :lastUpdated
           WHERE id = :projectId`,
          {
            replacements: {
              title: name,
              goal: description || "Imported from JIRA Assets",
              lastUpdated: now,
              projectId: existing.project_id,
            },
          }
        );

        // Update JIRA data
        await sequelize.query(
          `UPDATE "${tenantId}".jira_assets_use_cases
           SET data = :data, last_synced_at = :lastSyncedAt, sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
           WHERE jira_object_id = :jiraObjectId`,
          {
            replacements: {
              data: JSON.stringify(data),
              lastSyncedAt: now,
              jiraObjectId,
            },
          }
        );
        objectsUpdated++;
      }
      existingMap.delete(jiraObjectId);
    }

    // Delete objects that no longer exist in JIRA
    const remainingIds = Array.from(existingMap.keys());
    for (const jiraObjectId of remainingIds) {
      const record = existingMap.get(jiraObjectId);
      // Delete native project (JIRA link deleted by CASCADE)
      if (record?.project_id) {
        await sequelize.query(
          `DELETE FROM "${tenantId}".projects WHERE id = :projectId`,
          { replacements: { projectId: record.project_id } }
        );
      }
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

function transformAttributes(attributes: any, attrIdToName?: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};

  // Handle case where attributes is not iterable
  if (!attributes || !Array.isArray(attributes)) {
    return result;
  }

  for (const attr of attributes) {
    // Try to get name from: objectTypeAttribute.name, then ID->name mapping, then fall back to ID
    const attrId = attr.objectTypeAttributeId || attr.id;
    const name = attr.objectTypeAttribute?.name ||
                 (attrIdToName && attrId ? attrIdToName[attrId] : null) ||
                 attr.name ||
                 attrId;
    if (!name) continue;

    const values = attr.objectAttributeValues || attr.values || [];
    if (!Array.isArray(values) || values.length === 0) {
      result[name] = attr.value || attr.displayValue || null;
    } else if (values.length === 1) {
      result[name] = values[0].displayValue || values[0].value;
    } else {
      result[name] = values.map((v: any) => v.displayValue || v.value);
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

// ========== PLUGIN METADATA ==========

export const metadata: PluginMetadata = {
  name: "Jira Assets Integration",
  version: "1.0.0",
  author: "VerifyWise",
  description: "Import AI Systems from Jira Service Management Assets as use-cases",
};

// ========== DATA PROVIDERS ==========
// Declares what data this plugin can provide to core VerifyWise

export const dataProviders = {
  // This plugin provides use-cases/projects data
  "use-cases": {
    enabled: true,
    // Transform JIRA use cases to match the Project interface expected by the frontend
    async getData(ctx: { sequelize: any; tenantId: string }): Promise<any[]> {
      const { sequelize, tenantId } = ctx;

      try {
        const useCases: any[] = await sequelize.query(
          `SELECT * FROM "${tenantId}".jira_assets_use_cases ORDER BY created_at DESC`,
          { type: "SELECT" }
        );

        // Transform to match Project interface (with JIRA-specific handling)
        return useCases.map((uc) => {
          const data = typeof uc.data === 'string' ? JSON.parse(uc.data) : uc.data;
          const name = data?.label || data?.attributes?.Name || uc.uc_id;
          const objectKey = data?.objectKey || '';

          return {
            id: `jira-assets-${uc.id}`, // Prefix with plugin key for frontend parsing
            project_title: name,
            uc_id: uc.uc_id,
            jira_object_key: objectKey,
            owner: null,
            users: [],
            start_date: data?.created || uc.created_at,
            // JIRA items don't have VW-specific fields - frontend handles null gracefully
            ai_risk_classification: null,
            type_of_high_risk_role: null,
            goal: data?.attributes?.Description || data?.attributes?.Purpose || "",
            last_updated: data?.updated || uc.updated_at,
            last_updated_by: null,
            is_organizational: false,
            framework: [],
            members: [],
            // Mark as JIRA-sourced for frontend to handle differently
            _source: "jira-assets",
            _jira_data: data,
            _sync_status: uc.sync_status,
          };
        });
      } catch (error) {
        console.error("[JiraAssets] dataProviders.use-cases.getData error:", error);
        return [];
      }
    },
  },
};

// ========== PLUGIN ROUTER ==========

/**
 * Helper to load config from jira_assets_config table
 * Used when ctx.configuration doesn't have the JIRA config
 */
async function loadConfigFromDb(sequelize: any, tenantId: string): Promise<any> {
  try {
    const configs: any[] = await sequelize.query(
      `SELECT * FROM "${tenantId}".jira_assets_config LIMIT 1`,
      { type: "SELECT" }
    );
    return configs.length > 0 ? configs[0] : null;
  } catch {
    return null;
  }
}

/**
 * GET /config - Get current configuration
 */
async function handleGetConfig(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId } = ctx;

  // Migration: ensure deployment_type column exists
  try {
    await sequelize.query(
      `ALTER TABLE "${tenantId}".jira_assets_config ADD COLUMN IF NOT EXISTS deployment_type VARCHAR(20) DEFAULT 'cloud'`
    );
  } catch {
    // Column might already exist
  }

  try {
    const configs: any[] = await sequelize.query(
      `SELECT id, jira_base_url, workspace_id, email, deployment_type, selected_schema_id, selected_object_type_id,
              sync_enabled, sync_interval_hours, last_sync_at, last_sync_status, last_sync_message,
              CASE WHEN api_token_encrypted IS NOT NULL AND api_token_encrypted != '' THEN true ELSE false END as has_api_token
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

  // Migration: ensure deployment_type column exists
  try {
    await sequelize.query(
      `ALTER TABLE "${tenantId}".jira_assets_config ADD COLUMN IF NOT EXISTS deployment_type VARCHAR(20) DEFAULT 'cloud'`
    );
  } catch {
    // Column might already exist or table structure different
  }

  // Check if config already exists
  const existing: any[] = await sequelize.query(
    `SELECT id, api_token_encrypted FROM "${tenantId}".jira_assets_config LIMIT 1`,
    { type: "SELECT" }
  );

  const isUpdate = existing.length > 0;
  const hasExistingToken = isUpdate && existing[0].api_token_encrypted;

  // Validate - api_token is only required for new configs or if no token exists
  if (!body.jira_base_url) {
    return { status: 400, data: { success: false, errors: ["JIRA Base URL is required"] } };
  }
  if (!body.workspace_id) {
    return { status: 400, data: { success: false, errors: ["Workspace ID is required"] } };
  }
  if (!body.email) {
    return { status: 400, data: { success: false, errors: ["Email is required"] } };
  }
  if (!body.api_token && !hasExistingToken) {
    return { status: 400, data: { success: false, errors: ["API Token is required"] } };
  }

  if (isUpdate) {
    // Update existing config
    if (body.api_token) {
      // New token provided - update it
      const iv = Math.random().toString(36).substring(2, 15);
      const encryptedToken = Buffer.from(body.api_token).toString("base64");
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
      // No new token - keep existing token
      await sequelize.query(
        `UPDATE "${tenantId}".jira_assets_config
         SET jira_base_url = :jiraBaseUrl, workspace_id = :workspaceId, email = :email,
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
    }
  } else {
    // New config - api_token is required (already validated above)
    const iv = Math.random().toString(36).substring(2, 15);
    const encryptedToken = Buffer.from(body.api_token).toString("base64");
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
  const { configuration, sequelize, tenantId } = ctx;


  // If configuration not provided via context, load from our own table
  let config = configuration;
  if (!config?.jira_base_url || !config?.workspace_id) {
    const configs: any[] = await sequelize.query(
      `SELECT * FROM "${tenantId}".jira_assets_config LIMIT 1`,
      { type: "SELECT" }
    );
    if (configs.length > 0) {
      config = configs[0];
    }
  }

  if (!config?.jira_base_url || !config?.workspace_id) {
    return {
      status: 400,
      data: { error: "JIRA not configured" },
    };
  }

  try {
    // Decrypt API token
    const apiToken = Buffer.from(config.api_token_encrypted || "", "base64").toString("utf-8") ||
                     config.api_token;

    const client = new JiraAssetsClient(
      config.jira_base_url,
      config.workspace_id,
      config.email,
      apiToken,
      config.deployment_type || "cloud"
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
  const { configuration, params, sequelize, tenantId } = ctx;
  const schemaId = params.schemaId;

  // Load config from database if not in context
  let config = configuration;
  if (!config?.jira_base_url || !config?.workspace_id) {
    config = await loadConfigFromDb(sequelize, tenantId);
  }

  if (!config?.jira_base_url || !config?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  try {
    const apiToken = Buffer.from(config.api_token_encrypted || "", "base64").toString("utf-8") ||
                     config.api_token;

    const client = new JiraAssetsClient(
      config.jira_base_url,
      config.workspace_id,
      config.email,
      apiToken,
      config.deployment_type || "cloud"
    );

    const objectTypes = await client.getObjectTypes(schemaId);
    return { status: 200, data: objectTypes };
  } catch (error: any) {
    console.error("[JiraAssets] getObjectTypes error:", error.message);
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * GET /object-types/:objectTypeId/attributes - Get attributes for an object type
 */
async function handleGetAttributes(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { configuration, params, sequelize, tenantId } = ctx;
  const objectTypeId = params.objectTypeId;

  // Load config from database if not in context
  let config = configuration;
  if (!config?.jira_base_url || !config?.workspace_id) {
    config = await loadConfigFromDb(sequelize, tenantId);
  }

  if (!config?.jira_base_url || !config?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  try {
    const apiToken = Buffer.from(config.api_token_encrypted || "", "base64").toString("utf-8") ||
                     config.api_token;

    const client = new JiraAssetsClient(
      config.jira_base_url,
      config.workspace_id,
      config.email,
      apiToken,
      config.deployment_type || "cloud"
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
  const { configuration, params, sequelize, tenantId } = ctx;
  const objectTypeId = params.objectTypeId;


  // Load config from database if not in context
  let config = configuration;
  if (!config?.jira_base_url || !config?.workspace_id) {
    config = await loadConfigFromDb(sequelize, tenantId);
  }

  if (!config?.jira_base_url || !config?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  try {
    const apiToken = Buffer.from(config.api_token_encrypted || "", "base64").toString("utf-8") ||
                     config.api_token;

    const client = new JiraAssetsClient(
      config.jira_base_url,
      config.workspace_id,
      config.email,
      apiToken,
      config.deployment_type || "cloud"
    );

    const objects = await client.getObjects(objectTypeId);

    // Transform objects for UI - use injected attrIdToName mapping
    const transformed = objects.map((obj) => {
      const attrIdToName = (obj as any)._attrIdToName || {};
      return {
        id: obj.id,
        key: obj.objectKey,
        name: obj.label,
        attributes: transformAttributes(obj.attributes, attrIdToName),
        created: obj.created,
        updated: obj.updated,
      };
    });

    return { status: 200, data: transformed };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * POST /import - Import selected JIRA objects
 */
async function handleImportObjects(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, body, configuration } = ctx;


  const { object_ids } = body;

  if (!object_ids || !Array.isArray(object_ids) || object_ids.length === 0) {
    return { status: 400, data: { error: "No objects selected for import" } };
  }


  // Load config from database if not in context
  let config = configuration;
  if (!config?.jira_base_url || !config?.workspace_id) {
    config = await loadConfigFromDb(sequelize, tenantId);
  }

  if (!config?.jira_base_url || !config?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  try {
    const apiToken = Buffer.from(config.api_token_encrypted || "", "base64").toString("utf-8") ||
                     config.api_token;

    const client = new JiraAssetsClient(
      config.jira_base_url,
      config.workspace_id,
      config.email,
      apiToken,
      config.deployment_type || "cloud"
    );

    const now = new Date();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Fetch attribute definitions once for ID -> name mapping
    let attrIdToName: Record<string, string> = {};
    if (config.selected_object_type_id) {
      const attrDefs = await client.getAttributes(config.selected_object_type_id);
      for (const attr of attrDefs) {
        attrIdToName[attr.id] = attr.name;
      }
    }

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
        const jiraObjectId = String(jiraObj.id);
        const transformedAttrs = transformAttributes(jiraObj.attributes, attrIdToName);

        // Extract name and description
        const name = jiraObj.label || transformedAttrs["Name"] || `JIRA-${jiraObj.objectKey}`;
        const description = transformedAttrs["Description / Purpose"] || transformedAttrs["Description"] || "";

        // Generate UC-ID
        const ucId = await generateUcId(tenantId, sequelize);

        // Create native project entry with _source for plugin identification
        const projectResult: any[] = await sequelize.query(
          `INSERT INTO "${tenantId}".projects
           (uc_id, project_title, owner, start_date, goal, geography, last_updated, created_at, _source)
           VALUES (:ucId, :title, 1, :startDate, :goal, 1, :lastUpdated, :createdAt, 'jira-assets')
           RETURNING id`,
          {
            replacements: {
              ucId,
              title: name,
              startDate: now,
              goal: description || "Imported from JIRA Assets",
              lastUpdated: now,
              createdAt: now,
            },
            type: "SELECT",
          }
        );
        const projectId = projectResult[0].id;

        // Store full JIRA data with project link
        const data = {
          id: jiraObj.id,
          objectKey: jiraObj.objectKey,
          label: jiraObj.label,
          objectType: jiraObj.objectType,
          attributes: transformedAttrs,
          created: jiraObj.created,
          updated: jiraObj.updated,
        };

        await sequelize.query(
          `INSERT INTO "${tenantId}".jira_assets_use_cases
           (jira_object_id, project_id, data, last_synced_at, sync_status)
           VALUES (:jiraObjectId, :projectId, :data, :lastSyncedAt, 'synced')`,
          {
            replacements: {
              jiraObjectId,
              projectId,
              data: JSON.stringify(data),
              lastSyncedAt: now,
            },
          }
        );

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

  // Load config from database if not in context
  let dbConfig = configuration;
  if (!dbConfig?.jira_base_url || !dbConfig?.workspace_id) {
    dbConfig = await loadConfigFromDb(sequelize, tenantId);
  }

  if (!dbConfig?.jira_base_url || !dbConfig?.workspace_id) {
    return { status: 400, data: { error: "JIRA not configured" } };
  }

  // Decrypt API token
  const apiToken = Buffer.from(dbConfig.api_token_encrypted || "", "base64").toString("utf-8") ||
                   dbConfig.api_token;

  const config: JiraAssetsConfig = {
    jira_base_url: dbConfig.jira_base_url,
    workspace_id: dbConfig.workspace_id,
    email: dbConfig.email,
    api_token: apiToken,
    selected_schema_id: dbConfig.selected_schema_id,
    selected_object_type_id: dbConfig.selected_object_type_id,
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
  const { sequelize, tenantId } = ctx;

  try {
    const useCases: any[] = await sequelize.query(
      `SELECT j.*, p.uc_id, p.project_title as name
       FROM "${tenantId}".jira_assets_use_cases j
       LEFT JOIN "${tenantId}".projects p ON j.project_id = p.id
       ORDER BY j.created_at DESC`,
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
 * GET /use-cases/:id - Get a specific use case by project_id
 * The :id parameter is the projects.id (native project ID)
 * Returns data formatted for the frontend ProjectView
 */
async function handleGetUseCase(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const projectId = params.id; // This is projects.id

  try {
    // Look up by project_id (native project ID)
    const useCases: any[] = await sequelize.query(
      `SELECT * FROM "${tenantId}".jira_assets_use_cases WHERE project_id = :projectId`,
      { replacements: { projectId }, type: "SELECT" }
    );

    if (useCases.length === 0) {
      return { status: 404, data: { error: "Use case not found" } };
    }

    const uc = useCases[0];
    const data = typeof uc.data === 'string' ? JSON.parse(uc.data) : uc.data;

    // Fetch native project data for complete info
    const projects: any[] = await sequelize.query(
      `SELECT * FROM "${tenantId}".projects WHERE id = :projectId`,
      { replacements: { projectId }, type: "SELECT" }
    );
    const nativeProject = projects[0] || {};

    // Transform to match Project interface expected by frontend
    // Use project_id (from projects table) as id so native APIs work
    const transformedUseCase = {
      id: uc.project_id,
      uc_id: nativeProject.uc_id || uc.uc_id,
      project_title: nativeProject.project_title || data?.label || data?.attributes?.Name || uc.uc_id,
      owner: nativeProject.owner || null,
      members: [],
      start_date: nativeProject.start_date || data?.created || uc.created_at,
      ai_risk_classification: nativeProject.ai_risk_classification || null,
      type_of_high_risk_role: nativeProject.type_of_high_risk_role || null,
      goal: nativeProject.goal || data?.attributes?.Description || data?.attributes?.Purpose || "",
      last_updated: nativeProject.last_updated || data?.updated || uc.updated_at,
      last_updated_by: nativeProject.last_updated_by || null,
      framework: [],
      monitored_regulations_and_standards: [],
      // Plugin-specific fields
      _source: "jira-assets",
      _jira_use_case_id: uc.id,
      _jira_data: data,
      _sync_status: uc.sync_status,
    };

    return { status: 200, data: transformedUseCase };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

/**
 * DELETE /use-cases/:id - Delete a use case by project_id
 * The :id parameter is the projects.id (native project ID)
 * Deletes the native project (cascades to jira_assets_use_cases via FK)
 */
async function handleDeleteUseCase(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const projectId = params.id; // This is projects.id

  try {
    // Delete the native project (cascades to jira_assets_use_cases via FK)
    await sequelize.query(
      `DELETE FROM "${tenantId}".projects WHERE id = :projectId`,
      { replacements: { projectId } }
    );

    return { status: 200, data: { success: true } };
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

  // Attribute Mappings (kept for reference but not used)
  "GET /vw-attributes": handleGetVWAttributes,
  "GET /mappings": handleGetMappings,
  "POST /mappings": handleSaveMappings,

  // Schema & Object Type selection
  "GET /schemas": handleGetSchemas,
  "GET /schemas/:schemaId/object-types": handleGetObjectTypes,
  "GET /object-types/:objectTypeId/attributes": handleGetAttributes,
  "GET /object-types/:objectTypeId/objects": handleGetObjects,

  // Import & Sync
  "POST /import": handleImportObjects,
  "POST /sync": handleManualSync,
  "GET /sync/status": handleGetSyncStatus,
  "GET /sync/history": handleGetSyncHistory,

  // Use Cases
  "GET /use-cases": handleGetUseCases,
  "GET /use-cases/:id": handleGetUseCase,
  "DELETE /use-cases/:id": handleDeleteUseCase,
};
