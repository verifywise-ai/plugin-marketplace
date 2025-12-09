/**
 * @fileoverview Sample Iframe Plugin
 *
 * A built-in plugin that demonstrates how to embed external content
 * in an iframe within VerifyWise. Use this as a template for integrating:
 * - External dashboards (Grafana, Metabase, etc.)
 * - Third-party compliance tools
 * - Legacy web applications
 * - Documentation wikis
 *
 * ## How Iframe Pages Work
 *
 * 1. The manifest specifies `type: "iframe"` and a `url` in the `ui.page` section
 * 2. VerifyWise renders the URL in a sandboxed iframe
 * 3. The iframe has security restrictions (configurable via sandbox attributes)
 *
 * ## Key Configuration Options
 *
 * - `iframeUrl`: The URL to embed (configurable in plugin settings)
 * - `allowScripts`: Enable/disable JavaScript in iframe
 * - `allowForms`: Enable/disable form submissions in iframe
 *
 * ## Communication Between Iframe and VerifyWise
 *
 * Use the browser's postMessage API:
 *
 * ```javascript
 * // From iframe (external page):
 * window.parent.postMessage({ type: 'plugin-event', data: {...} }, '*');
 *
 * // In VerifyWise (listening):
 * window.addEventListener('message', (event) => {
 *   if (event.data.type === 'plugin-event') {
 *     // Handle message
 *   }
 * });
 * ```
 *
 * @module plugins/sample-iframe
 */

import fs from "fs";
import path from "path";
import { Router } from "express";
import { Plugin, PluginContext, PluginManifest } from "../../core";

// Load manifest from JSON file
const manifestPath = path.join(__dirname, "manifest.json");
const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

// Load icon from SVG file (optional - will use default puzzle icon if not present)
let icon: string | undefined;
try {
  const iconPath = path.join(__dirname, "icon.svg");
  icon = fs.readFileSync(iconPath, "utf-8");
} catch {
  // Icon is optional, will use default
}

// Store plugin context for use in routes
let pluginContext: PluginContext | null = null;

/**
 * Sample Iframe Plugin
 *
 * Demonstrates iframe-based plugin pages for embedding external content.
 */
const sampleIframePlugin: Plugin = {
  manifest: {
    ...manifest,
    icon,
  },

  async onInstall(context: PluginContext): Promise<void> {
    context.logger.info("Sample Iframe plugin installed");
    context.logger.info("Configure the iframe URL in Settings > Plugins > Sample iframe plugin");
  },

  async onUninstall(context: PluginContext): Promise<void> {
    context.logger.info("Sample Iframe plugin uninstalled");
  },

  async onLoad(context: PluginContext): Promise<void> {
    pluginContext = context;
    context.logger.info("Sample Iframe plugin loaded");
  },

  async onUnload(context: PluginContext): Promise<void> {
    pluginContext = null;
    context.logger.info("Sample Iframe plugin unloaded");
  },

  async onEnable(context: PluginContext): Promise<void> {
    pluginContext = context;
    const configuredUrl = context.config.get<string>("iframeUrl", "https://example.com");
    context.logger.info(`Sample Iframe plugin enabled with URL: ${configuredUrl}`);
  },

  async onDisable(context: PluginContext): Promise<void> {
    pluginContext = null;
    context.logger.info("Sample Iframe plugin disabled");
  },

  /**
   * Routes - Example endpoints for iframe communication
   *
   * These routes demonstrate patterns for:
   * 1. Getting the configured iframe URL
   * 2. Handling postMessage-style webhooks from iframe content
   * 3. Serving a test HTML page that can be embedded
   * 4. Serving dynamic page content based on selected source
   */
  routes(router: Router): void {
    /**
     * URL mapping for selectable sources
     */
    const sourceUrls: Record<string, { url: string; name: string }> = {
      "test-page": {
        url: "/api/plugins/sample-iframe/test-page",
        name: "Built-in test page",
      },
      "wikipedia": {
        url: "https://www.wikipedia.org",
        name: "Wikipedia",
      },
      "openstreetmap": {
        url: "https://www.openstreetmap.org/export/embed.html?bbox=-0.1%2C51.5%2C0.0%2C51.52&layer=mapnik",
        name: "OpenStreetMap",
      },
      "example": {
        url: "https://example.com",
        name: "Example.com",
      },
    };

    /**
     * GET /api/plugins/sample-iframe/page-content
     *
     * Returns HTML content for the plugin page with embedded iframe.
     * The iframe URL is determined by the selectedSource config.
     */
    router.get("/page-content", async (_req, res): Promise<void> => {
      try {
        if (!pluginContext) {
          res.json({
            success: false,
            error: "Plugin context not available",
          });
          return;
        }

        const selectedSource = pluginContext.config.get<string>("selectedSource", "test-page");
        const allowScripts = pluginContext.config.get<boolean>("allowScripts", true);
        const allowForms = pluginContext.config.get<boolean>("allowForms", true);

        const source = sourceUrls[selectedSource] || sourceUrls["test-page"];

        // For test-page, use full URL with host
        const iframeUrl = selectedSource === "test-page"
          ? `${_req.protocol}://${_req.get("host")}${source.url}`
          : source.url;

        // Build sandbox attribute
        const sandboxParts = ["allow-same-origin"];
        if (allowScripts) sandboxParts.push("allow-scripts");
        if (allowForms) sandboxParts.push("allow-forms");
        const sandbox = sandboxParts.join(" ");

        const html = `
          <div style="display: flex; flex-direction: column; height: calc(100vh - 180px); min-height: 500px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px 8px 0 0;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; color: #6b7280;">Viewing:</span>
                <span style="font-size: 13px; font-weight: 500; color: #374151;">${source.name}</span>
              </div>
              <a href="${iframeUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #13715B; text-decoration: none;">
                Open in new tab
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
            <iframe
              src="${iframeUrl}"
              style="flex: 1; width: 100%; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"
              sandbox="${sandbox}"
              title="${source.name}"
            ></iframe>
          </div>
        `;

        res.json({
          success: true,
          data: {
            contentType: "html",
            html,
          },
        });
      } catch (error) {
        pluginContext?.logger.error("Failed to get page content", { error });
        res.status(500).json({
          success: false,
          error: "Failed to load page content",
        });
      }
    });

    /**
     * GET /api/plugins/sample-iframe/config-url
     *
     * Returns the configured iframe URL from plugin settings.
     * Useful for dynamically determining the embed URL.
     */
    router.get("/config-url", async (_req, res): Promise<void> => {
      try {
        if (!pluginContext) {
          res.json({
            success: false,
            error: "Plugin context not available",
          });
          return;
        }

        const selectedSource = pluginContext.config.get<string>("selectedSource", "test-page");
        const allowScripts = pluginContext.config.get<boolean>("allowScripts", true);
        const allowForms = pluginContext.config.get<boolean>("allowForms", true);

        const source = sourceUrls[selectedSource] || sourceUrls["test-page"];

        res.json({
          success: true,
          data: {
            selectedSource,
            url: source.url,
            name: source.name,
            sandbox: {
              allowScripts,
              allowForms,
              sandboxAttribute: [
                allowScripts ? "allow-scripts" : "",
                "allow-same-origin",
                allowForms ? "allow-forms" : "",
              ]
                .filter(Boolean)
                .join(" "),
            },
          },
        });
      } catch (error) {
        pluginContext?.logger.error("Failed to get config URL", { error });
        res.status(500).json({
          success: false,
          error: "Failed to get configuration",
        });
      }
    });

    /**
     * POST /api/plugins/sample-iframe/message
     *
     * Webhook endpoint for receiving messages from iframe content.
     * The embedded page can POST here to communicate with VerifyWise.
     *
     * Example usage in iframe:
     * ```javascript
     * fetch('/api/plugins/sample-iframe/message', {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   body: JSON.stringify({ type: 'user-action', action: 'clicked-button' })
     * });
     * ```
     */
    router.post("/message", async (req, res): Promise<void> => {
      try {
        if (!pluginContext) {
          res.json({
            success: false,
            error: "Plugin context not available",
          });
          return;
        }

        const { type, action, data } = req.body;

        pluginContext.logger.info("Received message from iframe", {
          type,
          action,
          data,
        });

        // Handle different message types
        switch (type) {
          case "user-action":
            // Log user actions from iframe
            pluginContext.logger.info(`Iframe user action: ${action}`);
            break;

          case "data-sync":
            // Handle data synchronization from iframe
            pluginContext.logger.info("Iframe data sync request", { data });
            break;

          default:
            pluginContext.logger.info(`Unknown message type: ${type}`);
        }

        res.json({
          success: true,
          message: "Message received",
        });
      } catch (error) {
        pluginContext?.logger.error("Failed to process iframe message", { error });
        res.status(500).json({
          success: false,
          error: "Failed to process message",
        });
      }
    });

    /**
     * GET /api/plugins/sample-iframe/test-page
     *
     * Serves a simple HTML test page that can be embedded in the iframe.
     * Useful for testing the iframe integration without an external server.
     *
     * To use: Set the iframe URL to the full URL of this endpoint.
     */
    router.get("/test-page", async (_req, res): Promise<void> => {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sample Iframe Content</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #13715B;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #374151;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .success-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #dcfce7;
      color: #166534;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 24px;
    }
    .code-block {
      background: #f3f4f6;
      border-radius: 6px;
      padding: 16px;
      font-family: monospace;
      font-size: 13px;
      overflow-x: auto;
      margin-bottom: 16px;
    }
    button {
      background: #13715B;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }
    button:hover {
      background: #0f5f4c;
    }
    #message-log {
      margin-top: 16px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 6px;
      font-size: 13px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-badge">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Iframe loaded successfully
    </div>

    <h1>Sample Iframe Content</h1>

    <p>
      This page is served by the sample-iframe plugin and demonstrates
      how external content appears inside VerifyWise.
    </p>

    <p>
      <strong>Communication example:</strong> Click the button below to send
      a message to the parent VerifyWise window using postMessage.
    </p>

    <div class="code-block">
window.parent.postMessage({
  type: 'plugin-event',
  pluginId: 'sample-iframe',
  action: 'button-clicked'
}, '*');
    </div>

    <button onclick="sendMessage()">Send Message to Parent</button>

    <div id="message-log">Messages will appear here...</div>
  </div>

  <script>
    let messageCount = 0;

    function sendMessage() {
      messageCount++;
      const message = {
        type: 'plugin-event',
        pluginId: 'sample-iframe',
        action: 'button-clicked',
        count: messageCount,
        timestamp: new Date().toISOString()
      };

      // Send to parent window
      window.parent.postMessage(message, '*');

      // Log locally
      document.getElementById('message-log').innerHTML =
        'Sent message #' + messageCount + ' at ' + new Date().toLocaleTimeString();
    }

    // Listen for messages from parent
    window.addEventListener('message', (event) => {
      console.log('Received from parent:', event.data);
    });
  </script>
</body>
</html>
      `.trim();

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    });
  },
};

export default sampleIframePlugin;
