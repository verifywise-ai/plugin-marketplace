/**
 * Custom Framework Import Plugin
 *
 * Allows users to import custom compliance frameworks (organizational and non-organizational)
 * with full feature parity to built-in frameworks.
 *
 * All framework data is stored in the tenant schema for proper multi-tenant isolation.
 */

import * as ExcelJS from "exceljs";

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

interface CustomFrameworkImport {
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

interface FrameworkLevel1 {
  title: string;
  description?: string;
  order_no: number;
  metadata?: Record<string, any>;
  items: FrameworkLevel2[];
}

interface FrameworkLevel2 {
  title: string;
  description?: string;
  order_no: number;
  summary?: string;
  questions?: string[];
  evidence_examples?: string[];
  metadata?: Record<string, any>;
  items?: FrameworkLevel3[];
}

interface FrameworkLevel3 {
  title: string;
  description?: string;
  order_no: number;
  summary?: string;
  questions?: string[];
  evidence_examples?: string[];
  metadata?: Record<string, any>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ========== PLUGIN METADATA ==========

export const metadata = {
  name: "Custom Framework Import",
  version: "1.0.0",
  author: "VerifyWise",
  description: "Import and manage custom compliance frameworks",
};

// ========== PLUGIN LIFECYCLE ==========

export async function install(
  _userId: number,
  tenantId: string,
  _config: any,
  context: PluginContext
): Promise<{ success: boolean; message: string; installedAt: string }> {
  const { sequelize } = context;

  try {
    // All tables are created in the tenant schema for proper isolation

    // Framework definition table (tenant-specific)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${tenantId}".custom_frameworks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(50) DEFAULT '1.0.0',
        is_organizational BOOLEAN DEFAULT FALSE,
        hierarchy_type VARCHAR(50) NOT NULL DEFAULT 'two_level',
        level_1_name VARCHAR(100) NOT NULL DEFAULT 'Category',
        level_2_name VARCHAR(100) NOT NULL DEFAULT 'Control',
        level_3_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Level 1 structure (Categories/Clauses/etc)
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

    // Level 2 structure (Controls/Requirements/etc)
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

    // Level 3 structure (Subcontrols - optional)
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

    // Level 2 implementation records (per project)
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

    // Level 3 implementation records (per project)
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

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_level1_framework
      ON "${tenantId}".custom_framework_level1(framework_id)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_level2_level1
      ON "${tenantId}".custom_framework_level2(level1_id)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_level3_level2
      ON "${tenantId}".custom_framework_level3(level2_id)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_l2impl_pf
      ON "${tenantId}".custom_framework_level2_impl(project_framework_id)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_cf_l3impl_l2impl
      ON "${tenantId}".custom_framework_level3_impl(level2_impl_id)
    `);

    return {
      success: true,
      message:
        "Custom Framework Import plugin installed successfully. You can now import custom compliance frameworks.",
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
): Promise<{ success: boolean; message: string; uninstalledAt: string }> {
  const { sequelize } = context;

  // Delete project associations and implementation data, but preserve framework definitions
  try {
    // Delete implementation status/progress data
    await sequelize.query(
      `DELETE FROM "${tenantId}".custom_framework_controls`
    );

    // Delete project-framework associations
    await sequelize.query(
      `DELETE FROM "${tenantId}".custom_framework_projects`
    );

    // Framework definitions (custom_frameworks, custom_framework_level1/2/3) are preserved
  } catch (error: any) {
    console.error("[CustomFrameworkImport] Error cleaning up data:", error);
    // Continue with uninstall even if cleanup fails
  }

  return {
    success: true,
    message:
      "Custom Framework Import plugin uninstalled. Framework definitions preserved, project associations removed.",
    uninstalledAt: new Date().toISOString(),
  };
}

// ========== VALIDATION ==========

export function validateConfig(_config: any): ValidationResult {
  // This plugin doesn't require configuration
  return { isValid: true, errors: [] };
}

function validateFrameworkImport(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
    errors.push("Framework name is required");
  }

  if (
    !data.description ||
    typeof data.description !== "string" ||
    data.description.trim() === ""
  ) {
    errors.push("Framework description is required");
  }

  if (!data.hierarchy) {
    errors.push("Hierarchy configuration is required");
  } else {
    if (data.hierarchy.type !== "two_level" && data.hierarchy.type !== "three_level") {
      errors.push('Hierarchy type must be "two_level" or "three_level"');
    }
    if (!data.hierarchy.level1_name) {
      errors.push("Level 1 name is required (e.g., Category, Article, Clause)");
    }
    if (!data.hierarchy.level2_name) {
      errors.push(
        "Level 2 name is required (e.g., Control, Requirement, Section)"
      );
    }
    if (data.hierarchy.type === "three_level" && !data.hierarchy.level3_name) {
      errors.push("Level 3 name is required for three-level hierarchies");
    }
  }

  if (!data.structure || !Array.isArray(data.structure)) {
    errors.push("Structure array is required");
  } else if (data.structure.length === 0) {
    errors.push("Structure must contain at least one level 1 item");
  } else {
    // Validate structure items
    data.structure.forEach((level1: any, l1Idx: number) => {
      if (!level1.title) {
        errors.push(`Level 1 item ${l1Idx + 1}: title is required`);
      }
      if (typeof level1.order_no !== "number") {
        errors.push(`Level 1 item ${l1Idx + 1}: order_no must be a number`);
      }
      if (!level1.items || !Array.isArray(level1.items)) {
        errors.push(`Level 1 item ${l1Idx + 1}: items array is required`);
      } else {
        level1.items.forEach((level2: any, l2Idx: number) => {
          if (!level2.title) {
            errors.push(
              `Level 1[${l1Idx + 1}] > Level 2[${l2Idx + 1}]: title is required`
            );
          }
          if (typeof level2.order_no !== "number") {
            errors.push(
              `Level 1[${l1Idx + 1}] > Level 2[${l2Idx + 1}]: order_no must be a number`
            );
          }

          // Validate level 3 if three-level hierarchy
          if (
            data.hierarchy?.type === "three_level" &&
            level2.items &&
            Array.isArray(level2.items)
          ) {
            level2.items.forEach((level3: any, l3Idx: number) => {
              if (!level3.title) {
                errors.push(
                  `Level 1[${l1Idx + 1}] > Level 2[${l2Idx + 1}] > Level 3[${l3Idx + 1}]: title is required`
                );
              }
            });
          }
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ========== HELPER FUNCTIONS ==========

/**
 * Convert a JavaScript array to PostgreSQL array literal format
 * e.g., ["a", "b"] -> '{"a","b"}'
 */
function toPgArray(arr: string[] | undefined | null): string {
  if (!arr || arr.length === 0) return '{}';
  const escaped = arr.map(item => {
    // Escape backslashes and double quotes
    const escapedItem = String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escapedItem}"`;
  });
  return `{${escaped.join(',')}}`;
}

// ========== CORE FUNCTIONS ==========

async function importFramework(
  frameworkData: CustomFrameworkImport,
  tenantId: string,
  sequelize: any
): Promise<{ frameworkId: number; itemsCreated: number }> {
  const transaction = await sequelize.transaction();

  try {
    // 1. Create framework entry in tenant schema
    const [frameworkResult] = await sequelize.query(
      `INSERT INTO "${tenantId}".custom_frameworks
       (name, description, version, is_organizational, hierarchy_type, level_1_name, level_2_name, level_3_name, created_at)
       VALUES (:name, :description, :version, :is_organizational, :hierarchy_type, :level_1_name, :level_2_name, :level_3_name, NOW())
       RETURNING id`,
      {
        replacements: {
          name: frameworkData.name,
          description: frameworkData.description,
          version: frameworkData.version || "1.0.0",
          is_organizational: frameworkData.is_organizational,
          hierarchy_type: frameworkData.hierarchy.type,
          level_1_name: frameworkData.hierarchy.level1_name,
          level_2_name: frameworkData.hierarchy.level2_name,
          level_3_name: frameworkData.hierarchy.level3_name || null,
        },
        transaction,
      }
    );
    const frameworkId = frameworkResult[0].id;

    // 2. Create structure items
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
           VALUES (:level1_id, :title, :description, :order_no, :summary, :questions::text[], :evidence_examples::text[], :metadata)
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

        // Level 3 items (if applicable)
        if (
          frameworkData.hierarchy.type === "three_level" &&
          level2.items &&
          level2.items.length > 0
        ) {
          for (const level3 of level2.items) {
            await sequelize.query(
              `INSERT INTO "${tenantId}".custom_framework_level3
               (level2_id, title, description, order_no, summary, questions, evidence_examples, metadata)
               VALUES (:level2_id, :title, :description, :order_no, :summary, :questions::text[], :evidence_examples::text[], :metadata)`,
              {
                replacements: {
                  level2_id: level2Id,
                  title: level3.title,
                  description: level3.description || null,
                  order_no: level3.order_no || 1,
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

    return { frameworkId, itemsCreated };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ========== ROUTE HANDLERS ==========

async function handleImportFramework(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, body } = ctx;

  try {
    const frameworkData = body as CustomFrameworkImport;

    // Validate framework data
    const validation = validateFrameworkImport(frameworkData);
    if (!validation.isValid) {
      return {
        status: 400,
        data: {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        },
      };
    }

    // Check if framework with same name already exists in tenant
    const [existing] = await sequelize.query(
      `SELECT id FROM "${tenantId}".custom_frameworks WHERE LOWER(name) = LOWER(:name)`,
      { replacements: { name: frameworkData.name } }
    );

    if (existing.length > 0) {
      return {
        status: 400,
        data: {
          success: false,
          message: `A framework with name "${frameworkData.name}" already exists`,
        },
      };
    }

    const result = await importFramework(frameworkData, tenantId, sequelize);

    return {
      status: 200,
      data: {
        success: true,
        frameworkId: result.frameworkId,
        itemsCreated: result.itemsCreated,
        message: `Framework "${frameworkData.name}" imported successfully with ${result.itemsCreated} items.`,
      },
    };
  } catch (error: any) {
    return {
      status: 500,
      data: {
        success: false,
        message: `Import failed: ${error.message}`,
      },
    };
  }
}

async function handleGetCustomFrameworks(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId } = ctx;

  try {
    const [frameworks] = await sequelize.query(`
      SELECT
        cf.id,
        cf.name,
        cf.description,
        cf.version,
        cf.is_organizational,
        cf.hierarchy_type,
        cf.level_1_name,
        cf.level_2_name,
        cf.level_3_name,
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
      ORDER BY cf.created_at DESC
    `);

    return {
      status: 200,
      data: frameworks,
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Failed to fetch frameworks: ${error.message}` },
    };
  }
}

async function handleGetFrameworkById(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const frameworkId = parseInt(params.frameworkId);

  try {
    // Get framework metadata
    const [meta] = await sequelize.query(
      `SELECT * FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
      { replacements: { frameworkId } }
    );

    if (meta.length === 0) {
      return { status: 404, data: { message: "Framework not found" } };
    }

    // Get level 1 items with nested level 2 and level 3
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

    return {
      status: 200,
      data: {
        ...meta[0],
        structure: level1Items,
      },
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Failed to fetch structure: ${error.message}` },
    };
  }
}

async function handleDeleteFramework(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const frameworkId = parseInt(params.frameworkId);

  try {
    // Check if framework exists
    const [existing] = await sequelize.query(
      `SELECT id FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
      { replacements: { frameworkId } }
    );

    if (existing.length === 0) {
      return { status: 404, data: { message: "Framework not found" } };
    }

    // Check if framework is in use by any existing projects
    // (only count associations where the project still exists)
    const [usage] = await sequelize.query(
      `SELECT COUNT(*) as count
       FROM "${tenantId}".custom_framework_projects
       WHERE framework_id = :frameworkId
       AND project_id IN (SELECT id FROM "${tenantId}".projects)`,
      { replacements: { frameworkId } }
    );

    if (parseInt(usage[0].count) > 0) {
      return {
        status: 400,
        data: {
          message:
            "Cannot delete framework that is in use by projects. Remove it from all projects first.",
        },
      };
    }

    // Clean up any orphaned project associations (where project was deleted)
    await sequelize.query(
      `DELETE FROM "${tenantId}".custom_framework_projects
       WHERE framework_id = :frameworkId
       AND project_id NOT IN (SELECT id FROM "${tenantId}".projects)`,
      { replacements: { frameworkId } }
    );

    // Delete framework (cascades to level1, level2, level3)
    await sequelize.query(
      `DELETE FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
      { replacements: { frameworkId } }
    );

    return {
      status: 200,
      data: { success: true, message: "Framework deleted successfully" },
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Delete failed: ${error.message}` },
    };
  }
}

async function handleAddToProject(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, body } = ctx;
  const { frameworkId, projectId } = body;

  if (!frameworkId || !projectId) {
    return {
      status: 400,
      data: { message: "frameworkId and projectId are required" },
    };
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Check if framework exists
    const [framework] = await sequelize.query(
      `SELECT * FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
      { replacements: { frameworkId }, transaction }
    );

    if (framework.length === 0) {
      await transaction.rollback();
      return { status: 404, data: { message: "Framework not found" } };
    }

    // 2. Check if already added to this project
    const [existing] = await sequelize.query(
      `SELECT id FROM "${tenantId}".custom_framework_projects
       WHERE framework_id = :frameworkId AND project_id = :projectId`,
      { replacements: { frameworkId, projectId }, transaction }
    );

    if (existing.length > 0) {
      await transaction.rollback();
      return {
        status: 400,
        data: { message: "Framework is already added to this project" },
      };
    }

    // 3. Check organizational compatibility
    const frameworkInfo = framework[0];
    const [[projectInfo]] = await sequelize.query(
      `SELECT is_organizational FROM "${tenantId}".projects WHERE id = :projectId`,
      { replacements: { projectId }, transaction }
    ) as [[{ is_organizational: boolean }], number];

    if (frameworkInfo.is_organizational !== projectInfo.is_organizational) {
      await transaction.rollback();
      return {
        status: 400,
        data: {
          message: frameworkInfo.is_organizational
            ? "Organizational frameworks can only be added to organizational projects"
            : "Project-level frameworks can only be added to regular projects",
        },
      };
    }

    // 4. Create project-framework association
    const [pfResult] = await sequelize.query(
      `INSERT INTO "${tenantId}".custom_framework_projects (framework_id, project_id, created_at)
       VALUES (:frameworkId, :projectId, NOW())
       RETURNING id`,
      { replacements: { frameworkId, projectId }, transaction }
    );
    const projectFrameworkId = (pfResult as any[])[0].id;

    // 5. Get all level1 items
    const [level1Items] = await sequelize.query(
      `SELECT id FROM "${tenantId}".custom_framework_level1
       WHERE framework_id = :frameworkId ORDER BY order_no`,
      { replacements: { frameworkId }, transaction }
    );

    let level2Count = 0;
    let level3Count = 0;

    // 6. Create implementation records
    for (const level1 of level1Items as any[]) {
      const [level2Items] = await sequelize.query(
        `SELECT id FROM "${tenantId}".custom_framework_level2
         WHERE level1_id = :level1Id ORDER BY order_no`,
        { replacements: { level1Id: level1.id }, transaction }
      );

      for (const level2 of level2Items as any[]) {
        // Create level2 implementation record
        const [l2ImplResult] = await sequelize.query(
          `INSERT INTO "${tenantId}".custom_framework_level2_impl
           (level2_id, project_framework_id, status, created_at, updated_at)
           VALUES (:level2Id, :projectFrameworkId, 'Not started', NOW(), NOW())
           RETURNING id`,
          {
            replacements: {
              level2Id: level2.id,
              projectFrameworkId,
            },
            transaction,
          }
        );
        const level2ImplId = (l2ImplResult as any[])[0].id;
        level2Count++;

        // If three-level hierarchy, create level3 implementation records
        if (frameworkInfo.hierarchy_type === "three_level") {
          const [level3Items] = await sequelize.query(
            `SELECT id FROM "${tenantId}".custom_framework_level3
             WHERE level2_id = :level2Id ORDER BY order_no`,
            { replacements: { level2Id: level2.id }, transaction }
          );

          for (const level3 of level3Items as any[]) {
            await sequelize.query(
              `INSERT INTO "${tenantId}".custom_framework_level3_impl
               (level3_id, level2_impl_id, status, created_at, updated_at)
               VALUES (:level3Id, :level2ImplId, 'Not started', NOW(), NOW())`,
              {
                replacements: {
                  level3Id: level3.id,
                  level2ImplId,
                },
                transaction,
              }
            );
            level3Count++;
          }
        }
      }
    }

    await transaction.commit();

    return {
      status: 200,
      data: {
        success: true,
        projectFrameworkId,
        level2Count,
        level3Count,
        message: `Framework added to project with ${level2Count} controls${level3Count > 0 ? ` and ${level3Count} subcontrols` : ""}`,
      },
    };
  } catch (error: any) {
    await transaction.rollback();
    return {
      status: 500,
      data: { message: `Failed to add framework to project: ${error.message}` },
    };
  }
}

async function handleRemoveFromProject(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, body } = ctx;
  const { frameworkId, projectId } = body;

  if (!frameworkId || !projectId) {
    return {
      status: 400,
      data: { message: "frameworkId and projectId are required" },
    };
  }

  try {
    // Get project-framework ID
    const [pfResult] = await sequelize.query(
      `SELECT id FROM "${tenantId}".custom_framework_projects
       WHERE framework_id = :frameworkId AND project_id = :projectId`,
      { replacements: { frameworkId, projectId } }
    );

    if (pfResult.length === 0) {
      return {
        status: 404,
        data: { message: "Framework not found in this project" },
      };
    }

    // Check if this is the only framework (system + custom) for the project
    // Cannot remove if it's the last one
    const [countResult] = await sequelize.query(
      `SELECT (
        (SELECT COUNT(*) FROM "${tenantId}".projects_frameworks WHERE project_id = :projectId) +
        (SELECT COUNT(*) FROM "${tenantId}".custom_framework_projects WHERE project_id = :projectId)
      ) as total_count`,
      { replacements: { projectId } }
    );

    const totalCount = parseInt((countResult as any[])[0]?.total_count || "0");
    if (totalCount <= 1) {
      return {
        status: 400,
        data: { message: "Cannot remove the only framework from a project. At least one framework must remain." },
      };
    }

    const projectFrameworkId = (pfResult as any[])[0].id;

    // Delete project-framework association (cascades to impl records)
    await sequelize.query(
      `DELETE FROM "${tenantId}".custom_framework_projects WHERE id = :pfId`,
      { replacements: { pfId: projectFrameworkId } }
    );

    return {
      status: 200,
      data: {
        success: true,
        message: "Framework removed from project successfully",
      },
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Failed to remove framework: ${error.message}` },
    };
  }
}

async function handleGetProjectFrameworkData(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const projectId = parseInt(params.projectId);
  const frameworkId = parseInt(params.frameworkId);

  try {
    // Get project-framework ID
    const [pfResult] = await sequelize.query(
      `SELECT id FROM "${tenantId}".custom_framework_projects
       WHERE project_id = :projectId AND framework_id = :frameworkId`,
      { replacements: { projectId, frameworkId } }
    );

    if (pfResult.length === 0) {
      return { status: 404, data: { message: "Project framework not found" } };
    }

    const projectFrameworkId = pfResult[0].id;

    // Get framework metadata
    const [meta] = await sequelize.query(
      `SELECT * FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
      { replacements: { frameworkId } }
    );

    // Get framework structure with implementation data
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

      // Get linked risks and level3 items for each level2
      for (const l2 of level2Items as any[]) {
        if (l2.impl_id) {
          const [risks] = await sequelize.query(
            `SELECT r.id, r.risk_name, r.risk_description
             FROM "${tenantId}".custom_framework_level2_risks lr
             JOIN "${tenantId}".risks r ON lr.risk_id = r.id
             WHERE lr.level2_impl_id = :implId`,
            { replacements: { implId: l2.impl_id } }
          );
          l2.linked_risks = risks;
        } else {
          l2.linked_risks = [];
        }

        // Get level3 items if three-level
        if (meta[0].hierarchy_type === "three_level") {
          const [level3Items] = await sequelize.query(
            `SELECT l3.*,
                    impl.id as impl_id, impl.status, impl.owner, impl.reviewer, impl.approver,
                    impl.due_date, impl.implementation_details, impl.evidence_links,
                    impl.feedback_links, impl.auditor_feedback
             FROM "${tenantId}".custom_framework_level3 l3
             LEFT JOIN "${tenantId}".custom_framework_level3_impl impl
               ON l3.id = impl.level3_id AND impl.level2_impl_id = :level2ImplId
             WHERE l3.level2_id = :level2Id
             ORDER BY l3.order_no`,
            { replacements: { level2Id: l2.id, level2ImplId: l2.impl_id } }
          );
          l2.items = level3Items;
        }
      }

      l1.items = level2Items;
    }

    return {
      status: 200,
      data: {
        projectFrameworkId,
        frameworkId,
        ...meta[0],
        structure: level1Items,
      },
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Failed to fetch data: ${error.message}` },
    };
  }
}

async function handleUpdateLevel2(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
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

    return {
      status: 200,
      data: { success: true, message: "Updated successfully" },
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Update failed: ${error.message}` },
    };
  }
}

async function handleUpdateLevel3(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
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

    return {
      status: 200,
      data: { success: true, message: "Updated successfully" },
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Update failed: ${error.message}` },
    };
  }
}

async function handleGetProgress(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const projectId = parseInt(params.projectId);
  const frameworkId = parseInt(params.frameworkId);

  try {
    // Get framework info
    const [framework] = await sequelize.query(
      `SELECT hierarchy_type FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
      { replacements: { frameworkId } }
    );

    if (framework.length === 0) {
      return { status: 404, data: { message: "Framework not found" } };
    }

    const hierarchyType = framework[0].hierarchy_type;

    // Get project-framework ID
    const [pf] = await sequelize.query(
      `SELECT id FROM "${tenantId}".custom_framework_projects
       WHERE project_id = :projectId AND framework_id = :frameworkId`,
      { replacements: { projectId, frameworkId } }
    );

    if (pf.length === 0) {
      return { status: 404, data: { message: "Project framework not found" } };
    }

    const projectFrameworkId = pf[0].id;

    // Calculate progress at level 2
    const [level2Progress] = await sequelize.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'Implemented' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN owner IS NOT NULL THEN 1 ELSE 0 END) as assigned
       FROM "${tenantId}".custom_framework_level2_impl
       WHERE project_framework_id = :pfId`,
      { replacements: { pfId: projectFrameworkId } }
    );

    const result: any = {
      level2: {
        total: parseInt(level2Progress[0].total) || 0,
        completed: parseInt(level2Progress[0].completed) || 0,
        assigned: parseInt(level2Progress[0].assigned) || 0,
        percentage:
          level2Progress[0].total > 0
            ? Math.round(
                (parseInt(level2Progress[0].completed) /
                  parseInt(level2Progress[0].total)) *
                  100
              )
            : 0,
      },
    };

    // Calculate progress at level 3 if applicable
    if (hierarchyType === "three_level") {
      const [level3Progress] = await sequelize.query(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN l3.status = 'Implemented' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN l3.owner IS NOT NULL THEN 1 ELSE 0 END) as assigned
         FROM "${tenantId}".custom_framework_level3_impl l3
         JOIN "${tenantId}".custom_framework_level2_impl l2 ON l3.level2_impl_id = l2.id
         WHERE l2.project_framework_id = :pfId`,
        { replacements: { pfId: projectFrameworkId } }
      );

      result.level3 = {
        total: parseInt(level3Progress[0].total) || 0,
        completed: parseInt(level3Progress[0].completed) || 0,
        assigned: parseInt(level3Progress[0].assigned) || 0,
        percentage:
          level3Progress[0].total > 0
            ? Math.round(
                (parseInt(level3Progress[0].completed) /
                  parseInt(level3Progress[0].total)) *
                  100
              )
            : 0,
      };
    }

    // Calculate overall progress (use level3 if available, otherwise level2)
    const mainProgress =
      hierarchyType === "three_level" && result.level3
        ? result.level3
        : result.level2;
    result.overall = mainProgress;

    return {
      status: 200,
      data: result,
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Failed to calculate progress: ${error.message}` },
    };
  }
}

async function handleGetExcelTemplate(
  _ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  try {
    const workbook = new ExcelJS.Workbook();

    // ===== Sheet 1: Instructions =====
    const instructionsSheet = workbook.addWorksheet("Instructions");
    instructionsSheet.columns = [
      { header: "", key: "content", width: 100 },
    ];

    const instructions = [
      "CUSTOM FRAMEWORK IMPORT TEMPLATE",
      "",
      "This template allows you to import a custom compliance framework into VerifyWise.",
      "",
      "INSTRUCTIONS:",
      "1. Fill out the 'Framework Info' sheet with your framework details",
      "2. Fill out the 'Structure' sheet with your framework hierarchy",
      "3. Save this file and upload it via the plugin",
      "",
      "HIERARCHY TYPES:",
      "- two_level: Category -> Control (e.g., GDPR Articles -> Requirements)",
      "- three_level: Category -> Control -> Subcontrol (e.g., NIST Functions -> Categories -> Subcategories)",
      "",
      "STRUCTURE SHEET FORMAT:",
      "- Level 1 = top-level items (Categories, Articles, Clauses, etc.)",
      "- Level 2 = second-level items (Controls, Requirements, Sections, etc.)",
      "- Level 3 = third-level items (Subcontrols, Subrequirements) - only for three_level hierarchy",
      "",
      "TIPS:",
      "- Use consistent order_no values to control display order",
      "- Questions and Evidence Examples can be comma-separated lists",
      "- Leave optional fields blank if not needed",
    ];

    instructions.forEach((line) => {
      instructionsSheet.addRow({ content: line });
    });

    // ===== Sheet 2: Framework Info =====
    const infoSheet = workbook.addWorksheet("Framework Info");
    infoSheet.columns = [
      { header: "Field", key: "field", width: 25 },
      { header: "Value", key: "value", width: 60 },
      { header: "Description", key: "description", width: 50 },
    ];

    // Style header row
    infoSheet.getRow(1).font = { bold: true };
    infoSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF13715B" },
    };
    infoSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    infoSheet.addRows([
      {
        field: "name",
        value: "My Custom Framework",
        description: "Name of your framework (required)",
      },
      {
        field: "description",
        value: "A comprehensive compliance framework for...",
        description: "Description of the framework (required)",
      },
      {
        field: "version",
        value: "1.0.0",
        description: "Version number (optional)",
      },
      {
        field: "is_organizational",
        value: "false",
        description: "true = organizational, false = project-level",
      },
      {
        field: "hierarchy_type",
        value: "two_level",
        description: "two_level or three_level",
      },
      {
        field: "level1_name",
        value: "Category",
        description: "Name for level 1 items (e.g., Category, Article, Clause)",
      },
      {
        field: "level2_name",
        value: "Control",
        description:
          "Name for level 2 items (e.g., Control, Requirement, Section)",
      },
      {
        field: "level3_name",
        value: "",
        description: "Name for level 3 items (only for three_level hierarchy)",
      },
    ]);

    // ===== Sheet 3: Structure =====
    const structureSheet = workbook.addWorksheet("Structure");
    structureSheet.columns = [
      { header: "Level", key: "level", width: 8 },
      { header: "Order", key: "order_no", width: 8 },
      { header: "Title *", key: "title", width: 50 },
      { header: "Description", key: "description", width: 60 },
      { header: "Summary", key: "summary", width: 50 },
      {
        header: "Questions (comma-separated)",
        key: "questions",
        width: 60,
      },
      {
        header: "Evidence Examples (comma-separated)",
        key: "evidence_examples",
        width: 60,
      },
    ];

    // Style header row
    structureSheet.getRow(1).font = { bold: true };
    structureSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF13715B" },
    };
    structureSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add example rows
    structureSheet.addRows([
      {
        level: 1,
        order_no: 1,
        title: "Access Control",
        description: "Controls related to access management",
        summary: "",
        questions: "",
        evidence_examples: "",
      },
      {
        level: 2,
        order_no: 1,
        title: "AC-1: Access Control Policy",
        description: "Establish and maintain access control policy",
        summary: "Define who can access what resources",
        questions:
          "Is there a documented access control policy?,Who is responsible for access control?",
        evidence_examples: "Access control policy document,Policy review logs",
      },
      {
        level: 2,
        order_no: 2,
        title: "AC-2: Account Management",
        description: "Manage system accounts throughout their lifecycle",
        summary: "Procedures for account provisioning and deprovisioning",
        questions:
          "How are accounts provisioned?,How are accounts deprovisioned?",
        evidence_examples:
          "Account management procedures,User access reviews,Termination checklists",
      },
      {
        level: 1,
        order_no: 2,
        title: "Audit and Accountability",
        description: "Controls for audit logging and accountability",
        summary: "",
        questions: "",
        evidence_examples: "",
      },
      {
        level: 2,
        order_no: 1,
        title: "AU-1: Audit Policy",
        description: "Establish audit and accountability policy",
        summary: "Define what events are logged and how",
        questions: "What events are being logged?,How long are logs retained?",
        evidence_examples: "Audit policy,Log retention schedule",
      },
    ]);

    // Freeze header rows
    infoSheet.views = [{ state: "frozen", ySplit: 1 }];
    structureSheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      status: 200,
      buffer: buffer,
      filename: "custom_framework_template.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Failed to generate template: ${error.message}` },
    };
  }
}

async function handleImportFromExcel(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, body } = ctx;

  try {
    // body should contain { info: {...}, structure: [...] } parsed from Excel
    const { info, structure } = body;

    if (!info || !structure) {
      return {
        status: 400,
        data: {
          message:
            "Invalid Excel data. Please ensure both Framework Info and Structure sheets are filled.",
        },
      };
    }

    // Convert Excel data to framework import format
    const frameworkData: CustomFrameworkImport = {
      name: info.name,
      description: info.description,
      version: info.version || "1.0.0",
      is_organizational: info.is_organizational === "true",
      hierarchy: {
        type: info.hierarchy_type as "two_level" | "three_level",
        level1_name: info.level1_name || "Category",
        level2_name: info.level2_name || "Control",
        level3_name: info.level3_name || undefined,
      },
      structure: [],
    };

    // Parse structure from flat Excel rows to nested format
    let currentLevel1: FrameworkLevel1 | null = null;
    let currentLevel2: FrameworkLevel2 | null = null;

    for (const row of structure) {
      const level = parseInt(row.level);

      if (level === 1) {
        if (currentLevel1) {
          frameworkData.structure.push(currentLevel1);
        }
        currentLevel1 = {
          title: row.title,
          description: row.description || undefined,
          order_no: parseInt(row.order_no) || 1,
          items: [],
        };
        currentLevel2 = null;
      } else if (level === 2 && currentLevel1) {
        currentLevel2 = {
          title: row.title,
          description: row.description || undefined,
          order_no: parseInt(row.order_no) || 1,
          summary: row.summary || undefined,
          questions: row.questions
            ? row.questions.split(",").map((q: string) => q.trim())
            : undefined,
          evidence_examples: row.evidence_examples
            ? row.evidence_examples.split(",").map((e: string) => e.trim())
            : undefined,
          items: [],
        };
        currentLevel1.items.push(currentLevel2);
      } else if (level === 3 && currentLevel2) {
        const level3Item: FrameworkLevel3 = {
          title: row.title,
          description: row.description || undefined,
          order_no: parseInt(row.order_no) || 1,
          summary: row.summary || undefined,
          questions: row.questions
            ? row.questions.split(",").map((q: string) => q.trim())
            : undefined,
          evidence_examples: row.evidence_examples
            ? row.evidence_examples.split(",").map((e: string) => e.trim())
            : undefined,
        };
        currentLevel2.items = currentLevel2.items || [];
        currentLevel2.items.push(level3Item);
      }
    }

    // Don't forget the last level1
    if (currentLevel1) {
      frameworkData.structure.push(currentLevel1);
    }

    // Validate the parsed framework data
    const validation = validateFrameworkImport(frameworkData);
    if (!validation.isValid) {
      return {
        status: 400,
        data: {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        },
      };
    }

    // Import the framework
    const result = await importFramework(frameworkData, tenantId, sequelize);

    return {
      status: 200,
      data: {
        success: true,
        frameworkId: result.frameworkId,
        itemsCreated: result.itemsCreated,
        message: `Framework "${frameworkData.name}" imported successfully with ${result.itemsCreated} items.`,
      },
    };
  } catch (error: any) {
    return {
      status: 500,
      data: {
        success: false,
        message: `Import failed: ${error.message}`,
      },
    };
  }
}

async function handleGetFrameworkWithProjects(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const frameworkId = parseInt(params.frameworkId);

  try {
    // Get framework metadata
    const [framework] = await sequelize.query(
      `SELECT * FROM "${tenantId}".custom_frameworks WHERE id = :frameworkId`,
      { replacements: { frameworkId } }
    );

    if (framework.length === 0) {
      return { status: 404, data: { message: "Framework not found" } };
    }

    // Get framework structure with counts
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
        if (framework[0].hierarchy_type === "three_level") {
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

    // Get projects using this framework with progress
    const [linkedProjects] = await sequelize.query(
      `SELECT
         cfp.id as project_framework_id,
         cfp.project_id,
         cfp.created_at as added_at,
         p.project_title,
         p.is_organizational
       FROM "${tenantId}".custom_framework_projects cfp
       JOIN "${tenantId}".projects p ON cfp.project_id = p.id
       WHERE cfp.framework_id = :frameworkId
       ORDER BY cfp.created_at DESC`,
      { replacements: { frameworkId } }
    );

    // Get progress for each linked project
    const projectsWithProgress = [];
    for (const project of linkedProjects as any[]) {
      // Calculate level 2 progress
      const [level2Progress] = await sequelize.query(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'Implemented' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN owner IS NOT NULL THEN 1 ELSE 0 END) as assigned
         FROM "${tenantId}".custom_framework_level2_impl
         WHERE project_framework_id = :pfId`,
        { replacements: { pfId: project.project_framework_id } }
      );

      const total = parseInt(level2Progress[0].total) || 0;
      const completed = parseInt(level2Progress[0].completed) || 0;
      const assigned = parseInt(level2Progress[0].assigned) || 0;

      projectsWithProgress.push({
        ...project,
        progress: {
          total,
          completed,
          assigned,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      });
    }

    return {
      status: 200,
      data: {
        ...framework[0],
        structure: level1Items,
        linkedProjects: projectsWithProgress,
      },
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Failed to fetch framework details: ${error.message}` },
    };
  }
}

async function handleGetProjectCustomFrameworks(
  ctx: PluginRouteContext
): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, params } = ctx;
  const projectId = parseInt(params.projectId);

  try {
    // Get all custom frameworks added to this project
    const [frameworks] = await sequelize.query(
      `SELECT
         cfp.id as project_framework_id,
         cfp.framework_id,
         cfp.created_at as added_at,
         cf.name,
         cf.description,
         cf.is_organizational,
         cf.hierarchy_type,
         cf.level_1_name,
         cf.level_2_name,
         cf.level_3_name
       FROM "${tenantId}".custom_framework_projects cfp
       JOIN "${tenantId}".custom_frameworks cf ON cfp.framework_id = cf.id
       WHERE cfp.project_id = :projectId
       ORDER BY cfp.created_at DESC`,
      { replacements: { projectId } }
    );

    return {
      status: 200,
      data: frameworks,
    };
  } catch (error: any) {
    return {
      status: 500,
      data: { message: `Failed to fetch project custom frameworks: ${error.message}` },
    };
  }
}

// ========== ROUTER ==========

export const router: Record<
  string,
  (ctx: PluginRouteContext) => Promise<PluginRouteResponse>
> = {
  // Framework management
  "POST /import": handleImportFramework,
  "POST /import-excel": handleImportFromExcel,
  "GET /frameworks": handleGetCustomFrameworks,
  "GET /frameworks/:frameworkId": handleGetFrameworkById,
  "GET /frameworks/:frameworkId/details": handleGetFrameworkWithProjects,
  "DELETE /frameworks/:frameworkId": handleDeleteFramework,
  "GET /template": handleGetExcelTemplate,

  // Project framework operations
  "POST /add-to-project": handleAddToProject,
  "POST /remove-from-project": handleRemoveFromProject,
  "GET /projects/:projectId/custom-frameworks": handleGetProjectCustomFrameworks,
  "GET /projects/:projectId/frameworks/:frameworkId": handleGetProjectFrameworkData,
  "GET /projects/:projectId/frameworks/:frameworkId/progress": handleGetProgress,

  // Implementation updates
  "PATCH /level2/:level2Id": handleUpdateLevel2,
  "PATCH /level3/:level3Id": handleUpdateLevel3,
};
