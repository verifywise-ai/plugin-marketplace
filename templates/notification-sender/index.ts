/**
 * Notification Sender Plugin Template
 *
 * This template demonstrates how to send notifications to external services
 * when events occur in VerifyWise. Use this as a starting point for
 * Slack, Microsoft Teams, Discord, or any webhook-based notification service.
 *
 * Key features demonstrated:
 * - Event subscription and filtering
 * - HTTP POST to external webhooks
 * - Message formatting for different platforms
 * - Rate limiting and retry logic
 * - Quiet hours support
 * - Severity-based filtering
 *
 * @example Supported Platforms
 * - Slack (Incoming Webhooks)
 * - Microsoft Teams (Connectors)
 * - Discord (Webhooks)
 * - Generic webhooks (JSON POST)
 */

import { Router, Request, Response } from "express";
import {
  Plugin,
  PluginContext,
  PluginManifest,
  PluginEvent,
  EventHandlerMap,
  EventPayload,
} from "../core/types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Notification to be sent
 */
interface Notification {
  title: string;
  message: string;
  severity?: "info" | "warning" | "error" | "success";
  fields?: Array<{ name: string; value: string }>;
  url?: string;
  timestamp?: Date;
}

/**
 * Queued notification for retry
 */
interface QueuedNotification {
  id: string;
  notification: Notification;
  attempts: number;
  lastAttempt: Date;
  error?: string;
}

/**
 * Platform-specific message formatter
 */
type MessageFormatter = (notification: Notification, mention: boolean) => unknown;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum retry attempts for failed notifications */
const MAX_RETRY_ATTEMPTS = 3;

/** Delay between retries in milliseconds */
const RETRY_DELAY_MS = 5000;

/** Rate limit: minimum milliseconds between notifications */
const RATE_LIMIT_MS = 1000;

/** Severity levels for filtering */
const SEVERITY_LEVELS: Record<string, number> = {
  All: 0,
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

// =============================================================================
// MESSAGE FORMATTERS
// =============================================================================

/**
 * Format notification for Slack
 * @see https://api.slack.com/messaging/webhooks
 */
const formatSlackMessage: MessageFormatter = (notification, mention) => {
  const severityColors: Record<string, string> = {
    info: "#36a64f",
    warning: "#ff9800",
    error: "#f44336",
    success: "#4caf50",
  };

  return {
    text: mention ? "<!channel> " + notification.title : notification.title,
    attachments: [
      {
        color: severityColors[notification.severity || "info"],
        title: notification.title,
        title_link: notification.url,
        text: notification.message,
        fields: notification.fields?.map((f) => ({
          title: f.name,
          value: f.value,
          short: true,
        })),
        ts: notification.timestamp
          ? Math.floor(notification.timestamp.getTime() / 1000)
          : undefined,
      },
    ],
  };
};

/**
 * Format notification for Microsoft Teams
 * @see https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
 */
const formatTeamsMessage: MessageFormatter = (notification, mention) => {
  const themeColors: Record<string, string> = {
    info: "0076D7",
    warning: "FFA500",
    error: "FF0000",
    success: "00FF00",
  };

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: themeColors[notification.severity || "info"],
    summary: notification.title,
    sections: [
      {
        activityTitle: mention ? "@channel " + notification.title : notification.title,
        facts: notification.fields?.map((f) => ({
          name: f.name,
          value: f.value,
        })),
        text: notification.message,
      },
    ],
    potentialAction: notification.url
      ? [
          {
            "@type": "OpenUri",
            name: "View in VerifyWise",
            targets: [{ os: "default", uri: notification.url }],
          },
        ]
      : undefined,
  };
};

/**
 * Format notification for Discord
 * @see https://discord.com/developers/docs/resources/webhook#execute-webhook
 */
const formatDiscordMessage: MessageFormatter = (notification, mention) => {
  const colors: Record<string, number> = {
    info: 0x3498db,
    warning: 0xf39c12,
    error: 0xe74c3c,
    success: 0x2ecc71,
  };

  return {
    content: mention ? "@everyone" : undefined,
    embeds: [
      {
        title: notification.title,
        description: notification.message,
        color: colors[notification.severity || "info"],
        url: notification.url,
        fields: notification.fields?.map((f) => ({
          name: f.name,
          value: f.value,
          inline: true,
        })),
        timestamp: notification.timestamp?.toISOString(),
      },
    ],
  };
};

/**
 * Generic JSON format (for custom webhooks)
 */
const formatGenericMessage: MessageFormatter = (notification, mention) => ({
  ...notification,
  mention,
  timestamp: notification.timestamp?.toISOString(),
});

// =============================================================================
// PLUGIN STATE
// =============================================================================

/** Plugin context reference */
let pluginContext: PluginContext | null = null;

/** Queue for failed notifications */
let notificationQueue: QueuedNotification[] = [];

/** Last notification timestamp for rate limiting */
let lastNotificationTime = 0;

/** Statistics */
let stats = {
  sent: 0,
  failed: 0,
  filtered: 0,
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Detect platform from webhook URL
 */
function detectPlatform(url: string): "slack" | "teams" | "discord" | "generic" {
  if (url.includes("hooks.slack.com")) return "slack";
  if (url.includes("webhook.office.com") || url.includes("outlook.office.com")) return "teams";
  if (url.includes("discord.com/api/webhooks")) return "discord";
  return "generic";
}

/**
 * Get the appropriate message formatter for the platform
 */
function getFormatter(platform: string): MessageFormatter {
  switch (platform) {
    case "slack":
      return formatSlackMessage;
    case "teams":
      return formatTeamsMessage;
    case "discord":
      return formatDiscordMessage;
    default:
      return formatGenericMessage;
  }
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(start: string | undefined, end: string | undefined): boolean {
  if (!start || !end) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if severity meets minimum threshold
 */
function meetsSeverityThreshold(severity: string | undefined, minimum: string): boolean {
  const itemLevel = SEVERITY_LEVELS[severity || "Medium"] || 2;
  const minLevel = SEVERITY_LEVELS[minimum] || 0;
  return itemLevel >= minLevel;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Send notification to external service with retry logic
 */
async function sendNotification(
  ctx: PluginContext,
  notification: Notification,
  isRetry = false
): Promise<boolean> {
  const config = ctx.getConfig();
  const webhookUrl = config.webhookUrl as string;

  if (!webhookUrl) {
    ctx.logger.error("Webhook URL not configured");
    return false;
  }

  // Rate limiting (skip for retries)
  if (!isRetry) {
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotificationTime;

    if (timeSinceLastNotification < RATE_LIMIT_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastNotification)
      );
    }
    lastNotificationTime = Date.now();
  }

  // Detect platform and format message
  const platform = detectPlatform(webhookUrl);
  const formatter = getFormatter(platform);
  const shouldMention =
    config.mentionOnCritical &&
    notification.severity === "error"; // 'error' maps to critical

  const body = formatter(notification, shouldMention as boolean);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    stats.sent++;
    ctx.logger.debug("Notification sent successfully", { platform });
    return true;
  } catch (error) {
    ctx.logger.error("Failed to send notification", { error, platform });
    stats.failed++;
    return false;
  }
}

/**
 * Queue a notification for retry
 */
function queueForRetry(notification: Notification, error: string): void {
  notificationQueue.push({
    id: generateId(),
    notification,
    attempts: 1,
    lastAttempt: new Date(),
    error,
  });
}

/**
 * Process the retry queue
 */
async function processRetryQueue(ctx: PluginContext): Promise<void> {
  const toRetry = [...notificationQueue];
  notificationQueue = [];

  for (const item of toRetry) {
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      ctx.logger.warn("Notification dropped after max retries", {
        id: item.id,
        title: item.notification.title,
      });
      continue;
    }

    const success = await sendNotification(ctx, item.notification, true);

    if (!success) {
      notificationQueue.push({
        ...item,
        attempts: item.attempts + 1,
        lastAttempt: new Date(),
      });
    }
  }
}

/**
 * Build notification from event payload
 */
function buildNotification(
  event: string,
  payload: EventPayload,
  baseUrl: string
): Notification | null {
  // Map events to notification format
  // Customize these based on your needs

  switch (event) {
    case PluginEvent.RISK_CREATED:
      return {
        title: "New Risk Created",
        message: payload.data.description as string || "A new risk has been added.",
        severity: mapSeverityToLevel(payload.data.severity as string),
        fields: [
          { name: "Title", value: payload.data.title as string || "Untitled" },
          { name: "Severity", value: payload.data.severity as string || "Unknown" },
          { name: "Status", value: payload.data.status as string || "Open" },
        ],
        url: `${baseUrl}/risks/${payload.entityId}`,
        timestamp: new Date(),
      };

    case PluginEvent.RISK_UPDATED:
      return {
        title: "Risk Updated",
        message: `Risk "${payload.data.title}" has been updated.`,
        severity: "info",
        fields: [
          { name: "Title", value: payload.data.title as string || "Untitled" },
          { name: "Status", value: payload.data.status as string || "Unknown" },
        ],
        url: `${baseUrl}/risks/${payload.entityId}`,
        timestamp: new Date(),
      };

    case PluginEvent.TASK_CREATED:
      return {
        title: "New Task Assigned",
        message: payload.data.description as string || "A new task has been created.",
        severity: "info",
        fields: [
          { name: "Title", value: payload.data.title as string || "Untitled" },
          { name: "Priority", value: payload.data.priority as string || "Normal" },
          { name: "Due Date", value: payload.data.dueDate as string || "Not set" },
        ],
        url: `${baseUrl}/tasks/${payload.entityId}`,
        timestamp: new Date(),
      };

    case PluginEvent.COMPLIANCE_STATUS_CHANGED:
      return {
        title: "Compliance Status Changed",
        message: `Compliance status changed to ${payload.data.status}.`,
        severity: payload.data.status === "Non-Compliant" ? "error" : "success",
        fields: [
          { name: "Framework", value: payload.data.framework as string || "Unknown" },
          { name: "Status", value: payload.data.status as string || "Unknown" },
        ],
        url: `${baseUrl}/compliance`,
        timestamp: new Date(),
      };

    default:
      return null;
  }
}

/**
 * Map VerifyWise severity to notification severity
 */
function mapSeverityToLevel(severity: string | undefined): "info" | "warning" | "error" | "success" {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "error";
    case "high":
      return "error";
    case "medium":
      return "warning";
    case "low":
      return "info";
    default:
      return "info";
  }
}

// =============================================================================
// PLUGIN DEFINITION
// =============================================================================

const notificationSenderPlugin: Plugin = {
  /**
   * Plugin manifest
   */
  manifest: {
    ...require("./manifest.json"),
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#10B981"/>
      <path d="M16 8a6 6 0 0 0-6 6v4l-2 2v1h16v-1l-2-2v-4a6 6 0 0 0-6-6z" fill="white"/>
      <path d="M14 23h4a2 2 0 0 1-4 0z" fill="white"/>
      <circle cx="22" cy="10" r="4" fill="#EF4444"/>
    </svg>`,
  } as PluginManifest,

  // ===========================================================================
  // LIFECYCLE HOOKS
  // ===========================================================================

  async onInstall(ctx: PluginContext): Promise<void> {
    ctx.logger.info("Notification Sender plugin installed");
  },

  async onUninstall(ctx: PluginContext): Promise<void> {
    ctx.logger.info("Notification Sender plugin uninstalled");
    notificationQueue = [];
    stats = { sent: 0, failed: 0, filtered: 0 };
  },

  async onLoad(ctx: PluginContext): Promise<void> {
    pluginContext = ctx;
    ctx.logger.info("Notification Sender plugin loaded");

    // Start retry processor
    setInterval(() => {
      if (notificationQueue.length > 0 && pluginContext) {
        processRetryQueue(pluginContext);
      }
    }, RETRY_DELAY_MS);
  },

  async onEnable(ctx: PluginContext): Promise<void> {
    ctx.logger.info("Notification Sender plugin enabled");

    // Send test notification
    const config = ctx.getConfig();
    if (config.webhookUrl) {
      await sendNotification(ctx, {
        title: "VerifyWise Notifications Enabled",
        message: "You will now receive notifications from VerifyWise.",
        severity: "success",
        timestamp: new Date(),
      });
    }
  },

  async onDisable(ctx: PluginContext): Promise<void> {
    ctx.logger.info("Notification Sender plugin disabled");
  },

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  eventHandlers(): EventHandlerMap {
    return {
      // Risk events
      [PluginEvent.RISK_CREATED]: async (payload) => {
        await handleEvent(PluginEvent.RISK_CREATED, payload, "notifyOnRisks");
      },
      [PluginEvent.RISK_UPDATED]: async (payload) => {
        await handleEvent(PluginEvent.RISK_UPDATED, payload, "notifyOnRisks");
      },
      [PluginEvent.RISK_DELETED]: async (payload) => {
        await handleEvent(PluginEvent.RISK_DELETED, payload, "notifyOnRisks");
      },

      // Task events
      [PluginEvent.TASK_CREATED]: async (payload) => {
        await handleEvent(PluginEvent.TASK_CREATED, payload, "notifyOnTasks");
      },
      [PluginEvent.TASK_UPDATED]: async (payload) => {
        await handleEvent(PluginEvent.TASK_UPDATED, payload, "notifyOnTasks");
      },

      // Compliance events
      [PluginEvent.COMPLIANCE_STATUS_CHANGED]: async (payload) => {
        await handleEvent(PluginEvent.COMPLIANCE_STATUS_CHANGED, payload, "notifyOnCompliance");
      },
    };
  },

  // ===========================================================================
  // ROUTES
  // ===========================================================================

  routes(router: Router): void {
    /**
     * GET /api/plugins/{pluginId}/status
     *
     * Get notification statistics and queue status
     */
    router.get("/status", async (req: Request, res: Response) => {
      const ctx = pluginContext;
      if (!ctx) {
        return res.status(503).json({ success: false, error: "Plugin not initialized" });
      }

      const config = ctx.getConfig();
      const webhookUrl = config.webhookUrl as string;
      const platform = webhookUrl ? detectPlatform(webhookUrl) : "none";

      return res.status(200).json({
        success: true,
        data: {
          platform,
          stats,
          queueLength: notificationQueue.length,
          quietHours: {
            enabled: Boolean(config.quietHoursStart && config.quietHoursEnd),
            active: isQuietHours(
              config.quietHoursStart as string,
              config.quietHoursEnd as string
            ),
          },
        },
      });
    });

    /**
     * POST /api/plugins/{pluginId}/test
     *
     * Send a test notification
     */
    router.post("/test", async (req: Request, res: Response) => {
      const ctx = pluginContext;
      if (!ctx) {
        return res.status(503).json({ success: false, error: "Plugin not initialized" });
      }

      const success = await sendNotification(ctx, {
        title: "Test Notification",
        message: "This is a test notification from VerifyWise.",
        severity: "info",
        fields: [
          { name: "Source", value: "Manual Test" },
          { name: "Timestamp", value: new Date().toISOString() },
        ],
        timestamp: new Date(),
      });

      return res.status(success ? 200 : 500).json({
        success,
        message: success ? "Test notification sent" : "Failed to send test notification",
      });
    });

    /**
     * GET /api/plugins/{pluginId}/queue
     *
     * View queued notifications
     */
    router.get("/queue", async (req: Request, res: Response) => {
      return res.status(200).json({
        success: true,
        data: notificationQueue.map((item) => ({
          id: item.id,
          title: item.notification.title,
          attempts: item.attempts,
          lastAttempt: item.lastAttempt,
          error: item.error,
        })),
      });
    });

    /**
     * POST /api/plugins/{pluginId}/queue/retry
     *
     * Force retry all queued notifications
     */
    router.post("/queue/retry", async (req: Request, res: Response) => {
      const ctx = pluginContext;
      if (!ctx) {
        return res.status(503).json({ success: false, error: "Plugin not initialized" });
      }

      const queueLength = notificationQueue.length;
      await processRetryQueue(ctx);

      return res.status(200).json({
        success: true,
        message: `Retried ${queueLength} notifications`,
        remaining: notificationQueue.length,
      });
    });

    /**
     * DELETE /api/plugins/{pluginId}/queue
     *
     * Clear the notification queue
     */
    router.delete("/queue", async (req: Request, res: Response) => {
      const cleared = notificationQueue.length;
      notificationQueue = [];

      return res.status(200).json({
        success: true,
        message: `Cleared ${cleared} notifications from queue`,
      });
    });
  },
};

// =============================================================================
// EVENT HANDLER
// =============================================================================

/**
 * Handle an event and send notification if appropriate
 */
async function handleEvent(
  event: string,
  payload: EventPayload,
  configKey: string
): Promise<void> {
  const ctx = pluginContext;
  if (!ctx) return;

  const config = ctx.getConfig();

  // Check if this notification type is enabled
  if (!config[configKey]) {
    stats.filtered++;
    return;
  }

  // Check quiet hours
  if (isQuietHours(config.quietHoursStart as string, config.quietHoursEnd as string)) {
    ctx.logger.debug("Notification skipped - quiet hours active");
    stats.filtered++;
    return;
  }

  // Check severity threshold
  const severity = payload.data.severity as string;
  if (!meetsSeverityThreshold(severity, config.minSeverity as string)) {
    stats.filtered++;
    return;
  }

  // Build notification
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const notification = buildNotification(event, payload, baseUrl);

  if (!notification) {
    ctx.logger.warn(`No notification template for event: ${event}`);
    return;
  }

  // Send notification
  const success = await sendNotification(ctx, notification);

  if (!success) {
    queueForRetry(notification, "Initial send failed");
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export default notificationSenderPlugin;
