/**
 * Custom Framework Base Package
 *
 * Provides a factory function to create framework plugins with minimal configuration.
 * Uses a struct/impl split: shared struct tables (no organization_id) for template data,
 * per-org impl tables for project-specific implementation records.
 *
 * Struct tables (shared, no org_id):
 *   custom_framework_definitions
 *   custom_framework_level1_struct
 *   custom_framework_level2_struct
 *   custom_framework_level3_struct
 *
 * Per-org tables:
 *   custom_frameworks (per-org record with definition_id FK)
 *   custom_framework_projects
 *   custom_framework_level2_impl
 *   custom_framework_level3_impl
 *   custom_framework_level2_risks
 *   custom_framework_level3_risks
 */

import * as ExcelJS from "exceljs";

// ========== TYPE DEFINITIONS ==========

export interface PluginContext {
  sequelize: any;
}

export interface PluginRouteContext {
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

export interface PluginRouteResponse {
  status?: number;
  data?: any;
  buffer?: any;
  filename?: string;
  contentType?: string;
  headers?: Record<string, string>;
}

export interface FrameworkTemplate {
  name: string;
  description: string;
  version: string;
  is_organizational: boolean;
  hierarchy: {
    type: "two_level" | "three_level";
    level1_name: string;
    level2_name: string;
    level3_name?: string;
  };
  structure: FrameworkLevel1[];
}

export interface FrameworkLevel1 {
  title: string;
  description?: string;
  order_no: number;
  metadata?: Record<string, any>;
  items: FrameworkLevel2[];
}

export interface FrameworkLevel2 {
  title: string;
  description?: string;
  order_no: number;
  summary?: string;
  questions?: string[];
  evidence_examples?: string[];
  metadata?: Record<string, any>;
  items?: FrameworkLevel3[];
}

export interface FrameworkLevel3 {
  title: string;
  description?: string;
  order_no: number;
  summary?: string;
  questions?: string[];
  evidence_examples?: string[];
  metadata?: Record<string, any>;
}

export interface FrameworkPluginConfig {
  key: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  template: FrameworkTemplate;
  fileSource?: string;
  autoImport?: boolean; // If true, auto-import template on install
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ========== SHARED TABLE CREATION (PUBLIC SCHEMA) ==========

async function ensureSharedTables(sequelize: any): Promise<void> {
  // ---- Struct tables (shared, no organization_id) ----

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_framework_definitions (
      id SERIAL PRIMARY KEY,
      plugin_key VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      version VARCHAR(50) DEFAULT '1.0.0',
      is_organizational BOOLEAN DEFAULT FALSE,
      hierarchy_type VARCHAR(50) NOT NULL DEFAULT 'two_level',
      level_1_name VARCHAR(100) NOT NULL DEFAULT 'Category',
      level_2_name VARCHAR(100) NOT NULL DEFAULT 'Control',
      level_3_name VARCHAR(100),
      file_source VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_framework_level1_struct (
      id SERIAL PRIMARY KEY,
      definition_id INTEGER NOT NULL REFERENCES custom_framework_definitions(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      order_no INTEGER NOT NULL DEFAULT 1,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_framework_level2_struct (
      id SERIAL PRIMARY KEY,
      level1_id INTEGER NOT NULL REFERENCES custom_framework_level1_struct(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      order_no INTEGER NOT NULL DEFAULT 1,
      summary TEXT,
      questions TEXT[],
      evidence_examples TEXT[],
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_framework_level3_struct (
      id SERIAL PRIMARY KEY,
      level2_id INTEGER NOT NULL REFERENCES custom_framework_level2_struct(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      order_no INTEGER NOT NULL DEFAULT 1,
      summary TEXT,
      questions TEXT[],
      evidence_examples TEXT[],
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // ---- Per-org tables ----

  // Framework per-org record (links to definition)
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_frameworks (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      definition_id INTEGER REFERENCES custom_framework_definitions(id),
      plugin_key VARCHAR(100),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      version VARCHAR(50) DEFAULT '1.0.0',
      is_organizational BOOLEAN DEFAULT FALSE,
      hierarchy_type VARCHAR(50) NOT NULL DEFAULT 'two_level',
      level_1_name VARCHAR(100) NOT NULL DEFAULT 'Category',
      level_2_name VARCHAR(100) NOT NULL DEFAULT 'Control',
      level_3_name VARCHAR(100),
      file_source VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Add definition_id if missing (for upgrades from old schema)
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'custom_frameworks'
        AND column_name = 'definition_id'
      ) THEN
        ALTER TABLE custom_frameworks ADD COLUMN definition_id INTEGER REFERENCES custom_framework_definitions(id);
      END IF;
    END $$;
  `);

  // Add organization_id column if it doesn't exist (for migration from old schema)
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'custom_frameworks'
        AND column_name = 'organization_id'
      ) THEN
        ALTER TABLE custom_frameworks ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Add plugin_key column if it doesn't exist (for migration from old schema)
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'custom_frameworks'
        AND column_name = 'plugin_key'
      ) THEN
        ALTER TABLE custom_frameworks ADD COLUMN plugin_key VARCHAR(100);
      END IF;
    END $$;
  `);

  // Add file_source column if it doesn't exist (for migration from old schema)
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'custom_frameworks'
        AND column_name = 'file_source'
      ) THEN
        ALTER TABLE custom_frameworks ADD COLUMN file_source VARCHAR(100);
      END IF;
    END $$;
  `);

  // Project-framework association
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_framework_projects (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      framework_id INTEGER NOT NULL REFERENCES custom_frameworks(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(organization_id, framework_id, project_id)
    )
  `);

  // Level 2 implementation records (FK to struct table)
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_framework_level2_impl (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      level2_id INTEGER NOT NULL REFERENCES custom_framework_level2_struct(id) ON DELETE CASCADE,
      project_framework_id INTEGER NOT NULL REFERENCES custom_framework_projects(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'Not started',
      owner INTEGER,
      reviewer INTEGER,
      approver INTEGER,
      due_date DATE,
      implementation_details TEXT,
      evidence_links JSONB DEFAULT '[]',
      feedback_links JSONB DEFAULT '[]',
      auditor_feedback TEXT,
      is_demo BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Level 3 implementation records (FK to struct table)
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_framework_level3_impl (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      level3_id INTEGER NOT NULL REFERENCES custom_framework_level3_struct(id) ON DELETE CASCADE,
      level2_impl_id INTEGER NOT NULL REFERENCES custom_framework_level2_impl(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'Not started',
      owner INTEGER,
      reviewer INTEGER,
      approver INTEGER,
      due_date DATE,
      implementation_details TEXT,
      evidence_links JSONB DEFAULT '[]',
      feedback_links JSONB DEFAULT '[]',
      auditor_feedback TEXT,
      is_demo BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Risk linking tables
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_framework_level2_risks (
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      level2_impl_id INTEGER NOT NULL REFERENCES custom_framework_level2_impl(id) ON DELETE CASCADE,
      risk_id INTEGER NOT NULL,
      PRIMARY KEY (level2_impl_id, risk_id)
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS custom_framework_level3_risks (
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      level3_impl_id INTEGER NOT NULL REFERENCES custom_framework_level3_impl(id) ON DELETE CASCADE,
      risk_id INTEGER NOT NULL,
      PRIMARY KEY (level3_impl_id, risk_id)
    )
  `);

  // Create indexes for performance
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_cfd_plugin_key ON custom_framework_definitions(plugin_key)`,
    `CREATE INDEX IF NOT EXISTS idx_cfl1s_definition ON custom_framework_level1_struct(definition_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cfl2s_level1 ON custom_framework_level2_struct(level1_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cfl3s_level2 ON custom_framework_level3_struct(level2_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_org_id ON custom_frameworks(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_plugin_key ON custom_frameworks(plugin_key)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_definition_id ON custom_frameworks(definition_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_projects_org ON custom_framework_projects(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_l2impl_pf ON custom_framework_level2_impl(project_framework_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_l2impl_org ON custom_framework_level2_impl(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_l2impl_l2 ON custom_framework_level2_impl(level2_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_l3impl_l2impl ON custom_framework_level3_impl(level2_impl_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_l3impl_org ON custom_framework_level3_impl(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_l3impl_l3 ON custom_framework_level3_impl(level3_id)`,
  ];

  for (const idx of indexes) {
    await sequelize.query(idx);
  }
}

// ========== HELPER FUNCTIONS ==========

function toPgArray(arr: string[] | undefined | null): string {
  if (!arr || arr.length === 0) return "{}";
  const escaped = arr.map((item) => {
    const escapedItem = String(item).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escapedItem}"`;
  });
  return `{${escaped.join(",")}}`;
}

function generateFileSourceName(frameworkName: string): string {
  const cleanName = frameworkName.trim();
  return `${cleanName} evidence`;
}

async function addFileSourceEnum(sequelize: any, sourceName: string): Promise<boolean> {
  try {
    const [existing] = await sequelize.query(
      `
      SELECT 1 FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_files_source')
      AND enumlabel = :sourceName
    `,
      { replacements: { sourceName } }
    );

    if (existing.length === 0) {
      await sequelize.query(
        `ALTER TYPE enum_files_source ADD VALUE '${sourceName.replace(/'/g, "''")}'`
      );
      console.log(`[CustomFrameworkBase] Added file source enum: "${sourceName}"`);
    }
    return true;
  } catch (error: any) {
    console.error(`[CustomFrameworkBase] Failed to add file source enum: ${error.message}`);
    return false;
  }
}

function validateFrameworkImport(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== "string") {
    errors.push("Framework name is required");
  }

  if (!data.hierarchy || typeof data.hierarchy !== "object") {
    errors.push("Hierarchy configuration is required");
  } else {
    if (!["two_level", "three_level"].includes(data.hierarchy.type)) {
      errors.push('Hierarchy type must be "two_level" or "three_level"');
    }
    if (!data.hierarchy.level1_name) {
      errors.push("Level 1 name is required");
    }
    if (!data.hierarchy.level2_name) {
      errors.push("Level 2 name is required");
    }
    if (data.hierarchy.type === "three_level" && !data.hierarchy.level3_name) {
      errors.push("Level 3 name is required for three-level hierarchy");
    }
  }

  if (!Array.isArray(data.structure) || data.structure.length === 0) {
    errors.push("Framework structure is required and must have at least one level 1 item");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ========== FRAMEWORK IMPORT ==========

/**
 * Import a framework template. Idempotent by plugin_key:
 * - If definition already exists, skip struct creation.
 * - Always create per-org custom_frameworks record.
 */
async function importFramework(
  frameworkData: FrameworkTemplate,
  organizationId: number,
  sequelize: any,
  pluginKey: string
): Promise<{ frameworkId: number; itemsCreated: number; fileSource: string }> {
  const fileSource = generateFileSourceName(frameworkData.name);
  await addFileSourceEnum(sequelize, fileSource);

  const transaction = await sequelize.transaction();

  try {
    let definitionId: number;
    let itemsCreated = 0;

    // Check if definition already exists for this plugin_key
    const [existingDef] = await sequelize.query(
      `SELECT id FROM custom_framework_definitions WHERE plugin_key = :pluginKey`,
      { replacements: { pluginKey }, transaction }
    );

    if (existingDef.length > 0) {
      // Definition already exists (another org installed first) — reuse it
      definitionId = existingDef[0].id;
    } else {
      // Create new definition
      const [defResult] = await sequelize.query(
        `INSERT INTO custom_framework_definitions
         (plugin_key, name, description, version, is_organizational, hierarchy_type,
          level_1_name, level_2_name, level_3_name, file_source, created_at)
         VALUES (:plugin_key, :name, :description, :version, :is_organizational,
                 :hierarchy_type, :level_1_name, :level_2_name, :level_3_name, :file_source, NOW())
         RETURNING id`,
        {
          replacements: {
            plugin_key: pluginKey,
            name: frameworkData.name,
            description: frameworkData.description,
            version: frameworkData.version || "1.0.0",
            is_organizational: frameworkData.is_organizational,
            hierarchy_type: frameworkData.hierarchy.type,
            level_1_name: frameworkData.hierarchy.level1_name,
            level_2_name: frameworkData.hierarchy.level2_name,
            level_3_name: frameworkData.hierarchy.level3_name || null,
            file_source: fileSource,
          },
          transaction,
        }
      );
      definitionId = defResult[0].id;

      // Insert struct rows (shared, no org_id)
      for (const level1 of frameworkData.structure) {
        const [level1Result] = await sequelize.query(
          `INSERT INTO custom_framework_level1_struct
           (definition_id, title, description, order_no, metadata)
           VALUES (:definition_id, :title, :description, :order_no, :metadata)
           RETURNING id`,
          {
            replacements: {
              definition_id: definitionId,
              title: level1.title,
              description: level1.description || null,
              order_no: level1.order_no,
              metadata: JSON.stringify(level1.metadata || {}),
            },
            transaction,
          }
        );
        const level1Id = level1Result[0].id;
        itemsCreated++;

        for (const level2 of level1.items || []) {
          const [level2Result] = await sequelize.query(
            `INSERT INTO custom_framework_level2_struct
             (level1_id, title, description, order_no, summary, questions, evidence_examples, metadata)
             VALUES (:level1_id, :title, :description, :order_no, :summary, :questions, :evidence_examples, :metadata)
             RETURNING id`,
            {
              replacements: {
                level1_id: level1Id,
                title: level2.title,
                description: level2.description || null,
                order_no: level2.order_no,
                summary: level2.summary || null,
                questions: toPgArray(level2.questions),
                evidence_examples: toPgArray(level2.evidence_examples),
                metadata: JSON.stringify(level2.metadata || {}),
              },
              transaction,
            }
          );
          const level2Id = level2Result[0].id;
          itemsCreated++;

          if (frameworkData.hierarchy.type === "three_level" && level2.items) {
            for (const level3 of level2.items) {
              await sequelize.query(
                `INSERT INTO custom_framework_level3_struct
                 (level2_id, title, description, order_no, summary, questions, evidence_examples, metadata)
                 VALUES (:level2_id, :title, :description, :order_no, :summary, :questions, :evidence_examples, :metadata)`,
                {
                  replacements: {
                    level2_id: level2Id,
                    title: level3.title,
                    description: level3.description || null,
                    order_no: level3.order_no,
                    summary: level3.summary || null,
                    questions: toPgArray(level3.questions),
                    evidence_examples: toPgArray(level3.evidence_examples),
                    metadata: JSON.stringify(level3.metadata || {}),
                  },
                  transaction,
                }
              );
              itemsCreated++;
            }
          }
        }
      }
    }

    // Always create per-org custom_frameworks record with definition_id
    const [frameworkResult] = await sequelize.query(
      `INSERT INTO custom_frameworks
       (organization_id, definition_id, plugin_key, name, description, version, is_organizational,
        hierarchy_type, level_1_name, level_2_name, level_3_name, file_source, created_at)
       VALUES (:organization_id, :definition_id, :plugin_key, :name, :description, :version, :is_organizational,
               :hierarchy_type, :level_1_name, :level_2_name, :level_3_name, :file_source, NOW())
       RETURNING id`,
      {
        replacements: {
          organization_id: organizationId,
          definition_id: definitionId,
          plugin_key: pluginKey,
          name: frameworkData.name,
          description: frameworkData.description,
          version: frameworkData.version || "1.0.0",
          is_organizational: frameworkData.is_organizational,
          hierarchy_type: frameworkData.hierarchy.type,
          level_1_name: frameworkData.hierarchy.level1_name,
          level_2_name: frameworkData.hierarchy.level2_name,
          level_3_name: frameworkData.hierarchy.level3_name || null,
          file_source: fileSource,
        },
        transaction,
      }
    );
    const frameworkId = frameworkResult[0].id;

    await transaction.commit();
    return { frameworkId, itemsCreated, fileSource };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ========== ROUTE HANDLERS FACTORY ==========

function createRouteHandlers(pluginKey: string, config: FrameworkPluginConfig) {
  // Handler: Get frameworks for this plugin (or all if ?all=true)
  // Counts come from struct tables (no org_id filter needed)
  async function handleGetFrameworks(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, query } = ctx;
    const showAll = query.all === "true";

    try {
      const whereClause = showAll
        ? "cf.organization_id = :organizationId"
        : "(cf.plugin_key = :pluginKey OR cf.plugin_key IS NULL) AND cf.organization_id = :organizationId";

      const [frameworks] = await sequelize.query(
        `
        SELECT
          cf.id,
          cf.plugin_key,
          cf.name,
          cf.description,
          cf.version,
          cf.is_organizational,
          cf.hierarchy_type,
          cf.level_1_name,
          cf.level_2_name,
          cf.level_3_name,
          cf.file_source,
          cf.created_at,
          cf.definition_id,
          (SELECT COUNT(*) FROM custom_framework_level1_struct WHERE definition_id = cf.definition_id) as level1_count,
          (SELECT COUNT(*) FROM custom_framework_level2_struct l2s
           JOIN custom_framework_level1_struct l1s ON l2s.level1_id = l1s.id
           WHERE l1s.definition_id = cf.definition_id) as level2_count,
          (SELECT COUNT(*) FROM custom_framework_level3_struct l3s
           JOIN custom_framework_level2_struct l2s ON l3s.level2_id = l2s.id
           JOIN custom_framework_level1_struct l1s ON l2s.level1_id = l1s.id
           WHERE l1s.definition_id = cf.definition_id) as level3_count
        FROM custom_frameworks cf
        WHERE ${whereClause}
        ORDER BY cf.created_at DESC
      `,
        { replacements: { pluginKey, organizationId } }
      );

      return { status: 200, data: frameworks };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to fetch frameworks: ${error.message}` } };
    }
  }

  // Handler: Get framework by ID
  // Reads struct from _struct tables via definition_id
  async function handleGetFrameworkById(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params } = ctx;
    const frameworkId = parseInt(params.frameworkId);

    try {
      const [meta] = await sequelize.query(
        `SELECT * FROM custom_frameworks WHERE id = :frameworkId AND organization_id = :organizationId`,
        { replacements: { frameworkId, organizationId } }
      );

      if (meta.length === 0) {
        return { status: 404, data: { message: "Framework not found" } };
      }

      const definitionId = meta[0].definition_id;

      // Read structure from struct tables (shared, no org filter)
      const [level1Items] = await sequelize.query(
        `SELECT * FROM custom_framework_level1_struct
         WHERE definition_id = :definitionId ORDER BY order_no`,
        { replacements: { definitionId } }
      );

      for (const l1 of level1Items as any[]) {
        const [level2Items] = await sequelize.query(
          `SELECT * FROM custom_framework_level2_struct
           WHERE level1_id = :level1Id ORDER BY order_no`,
          { replacements: { level1Id: l1.id } }
        );

        for (const l2 of level2Items as any[]) {
          if (meta[0].hierarchy_type === "three_level") {
            const [level3Items] = await sequelize.query(
              `SELECT * FROM custom_framework_level3_struct
               WHERE level2_id = :level2Id ORDER BY order_no`,
              { replacements: { level2Id: l2.id } }
            );
            l2.items = level3Items;
          }
        }

        l1.items = level2Items;
      }

      // Fetch linked projects with progress
      const [linkedProjectsRaw] = await sequelize.query(
        `SELECT
          cfp.id as project_framework_id,
          cfp.project_id,
          cfp.created_at as added_at,
          p.project_title,
          COALESCE(p.is_organizational, false) as is_organizational
        FROM custom_framework_projects cfp
        JOIN projects p ON cfp.project_id = p.id AND p.organization_id = :organizationId
        WHERE cfp.framework_id = :frameworkId AND cfp.organization_id = :organizationId`,
        { replacements: { frameworkId, organizationId } }
      );

      // Calculate progress for each linked project
      const linkedProjects = await Promise.all(
        (linkedProjectsRaw as any[]).map(async (proj) => {
          let progressData: any[];

          if (meta[0].hierarchy_type === "three_level") {
            [progressData] = await sequelize.query(
              `SELECT
                COUNT(*) as total,
                SUM(CASE WHEN l3.status = 'Implemented' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN l3.owner IS NOT NULL THEN 1 ELSE 0 END) as assigned
              FROM custom_framework_level3_impl l3
              JOIN custom_framework_level2_impl l2 ON l3.level2_impl_id = l2.id
              WHERE l2.project_framework_id = :projectFrameworkId AND l3.organization_id = :organizationId`,
              { replacements: { projectFrameworkId: proj.project_framework_id, organizationId } }
            );
          } else {
            [progressData] = await sequelize.query(
              `SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Implemented' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN owner IS NOT NULL THEN 1 ELSE 0 END) as assigned
              FROM custom_framework_level2_impl
              WHERE project_framework_id = :projectFrameworkId AND organization_id = :organizationId`,
              { replacements: { projectFrameworkId: proj.project_framework_id, organizationId } }
            );
          }

          const total = parseInt(progressData[0]?.total || '0');
          const completed = parseInt(progressData[0]?.completed || '0');
          const assigned = parseInt(progressData[0]?.assigned || '0');

          return {
            project_framework_id: proj.project_framework_id,
            project_id: proj.project_id,
            project_title: proj.project_title,
            is_organizational: proj.is_organizational,
            added_at: proj.added_at,
            progress: {
              total,
              completed,
              assigned,
              percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            },
          };
        })
      );

      return {
        status: 200,
        data: {
          ...meta[0],
          structure: level1Items,
          linkedProjects,
        },
      };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to fetch structure: ${error.message}` } };
    }
  }

  // Handler: Delete framework (per-org record only, not struct)
  async function handleDeleteFramework(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params } = ctx;
    const frameworkId = parseInt(params.frameworkId);

    try {
      const [framework] = await sequelize.query(
        `SELECT id, definition_id FROM custom_frameworks WHERE id = :frameworkId AND organization_id = :organizationId`,
        { replacements: { frameworkId, organizationId } }
      );

      if (framework.length === 0) {
        return { status: 404, data: { message: "Framework not found" } };
      }

      // Clean up project associations
      const [projects] = await sequelize.query(
        `SELECT COUNT(*) as count FROM custom_framework_projects WHERE framework_id = :frameworkId AND organization_id = :organizationId`,
        { replacements: { frameworkId, organizationId } }
      );

      if (parseInt(projects[0].count) > 0) {
        await sequelize.query(
          `DELETE FROM custom_framework_projects WHERE framework_id = :frameworkId AND organization_id = :organizationId`,
          { replacements: { frameworkId, organizationId } }
        );
      }

      // Delete per-org record
      await sequelize.query(`DELETE FROM custom_frameworks WHERE id = :frameworkId AND organization_id = :organizationId`, {
        replacements: { frameworkId, organizationId },
      });

      // Do NOT delete struct — other orgs may reference the same definition

      return { status: 200, data: { success: true, message: "Framework deleted" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Delete failed: ${error.message}` } };
    }
  }

  // Handler: Add to project
  // Reads struct IDs from _struct tables to create impl records
  async function handleAddToProject(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, body } = ctx;
    const { frameworkId, projectId } = body;

    if (!frameworkId || !projectId) {
      return { status: 400, data: { message: "frameworkId and projectId are required" } };
    }

    try {
      const [framework] = await sequelize.query(
        `SELECT id, hierarchy_type, definition_id FROM custom_frameworks WHERE id = :frameworkId AND organization_id = :organizationId`,
        { replacements: { frameworkId, organizationId } }
      );

      if (framework.length === 0) {
        return { status: 404, data: { message: "Framework not found" } };
      }

      const hierarchyType = framework[0].hierarchy_type;
      const definitionId = framework[0].definition_id;

      // Check if already added
      const [existing] = await sequelize.query(
        `SELECT id FROM custom_framework_projects
         WHERE framework_id = :frameworkId AND project_id = :projectId AND organization_id = :organizationId`,
        { replacements: { frameworkId, projectId, organizationId } }
      );

      if (existing.length > 0) {
        return { status: 400, data: { message: "Framework already added to this project" } };
      }

      // Create association
      const [insertResult] = await sequelize.query(
        `INSERT INTO custom_framework_projects (organization_id, framework_id, project_id, created_at)
         VALUES (:organizationId, :frameworkId, :projectId, NOW())
         RETURNING id`,
        { replacements: { organizationId, frameworkId, projectId } }
      );
      const projectFrameworkId = insertResult[0].id;

      // Create implementation records from struct IDs
      const [level2Items] = await sequelize.query(
        `SELECT l2s.id FROM custom_framework_level2_struct l2s
         JOIN custom_framework_level1_struct l1s ON l2s.level1_id = l1s.id
         WHERE l1s.definition_id = :definitionId`,
        { replacements: { definitionId } }
      );

      for (const l2 of level2Items as any[]) {
        const [implResult] = await sequelize.query(
          `INSERT INTO custom_framework_level2_impl
           (organization_id, level2_id, project_framework_id, status, created_at, updated_at)
           VALUES (:organizationId, :level2_id, :project_framework_id, 'Not started', NOW(), NOW())
           RETURNING id`,
          { replacements: { organizationId, level2_id: l2.id, project_framework_id: projectFrameworkId } }
        );

        if (hierarchyType === "three_level") {
          const [level3Items] = await sequelize.query(
            `SELECT id FROM custom_framework_level3_struct WHERE level2_id = :level2Id`,
            { replacements: { level2Id: l2.id } }
          );

          for (const l3 of level3Items as any[]) {
            await sequelize.query(
              `INSERT INTO custom_framework_level3_impl
               (organization_id, level3_id, level2_impl_id, status, created_at, updated_at)
               VALUES (:organizationId, :level3_id, :level2_impl_id, 'Not started', NOW(), NOW())`,
              { replacements: { organizationId, level3_id: l3.id, level2_impl_id: implResult[0].id } }
            );
          }
        }
      }

      return {
        status: 200,
        data: { success: true, message: "Framework added to project", projectFrameworkId },
      };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to add: ${error.message}` } };
    }
  }

  // Handler: Remove from project
  async function handleRemoveFromProject(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, body } = ctx;
    const { frameworkId, projectId } = body;

    if (!frameworkId || !projectId) {
      return { status: 400, data: { message: "frameworkId and projectId are required" } };
    }

    try {
      await sequelize.query(
        `DELETE FROM custom_framework_projects
         WHERE framework_id = :frameworkId AND project_id = :projectId AND organization_id = :organizationId`,
        { replacements: { frameworkId, projectId, organizationId } }
      );

      return { status: 200, data: { success: true, message: "Framework removed from project" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to remove: ${error.message}` } };
    }
  }

  // Handler: Get project frameworks
  // JOIN through definition_id for metadata
  async function handleGetProjectFrameworks(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params, query } = ctx;
    const projectId = parseInt(params.projectId);
    const isOrganizational = query.is_organizational === "true";

    try {
      const [frameworks] = await sequelize.query(
        `
        SELECT cf.*, cf.id as framework_id, cfp.id as project_framework_id, cfp.created_at as added_at
        FROM custom_frameworks cf
        JOIN custom_framework_projects cfp ON cf.id = cfp.framework_id
        WHERE cfp.project_id = :projectId AND cfp.organization_id = :organizationId
        ORDER BY cf.name
      `,
        { replacements: { projectId, organizationId } }
      );

      return { status: 200, data: frameworks };
    } catch (error: any) {
      return { status: 500, data: { message: error.message } };
    }
  }

  // Handler: Get project framework with structure
  // JOINs _struct tables for definitions, _impl for per-project data
  async function handleGetProjectFramework(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params } = ctx;
    const projectId = parseInt(params.projectId);
    const frameworkId = parseInt(params.frameworkId);

    try {
      const [projectFramework] = await sequelize.query(
        `SELECT cfp.id as project_framework_id, cf.*
         FROM custom_framework_projects cfp
         JOIN custom_frameworks cf ON cfp.framework_id = cf.id
         WHERE cfp.project_id = :projectId AND cfp.framework_id = :frameworkId AND cfp.organization_id = :organizationId`,
        { replacements: { projectId, frameworkId, organizationId } }
      );

      if (projectFramework.length === 0) {
        return { status: 404, data: { message: "Framework not found in project" } };
      }

      const pf = projectFramework[0];
      const projectFrameworkId = pf.project_framework_id;
      const definitionId = pf.definition_id;

      // Read structure from struct tables (shared)
      const [level1Items] = await sequelize.query(
        `SELECT * FROM custom_framework_level1_struct
         WHERE definition_id = :definitionId ORDER BY order_no`,
        { replacements: { definitionId } }
      );

      for (const l1 of level1Items as any[]) {
        const [level2Items] = await sequelize.query(
          `SELECT l2s.*,
                  impl.id as impl_id, impl.status, impl.owner, impl.reviewer, impl.approver,
                  impl.due_date, impl.implementation_details, impl.evidence_links,
                  impl.feedback_links, impl.auditor_feedback,
                  u_owner.name as owner_name, u_owner.surname as owner_surname,
                  u_reviewer.name as reviewer_name, u_reviewer.surname as reviewer_surname,
                  u_approver.name as approver_name, u_approver.surname as approver_surname
           FROM custom_framework_level2_struct l2s
           LEFT JOIN custom_framework_level2_impl impl
             ON l2s.id = impl.level2_id AND impl.project_framework_id = :projectFrameworkId
           LEFT JOIN users u_owner ON impl.owner = u_owner.id
           LEFT JOIN users u_reviewer ON impl.reviewer = u_reviewer.id
           LEFT JOIN users u_approver ON impl.approver = u_approver.id
           WHERE l2s.level1_id = :level1Id
           ORDER BY l2s.order_no`,
          { replacements: { level1Id: l1.id, projectFrameworkId } }
        );

        for (const l2 of level2Items as any[]) {
          if (l2.impl_id) {
            // Fetch linked risks
            const [risks] = await sequelize.query(
              `SELECT r.id, r.risk_name, r.risk_description
               FROM custom_framework_level2_risks lr
               JOIN risks r ON lr.risk_id = r.id AND r.organization_id = :organizationId
               WHERE lr.level2_impl_id = :implId AND lr.organization_id = :organizationId`,
              { replacements: { implId: l2.impl_id, organizationId } }
            );
            l2.linked_risks = risks;

            // Fetch linked files from file_entity_links table
            const [linkedFiles] = await sequelize.query(
              `SELECT
                f.id,
                f.filename,
                f.size,
                f.type as mimetype,
                f.uploaded_time as upload_date,
                u.name as uploader_name,
                u.surname as uploader_surname,
                fel.link_type
              FROM file_entity_links fel
              JOIN files f ON fel.file_id = f.id AND f.organization_id = :organizationId
              LEFT JOIN users u ON f.uploaded_by = u.id
              WHERE fel.framework_type = :frameworkType
                AND fel.entity_type = 'level2_impl'
                AND fel.entity_id = :implId
                AND fel.organization_id = :organizationId
              ORDER BY fel.created_at DESC`,
              { replacements: { frameworkType: pluginKey, implId: l2.impl_id, organizationId } }
            );
            l2.linked_files = linkedFiles;
          } else {
            l2.linked_risks = [];
            l2.linked_files = [];
          }

          if (pf.hierarchy_type === "three_level") {
            const [level3Items] = await sequelize.query(
              `SELECT l3s.*,
                      impl.id as impl_id, impl.status, impl.owner, impl.reviewer, impl.approver,
                      impl.due_date, impl.implementation_details, impl.evidence_links
               FROM custom_framework_level3_struct l3s
               LEFT JOIN custom_framework_level3_impl impl
                 ON l3s.id = impl.level3_id AND impl.level2_impl_id = :level2ImplId
               WHERE l3s.level2_id = :level2Id
               ORDER BY l3s.order_no`,
              { replacements: { level2Id: l2.id, level2ImplId: l2.impl_id } }
            );

            // Fetch linked files for each level3 item
            for (const l3 of level3Items as any[]) {
              if (l3.impl_id) {
                const [l3Files] = await sequelize.query(
                  `SELECT
                    f.id,
                    f.filename,
                    f.size,
                    f.type as mimetype,
                    f.uploaded_time as upload_date,
                    u.name as uploader_name,
                    u.surname as uploader_surname,
                    fel.link_type
                  FROM file_entity_links fel
                  JOIN files f ON fel.file_id = f.id AND f.organization_id = :organizationId
                  LEFT JOIN users u ON f.uploaded_by = u.id
                  WHERE fel.framework_type = :frameworkType
                    AND fel.entity_type = 'level3_impl'
                    AND fel.entity_id = :implId
                    AND fel.organization_id = :organizationId
                  ORDER BY fel.created_at DESC`,
                  { replacements: { frameworkType: pluginKey, implId: l3.impl_id, organizationId } }
                );
                l3.linked_files = l3Files;
              } else {
                l3.linked_files = [];
              }
            }

            l2.items = level3Items;
          }
        }

        l1.items = level2Items;
      }

      return {
        status: 200,
        data: {
          projectFrameworkId,
          frameworkId: pf.id,
          name: pf.name,
          description: pf.description,
          is_organizational: pf.is_organizational,
          hierarchy_type: pf.hierarchy_type,
          level_1_name: pf.level_1_name,
          level_2_name: pf.level_2_name,
          level_3_name: pf.level_3_name,
          file_source: pf.file_source,
          structure: level1Items,
        },
      };
    } catch (error: any) {
      return { status: 500, data: { message: error.message } };
    }
  }

  // Handler: Get progress (unchanged — only touches impl tables)
  async function handleGetProgress(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params } = ctx;
    const projectId = parseInt(params.projectId);
    const frameworkId = parseInt(params.frameworkId);

    try {
      const [projectFramework] = await sequelize.query(
        `SELECT cfp.id as project_framework_id, cf.hierarchy_type
         FROM custom_framework_projects cfp
         JOIN custom_frameworks cf ON cfp.framework_id = cf.id
         WHERE cfp.project_id = :projectId AND cfp.framework_id = :frameworkId AND cfp.organization_id = :organizationId`,
        { replacements: { projectId, frameworkId, organizationId } }
      );

      if (projectFramework.length === 0) {
        return { status: 404, data: { message: "Framework not found in project" } };
      }

      const projectFrameworkId = projectFramework[0].project_framework_id;
      const hierarchyType = projectFramework[0].hierarchy_type;

      const [level2Stats] = await sequelize.query(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'Implemented' THEN 1 END) as completed,
           COUNT(CASE WHEN owner IS NOT NULL THEN 1 END) as assigned
         FROM custom_framework_level2_impl
         WHERE project_framework_id = :projectFrameworkId AND organization_id = :organizationId`,
        { replacements: { projectFrameworkId, organizationId } }
      );

      const result: any = {
        level2: {
          total: parseInt(level2Stats[0].total),
          completed: parseInt(level2Stats[0].completed),
          assigned: parseInt(level2Stats[0].assigned),
          percentage:
            parseInt(level2Stats[0].total) > 0
              ? Math.round(
                  (parseInt(level2Stats[0].completed) / parseInt(level2Stats[0].total)) * 100
                )
              : 0,
        },
      };

      if (hierarchyType === "three_level") {
        const [level3Stats] = await sequelize.query(
          `SELECT
             COUNT(*) as total,
             COUNT(CASE WHEN l3.status = 'Implemented' THEN 1 END) as completed,
             COUNT(CASE WHEN l3.owner IS NOT NULL THEN 1 END) as assigned
           FROM custom_framework_level3_impl l3
           JOIN custom_framework_level2_impl l2 ON l3.level2_impl_id = l2.id
           WHERE l2.project_framework_id = :projectFrameworkId AND l3.organization_id = :organizationId`,
          { replacements: { projectFrameworkId, organizationId } }
        );

        result.level3 = {
          total: parseInt(level3Stats[0].total),
          completed: parseInt(level3Stats[0].completed),
          assigned: parseInt(level3Stats[0].assigned),
          percentage:
            parseInt(level3Stats[0].total) > 0
              ? Math.round(
                  (parseInt(level3Stats[0].completed) / parseInt(level3Stats[0].total)) * 100
                )
              : 0,
        };

        result.overall = result.level3;
      } else {
        result.overall = result.level2;
      }

      return { status: 200, data: result };
    } catch (error: any) {
      return { status: 500, data: { message: error.message } };
    }
  }

  // Handler: Update level 2 implementation (unchanged — only touches impl tables)
  async function handleUpdateLevel2(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params, body } = ctx;
    const implId = parseInt(params.level2Id);

    try {
      const updateFields: string[] = [];
      const replacements: any = { id: implId, organizationId };

      const allowedFields = [
        "status",
        "owner",
        "reviewer",
        "approver",
        "due_date",
        "implementation_details",
        "evidence_links",
        "feedback_links",
        "auditor_feedback",
      ];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          if (field === "evidence_links" || field === "feedback_links") {
            updateFields.push(`${field} = :${field}::jsonb`);
            replacements[field] = JSON.stringify(body[field]);
          } else if (field === "due_date" && body[field] === null) {
            updateFields.push(`${field} = NULL`);
          } else {
            updateFields.push(`${field} = :${field}`);
            replacements[field] = body[field];
          }
        }
      }

      if (updateFields.length === 0) {
        return { status: 400, data: { message: "No fields to update" } };
      }

      updateFields.push("updated_at = NOW()");

      await sequelize.query(
        `UPDATE custom_framework_level2_impl
         SET ${updateFields.join(", ")}
         WHERE id = :id AND organization_id = :organizationId`,
        { replacements }
      );

      // Handle risk linking
      if (body.risks_to_add && Array.isArray(body.risks_to_add)) {
        for (const riskId of body.risks_to_add) {
          await sequelize.query(
            `INSERT INTO custom_framework_level2_risks (organization_id, level2_impl_id, risk_id)
             VALUES (:organizationId, :implId, :riskId)
             ON CONFLICT DO NOTHING`,
            { replacements: { organizationId, implId, riskId } }
          );
        }
      }

      if (body.risks_to_remove && Array.isArray(body.risks_to_remove)) {
        await sequelize.query(
          `DELETE FROM custom_framework_level2_risks
           WHERE level2_impl_id = :implId AND risk_id = ANY(:risks) AND organization_id = :organizationId`,
          { replacements: { implId, risks: body.risks_to_remove, organizationId } }
        );
      }

      return { status: 200, data: { success: true, message: "Updated successfully" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Update failed: ${error.message}` } };
    }
  }

  // Handler: Update level 3 implementation (unchanged — only touches impl tables)
  async function handleUpdateLevel3(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params, body } = ctx;
    const implId = parseInt(params.level3Id);

    try {
      const updateFields: string[] = [];
      const replacements: any = { id: implId, organizationId };

      const allowedFields = [
        "status",
        "owner",
        "reviewer",
        "approver",
        "due_date",
        "implementation_details",
        "evidence_links",
        "feedback_links",
        "auditor_feedback",
      ];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          if (field === "evidence_links" || field === "feedback_links") {
            updateFields.push(`${field} = :${field}::jsonb`);
            replacements[field] = JSON.stringify(body[field]);
          } else if (field === "due_date" && body[field] === null) {
            updateFields.push(`${field} = NULL`);
          } else {
            updateFields.push(`${field} = :${field}`);
            replacements[field] = body[field];
          }
        }
      }

      if (updateFields.length === 0) {
        return { status: 400, data: { message: "No fields to update" } };
      }

      updateFields.push("updated_at = NOW()");

      await sequelize.query(
        `UPDATE custom_framework_level3_impl
         SET ${updateFields.join(", ")}
         WHERE id = :id AND organization_id = :organizationId`,
        { replacements }
      );

      return { status: 200, data: { success: true, message: "Updated successfully" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Update failed: ${error.message}` } };
    }
  }

  // ========== FILE ATTACHMENT HANDLERS (unchanged — only touch impl tables) ==========

  async function handleAttachFilesToLevel2(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, userId, params, body } = ctx;
    const implId = parseInt(params.level2Id);
    const { file_ids, link_type = "evidence" } = body;

    if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
      return { status: 400, data: { message: "file_ids array is required" } };
    }

    try {
      const [impl] = await sequelize.query(
        `SELECT id FROM custom_framework_level2_impl WHERE id = :implId AND organization_id = :organizationId`,
        { replacements: { implId, organizationId } }
      );

      if (impl.length === 0) {
        return { status: 404, data: { message: "Implementation record not found" } };
      }

      const results: { file_id: number; success: boolean; message: string }[] = [];

      for (const fileId of file_ids) {
        try {
          await sequelize.query(
            `INSERT INTO file_entity_links
             (organization_id, file_id, framework_type, entity_type, entity_id, link_type, created_by, created_at)
             VALUES (:organizationId, :fileId, :frameworkType, 'level2_impl', :entityId, :linkType, :userId, NOW())
             ON CONFLICT (file_id, framework_type, entity_type, entity_id) DO NOTHING`,
            {
              replacements: {
                organizationId,
                fileId,
                frameworkType: pluginKey,
                entityId: implId,
                linkType: link_type,
                userId,
              },
            }
          );
          results.push({ file_id: fileId, success: true, message: "Attached" });
        } catch (err: any) {
          results.push({ file_id: fileId, success: false, message: err.message });
        }
      }

      return { status: 200, data: { message: "Files attached", results } };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to attach files: ${error.message}` } };
    }
  }

  async function handleGetLevel2Files(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params } = ctx;
    const implId = parseInt(params.level2Id);

    try {
      const [files] = await sequelize.query(
        `SELECT
          f.id,
          f.filename,
          f.size,
          f.type as mimetype,
          f.uploaded_time as upload_date,
          f.uploaded_by,
          u.name as uploader_name,
          u.surname as uploader_surname,
          fel.link_type,
          fel.created_at as linked_at
        FROM file_entity_links fel
        JOIN files f ON fel.file_id = f.id AND f.organization_id = :organizationId
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE fel.framework_type = :frameworkType
          AND fel.entity_type = 'level2_impl'
          AND fel.entity_id = :entityId
          AND fel.organization_id = :organizationId
        ORDER BY fel.created_at DESC`,
        {
          replacements: {
            frameworkType: pluginKey,
            entityId: implId,
            organizationId,
          },
        }
      );

      return { status: 200, data: files };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to get files: ${error.message}` } };
    }
  }

  async function handleDetachFileFromLevel2(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params } = ctx;
    const implId = parseInt(params.level2Id);
    const fileId = parseInt(params.fileId);

    try {
      await sequelize.query(
        `DELETE FROM file_entity_links
         WHERE file_id = :fileId
           AND framework_type = :frameworkType
           AND entity_type = 'level2_impl'
           AND entity_id = :entityId
           AND organization_id = :organizationId`,
        {
          replacements: {
            fileId,
            frameworkType: pluginKey,
            entityId: implId,
            organizationId,
          },
        }
      );

      return { status: 200, data: { message: "File detached successfully" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to detach file: ${error.message}` } };
    }
  }

  async function handleAttachFilesToLevel3(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, userId, params, body } = ctx;
    const implId = parseInt(params.level3Id);
    const { file_ids, link_type = "evidence" } = body;

    if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
      return { status: 400, data: { message: "file_ids array is required" } };
    }

    try {
      const [impl] = await sequelize.query(
        `SELECT id FROM custom_framework_level3_impl WHERE id = :implId AND organization_id = :organizationId`,
        { replacements: { implId, organizationId } }
      );

      if (impl.length === 0) {
        return { status: 404, data: { message: "Implementation record not found" } };
      }

      const results: { file_id: number; success: boolean; message: string }[] = [];

      for (const fileId of file_ids) {
        try {
          await sequelize.query(
            `INSERT INTO file_entity_links
             (organization_id, file_id, framework_type, entity_type, entity_id, link_type, created_by, created_at)
             VALUES (:organizationId, :fileId, :frameworkType, 'level3_impl', :entityId, :linkType, :userId, NOW())
             ON CONFLICT (file_id, framework_type, entity_type, entity_id) DO NOTHING`,
            {
              replacements: {
                organizationId,
                fileId,
                frameworkType: pluginKey,
                entityId: implId,
                linkType: link_type,
                userId,
              },
            }
          );
          results.push({ file_id: fileId, success: true, message: "Attached" });
        } catch (err: any) {
          results.push({ file_id: fileId, success: false, message: err.message });
        }
      }

      return { status: 200, data: { message: "Files attached", results } };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to attach files: ${error.message}` } };
    }
  }

  async function handleGetLevel3Files(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params } = ctx;
    const implId = parseInt(params.level3Id);

    try {
      const [files] = await sequelize.query(
        `SELECT
          f.id,
          f.filename,
          f.size,
          f.type as mimetype,
          f.uploaded_time as upload_date,
          f.uploaded_by,
          u.name as uploader_name,
          u.surname as uploader_surname,
          fel.link_type,
          fel.created_at as linked_at
        FROM file_entity_links fel
        JOIN files f ON fel.file_id = f.id AND f.organization_id = :organizationId
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE fel.framework_type = :frameworkType
          AND fel.entity_type = 'level3_impl'
          AND fel.entity_id = :entityId
          AND fel.organization_id = :organizationId
        ORDER BY fel.created_at DESC`,
        {
          replacements: {
            frameworkType: pluginKey,
            entityId: implId,
            organizationId,
          },
        }
      );

      return { status: 200, data: files };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to get files: ${error.message}` } };
    }
  }

  async function handleDetachFileFromLevel3(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, organizationId, params } = ctx;
    const implId = parseInt(params.level3Id);
    const fileId = parseInt(params.fileId);

    try {
      await sequelize.query(
        `DELETE FROM file_entity_links
         WHERE file_id = :fileId
           AND framework_type = :frameworkType
           AND entity_type = 'level3_impl'
           AND entity_id = :entityId
           AND organization_id = :organizationId`,
        {
          replacements: {
            fileId,
            frameworkType: pluginKey,
            entityId: implId,
            organizationId,
          },
        }
      );

      return { status: 200, data: { message: "File detached successfully" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to detach file: ${error.message}` } };
    }
  }

  return {
    handleGetFrameworks,
    handleGetFrameworkById,
    handleDeleteFramework,
    handleAddToProject,
    handleRemoveFromProject,
    handleGetProjectFrameworks,
    handleGetProjectFramework,
    handleGetProgress,
    handleUpdateLevel2,
    handleUpdateLevel3,
    // File attachment handlers
    handleAttachFilesToLevel2,
    handleGetLevel2Files,
    handleDetachFileFromLevel2,
    handleAttachFilesToLevel3,
    handleGetLevel3Files,
    handleDetachFileFromLevel3,
  };
}

// ========== PLUGIN FACTORY ==========

export function createFrameworkPlugin(config: FrameworkPluginConfig) {
  const pluginKey = config.key;

  // Metadata
  const metadata = {
    name: config.name,
    version: config.version || "1.0.0",
    author: config.author || "VerifyWise",
    description: config.description,
  };

  // Install function
  async function install(
    _userId: number,
    organizationId: number,
    _config: any,
    context: PluginContext
  ): Promise<{ success: boolean; message: string; installedAt: string }> {
    const { sequelize } = context;

    try {
      // Ensure shared tables exist (no org_id needed)
      await ensureSharedTables(sequelize);

      // Auto-import template if configured
      if (config.autoImport !== false && config.template) {
        // Check if this org already has a record for this plugin
        const [existing] = await sequelize.query(
          `SELECT id FROM custom_frameworks WHERE plugin_key = :pluginKey AND organization_id = :organizationId`,
          { replacements: { pluginKey, organizationId } }
        );

        if (existing.length === 0) {
          const result = await importFramework(config.template, organizationId, sequelize, pluginKey);
          console.log(
            `[${config.name}] Auto-imported framework with ${result.itemsCreated} items`
          );
        }
      }

      return {
        success: true,
        message: `${config.name} plugin installed successfully.`,
        installedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Installation failed: ${error.message}`);
    }
  }

  // Uninstall function
  // Deletes per-org records. Only deletes struct if no other org references the definition.
  async function uninstall(
    _userId: number,
    organizationId: number,
    context: PluginContext
  ): Promise<{ success: boolean; message: string; uninstalledAt: string }> {
    const { sequelize } = context;

    try {
      // Get framework IDs for this plugin + org
      const [frameworks] = await sequelize.query(
        `SELECT id, definition_id FROM custom_frameworks WHERE plugin_key = :pluginKey AND organization_id = :organizationId`,
        { replacements: { pluginKey, organizationId } }
      );

      const frameworkIds = (frameworks as any[]).map((f) => f.id);
      const defIdSet = new Set((frameworks as any[]).map((f) => f.definition_id).filter(Boolean));
      const definitionIds: number[] = [];
      defIdSet.forEach((id) => definitionIds.push(id));

      if (frameworkIds.length > 0) {
        // Clean up file_entity_links for this plugin's framework
        await sequelize.query(
          `DELETE FROM file_entity_links WHERE framework_type = :pluginKey AND organization_id = :organizationId`,
          { replacements: { pluginKey, organizationId } }
        );

        // Delete project associations and implementations (cascade handles related records)
        await sequelize.query(
          `DELETE FROM custom_framework_projects WHERE framework_id IN (:ids) AND organization_id = :organizationId`,
          { replacements: { ids: frameworkIds, organizationId } }
        );

        // Delete per-org framework records
        await sequelize.query(
          `DELETE FROM custom_frameworks WHERE plugin_key = :pluginKey AND organization_id = :organizationId`,
          { replacements: { pluginKey, organizationId } }
        );
      }

      // Clean up struct if no other org references the definition
      for (const defId of definitionIds) {
        const [remaining] = await sequelize.query(
          `SELECT COUNT(*) as cnt FROM custom_frameworks WHERE definition_id = :defId`,
          { replacements: { defId } }
        );

        if (parseInt(remaining[0].cnt) === 0) {
          // No other org uses this definition — safe to delete struct
          await sequelize.query(
            `DELETE FROM custom_framework_definitions WHERE id = :defId`,
            { replacements: { defId } }
          );
          console.log(`[${config.name}] Cleaned up orphaned definition id=${defId}`);
        }
      }

      return {
        success: true,
        message: `${config.name} plugin uninstalled successfully.`,
        uninstalledAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Uninstall failed: ${error.message}`);
    }
  }

  // Validate config
  function validateConfig(_config: any): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  // Create route handlers
  const handlers = createRouteHandlers(pluginKey, config);

  // Router
  const router: Record<string, (ctx: PluginRouteContext) => Promise<PluginRouteResponse>> = {
    "GET /frameworks": handlers.handleGetFrameworks,
    "GET /frameworks/:frameworkId": handlers.handleGetFrameworkById,
    "DELETE /frameworks/:frameworkId": handlers.handleDeleteFramework,
    "POST /add-to-project": handlers.handleAddToProject,
    "POST /remove-from-project": handlers.handleRemoveFromProject,
    "GET /projects/:projectId/custom-frameworks": handlers.handleGetProjectFrameworks,
    "GET /projects/:projectId/frameworks/:frameworkId": handlers.handleGetProjectFramework,
    "GET /projects/:projectId/frameworks/:frameworkId/progress": handlers.handleGetProgress,
    "PATCH /level2/:level2Id": handlers.handleUpdateLevel2,
    "PATCH /level3/:level3Id": handlers.handleUpdateLevel3,
    // File attachment routes for level2 implementations
    "POST /level2/:level2Id/files": handlers.handleAttachFilesToLevel2,
    "GET /level2/:level2Id/files": handlers.handleGetLevel2Files,
    "DELETE /level2/:level2Id/files/:fileId": handlers.handleDetachFileFromLevel2,
    // File attachment routes for level3 implementations
    "POST /level3/:level3Id/files": handlers.handleAttachFilesToLevel3,
    "GET /level3/:level3Id/files": handlers.handleGetLevel3Files,
    "DELETE /level3/:level3Id/files/:fileId": handlers.handleDetachFileFromLevel3,
  };

  return {
    metadata,
    install,
    uninstall,
    validateConfig,
    router,
  };
}

// Export types for consumers
export type { PluginRouteContext, PluginRouteResponse, PluginContext };
