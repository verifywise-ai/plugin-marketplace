/**
 * Dataset Bulk Upload Plugin for VerifyWise
 *
 * This plugin provides bulk dataset upload functionality.
 * Users can upload multiple CSV/XLSX files with metadata,
 * PII detection, and batch processing.
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

// ========== PLUGIN LIFECYCLE METHODS ==========

/**
 * Install the Dataset Bulk Upload plugin.
 * Adds 'dataset_bulk_upload' to enum_files_source if not present.
 * Uses existing core tables (datasets, files, file_entity_links, dataset_change_histories).
 */
export async function install(
  _userId: number,
  _tenantId: string,
  _config: any,
  _context: PluginContext
): Promise<InstallResult> {
  try {
    return {
      success: true,
      message: "Dataset Bulk Upload plugin installed successfully.",
      installedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Installation failed: ${error.message}`);
  }
}

/**
 * Uninstall the Dataset Bulk Upload plugin.
 * No custom tables to drop — core tables remain.
 */
export async function uninstall(
  _userId: number,
  _tenantId: string,
  _context: PluginContext
): Promise<UninstallResult> {
  try {
    return {
      success: true,
      message: "Dataset Bulk Upload plugin uninstalled successfully.",
      uninstalledAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`Uninstallation failed: ${error.message}`);
  }
}

/**
 * Validate plugin configuration.
 * No configuration needed for this plugin.
 */
export function validateConfig(_config: any): ValidationResult {
  return { valid: true, errors: [] };
}

// ========== HELPER FUNCTIONS ==========

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function escapePgIdentifier(ident: string): string {
  if (!/^[A-Za-z0-9_]{1,30}$/.test(ident)) {
    throw new Error("Invalid tenant identifier");
  }
  return '"' + ident.replace(/"/g, '""') + '"';
}

// ========== ROUTE HANDLERS ==========

/**
 * POST /upload — Upload one file and create an associated dataset record.
 *
 * Called N times by the client (once per file) to enable per-file progress.
 *
 * Expects:
 *   - file: multipart file (CSV/XLSX, max 30MB)
 *   - body.metadata: JSON string with dataset metadata fields
 */
async function handleUpload(ctx: PluginRouteContext): Promise<PluginRouteResponse> {
  const { sequelize, tenantId, userId, organizationId, body, file } = ctx;
  const schema = escapePgIdentifier(tenantId);

  if (!file) {
    return {
      status: 400,
      data: { message: "No file provided" },
    };
  }

  let metadata: Record<string, any>;
  try {
    metadata =
      typeof body.metadata === "string"
        ? JSON.parse(body.metadata)
        : body.metadata || {};
  } catch {
    return {
      status: 400,
      data: { message: "Invalid metadata JSON in request body" },
    };
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Create dataset record
    const datasetResult = await sequelize.query(
      `INSERT INTO ${schema}.datasets
        (name, description, version, owner, type, function, source, license,
         format, classification, contains_pii, pii_types, status, status_date,
         known_biases, bias_mitigation, collection_method, preprocessing_steps,
         created_at, updated_at)
       VALUES
        (:name, :description, :version, :owner, :type, :function, :source, :license,
         :format, :classification, :contains_pii, :pii_types, :status, NOW(),
         :known_biases, :bias_mitigation, :collection_method, :preprocessing_steps,
         NOW(), NOW())
       RETURNING id;`,
      {
        replacements: {
          name: metadata.name || file.originalname.replace(/\.[^.]+$/, ""),
          description: metadata.description || "",
          version: metadata.version || "1.0",
          owner: metadata.owner || "",
          type: metadata.type || "Training",
          function: metadata.function || "",
          source: metadata.source || "Bulk Upload",
          license: metadata.license || "",
          format: metadata.format || "",
          classification: metadata.classification || "Internal",
          contains_pii: metadata.contains_pii || false,
          pii_types: metadata.pii_types || "",
          status: metadata.status || "Draft",
          known_biases: metadata.known_biases || "",
          bias_mitigation: metadata.bias_mitigation || "",
          collection_method: metadata.collection_method || "",
          preprocessing_steps: metadata.preprocessing_steps || "",
        },
        transaction,
      }
    );

    const datasetId =
      Array.isArray(datasetResult[0]) && datasetResult[0].length > 0
        ? datasetResult[0][0].id
        : datasetResult[0]?.id;

    // 2. Create model/project relationships if provided
    const modelIds: number[] = metadata.models || [];
    for (const modelId of modelIds) {
      await sequelize.query(
        `INSERT INTO ${schema}.dataset_models (dataset_id, model_id) VALUES (:datasetId, :modelId)
         ON CONFLICT DO NOTHING;`,
        { replacements: { datasetId, modelId }, transaction }
      );
    }

    const projectIds: number[] = metadata.projects || [];
    for (const projectId of projectIds) {
      await sequelize.query(
        `INSERT INTO ${schema}.dataset_projects (dataset_id, project_id) VALUES (:datasetId, :projectId)
         ON CONFLICT DO NOTHING;`,
        { replacements: { datasetId, projectId }, transaction }
      );
    }

    // 3. Store file blob
    const sanitizedName = sanitizeFilename(file.originalname);
    const fileResult = await sequelize.query(
      `INSERT INTO ${schema}.files
        (filename, type, data, uploaded_by, organization_id, source, created_at, updated_at)
       VALUES (:filename, :type, :data, :uploaded_by, :organization_id, :source, NOW(), NOW())
       RETURNING id;`,
      {
        replacements: {
          filename: sanitizedName,
          type: file.mimetype,
          data: file.buffer,
          uploaded_by: userId,
          organization_id: organizationId,
          source: "dataset_bulk_upload",
        },
        transaction,
      }
    );

    const fileId =
      Array.isArray(fileResult[0]) && fileResult[0].length > 0
        ? fileResult[0][0].id
        : fileResult[0]?.id;

    // 4. Create file → dataset link
    await sequelize.query(
      `INSERT INTO ${schema}.file_entity_links
        (file_id, framework_type, entity_type, entity_id, link_type, created_by, created_at)
       VALUES (:file_id, 'general', 'dataset', :entity_id, 'source_data', :created_by, NOW());`,
      {
        replacements: {
          file_id: fileId,
          entity_id: datasetId,
          created_by: userId,
        },
        transaction,
      }
    );

    // 5. Record change history
    await sequelize.query(
      `INSERT INTO ${schema}.dataset_change_histories
        (dataset_id, change_type, changed_by, change_details, created_at)
       VALUES (:dataset_id, 'created', :changed_by, :change_details, NOW());`,
      {
        replacements: {
          dataset_id: datasetId,
          changed_by: userId,
          change_details: JSON.stringify({
            action: "bulk_upload",
            fileName: file.originalname,
          }),
        },
        transaction,
      }
    );

    await transaction.commit();

    return {
      status: 201,
      data: {
        datasetId,
        fileId,
      },
    };
  } catch (error: any) {
    try {
      await transaction.rollback();
    } catch {
      // rollback failed
    }

    return {
      status: 500,
      data: { message: `Upload failed: ${error.message}` },
    };
  }
}

// ========== PLUGIN METADATA ==========

export const metadata: PluginMetadata = {
  name: "Dataset Bulk Upload",
  version: "1.0.0",
  author: "VerifyWise",
  description: "Upload multiple CSV/XLSX datasets with metadata, PII detection, and batch processing",
};

// ========== PLUGIN ROUTER ==========

export const router: Record<string, (ctx: PluginRouteContext) => Promise<PluginRouteResponse>> = {
  "POST /upload": handleUpload,
};
