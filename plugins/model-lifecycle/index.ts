/**
 * Model Lifecycle Plugin for VerifyWise
 *
 * This plugin provides configurable model lifecycle phase tracking with
 * approval workflows, document management, and compliance documentation.
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
  file?: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
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

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ========== DEFAULT SEED DATA ==========

const DEFAULT_PHASES = [
  {
    name: 'Registration & Inventory',
    description: 'Initial model registration, ownership assignment, and classification of the AI model.',
    display_order: 1,
    items: [
      { name: 'Model Registration Form', item_type: 'documents', is_required: true, display_order: 1, config: { maxFiles: 5, allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] } },
      { name: 'Unique Model Identifier', item_type: 'text', is_required: true, display_order: 2, config: { placeholder: 'Enter unique model identifier' } },
      { name: 'Model Ownership Record', item_type: 'people', is_required: true, display_order: 3, config: { maxPeople: 10, roles: ['Owner', 'Co-Owner', 'Steward'] } },
      { name: 'Purpose & Intended Use', item_type: 'textarea', is_required: true, display_order: 4, config: { placeholder: 'Describe the purpose and intended use of this model' } },
      { name: 'Regulatory / Risk Classification', item_type: 'classification', is_required: true, display_order: 5, config: { levels: ['Minimal', 'Low', 'Medium', 'High', 'Critical'] } },
      { name: 'Model Dependencies', item_type: 'textarea', is_required: false, display_order: 6, config: { placeholder: 'List any model dependencies or upstream/downstream systems' } },
    ],
  },
  {
    name: 'Design & Development',
    description: 'Documentation of model design, data lineage, feature engineering, and development assessments.',
    display_order: 2,
    items: [
      { name: 'Model Design Document', item_type: 'documents', is_required: true, display_order: 1, config: {} },
      { name: 'Data Lineage & Quality Assessment', item_type: 'documents', is_required: true, display_order: 2, config: {} },
      { name: 'Feature Documentation Sheet', item_type: 'documents', is_required: true, display_order: 3, config: {} },
      { name: 'Explainability Assessment (SHAP/LIME)', item_type: 'documents', is_required: true, display_order: 4, config: {} },
      { name: 'Bias & Fairness Assessment', item_type: 'documents', is_required: true, display_order: 5, config: {} },
      { name: 'Security & Adversarial Robustness Review', item_type: 'documents', is_required: false, display_order: 6, config: {} },
      { name: 'Version Control Log', item_type: 'documents', is_required: false, display_order: 7, config: {} },
    ],
  },
  {
    name: 'Validation & Testing',
    description: 'Validation test plans, performance evaluation, bias testing, and stress testing outputs.',
    display_order: 3,
    items: [
      { name: 'Validation Test Plan', item_type: 'documents', is_required: true, display_order: 1, config: {} },
      { name: 'Performance Evaluation Results', item_type: 'documents', is_required: true, display_order: 2, config: {} },
      { name: 'Bias Testing Results & Mitigation', item_type: 'documents', is_required: true, display_order: 3, config: {} },
      { name: 'Explainability Validation', item_type: 'documents', is_required: true, display_order: 4, config: {} },
      { name: 'Stress / Adversarial Test Outputs', item_type: 'documents', is_required: false, display_order: 5, config: {} },
    ],
  },
  {
    name: 'Deployment & Operational Readiness',
    description: 'Pre-deployment checklists, rollback plans, deployment records, and governance approval.',
    display_order: 4,
    items: [
      { name: 'Deployment Readiness Checklist', item_type: 'checklist', is_required: true, display_order: 1, config: { defaultItems: ['Infrastructure validated', 'Security review complete', 'Performance benchmarks met', 'Monitoring configured', 'Rollback tested'] } },
      { name: 'Rollback & Contingency Plan', item_type: 'documents', is_required: true, display_order: 2, config: {} },
      { name: 'Deployment Record', item_type: 'documents', is_required: true, display_order: 3, config: {} },
      { name: 'Versioning History Log', item_type: 'textarea', is_required: false, display_order: 4, config: { placeholder: 'Provide versioning history for this deployment' } },
      { name: 'Model Acceptance & Governance Approval', item_type: 'approval', is_required: true, display_order: 5, config: { requiredApprovers: 2 } },
    ],
  },
  {
    name: 'Monitoring & Incident Management',
    description: 'Ongoing model monitoring, drift assessment, stability reports, and incident management.',
    display_order: 5,
    items: [
      { name: 'Monitoring Plan', item_type: 'documents', is_required: true, display_order: 1, config: {} },
      { name: 'Drift Assessment Reports', item_type: 'documents', is_required: true, display_order: 2, config: {} },
      { name: 'Operational Stability Reports', item_type: 'documents', is_required: false, display_order: 3, config: {} },
      { name: 'Incident Response SOP', item_type: 'documents', is_required: true, display_order: 4, config: {} },
      { name: 'Model Incident Log', item_type: 'documents', is_required: false, display_order: 5, config: {} },
    ],
  },
  {
    name: 'Human-in-the-Loop Oversight',
    description: 'Human oversight procedures, manual review logs, escalation protocols, and ethics review.',
    display_order: 6,
    items: [
      { name: 'HITL Procedure', item_type: 'documents', is_required: true, display_order: 1, config: {} },
      { name: 'Manual Review Logs', item_type: 'documents', is_required: false, display_order: 2, config: {} },
      { name: 'Override / Escalation Log', item_type: 'documents', is_required: false, display_order: 3, config: {} },
      { name: 'Ethics Review Committee Approvals', item_type: 'approval', is_required: true, display_order: 4, config: { requiredApprovers: 3 } },
    ],
  },
];

// ========== PLUGIN LIFECYCLE METHODS ==========

/**
 * Install the Model Lifecycle plugin.
 * Creates 7 tables in public schema with organization_id and seeds default phases/items.
 */
export async function install(
  _userId: number,
  organizationId: number,
  _config: any,
  context: PluginContext
): Promise<InstallResult> {
  try {
    const { sequelize } = context;

    // 1. model_lifecycle_phases
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS model_lifecycle_phases (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_model_lifecycle_phases_org_id
      ON model_lifecycle_phases(organization_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_model_lifecycle_phases_display_order
      ON model_lifecycle_phases(organization_id, display_order);
    `);

    // 2. model_lifecycle_items
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS model_lifecycle_items (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        phase_id INTEGER NOT NULL
          REFERENCES model_lifecycle_phases(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        item_type VARCHAR(50) NOT NULL DEFAULT 'text',
        is_required BOOLEAN NOT NULL DEFAULT false,
        display_order INTEGER NOT NULL DEFAULT 0,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_model_lifecycle_items_org_id
      ON model_lifecycle_items(organization_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_model_lifecycle_items_phase_id
      ON model_lifecycle_items(organization_id, phase_id);
    `);

    // 3. model_lifecycle_values
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS model_lifecycle_values (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        model_inventory_id INTEGER NOT NULL
          REFERENCES model_inventories(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL
          REFERENCES model_lifecycle_items(id) ON DELETE CASCADE,
        value_text TEXT,
        value_json JSONB,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT model_lifecycle_values_org_model_item_unique UNIQUE(organization_id, model_inventory_id, item_id)
      );
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_model_lifecycle_values_org_id
      ON model_lifecycle_values(organization_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_model_lifecycle_values_model_id
      ON model_lifecycle_values(organization_id, model_inventory_id);
    `);

    // 4. model_lifecycle_item_files
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS model_lifecycle_item_files (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        value_id INTEGER NOT NULL
          REFERENCES model_lifecycle_values(id) ON DELETE CASCADE,
        file_id INTEGER NOT NULL
          REFERENCES files(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT model_lifecycle_item_files_org_value_file_unique UNIQUE(organization_id, value_id, file_id)
      );
    `);

    // 5. model_lifecycle_item_people (for "people" field type)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS model_lifecycle_item_people (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        value_id INTEGER NOT NULL
          REFERENCES model_lifecycle_values(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT model_lifecycle_item_people_org_value_user_unique UNIQUE(organization_id, value_id, user_id)
      );
    `);

    // 6. model_lifecycle_item_approvals (for "approval" field type)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS model_lifecycle_item_approvals (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        value_id INTEGER NOT NULL
          REFERENCES model_lifecycle_values(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL
          REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        decided_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT model_lifecycle_item_approvals_org_value_user_unique UNIQUE(organization_id, value_id, user_id)
      );
    `);

    // 7. model_lifecycle_change_history
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS model_lifecycle_change_history (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        model_inventory_id INTEGER NOT NULL,
        item_id INTEGER,
        change_type VARCHAR(50) NOT NULL,
        changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        old_value JSONB,
        new_value JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_model_lifecycle_change_history_org_id
      ON model_lifecycle_change_history(organization_id);
    `);

    // Seed default phases and items (only if no phases exist yet for this org)
    const existingPhases = await sequelize.query(
      `SELECT COUNT(*) as count FROM model_lifecycle_phases WHERE organization_id = :organizationId;`,
      { replacements: { organizationId }, type: sequelize.QueryTypes?.SELECT || "SELECT" }
    );

    const phaseCount = Array.isArray(existingPhases)
      ? parseInt((existingPhases[0] as any)?.count ?? "0")
      : 0;

    if (phaseCount === 0) {
      for (const phase of DEFAULT_PHASES) {
        const phaseResult = await sequelize.query(
          `INSERT INTO model_lifecycle_phases (organization_id, name, description, display_order, is_active)
           VALUES (:organizationId, :name, :description, :display_order, true)
           RETURNING id;`,
          {
            replacements: {
              organizationId,
              name: phase.name,
              description: phase.description,
              display_order: phase.display_order,
            },
          }
        );

        const phaseId = Array.isArray(phaseResult[0]) && phaseResult[0].length > 0
          ? phaseResult[0][0].id
          : phaseResult[0]?.id;

        for (const item of phase.items) {
          await sequelize.query(
            `INSERT INTO model_lifecycle_items
              (organization_id, phase_id, name, item_type, is_required, display_order, config, is_active)
             VALUES (:organizationId, :phase_id, :name, :item_type, :is_required, :display_order, :config, true);`,
            {
              replacements: {
                organizationId,
                phase_id: phaseId,
                name: item.name,
                item_type: item.item_type,
                is_required: item.is_required,
                display_order: item.display_order,
                config: JSON.stringify(item.config),
              },
            }
          );
        }
      }
    }

    return {
      success: true,
      message: `Model Lifecycle plugin installed successfully. ${phaseCount === 0 ? `Seeded ${DEFAULT_PHASES.length} default phases.` : 'Existing phases preserved.'}`,
      installedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Installation failed: ${error.message}`);
  }
}

/**
 * Uninstall the Model Lifecycle plugin.
 * Deletes associated files and all organization's data (tables remain shared).
 */
export async function uninstall(
  _userId: number,
  organizationId: number,
  context: PluginContext
): Promise<UninstallResult> {
  try {
    const { sequelize } = context;

    // First, delete actual files that were linked to lifecycle items
    const linkedFiles = await sequelize.query(
      `SELECT DISTINCT file_id FROM model_lifecycle_item_files WHERE organization_id = :organizationId;`,
      { replacements: { organizationId }, type: sequelize.QueryTypes?.SELECT || "SELECT" }
    ) as { file_id: number }[];

    if (linkedFiles.length > 0) {
      const fileIds = linkedFiles.map((f) => f.file_id);
      await sequelize.query(
        `DELETE FROM files WHERE id IN (:fileIds) AND organization_id = :organizationId;`,
        { replacements: { fileIds, organizationId } }
      );
    }

    // Delete organization's data from plugin tables (order matters due to FK constraints)
    await sequelize.query(
      `DELETE FROM model_lifecycle_change_history WHERE organization_id = :organizationId;`,
      { replacements: { organizationId } }
    );
    await sequelize.query(
      `DELETE FROM model_lifecycle_item_approvals WHERE organization_id = :organizationId;`,
      { replacements: { organizationId } }
    );
    await sequelize.query(
      `DELETE FROM model_lifecycle_item_people WHERE organization_id = :organizationId;`,
      { replacements: { organizationId } }
    );
    await sequelize.query(
      `DELETE FROM model_lifecycle_item_files WHERE organization_id = :organizationId;`,
      { replacements: { organizationId } }
    );
    await sequelize.query(
      `DELETE FROM model_lifecycle_values WHERE organization_id = :organizationId;`,
      { replacements: { organizationId } }
    );
    await sequelize.query(
      `DELETE FROM model_lifecycle_items WHERE organization_id = :organizationId;`,
      { replacements: { organizationId } }
    );
    await sequelize.query(
      `DELETE FROM model_lifecycle_phases WHERE organization_id = :organizationId;`,
      { replacements: { organizationId } }
    );

    return {
      success: true,
      message: `Model Lifecycle plugin uninstalled successfully. ${linkedFiles.length} files and all lifecycle data removed.`,
      uninstalledAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Uninstallation failed: ${error.message}`);
  }
}

/**
 * Validate plugin configuration.
 */
export function validateConfig(_config: any): ValidationResult {
  return { valid: true, errors: [] };
}

// ========== ROUTE HANDLERS: CONFIG ==========

async function handleGetConfig(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, query } = ctx;
  const includeInactive = query.includeInactive === "true";
  const activeFilter = includeInactive ? "" : "AND is_active = true";

  const phases = await sequelize.query(
    `SELECT id, name, description, display_order, is_active, created_at, updated_at
     FROM model_lifecycle_phases
     WHERE organization_id = :organizationId ${activeFilter}
     ORDER BY display_order ASC;`,
    {
      type: sequelize.QueryTypes?.SELECT || "SELECT",
      replacements: { organizationId },
    }
  );

  for (const phase of (phases as any[])) {
    const itemActiveFilter = includeInactive ? "" : "AND is_active = true";
    phase.items = await sequelize.query(
      `SELECT id, phase_id, name, description, item_type, is_required,
              display_order, config, is_active, created_at, updated_at
       FROM model_lifecycle_items
       WHERE organization_id = :organizationId AND phase_id = :phaseId ${itemActiveFilter}
       ORDER BY display_order ASC;`,
      {
        type: sequelize.QueryTypes?.SELECT || "SELECT",
        replacements: { organizationId, phaseId: phase.id },
      }
    );
  }

  return { status: 200, data: phases };
}

async function handleCreatePhase(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, body } = ctx;

  let displayOrder = body.display_order;
  if (displayOrder === undefined) {
    const maxResult = await sequelize.query(
      `SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order
       FROM model_lifecycle_phases
       WHERE organization_id = :organizationId;`,
      {
        type: sequelize.QueryTypes?.SELECT || "SELECT",
        replacements: { organizationId },
      }
    );
    displayOrder = (maxResult[0] as any)?.next_order ?? 1;
  }

  const results = await sequelize.query(
    `INSERT INTO model_lifecycle_phases (organization_id, name, description, display_order)
     VALUES (:organizationId, :name, :description, :display_order)
     RETURNING *;`,
    {
      type: sequelize.QueryTypes?.SELECT || "SELECT",
      replacements: {
        organizationId,
        name: body.name,
        description: body.description || null,
        display_order: displayOrder,
      },
    }
  );

  return { status: 201, data: results[0] };
}

async function handleUpdatePhase(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params, body } = ctx;
  const phaseId = params.id;

  const setClauses: string[] = [];
  const replacements: Record<string, unknown> = { organizationId, phaseId };

  if (body.name !== undefined) { setClauses.push("name = :name"); replacements.name = body.name; }
  if (body.description !== undefined) { setClauses.push("description = :description"); replacements.description = body.description; }
  if (body.display_order !== undefined) { setClauses.push("display_order = :display_order"); replacements.display_order = body.display_order; }
  if (body.is_active !== undefined) { setClauses.push("is_active = :is_active"); replacements.is_active = body.is_active; }

  if (setClauses.length === 0) {
    return { status: 400, data: { message: "No fields to update" } };
  }

  setClauses.push("updated_at = NOW()");

  const results = await sequelize.query(
    `UPDATE model_lifecycle_phases SET ${setClauses.join(", ")}
     WHERE organization_id = :organizationId AND id = :phaseId
     RETURNING *;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements }
  );

  if (!results || results.length === 0) {
    return { status: 404, data: { message: "Phase not found" } };
  }

  return { status: 200, data: results[0] };
}

async function handleDeletePhase(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params } = ctx;
  const phaseId = params.id;

  // First, find and delete all files linked to items in this phase
  const linkedFiles = await sequelize.query(
    `SELECT DISTINCT lf.file_id
     FROM model_lifecycle_item_files lf
     INNER JOIN model_lifecycle_values v ON lf.value_id = v.id
     INNER JOIN model_lifecycle_items i ON v.item_id = i.id
     WHERE i.organization_id = :organizationId AND i.phase_id = :phaseId;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, phaseId } }
  ) as { file_id: number }[];

  if (linkedFiles.length > 0) {
    const fileIds = linkedFiles.map((f) => f.file_id);
    await sequelize.query(
      `DELETE FROM files WHERE organization_id = :organizationId AND id IN (:fileIds);`,
      { replacements: { organizationId, fileIds } }
    );
  }

  // Now delete the phase (items, values, file links cascade)
  await sequelize.query(
    `DELETE FROM model_lifecycle_phases WHERE organization_id = :organizationId AND id = :phaseId;`,
    { replacements: { organizationId, phaseId } }
  );

  return { status: 200, data: { success: true } };
}

async function handleReorderPhases(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, body } = ctx;
  const orderedIds: number[] = body.orderedIds || [];

  for (let i = 0; i < orderedIds.length; i++) {
    await sequelize.query(
      `UPDATE model_lifecycle_phases SET display_order = :order, updated_at = NOW()
       WHERE organization_id = :organizationId AND id = :id;`,
      { replacements: { organizationId, order: i + 1, id: orderedIds[i] } }
    );
  }

  return { status: 200, data: { success: true } };
}

async function handleCreateItem(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params, body } = ctx;
  const phaseId = params.phaseId;

  let displayOrder = body.display_order;
  if (displayOrder === undefined) {
    const maxResult = await sequelize.query(
      `SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order
       FROM model_lifecycle_items
       WHERE organization_id = :organizationId AND phase_id = :phaseId;`,
      { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, phaseId } }
    );
    displayOrder = (maxResult[0] as any)?.next_order ?? 1;
  }

  const results = await sequelize.query(
    `INSERT INTO model_lifecycle_items
       (organization_id, phase_id, name, description, item_type, is_required, display_order, config)
     VALUES (:organizationId, :phase_id, :name, :description, :item_type, :is_required, :display_order, :config)
     RETURNING *;`,
    {
      type: sequelize.QueryTypes?.SELECT || "SELECT",
      replacements: {
        organizationId,
        phase_id: phaseId,
        name: body.name,
        description: body.description || null,
        item_type: body.item_type || "text",
        is_required: body.is_required ?? false,
        display_order: displayOrder,
        config: JSON.stringify(body.config || {}),
      },
    }
  );

  return { status: 201, data: results[0] };
}

async function handleUpdateItem(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params, body } = ctx;
  const itemId = params.id;

  const setClauses: string[] = [];
  const replacements: Record<string, unknown> = { organizationId, itemId };

  if (body.name !== undefined) { setClauses.push("name = :name"); replacements.name = body.name; }
  if (body.description !== undefined) { setClauses.push("description = :description"); replacements.description = body.description; }
  if (body.item_type !== undefined) { setClauses.push("item_type = :item_type"); replacements.item_type = body.item_type; }
  if (body.is_required !== undefined) { setClauses.push("is_required = :is_required"); replacements.is_required = body.is_required; }
  if (body.display_order !== undefined) { setClauses.push("display_order = :display_order"); replacements.display_order = body.display_order; }
  if (body.config !== undefined) { setClauses.push("config = :config"); replacements.config = JSON.stringify(body.config); }
  if (body.is_active !== undefined) { setClauses.push("is_active = :is_active"); replacements.is_active = body.is_active; }

  if (setClauses.length === 0) {
    return { status: 400, data: { message: "No fields to update" } };
  }

  setClauses.push("updated_at = NOW()");

  const results = await sequelize.query(
    `UPDATE model_lifecycle_items SET ${setClauses.join(", ")}
     WHERE organization_id = :organizationId AND id = :itemId
     RETURNING *;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements }
  );

  return { status: 200, data: results[0] || null };
}

async function handleDeleteItem(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params } = ctx;
  const itemId = params.id;

  // First, find and delete all files linked to this item
  const linkedFiles = await sequelize.query(
    `SELECT DISTINCT lf.file_id
     FROM model_lifecycle_item_files lf
     INNER JOIN model_lifecycle_values v ON lf.value_id = v.id
     WHERE v.organization_id = :organizationId AND v.item_id = :itemId;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, itemId } }
  ) as { file_id: number }[];

  if (linkedFiles.length > 0) {
    const fileIds = linkedFiles.map((f) => f.file_id);
    await sequelize.query(
      `DELETE FROM files WHERE organization_id = :organizationId AND id IN (:fileIds);`,
      { replacements: { organizationId, fileIds } }
    );
  }

  // Now delete the item (values and file links cascade)
  await sequelize.query(
    `DELETE FROM model_lifecycle_items WHERE organization_id = :organizationId AND id = :itemId;`,
    { replacements: { organizationId, itemId } }
  );

  return { status: 200, data: { success: true } };
}

async function handleReorderItems(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params, body } = ctx;
  const phaseId = params.phaseId;
  const orderedIds: number[] = body.orderedIds || [];

  for (let i = 0; i < orderedIds.length; i++) {
    await sequelize.query(
      `UPDATE model_lifecycle_items SET display_order = :order, updated_at = NOW()
       WHERE organization_id = :organizationId AND id = :id AND phase_id = :phaseId;`,
      { replacements: { organizationId, order: i + 1, id: orderedIds[i], phaseId } }
    );
  }

  return { status: 200, data: { success: true } };
}

// ========== ROUTE HANDLERS: VALUES ==========

async function handleGetModelLifecycle(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params } = ctx;
  const modelId = params.id;

  const phases = await sequelize.query(
    `SELECT id, name, description, display_order, is_active
     FROM model_lifecycle_phases
     WHERE organization_id = :organizationId AND is_active = true
     ORDER BY display_order ASC;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId } }
  );

  for (const phase of (phases as any[])) {
    const items = await sequelize.query(
      `SELECT i.id, i.phase_id, i.name, i.description, i.item_type, i.is_required,
              i.display_order, i.config, i.is_active
       FROM model_lifecycle_items i
       WHERE i.organization_id = :organizationId AND i.phase_id = :phaseId AND i.is_active = true
       ORDER BY i.display_order ASC;`,
      { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, phaseId: phase.id } }
    );

    const values = await sequelize.query(
      `SELECT v.id, v.model_inventory_id, v.item_id, v.value_text, v.value_json,
              v.updated_by, v.created_at, v.updated_at
       FROM model_lifecycle_values v
       INNER JOIN model_lifecycle_items i ON v.item_id = i.id
       WHERE v.organization_id = :organizationId AND v.model_inventory_id = :modelId AND i.phase_id = :phaseId;`,
      { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, modelId, phaseId: phase.id } }
    );

    // Get files, people, and approvals for values
    const valueIds = (values as any[]).map((v: any) => v.id).filter(Boolean);
    const filesByValue: Record<number, any[]> = {};
    const peopleByValue: Record<number, any[]> = {};
    const approvalsByValue: Record<number, any[]> = {};

    if (valueIds.length > 0) {
      // Fetch files
      const files = await sequelize.query(
        `SELECT lf.id, lf.value_id, lf.file_id, lf.created_at,
                f.filename, f.type AS mimetype
         FROM model_lifecycle_item_files lf
         INNER JOIN files f ON lf.file_id = f.id
         WHERE lf.organization_id = :organizationId AND lf.value_id IN (:valueIds);`,
        { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, valueIds } }
      );
      for (const file of (files as any[])) {
        if (!filesByValue[file.value_id]) filesByValue[file.value_id] = [];
        filesByValue[file.value_id].push(file);
      }

      // Fetch people
      const people = await sequelize.query(
        `SELECT lp.id, lp.value_id, lp.user_id, lp.created_at,
                u.name, u.surname, u.email
         FROM model_lifecycle_item_people lp
         INNER JOIN users u ON lp.user_id = u.id
         WHERE lp.organization_id = :organizationId AND lp.value_id IN (:valueIds);`,
        { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, valueIds } }
      );
      for (const person of (people as any[])) {
        if (!peopleByValue[person.value_id]) peopleByValue[person.value_id] = [];
        peopleByValue[person.value_id].push(person);
      }

      // Fetch approvals
      const approvals = await sequelize.query(
        `SELECT la.id, la.value_id, la.user_id, la.status, la.decided_at, la.created_at,
                u.name, u.surname, u.email
         FROM model_lifecycle_item_approvals la
         INNER JOIN users u ON la.user_id = u.id
         WHERE la.organization_id = :organizationId AND la.value_id IN (:valueIds);`,
        { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, valueIds } }
      );
      for (const approval of (approvals as any[])) {
        if (!approvalsByValue[approval.value_id]) approvalsByValue[approval.value_id] = [];
        approvalsByValue[approval.value_id].push(approval);
      }
    }

    // Map values onto items
    const valueByItemId: Record<number, any> = {};
    for (const v of (values as any[])) {
      v.files = filesByValue[v.id] || [];
      v.people = peopleByValue[v.id] || [];
      v.approvals = approvalsByValue[v.id] || [];
      valueByItemId[v.item_id] = v;
    }

    for (const item of (items as any[])) {
      item.value = valueByItemId[item.id] || null;
    }

    phase.items = items;
  }

  return { status: 200, data: phases };
}

async function handleGetProgress(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params } = ctx;
  const modelId = params.id;

  const phaseProgress = await sequelize.query(
    `SELECT
       p.id AS phase_id,
       p.name AS phase_name,
       COUNT(i.id)::int AS total_items,
       COUNT(v.id)::int AS filled_items,
       COUNT(CASE WHEN i.is_required = true THEN 1 END)::int AS required_items,
       COUNT(CASE WHEN i.is_required = true AND v.id IS NOT NULL THEN 1 END)::int AS filled_required_items
     FROM model_lifecycle_phases p
     INNER JOIN model_lifecycle_items i
       ON i.phase_id = p.id AND i.is_active = true AND i.organization_id = :organizationId
     LEFT JOIN model_lifecycle_values v
       ON v.item_id = i.id AND v.model_inventory_id = :modelId AND v.organization_id = :organizationId
       AND (v.value_text IS NOT NULL OR v.value_json IS NOT NULL
            OR EXISTS (
              SELECT 1 FROM model_lifecycle_item_files lf
              WHERE lf.value_id = v.id AND lf.organization_id = :organizationId
            )
            OR EXISTS (
              SELECT 1 FROM model_lifecycle_item_people lp
              WHERE lp.value_id = v.id AND lp.organization_id = :organizationId
            )
            OR EXISTS (
              SELECT 1 FROM model_lifecycle_item_approvals la
              WHERE la.value_id = v.id AND la.organization_id = :organizationId
            ))
     WHERE p.organization_id = :organizationId AND p.is_active = true
     GROUP BY p.id, p.name, p.display_order
     ORDER BY p.display_order ASC;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, modelId } }
  );

  const totals = (phaseProgress as any[]).reduce(
    (acc: any, p: any) => ({
      total_items: acc.total_items + p.total_items,
      filled_items: acc.filled_items + p.filled_items,
      total_required: acc.total_required + p.required_items,
      filled_required: acc.filled_required + p.filled_required_items,
    }),
    { total_items: 0, filled_items: 0, total_required: 0, filled_required: 0 }
  );

  return {
    status: 200,
    data: {
      phases: phaseProgress,
      ...totals,
      completion_percentage:
        totals.total_items > 0
          ? Math.round((totals.filled_items / totals.total_items) * 100)
          : 0,
    },
  };
}

async function handleUpsertValue(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params, body, userId } = ctx;
  const modelId = params.id;
  const itemId = params.itemId;

  const results = await sequelize.query(
    `INSERT INTO model_lifecycle_values
       (organization_id, model_inventory_id, item_id, value_text, value_json, updated_by)
     VALUES (:organizationId, :modelId, :itemId, :value_text, :value_json, :userId)
     ON CONFLICT (organization_id, model_inventory_id, item_id)
     DO UPDATE SET
       value_text = :value_text,
       value_json = :value_json,
       updated_by = :userId,
       updated_at = NOW()
     RETURNING *;`,
    {
      type: sequelize.QueryTypes?.SELECT || "SELECT",
      replacements: {
        organizationId,
        modelId,
        itemId,
        value_text: body.value_text ?? null,
        value_json: body.value_json ? JSON.stringify(body.value_json) : null,
        userId,
      },
    }
  );

  return { status: 200, data: results[0] };
}

async function handleAddFile(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params, body, userId } = ctx;
  const modelId = params.id;
  const itemId = params.itemId;
  const fileId = body.fileId;

  if (!fileId) {
    return { status: 400, data: { message: "fileId is required" } };
  }

  // Ensure a value row exists
  await sequelize.query(
    `INSERT INTO model_lifecycle_values
       (organization_id, model_inventory_id, item_id, updated_by)
     VALUES (:organizationId, :modelId, :itemId, :userId)
     ON CONFLICT (organization_id, model_inventory_id, item_id) DO NOTHING;`,
    { replacements: { organizationId, modelId, itemId, userId } }
  );

  const valueResult = await sequelize.query(
    `SELECT id FROM model_lifecycle_values
     WHERE organization_id = :organizationId AND model_inventory_id = :modelId AND item_id = :itemId;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, modelId, itemId } }
  );

  const valueId = (valueResult[0] as any)?.id;

  const results = await sequelize.query(
    `INSERT INTO model_lifecycle_item_files (organization_id, value_id, file_id)
     VALUES (:organizationId, :valueId, :fileId)
     ON CONFLICT (organization_id, value_id, file_id) DO NOTHING
     RETURNING *;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, valueId, fileId } }
  );

  return { status: 201, data: results[0] || { value_id: valueId, file_id: fileId } };
}

async function handleRemoveFile(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params } = ctx;
  const modelId = params.id;
  const itemId = params.itemId;
  const fileId = params.fileId;

  // Remove link record
  await sequelize.query(
    `DELETE FROM model_lifecycle_item_files
     WHERE organization_id = :organizationId AND file_id = :fileId
     AND value_id = (
       SELECT id FROM model_lifecycle_values
       WHERE organization_id = :organizationId AND model_inventory_id = :modelId AND item_id = :itemId
     );`,
    { replacements: { organizationId, fileId, modelId, itemId } }
  );

  // Also delete the actual file to prevent orphans
  await sequelize.query(
    `DELETE FROM files WHERE organization_id = :organizationId AND id = :fileId;`,
    { replacements: { organizationId, fileId } }
  );

  return { status: 200, data: { success: true } };
}

// ========== ROUTE HANDLERS: PEOPLE ==========

async function handleAddPerson(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params, body, userId } = ctx;
  const modelId = params.id;
  const itemId = params.itemId;
  const personUserId = body.userId;

  if (!personUserId) {
    return { status: 400, data: { message: "userId is required" } };
  }

  // Ensure a value row exists
  await sequelize.query(
    `INSERT INTO model_lifecycle_values
       (organization_id, model_inventory_id, item_id, updated_by)
     VALUES (:organizationId, :modelId, :itemId, :userId)
     ON CONFLICT (organization_id, model_inventory_id, item_id) DO NOTHING;`,
    { replacements: { organizationId, modelId, itemId, userId } }
  );

  const valueResult = await sequelize.query(
    `SELECT id FROM model_lifecycle_values
     WHERE organization_id = :organizationId AND model_inventory_id = :modelId AND item_id = :itemId;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, modelId, itemId } }
  );

  const valueId = (valueResult[0] as any)?.id;

  const results = await sequelize.query(
    `INSERT INTO model_lifecycle_item_people (organization_id, value_id, user_id)
     VALUES (:organizationId, :valueId, :personUserId)
     ON CONFLICT (organization_id, value_id, user_id) DO NOTHING
     RETURNING *;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, valueId, personUserId } }
  );

  return { status: 201, data: results[0] || { value_id: valueId, user_id: personUserId } };
}

async function handleRemovePerson(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params } = ctx;
  const modelId = params.id;
  const itemId = params.itemId;
  const personUserId = params.userId;

  await sequelize.query(
    `DELETE FROM model_lifecycle_item_people
     WHERE organization_id = :organizationId AND user_id = :personUserId
     AND value_id = (
       SELECT id FROM model_lifecycle_values
       WHERE organization_id = :organizationId AND model_inventory_id = :modelId AND item_id = :itemId
     );`,
    { replacements: { organizationId, personUserId, modelId, itemId } }
  );

  return { status: 200, data: { success: true } };
}

// ========== ROUTE HANDLERS: APPROVALS ==========

async function handleAddApprover(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params, body, userId } = ctx;
  const modelId = params.id;
  const itemId = params.itemId;
  const approverUserId = body.userId;

  if (!approverUserId) {
    return { status: 400, data: { message: "userId is required" } };
  }

  // Ensure a value row exists
  await sequelize.query(
    `INSERT INTO model_lifecycle_values
       (organization_id, model_inventory_id, item_id, updated_by)
     VALUES (:organizationId, :modelId, :itemId, :userId)
     ON CONFLICT (organization_id, model_inventory_id, item_id) DO NOTHING;`,
    { replacements: { organizationId, modelId, itemId, userId } }
  );

  const valueResult = await sequelize.query(
    `SELECT id FROM model_lifecycle_values
     WHERE organization_id = :organizationId AND model_inventory_id = :modelId AND item_id = :itemId;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, modelId, itemId } }
  );

  const valueId = (valueResult[0] as any)?.id;

  const results = await sequelize.query(
    `INSERT INTO model_lifecycle_item_approvals (organization_id, value_id, user_id, status)
     VALUES (:organizationId, :valueId, :approverUserId, 'pending')
     ON CONFLICT (organization_id, value_id, user_id) DO NOTHING
     RETURNING *;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, valueId, approverUserId } }
  );

  return { status: 201, data: results[0] || { value_id: valueId, user_id: approverUserId, status: "pending" } };
}

async function handleRemoveApprover(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params } = ctx;
  const modelId = params.id;
  const itemId = params.itemId;
  const approverUserId = params.userId;

  await sequelize.query(
    `DELETE FROM model_lifecycle_item_approvals
     WHERE organization_id = :organizationId AND user_id = :approverUserId
     AND value_id = (
       SELECT id FROM model_lifecycle_values
       WHERE organization_id = :organizationId AND model_inventory_id = :modelId AND item_id = :itemId
     );`,
    { replacements: { organizationId, approverUserId, modelId, itemId } }
  );

  return { status: 200, data: { success: true } };
}

async function handleUpdateApprovalStatus(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, organizationId, params, body } = ctx;
  const modelId = params.id;
  const itemId = params.itemId;
  const approverUserId = params.userId;
  const status = body.status;

  if (!status || !["pending", "approved", "rejected"].includes(status)) {
    return { status: 400, data: { message: "Invalid status. Must be: pending, approved, or rejected" } };
  }

  const results = await sequelize.query(
    `UPDATE model_lifecycle_item_approvals
     SET status = :status, decided_at = ${status === "pending" ? "NULL" : "NOW()"}
     WHERE organization_id = :organizationId AND user_id = :approverUserId
     AND value_id = (
       SELECT id FROM model_lifecycle_values
       WHERE organization_id = :organizationId AND model_inventory_id = :modelId AND item_id = :itemId
     )
     RETURNING *;`,
    { type: sequelize.QueryTypes?.SELECT || "SELECT", replacements: { organizationId, status, approverUserId, modelId, itemId } }
  );

  if (!results || results.length === 0) {
    return { status: 404, data: { message: "Approval record not found" } };
  }

  return { status: 200, data: results[0] };
}

// ========== PLUGIN METADATA ==========

export const metadata: PluginMetadata = {
  name: "Model Lifecycle",
  version: "1.0.0",
  author: "VerifyWise",
  description: "Track AI model lifecycle phases from registration through monitoring with configurable phases, approval workflows, and compliance documentation",
};

// ========== PLUGIN ROUTER ==========

export const router: Record<string, (ctx: PluginRouteContext) => Promise<PluginRouteResponse>> = {
  // Config routes
  "GET /config": handleGetConfig,
  "POST /phases": handleCreatePhase,
  "PUT /phases/:id": handleUpdatePhase,
  "DELETE /phases/:id": handleDeletePhase,
  "PUT /phases/reorder": handleReorderPhases,
  "POST /phases/:phaseId/items": handleCreateItem,
  "PUT /items/:id": handleUpdateItem,
  "DELETE /items/:id": handleDeleteItem,
  "PUT /phases/:phaseId/items/reorder": handleReorderItems,

  // Value routes
  "GET /models/:id/lifecycle": handleGetModelLifecycle,
  "GET /models/:id/lifecycle/progress": handleGetProgress,
  "PUT /models/:id/lifecycle/items/:itemId": handleUpsertValue,

  // File routes
  "POST /models/:id/lifecycle/items/:itemId/files": handleAddFile,
  "DELETE /models/:id/lifecycle/items/:itemId/files/:fileId": handleRemoveFile,

  // People routes
  "POST /models/:id/lifecycle/items/:itemId/people": handleAddPerson,
  "DELETE /models/:id/lifecycle/items/:itemId/people/:userId": handleRemovePerson,

  // Approval routes
  "POST /models/:id/lifecycle/items/:itemId/approvals": handleAddApprover,
  "DELETE /models/:id/lifecycle/items/:itemId/approvals/:userId": handleRemoveApprover,
  "PUT /models/:id/lifecycle/items/:itemId/approvals/:userId": handleUpdateApprovalStatus,
};
