# Notification Sender Template

Send notifications to external services when events occur in VerifyWise.

## Supported Platforms

| Platform | Auto-detected | Features |
|----------|---------------|----------|
| **Slack** | `hooks.slack.com` | Rich attachments, @channel mentions |
| **Microsoft Teams** | `webhook.office.com` | Adaptive cards, action buttons |
| **Discord** | `discord.com/api/webhooks` | Embeds, @everyone mentions |
| **Generic** | Any other URL | JSON payload |

## Use Cases

- Alert team when critical risks are created
- Notify assignees of new tasks
- Broadcast compliance status changes
- Send audit events to logging services

## Quick Start

1. Copy this template to your plugin directory
2. Update `manifest.json` with your plugin details
3. Add your webhook URL in plugin settings
4. Customize event handlers in `index.ts`

## Configuration

| Setting | Description |
|---------|-------------|
| **Webhook URL** | Incoming webhook URL (auto-detects platform) |
| **Risk notifications** | Enable/disable risk event notifications |
| **Task notifications** | Enable/disable task event notifications |
| **Compliance notifications** | Enable/disable compliance notifications |
| **Minimum severity** | Filter notifications by severity level |
| **Mention on critical** | Add @channel for critical items |
| **Quiet hours** | Suppress notifications during specified hours |

## Supported Events

### Risk Events
- `risk:created` - New risk added
- `risk:updated` - Risk modified
- `risk:deleted` - Risk removed

### Task Events
- `task:created` - New task assigned
- `task:updated` - Task modified

### Compliance Events
- `compliance:status_changed` - Compliance status changed

## Customization

### Adding New Events

Edit the `eventHandlers()` method in `index.ts`:

```typescript
eventHandlers(): EventHandlerMap {
  return {
    // Add your custom event
    [PluginEvent.VENDOR_CREATED]: async (payload) => {
      await handleEvent(PluginEvent.VENDOR_CREATED, payload, "notifyOnVendors");
    },
  };
}
```

Then add the notification template in `buildNotification()`:

```typescript
case PluginEvent.VENDOR_CREATED:
  return {
    title: "New Vendor Added",
    message: `Vendor "${payload.data.name}" has been added.`,
    severity: "info",
    url: `${baseUrl}/vendors/${payload.entityId}`,
  };
```

### Custom Message Formats

Add a new formatter for your platform:

```typescript
const formatCustomMessage: MessageFormatter = (notification, mention) => ({
  // Your platform's expected format
  title: notification.title,
  body: notification.message,
  priority: notification.severity === "error" ? "high" : "normal",
});
```

### Severity Mapping

Customize how VerifyWise severities map to notification levels:

```typescript
function mapSeverityToLevel(severity: string): NotificationSeverity {
  const mapping = {
    critical: "error",
    high: "error",
    medium: "warning",
    low: "info",
  };
  return mapping[severity.toLowerCase()] || "info";
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Statistics and queue status |
| `/test` | POST | Send a test notification |
| `/queue` | GET | View failed notifications |
| `/queue/retry` | POST | Retry all failed notifications |
| `/queue` | DELETE | Clear the notification queue |

## Setting Up Webhooks

### Slack

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app → "Incoming Webhooks"
3. Add webhook to your workspace
4. Copy the webhook URL

### Microsoft Teams

1. Open your Teams channel
2. Click ••• → Connectors
3. Find "Incoming Webhook" → Configure
4. Name it and copy the URL

### Discord

1. Open your Discord server settings
2. Go to Integrations → Webhooks
3. Create a new webhook
4. Copy the webhook URL

## Rate Limiting

The plugin includes built-in rate limiting:

- **Minimum interval**: 1 second between notifications
- **Retry attempts**: 3 attempts for failed notifications
- **Retry delay**: 5 seconds between retries

Adjust these constants in `index.ts` if needed:

```typescript
const RATE_LIMIT_MS = 1000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;
```

## Quiet Hours

Configure quiet hours to suppress notifications during off-hours:

- **Start**: When quiet hours begin (e.g., `22:00`)
- **End**: When quiet hours end (e.g., `08:00`)

Supports overnight ranges (e.g., 22:00 - 08:00).

## Testing

### Send Test Notification

```bash
curl -X POST http://localhost:3000/api/plugins/notification-sender/test
```

### Check Status

```bash
curl http://localhost:3000/api/plugins/notification-sender/status
```

### View Queue

```bash
curl http://localhost:3000/api/plugins/notification-sender/queue
```

## File Structure

```
notification-sender/
├── manifest.json    # Plugin metadata and config schema
├── index.ts         # Plugin implementation
├── icon.svg         # Plugin icon
└── README.md        # This file
```

## Troubleshooting

### Notifications not sending

1. Check webhook URL is correct
2. Verify the plugin is enabled
3. Check notification type is enabled in config
4. Review minimum severity setting
5. Check if quiet hours are active

### Wrong message format

The plugin auto-detects platform from URL. If detection fails, it uses generic JSON format. You can force a specific format by modifying `detectPlatform()`.

### Rate limit errors

If your webhook service has stricter rate limits, increase `RATE_LIMIT_MS`:

```typescript
const RATE_LIMIT_MS = 2000; // 2 seconds between notifications
```
