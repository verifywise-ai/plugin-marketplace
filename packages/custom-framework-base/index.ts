/**
 * Custom Framework Base Package
 *
 * Provides a factory function to create framework plugins with minimal configuration.
 * All framework plugins share the same database tables with a plugin_key column for isolation.
 */

import * as ExcelJS from "exceljs";

// ========== TYPE DEFINITIONS ==========

export interface PluginContext {
  sequelize: any;
}

export interface PluginRouteContext {
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

// ========== SHARED TABLE CREATION ==========

async function ensureSharedTables(sequelize: any, tenantId: string): Promise<void> {
  // Framework definition table with plugin_key for isolation
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${tenantId}".custom_frameworks (
      id SERIAL PRIMARY KEY,
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

  // Add plugin_key column if it doesn't exist (for migration from old schema)
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = '${tenantId}'
        AND table_name = 'custom_frameworks'
        AND column_name = 'plugin_key'
      ) THEN
        ALTER TABLE "${tenantId}".custom_frameworks ADD COLUMN plugin_key VARCHAR(100);
      END IF;
    END $$;
  `);

  // Add file_source column if it doesn't exist (for migration from old schema)
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = '${tenantId}'
        AND table_name = 'custom_frameworks'
        AND column_name = 'file_source'
      ) THEN
        ALTER TABLE "${tenantId}".custom_frameworks ADD COLUMN file_source VARCHAR(100);
      END IF;
    END $$;
  `);

  // Level 1 structure
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${tenantId}".custom_framework_level1 (
      id SERIAL PRIMARY KEY,
      framework_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_frameworks(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      order_no INTEGER NOT NULL DEFAULT 1,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Level 2 structure
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${tenantId}".custom_framework_level2 (
      id SERIAL PRIMARY KEY,
      level1_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_framework_level1(id) ON DELETE CASCADE,
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

  // Level 3 structure
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${tenantId}".custom_framework_level3 (
      id SERIAL PRIMARY KEY,
      level2_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_framework_level2(id) ON DELETE CASCADE,
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

  // Project-framework association
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${tenantId}".custom_framework_projects (
      id SERIAL PRIMARY KEY,
      framework_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_frameworks(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(framework_id, project_id)
    )
  `);

  // Level 2 implementation records
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${tenantId}".custom_framework_level2_impl (
      id SERIAL PRIMARY KEY,
      level2_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_framework_level2(id) ON DELETE CASCADE,
      project_framework_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_framework_projects(id) ON DELETE CASCADE,
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

  // Level 3 implementation records
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${tenantId}".custom_framework_level3_impl (
      id SERIAL PRIMARY KEY,
      level3_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_framework_level3(id) ON DELETE CASCADE,
      level2_impl_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_framework_level2_impl(id) ON DELETE CASCADE,
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
    CREATE TABLE IF NOT EXISTS "${tenantId}".custom_framework_level2_risks (
      level2_impl_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_framework_level2_impl(id) ON DELETE CASCADE,
      risk_id INTEGER NOT NULL,
      PRIMARY KEY (level2_impl_id, risk_id)
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${tenantId}".custom_framework_level3_risks (
      level3_impl_id INTEGER NOT NULL REFERENCES "${tenantId}".custom_framework_level3_impl(id) ON DELETE CASCADE,
      risk_id INTEGER NOT NULL,
      PRIMARY KEY (level3_impl_id, risk_id)
    )
  `);

  // Create indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_cf_level1_framework ON "${tenantId}".custom_framework_level1(framework_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_level2_level1 ON "${tenantId}".custom_framework_level2(level1_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_level3_level2 ON "${tenantId}".custom_framework_level3(level2_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_l2impl_pf ON "${tenantId}".custom_framework_level2_impl(project_framework_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_l3impl_l2impl ON "${tenantId}".custom_framework_level3_impl(level2_impl_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cf_plugin_key ON "${tenantId}".custom_frameworks(plugin_key)`,
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
        `ALTER TYPE public.enum_files_source ADD VALUE '${sourceName.replace(/'/g, "''")}'`
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

async function importFramework(
  frameworkData: FrameworkTemplate,
  tenantId: string,
  sequelize: any,
  pluginKey: string
): Promise<{ frameworkId: number; itemsCreated: number; fileSource: string }> {
  const fileSource = generateFileSourceName(frameworkData.name);
  await addFileSourceEnum(sequelize, fileSource);

  const transaction = await sequelize.transaction();

  try {
    const [frameworkResult] = await sequelize.query(
      `INSERT INTO "${tenantId}".custom_frameworks
       (plugin_key, name, description, version, is_organizational, hierarchy_type, level_1_name, level_2_name, level_3_name, file_source, created_at)
       VALUES (:plugin_key, :name, :description, :version, :is_organizational, :hierarchy_type, :level_1_name, :level_2_name, :level_3_name, :file_source, NOW())
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
    const frameworkId = frameworkResult[0].id;

    let itemsCreated = 0;

    for (const level1 of frameworkData.structure) {
      const [level1Result] = await sequelize.query(
        `INSERT INTO "${tenantId}".custom_framework_level1
         (framework_id, title, description, order_no, metadata)
         VALUES (:framework_id, :title, :description, :order_no, :metadata)
         RETURNING id`,
        {
          replacements: {
            framework_id: frameworkId,
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
          `INSERT INTO "${tenantId}".custom_framework_level2
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
              `INSERT INTO "${tenantId}".custom_framework_level3
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
  async function handleGetFrameworks(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, query } = ctx;
    const showAll = query.all === "true";

    try {
      // If ?all=true, return all frameworks; otherwise filter by plugin_key
      const whereClause = showAll
        ? "1=1"
        : "cf.plugin_key = :pluginKey OR cf.plugin_key IS NULL";

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
          (SELECT COUNT(*) FROM "${tenantId}".custom_framework_level1 WHERE framework_id = cf.id) as level1_count,
          (SELECT COUNT(*) FROM "${tenantId}".custom_framework_level2 l2
           JOIN "${tenantId}".custom_framework_level1 l1 ON l2.level1_id = l1.id
           WHERE l1.framework_id = cf.id) as level2_count,
          (SELECT COUNT(*) FROM "${tenantId}".custom_framework_level3 l3
           JOIN "${tenantId}".custom_framework_level2 l2 ON l3.level2_id = l2.id
           JOIN "${tenantId}".custom_framework_level1 l1 ON l2.level1_id = l1.id
           WHERE l1.framework_id = cf.id) as level3_count
        FROM "${tenantId}".custom_frameworks cf
        WHERE ${whereClause}
        ORDER BY cf.created_at DESC
      `,
        { replacements: { pluginKey } }
      );

      return { status: 200, data: frameworks };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to fetch frameworks: ${error.message}` } };
    }
  }

  // Handler: Get framework by ID
  async function handleGetFrameworkById(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params } = ctx;
    const frameworkId = parseInt(params.frameworkId);

    try {
      const [meta] = await sequelize.query(
        `SELECT * FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
        { replacements: { frameworkId } }
      );

      if (meta.length === 0) {
        return { status: 404, data: { message: "Framework not found" } };
      }

      const [level1Items] = await sequelize.query(
        `SELECT * FROM "${tenantId}".custom_framework_level1
         WHERE framework_id = :frameworkId ORDER BY order_no`,
        { replacements: { frameworkId } }
      );

      for (const l1 of level1Items as any[]) {
        const [level2Items] = await sequelize.query(
          `SELECT * FROM "${tenantId}".custom_framework_level2
           WHERE level1_id = :level1Id ORDER BY order_no`,
          { replacements: { level1Id: l1.id } }
        );

        for (const l2 of level2Items as any[]) {
          if (meta[0].hierarchy_type === "three_level") {
            const [level3Items] = await sequelize.query(
              `SELECT * FROM "${tenantId}".custom_framework_level3
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
        FROM "${tenantId}".custom_framework_projects cfp
        JOIN "${tenantId}".projects p ON cfp.project_id = p.id
        WHERE cfp.framework_id = :frameworkId`,
        { replacements: { frameworkId } }
      );

      // Calculate progress for each linked project
      const linkedProjects = await Promise.all(
        (linkedProjectsRaw as any[]).map(async (proj) => {
          // Get total and completed controls for this project-framework
          // Use _impl tables (not _status) - for three_level, count level3_impl via level2_impl
          let progressData: any[];

          if (meta[0].hierarchy_type === "three_level") {
            [progressData] = await sequelize.query(
              `SELECT
                COUNT(*) as total,
                SUM(CASE WHEN l3.status = 'Implemented' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN l3.owner IS NOT NULL THEN 1 ELSE 0 END) as assigned
              FROM "${tenantId}".custom_framework_level3_impl l3
              JOIN "${tenantId}".custom_framework_level2_impl l2 ON l3.level2_impl_id = l2.id
              WHERE l2.project_framework_id = :projectFrameworkId`,
              { replacements: { projectFrameworkId: proj.project_framework_id } }
            );
          } else {
            [progressData] = await sequelize.query(
              `SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Implemented' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN owner IS NOT NULL THEN 1 ELSE 0 END) as assigned
              FROM "${tenantId}".custom_framework_level2_impl
              WHERE project_framework_id = :projectFrameworkId`,
              { replacements: { projectFrameworkId: proj.project_framework_id } }
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

  // Handler: Delete framework
  async function handleDeleteFramework(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params } = ctx;
    const frameworkId = parseInt(params.frameworkId);

    try {
      // Check if framework exists
      const [framework] = await sequelize.query(
        `SELECT id FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
        { replacements: { frameworkId } }
      );

      if (framework.length === 0) {
        return { status: 404, data: { message: "Framework not found" } };
      }

      // Check if framework is in use
      const [projects] = await sequelize.query(
        `SELECT COUNT(*) as count FROM "${tenantId}".custom_framework_projects WHERE framework_id = :frameworkId`,
        { replacements: { frameworkId } }
      );

      if (parseInt(projects[0].count) > 0) {
        // Clean up orphaned project associations first
        await sequelize.query(
          `DELETE FROM "${tenantId}".custom_framework_projects WHERE framework_id = :frameworkId`,
          { replacements: { frameworkId } }
        );
      }

      await sequelize.query(`DELETE FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`, {
        replacements: { frameworkId },
      });

      return { status: 200, data: { success: true, message: "Framework deleted" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Delete failed: ${error.message}` } };
    }
  }

  // Handler: Add to project
  async function handleAddToProject(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, body } = ctx;
    const { frameworkId, projectId } = body;

    if (!frameworkId || !projectId) {
      return { status: 400, data: { message: "frameworkId and projectId are required" } };
    }

    try {
      // Get framework by ID (no plugin_key filter - frameworks can be added from any endpoint)
      const [framework] = await sequelize.query(
        `SELECT id, hierarchy_type FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
        { replacements: { frameworkId } }
      );

      if (framework.length === 0) {
        return { status: 404, data: { message: "Framework not found" } };
      }

      const hierarchyType = framework[0].hierarchy_type;

      // Check if already added
      const [existing] = await sequelize.query(
        `SELECT id FROM "${tenantId}".custom_framework_projects
         WHERE framework_id = :frameworkId AND project_id = :projectId`,
        { replacements: { frameworkId, projectId } }
      );

      if (existing.length > 0) {
        return { status: 400, data: { message: "Framework already added to this project" } };
      }

      // Create association
      const [insertResult] = await sequelize.query(
        `INSERT INTO "${tenantId}".custom_framework_projects (framework_id, project_id, created_at)
         VALUES (:frameworkId, :projectId, NOW())
         RETURNING id`,
        { replacements: { frameworkId, projectId } }
      );
      const projectFrameworkId = insertResult[0].id;

      // Create implementation records for all level2 items
      const [level2Items] = await sequelize.query(
        `SELECT l2.id FROM "${tenantId}".custom_framework_level2 l2
         JOIN "${tenantId}".custom_framework_level1 l1 ON l2.level1_id = l1.id
         WHERE l1.framework_id = :frameworkId`,
        { replacements: { frameworkId } }
      );

      for (const l2 of level2Items as any[]) {
        const [implResult] = await sequelize.query(
          `INSERT INTO "${tenantId}".custom_framework_level2_impl
           (level2_id, project_framework_id, status, created_at, updated_at)
           VALUES (:level2_id, :project_framework_id, 'Not started', NOW(), NOW())
           RETURNING id`,
          { replacements: { level2_id: l2.id, project_framework_id: projectFrameworkId } }
        );

        if (hierarchyType === "three_level") {
          const [level3Items] = await sequelize.query(
            `SELECT id FROM "${tenantId}".custom_framework_level3 WHERE level2_id = :level2Id`,
            { replacements: { level2Id: l2.id } }
          );

          for (const l3 of level3Items as any[]) {
            await sequelize.query(
              `INSERT INTO "${tenantId}".custom_framework_level3_impl
               (level3_id, level2_impl_id, status, created_at, updated_at)
               VALUES (:level3_id, :level2_impl_id, 'Not started', NOW(), NOW())`,
              { replacements: { level3_id: l3.id, level2_impl_id: implResult[0].id } }
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
    const { sequelize, tenantId, body } = ctx;
    const { frameworkId, projectId } = body;

    if (!frameworkId || !projectId) {
      return { status: 400, data: { message: "frameworkId and projectId are required" } };
    }

    try {
      await sequelize.query(
        `DELETE FROM "${tenantId}".custom_framework_projects
         WHERE framework_id = :frameworkId AND project_id = :projectId`,
        { replacements: { frameworkId, projectId } }
      );

      return { status: 200, data: { success: true, message: "Framework removed from project" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to remove: ${error.message}` } };
    }
  }

  // Handler: Get project frameworks
  async function handleGetProjectFrameworks(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params, query } = ctx;
    const projectId = parseInt(params.projectId);
    const isOrganizational = query.is_organizational === "true";

    try {
      // Return all frameworks for this project - UI filters by is_organizational
      const [frameworks] = await sequelize.query(
        `
        SELECT cf.*, cf.id as framework_id, cfp.id as project_framework_id, cfp.created_at as added_at
        FROM "${tenantId}".custom_frameworks cf
        JOIN "${tenantId}".custom_framework_projects cfp ON cf.id = cfp.framework_id
        WHERE cfp.project_id = :projectId
        ORDER BY cf.name
      `,
        { replacements: { projectId } }
      );

      return { status: 200, data: frameworks };
    } catch (error: any) {
      return { status: 500, data: { message: error.message } };
    }
  }

  // Handler: Get project framework with structure
  async function handleGetProjectFramework(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params } = ctx;
    const projectId = parseInt(params.projectId);
    const frameworkId = parseInt(params.frameworkId);

    try {
      const [projectFramework] = await sequelize.query(
        `SELECT cfp.id as project_framework_id, cf.*
         FROM "${tenantId}".custom_framework_projects cfp
         JOIN "${tenantId}".custom_frameworks cf ON cfp.framework_id = cf.id
         WHERE cfp.project_id = :projectId AND cfp.framework_id = :frameworkId`,
        { replacements: { projectId, frameworkId } }
      );

      if (projectFramework.length === 0) {
        return { status: 404, data: { message: "Framework not found in project" } };
      }

      const pf = projectFramework[0];
      const projectFrameworkId = pf.project_framework_id;

      const [level1Items] = await sequelize.query(
        `SELECT * FROM "${tenantId}".custom_framework_level1
         WHERE framework_id = :frameworkId ORDER BY order_no`,
        { replacements: { frameworkId } }
      );

      for (const l1 of level1Items as any[]) {
        const [level2Items] = await sequelize.query(
          `SELECT l2.*,
                  impl.id as impl_id, impl.status, impl.owner, impl.reviewer, impl.approver,
                  impl.due_date, impl.implementation_details, impl.evidence_links,
                  impl.feedback_links, impl.auditor_feedback,
                  u_owner.name as owner_name, u_owner.surname as owner_surname,
                  u_reviewer.name as reviewer_name, u_reviewer.surname as reviewer_surname,
                  u_approver.name as approver_name, u_approver.surname as approver_surname
           FROM "${tenantId}".custom_framework_level2 l2
           LEFT JOIN "${tenantId}".custom_framework_level2_impl impl
             ON l2.id = impl.level2_id AND impl.project_framework_id = :projectFrameworkId
           LEFT JOIN public.users u_owner ON impl.owner = u_owner.id
           LEFT JOIN public.users u_reviewer ON impl.reviewer = u_reviewer.id
           LEFT JOIN public.users u_approver ON impl.approver = u_approver.id
           WHERE l2.level1_id = :level1Id
           ORDER BY l2.order_no`,
          { replacements: { level1Id: l1.id, projectFrameworkId } }
        );

        for (const l2 of level2Items as any[]) {
          if (l2.impl_id) {
            // Fetch linked risks
            const [risks] = await sequelize.query(
              `SELECT r.id, r.risk_name, r.risk_description
               FROM "${tenantId}".custom_framework_level2_risks lr
               JOIN "${tenantId}".risks r ON lr.risk_id = r.id
               WHERE lr.level2_impl_id = :implId`,
              { replacements: { implId: l2.impl_id } }
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
              FROM "${tenantId}".file_entity_links fel
              JOIN "${tenantId}".files f ON fel.file_id = f.id
              LEFT JOIN public.users u ON f.uploaded_by = u.id
              WHERE fel.framework_type = :frameworkType
                AND fel.entity_type = 'level2_impl'
                AND fel.entity_id = :implId
              ORDER BY fel.created_at DESC`,
              { replacements: { frameworkType: pluginKey, implId: l2.impl_id } }
            );
            l2.linked_files = linkedFiles;
          } else {
            l2.linked_risks = [];
            l2.linked_files = [];
          }

          if (pf.hierarchy_type === "three_level") {
            const [level3Items] = await sequelize.query(
              `SELECT l3.*,
                      impl.id as impl_id, impl.status, impl.owner, impl.reviewer, impl.approver,
                      impl.due_date, impl.implementation_details, impl.evidence_links
               FROM "${tenantId}".custom_framework_level3 l3
               LEFT JOIN "${tenantId}".custom_framework_level3_impl impl
                 ON l3.id = impl.level3_id AND impl.level2_impl_id = :level2ImplId
               WHERE l3.level2_id = :level2Id
               ORDER BY l3.order_no`,
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
                  FROM "${tenantId}".file_entity_links fel
                  JOIN "${tenantId}".files f ON fel.file_id = f.id
                  LEFT JOIN public.users u ON f.uploaded_by = u.id
                  WHERE fel.framework_type = :frameworkType
                    AND fel.entity_type = 'level3_impl'
                    AND fel.entity_id = :implId
                  ORDER BY fel.created_at DESC`,
                  { replacements: { frameworkType: pluginKey, implId: l3.impl_id } }
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

  // Handler: Get progress
  async function handleGetProgress(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params } = ctx;
    const projectId = parseInt(params.projectId);
    const frameworkId = parseInt(params.frameworkId);

    try {
      const [projectFramework] = await sequelize.query(
        `SELECT cfp.id as project_framework_id, cf.hierarchy_type
         FROM "${tenantId}".custom_framework_projects cfp
         JOIN "${tenantId}".custom_frameworks cf ON cfp.framework_id = cf.id
         WHERE cfp.project_id = :projectId AND cfp.framework_id = :frameworkId`,
        { replacements: { projectId, frameworkId } }
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
         FROM "${tenantId}".custom_framework_level2_impl
         WHERE project_framework_id = :projectFrameworkId`,
        { replacements: { projectFrameworkId } }
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
           FROM "${tenantId}".custom_framework_level3_impl l3
           JOIN "${tenantId}".custom_framework_level2_impl l2 ON l3.level2_impl_id = l2.id
           WHERE l2.project_framework_id = :projectFrameworkId`,
          { replacements: { projectFrameworkId } }
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

  // Handler: Update level 2 implementation
  async function handleUpdateLevel2(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params, body } = ctx;
    const implId = parseInt(params.level2Id);

    try {
      const updateFields: string[] = [];
      const replacements: any = { id: implId };

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
        `UPDATE "${tenantId}".custom_framework_level2_impl
         SET ${updateFields.join(", ")}
         WHERE id = :id`,
        { replacements }
      );

      // Handle risk linking
      if (body.risks_to_add && Array.isArray(body.risks_to_add)) {
        for (const riskId of body.risks_to_add) {
          await sequelize.query(
            `INSERT INTO "${tenantId}".custom_framework_level2_risks (level2_impl_id, risk_id)
             VALUES (:implId, :riskId)
             ON CONFLICT DO NOTHING`,
            { replacements: { implId, riskId } }
          );
        }
      }

      if (body.risks_to_remove && Array.isArray(body.risks_to_remove)) {
        await sequelize.query(
          `DELETE FROM "${tenantId}".custom_framework_level2_risks
           WHERE level2_impl_id = :implId AND risk_id = ANY(:risks)`,
          { replacements: { implId, risks: body.risks_to_remove } }
        );
      }

      return { status: 200, data: { success: true, message: "Updated successfully" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Update failed: ${error.message}` } };
    }
  }

  // Handler: Update level 3 implementation
  async function handleUpdateLevel3(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params, body } = ctx;
    const implId = parseInt(params.level3Id);

    try {
      const updateFields: string[] = [];
      const replacements: any = { id: implId };

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
        `UPDATE "${tenantId}".custom_framework_level3_impl
         SET ${updateFields.join(", ")}
         WHERE id = :id`,
        { replacements }
      );

      return { status: 200, data: { success: true, message: "Updated successfully" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Update failed: ${error.message}` } };
    }
  }

  // ========== FILE ATTACHMENT HANDLERS ==========

  // Handler: Attach files to level2 implementation
  async function handleAttachFilesToLevel2(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, userId, params, body } = ctx;
    const implId = parseInt(params.level2Id);
    const { file_ids, link_type = "evidence" } = body;

    if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
      return { status: 400, data: { message: "file_ids array is required" } };
    }

    try {
      // Verify the implementation record exists
      const [impl] = await sequelize.query(
        `SELECT id FROM "${tenantId}".custom_framework_level2_impl WHERE id = :implId`,
        { replacements: { implId } }
      );

      if (impl.length === 0) {
        return { status: 404, data: { message: "Implementation record not found" } };
      }

      const results: { file_id: number; success: boolean; message: string }[] = [];

      for (const fileId of file_ids) {
        try {
          await sequelize.query(
            `INSERT INTO "${tenantId}".file_entity_links
             (file_id, framework_type, entity_type, entity_id, link_type, created_by, created_at)
             VALUES (:fileId, :frameworkType, 'level2_impl', :entityId, :linkType, :userId, NOW())
             ON CONFLICT (file_id, framework_type, entity_type, entity_id) DO NOTHING`,
            {
              replacements: {
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

  // Handler: Get files attached to level2 implementation
  async function handleGetLevel2Files(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params } = ctx;
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
        FROM "${tenantId}".file_entity_links fel
        JOIN "${tenantId}".files f ON fel.file_id = f.id
        LEFT JOIN public.users u ON f.uploaded_by = u.id
        WHERE fel.framework_type = :frameworkType
          AND fel.entity_type = 'level2_impl'
          AND fel.entity_id = :entityId
        ORDER BY fel.created_at DESC`,
        {
          replacements: {
            frameworkType: pluginKey,
            entityId: implId,
          },
        }
      );

      return { status: 200, data: files };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to get files: ${error.message}` } };
    }
  }

  // Handler: Detach file from level2 implementation
  async function handleDetachFileFromLevel2(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params } = ctx;
    const implId = parseInt(params.level2Id);
    const fileId = parseInt(params.fileId);

    try {
      await sequelize.query(
        `DELETE FROM "${tenantId}".file_entity_links
         WHERE file_id = :fileId
           AND framework_type = :frameworkType
           AND entity_type = 'level2_impl'
           AND entity_id = :entityId`,
        {
          replacements: {
            fileId,
            frameworkType: pluginKey,
            entityId: implId,
          },
        }
      );

      return { status: 200, data: { message: "File detached successfully" } };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to detach file: ${error.message}` } };
    }
  }

  // Handler: Attach files to level3 implementation
  async function handleAttachFilesToLevel3(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, userId, params, body } = ctx;
    const implId = parseInt(params.level3Id);
    const { file_ids, link_type = "evidence" } = body;

    if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
      return { status: 400, data: { message: "file_ids array is required" } };
    }

    try {
      // Verify the implementation record exists
      const [impl] = await sequelize.query(
        `SELECT id FROM "${tenantId}".custom_framework_level3_impl WHERE id = :implId`,
        { replacements: { implId } }
      );

      if (impl.length === 0) {
        return { status: 404, data: { message: "Implementation record not found" } };
      }

      const results: { file_id: number; success: boolean; message: string }[] = [];

      for (const fileId of file_ids) {
        try {
          await sequelize.query(
            `INSERT INTO "${tenantId}".file_entity_links
             (file_id, framework_type, entity_type, entity_id, link_type, created_by, created_at)
             VALUES (:fileId, :frameworkType, 'level3_impl', :entityId, :linkType, :userId, NOW())
             ON CONFLICT (file_id, framework_type, entity_type, entity_id) DO NOTHING`,
            {
              replacements: {
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

  // Handler: Get files attached to level3 implementation
  async function handleGetLevel3Files(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params } = ctx;
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
        FROM "${tenantId}".file_entity_links fel
        JOIN "${tenantId}".files f ON fel.file_id = f.id
        LEFT JOIN public.users u ON f.uploaded_by = u.id
        WHERE fel.framework_type = :frameworkType
          AND fel.entity_type = 'level3_impl'
          AND fel.entity_id = :entityId
        ORDER BY fel.created_at DESC`,
        {
          replacements: {
            frameworkType: pluginKey,
            entityId: implId,
          },
        }
      );

      return { status: 200, data: files };
    } catch (error: any) {
      return { status: 500, data: { message: `Failed to get files: ${error.message}` } };
    }
  }

  // Handler: Detach file from level3 implementation
  async function handleDetachFileFromLevel3(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
    const { sequelize, tenantId, params } = ctx;
    const implId = parseInt(params.level3Id);
    const fileId = parseInt(params.fileId);

    try {
      await sequelize.query(
        `DELETE FROM "${tenantId}".file_entity_links
         WHERE file_id = :fileId
           AND framework_type = :frameworkType
           AND entity_type = 'level3_impl'
           AND entity_id = :entityId`,
        {
          replacements: {
            fileId,
            frameworkType: pluginKey,
            entityId: implId,
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
    tenantId: string,
    _config: any,
    context: PluginContext
  ): Promise<{ success: boolean; message: string; installedAt: string }> {
    const { sequelize } = context;

    try {
      // Ensure shared tables exist
      await ensureSharedTables(sequelize, tenantId);

      // Auto-import template if configured
      if (config.autoImport !== false && config.template) {
        // Check if already imported
        const [existing] = await sequelize.query(
          `SELECT id FROM "${tenantId}".custom_frameworks WHERE plugin_key = :pluginKey`,
          { replacements: { pluginKey } }
        );

        if (existing.length === 0) {
          const result = await importFramework(config.template, tenantId, sequelize, pluginKey);
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
  async function uninstall(
    _userId: number,
    tenantId: string,
    context: PluginContext
  ): Promise<{ success: boolean; message: string; uninstalledAt: string }> {
    const { sequelize } = context;

    try {
      // Get framework IDs for this plugin
      const [frameworks] = await sequelize.query(
        `SELECT id FROM "${tenantId}".custom_frameworks WHERE plugin_key = :pluginKey`,
        { replacements: { pluginKey } }
      );

      const frameworkIds = (frameworks as any[]).map((f) => f.id);

      if (frameworkIds.length > 0) {
        // Delete project associations and implementations (cascade will handle related records)
        await sequelize.query(
          `DELETE FROM "${tenantId}".custom_framework_projects WHERE framework_id IN (:ids)`,
          { replacements: { ids: frameworkIds } }
        );

        // Delete frameworks
        await sequelize.query(
          `DELETE FROM "${tenantId}".custom_frameworks WHERE plugin_key = :pluginKey`,
          { replacements: { pluginKey } }
        );
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
