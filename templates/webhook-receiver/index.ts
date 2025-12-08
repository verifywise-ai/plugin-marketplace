/**
 * Webhook Receiver Plugin Template
 *
 * This template demonstrates how to receive webhooks from external services
 * and trigger actions in VerifyWise. Use this as a starting point for integrations
 * with services like GitHub, Stripe, Twilio, or any service that sends webhooks.
 *
 * Key features demonstrated:
 * - Webhook endpoint registration
 * - HMAC signature verification
 * - IP allowlist filtering
 * - Payload parsing and validation
 * - Event emission to VerifyWise
 * - Failed webhook queuing for retry
 *
 * @example Webhook URL
 * POST /api/plugins/webhook-receiver/webhook
 *
 * @example Signature Header
 * X-Webhook-Signature: sha256=abc123...
 */

import { Router, Request, Response, NextFunction } from "express";
import * as crypto from "crypto";
import {
  Plugin,
  PluginContext,
  PluginManifest,
  EventHandlerMap,
} from "../core/types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Webhook payload structure - customize based on your external service
 */
interface WebhookPayload {
  /** Event type from the external service */
  event: string;
  /** Timestamp of when the event occurred */
  timestamp?: string;
  /** The actual event data */
  data: Record<string, unknown>;
}

/**
 * Stored failed webhook for retry
 */
interface FailedWebhook {
  id: string;
  receivedAt: Date;
  payload: WebhookPayload;
  error: string;
  retryCount: number;
}

/**
 * Webhook processing result
 */
interface ProcessingResult {
  success: boolean;
  action?: string;
  entityId?: number;
  error?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Map external event types to VerifyWise actions
 * Customize this based on your integration needs
 */
const EVENT_MAPPINGS: Record<string, (ctx: PluginContext, data: Record<string, unknown>) => Promise<ProcessingResult>> = {
  // Example: External service reports a security issue
  "security.issue.created": async (ctx, data) => {
    // Create a risk in VerifyWise
    const risk = await ctx.models.Risk?.create({
      title: data.title as string || "Security issue from webhook",
      description: data.description as string || "",
      severity: mapSeverity(data.severity as string),
      status: "Open",
      // Add more fields as needed
    });
    return { success: true, action: "risk_created", entityId: risk?.id };
  },

  // Example: External service completes a task
  "task.completed": async (ctx, data) => {
    // Find and update the linked task
    const externalId = data.taskId as string;
    // You would look up the mapping between external ID and VerifyWise task ID
    ctx.logger.info(`Task ${externalId} completed externally`);
    return { success: true, action: "task_synced" };
  },

  // Example: Compliance scan completed
  "scan.completed": async (ctx, data) => {
    ctx.logger.info("Compliance scan completed", { scanId: data.scanId });
    // Process scan results, update compliance status, etc.
    return { success: true, action: "scan_processed" };
  },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map external severity levels to VerifyWise severity
 */
function mapSeverity(external: string | undefined): string {
  const mapping: Record<string, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
    info: "Low",
  };
  return mapping[external?.toLowerCase() || ""] || "Medium";
}

/**
 * Verify webhook signature using HMAC-SHA256
 *
 * Most services use this pattern:
 * 1. Compute HMAC-SHA256 of the raw body using your secret
 * 2. Compare with the signature in the header
 *
 * @param payload - Raw request body as string
 * @param signature - Signature from the header
 * @param secret - Your webhook secret
 * @returns true if signature is valid
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  // Handle different signature formats
  // Format 1: "sha256=abc123..."
  // Format 2: "abc123..." (raw)
  const providedSig = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSig, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    // If signatures have different lengths, timingSafeEqual throws
    return false;
  }
}

/**
 * Check if request IP is in the allowlist
 *
 * @param requestIP - The IP address from the request
 * @param allowlist - Comma-separated list of allowed IPs
 * @returns true if IP is allowed or allowlist is empty
 */
function isIPAllowed(requestIP: string, allowlist: string | undefined): boolean {
  if (!allowlist || allowlist.trim() === "") {
    return true; // No allowlist = allow all
  }

  const allowedIPs = allowlist.split(",").map((ip) => ip.trim());

  // Handle x-forwarded-for header (may contain multiple IPs)
  const clientIP = requestIP.split(",")[0].trim();

  // Remove IPv6 prefix if present
  const normalizedIP = clientIP.replace(/^::ffff:/, "");

  return allowedIPs.includes(normalizedIP) || allowedIPs.includes(clientIP);
}

/**
 * Generate a unique ID for failed webhook storage
 */
function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// PLUGIN STATE
// =============================================================================

/** In-memory store for failed webhooks (replace with database in production) */
let failedWebhooks: FailedWebhook[] = [];

/** Plugin context reference for use in routes */
let pluginContext: PluginContext | null = null;

// =============================================================================
// PLUGIN DEFINITION
// =============================================================================

const webhookReceiverPlugin: Plugin = {
  /**
   * Plugin manifest - loaded from manifest.json
   * The icon is embedded as an SVG string
   */
  manifest: {
    ...require("./manifest.json"),
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#6366F1"/>
      <path d="M16 8v8l6 3" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <path d="M8 16a8 8 0 1 0 16 0" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 22l-2 4M20 22l2 4" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  } as PluginManifest,

  // ===========================================================================
  // LIFECYCLE HOOKS
  // ===========================================================================

  /**
   * Called when the plugin is first installed
   * Use this to set up any required database tables or initial data
   */
  async onInstall(ctx: PluginContext): Promise<void> {
    ctx.logger.info("Webhook Receiver plugin installed");

    // Example: Create a table to store webhook logs
    // In production, you'd use a proper migration
    /*
    await ctx.query(`
      CREATE TABLE IF NOT EXISTS plugin_webhook_logs (
        id SERIAL PRIMARY KEY,
        plugin_id VARCHAR(100) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB,
        status VARCHAR(20) DEFAULT 'received',
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    */
  },

  /**
   * Called when the plugin is uninstalled
   * Clean up any resources, tables, or data
   */
  async onUninstall(ctx: PluginContext): Promise<void> {
    ctx.logger.info("Webhook Receiver plugin uninstalled");
    failedWebhooks = [];

    // Example: Drop webhook logs table
    // await ctx.query(`DROP TABLE IF EXISTS plugin_webhook_logs`);
  },

  /**
   * Called when the plugin is loaded (server start)
   */
  async onLoad(ctx: PluginContext): Promise<void> {
    pluginContext = ctx;
    ctx.logger.info("Webhook Receiver plugin loaded");

    // Log the webhook URL for easy reference
    const webhookUrl = `/api/plugins/${ctx.manifest.id}/webhook`;
    ctx.logger.info(`Webhook endpoint available at: ${webhookUrl}`);
  },

  /**
   * Called when the plugin is enabled
   */
  async onEnable(ctx: PluginContext): Promise<void> {
    ctx.logger.info("Webhook Receiver plugin enabled");
  },

  /**
   * Called when the plugin is disabled
   */
  async onDisable(ctx: PluginContext): Promise<void> {
    ctx.logger.info("Webhook Receiver plugin disabled - webhooks will be rejected");
  },

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  /**
   * Subscribe to VerifyWise events
   * Useful for syncing state back to external services
   */
  eventHandlers(): EventHandlerMap {
    return {
      // Example: When a risk is resolved, notify the external service
      // "risk:updated": async (payload) => {
      //   if (payload.data.status === "Resolved") {
      //     await notifyExternalService("risk.resolved", payload.data);
      //   }
      // },
    };
  },

  // ===========================================================================
  // ROUTES
  // ===========================================================================

  /**
   * Register plugin routes
   * Main webhook endpoint + management endpoints
   */
  routes(router: Router): void {
    /**
     * POST /api/plugins/{pluginId}/webhook
     *
     * Main webhook endpoint - receives webhooks from external services
     *
     * Headers:
     * - X-Webhook-Signature: HMAC-SHA256 signature of the body
     * - Content-Type: application/json
     *
     * Body: WebhookPayload
     */
    router.post(
      "/webhook",
      // Middleware: Capture raw body for signature verification
      captureRawBody,
      async (req: Request, res: Response) => {
        const ctx = pluginContext;
        if (!ctx) {
          return res.status(503).json({
            success: false,
            error: "Plugin not initialized",
          });
        }

        const config = ctx.getConfig();

        // Step 1: Verify IP allowlist
        const clientIP =
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "";

        if (!isIPAllowed(clientIP, config.allowedIPs as string)) {
          ctx.logger.warn("Webhook rejected: IP not allowed", { ip: clientIP });
          return res.status(403).json({
            success: false,
            error: "IP address not allowed",
          });
        }

        // Step 2: Verify signature
        const signature = req.headers["x-webhook-signature"] as string;
        const secret = config.webhookSecret as string;

        if (!signature) {
          ctx.logger.warn("Webhook rejected: Missing signature header");
          return res.status(401).json({
            success: false,
            error: "Missing signature header",
          });
        }

        const rawBody = (req as Request & { rawBody?: string }).rawBody || "";
        if (!verifySignature(rawBody, signature, secret)) {
          ctx.logger.warn("Webhook rejected: Invalid signature");
          return res.status(401).json({
            success: false,
            error: "Invalid signature",
          });
        }

        // Step 3: Parse and validate payload
        const payload = req.body as WebhookPayload;

        if (!payload.event) {
          return res.status(400).json({
            success: false,
            error: "Missing event type in payload",
          });
        }

        // Optional: Log payload for debugging
        if (config.logPayloads) {
          ctx.logger.debug("Webhook received", {
            event: payload.event,
            payload: payload.data,
          });
        }

        // Step 4: Process the webhook
        try {
          const result = await processWebhook(ctx, payload);

          if (!result.success && config.retryOnFailure) {
            // Store for retry
            failedWebhooks.push({
              id: generateId(),
              receivedAt: new Date(),
              payload,
              error: result.error || "Unknown error",
              retryCount: 0,
            });
          }

          // Always return 200 to acknowledge receipt
          // (Most webhook senders retry on non-2xx responses)
          return res.status(200).json({
            success: result.success,
            action: result.action,
            entityId: result.entityId,
            error: result.error,
          });
        } catch (error) {
          ctx.logger.error("Webhook processing error", { error });

          if (config.retryOnFailure) {
            failedWebhooks.push({
              id: generateId(),
              receivedAt: new Date(),
              payload,
              error: error instanceof Error ? error.message : "Unknown error",
              retryCount: 0,
            });
          }

          // Still return 200 to prevent external service from retrying
          return res.status(200).json({
            success: false,
            error: "Processing failed, queued for retry",
          });
        }
      }
    );

    /**
     * GET /api/plugins/{pluginId}/webhook/status
     *
     * Get webhook endpoint status and statistics
     */
    router.get("/webhook/status", async (req: Request, res: Response) => {
      const ctx = pluginContext;
      if (!ctx) {
        return res.status(503).json({ success: false, error: "Plugin not initialized" });
      }

      return res.status(200).json({
        success: true,
        data: {
          enabled: true,
          endpoint: `/api/plugins/${ctx.manifest.id}/webhook`,
          failedWebhooksCount: failedWebhooks.length,
          supportedEvents: Object.keys(EVENT_MAPPINGS),
        },
      });
    });

    /**
     * GET /api/plugins/{pluginId}/webhook/failed
     *
     * List failed webhooks queued for retry
     */
    router.get("/webhook/failed", async (req: Request, res: Response) => {
      return res.status(200).json({
        success: true,
        data: failedWebhooks.map((wh) => ({
          id: wh.id,
          event: wh.payload.event,
          receivedAt: wh.receivedAt,
          error: wh.error,
          retryCount: wh.retryCount,
        })),
      });
    });

    /**
     * POST /api/plugins/{pluginId}/webhook/retry/:id
     *
     * Retry a failed webhook
     */
    router.post("/webhook/retry/:id", async (req: Request, res: Response) => {
      const ctx = pluginContext;
      if (!ctx) {
        return res.status(503).json({ success: false, error: "Plugin not initialized" });
      }

      const { id } = req.params;
      const webhookIndex = failedWebhooks.findIndex((wh) => wh.id === id);

      if (webhookIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "Failed webhook not found",
        });
      }

      const webhook = failedWebhooks[webhookIndex];
      const result = await processWebhook(ctx, webhook.payload);

      if (result.success) {
        // Remove from failed queue
        failedWebhooks.splice(webhookIndex, 1);
      } else {
        // Update retry count
        failedWebhooks[webhookIndex].retryCount++;
        failedWebhooks[webhookIndex].error = result.error || "Retry failed";
      }

      return res.status(200).json({
        success: result.success,
        action: result.action,
        error: result.error,
      });
    });

    /**
     * DELETE /api/plugins/{pluginId}/webhook/failed/:id
     *
     * Delete a failed webhook from the queue
     */
    router.delete("/webhook/failed/:id", async (req: Request, res: Response) => {
      const { id } = req.params;
      const index = failedWebhooks.findIndex((wh) => wh.id === id);

      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: "Failed webhook not found",
        });
      }

      failedWebhooks.splice(index, 1);
      return res.status(200).json({ success: true });
    });
  },
};

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Middleware to capture raw request body for signature verification
 * Must be used before body parsing
 */
function captureRawBody(req: Request, res: Response, next: NextFunction): void {
  let data = "";
  req.setEncoding("utf8");

  req.on("data", (chunk) => {
    data += chunk;
  });

  req.on("end", () => {
    (req as Request & { rawBody: string }).rawBody = data;
    try {
      req.body = JSON.parse(data);
    } catch {
      req.body = {};
    }
    next();
  });
}

// =============================================================================
// WEBHOOK PROCESSOR
// =============================================================================

/**
 * Process a webhook payload
 *
 * @param ctx - Plugin context
 * @param payload - Webhook payload
 * @returns Processing result
 */
async function processWebhook(
  ctx: PluginContext,
  payload: WebhookPayload
): Promise<ProcessingResult> {
  const handler = EVENT_MAPPINGS[payload.event];

  if (!handler) {
    ctx.logger.warn(`Unhandled webhook event type: ${payload.event}`);
    return {
      success: true, // Still "successful" - we received it, just don't handle it
      action: "ignored",
    };
  }

  try {
    return await handler(ctx, payload.data);
  } catch (error) {
    ctx.logger.error(`Error processing ${payload.event}`, { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export default webhookReceiverPlugin;
