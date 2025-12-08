# Webhook Receiver Template

Receive webhooks from external services and trigger actions in VerifyWise.

## Use Cases

- **GitHub** - Create risks/tasks from security alerts
- **Stripe** - Track payment events for vendor compliance
- **CI/CD** - Update deployment status in compliance records
- **Security scanners** - Import vulnerability findings as risks
- **Any webhook-enabled service**

## Quick Start

1. Copy this template to your plugin directory
2. Update `manifest.json` with your plugin details
3. Configure the webhook secret in plugin settings
4. Map external events to VerifyWise actions in `EVENT_MAPPINGS`

## Configuration

| Setting | Description |
|---------|-------------|
| **Webhook secret** | HMAC-SHA256 secret for signature verification |
| **Allowed IPs** | Comma-separated allowlist (empty = allow all) |
| **Queue failed webhooks** | Store failed webhooks for manual retry |
| **Log payloads** | Log incoming payloads (disable in production) |

## Webhook Endpoint

```
POST /api/plugins/{your-plugin-id}/webhook
```

### Headers

| Header | Description |
|--------|-------------|
| `X-Webhook-Signature` | HMAC-SHA256 signature: `sha256=<hex>` |
| `Content-Type` | `application/json` |

### Payload Format

```json
{
  "event": "security.issue.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "title": "SQL Injection vulnerability",
    "severity": "high",
    "description": "..."
  }
}
```

## Customization

### Adding Event Handlers

Edit the `EVENT_MAPPINGS` object in `index.ts`:

```typescript
const EVENT_MAPPINGS = {
  // Your custom event
  "vulnerability.detected": async (ctx, data) => {
    const risk = await ctx.models.Risk?.create({
      title: data.title,
      severity: mapSeverity(data.severity),
      status: "Open",
    });
    return { success: true, action: "risk_created", entityId: risk?.id };
  },
};
```

### Custom Signature Verification

Some services use different signature schemes. Modify `verifySignature()`:

```typescript
// Example: Stripe uses a different format
function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const elements = header.split(",");
  const timestamp = elements.find(e => e.startsWith("t="))?.slice(2);
  const signature = elements.find(e => e.startsWith("v1="))?.slice(3);

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature || "", "hex"),
    Buffer.from(expected, "hex")
  );
}
```

### IP Allowlisting

Configure allowed IPs in plugin settings. Example allowlists:

```
# GitHub webhook IPs
192.30.252.0/22,185.199.108.0/22

# Single IP
10.0.0.1

# Multiple IPs
10.0.0.1,10.0.0.2,10.0.0.3
```

## Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook/status` | GET | Endpoint status and supported events |
| `/webhook/failed` | GET | List failed webhooks |
| `/webhook/retry/:id` | POST | Retry a failed webhook |
| `/webhook/failed/:id` | DELETE | Delete a failed webhook |

## Security Best Practices

1. **Always verify signatures** - Never trust unverified webhooks
2. **Use IP allowlists** - Restrict to known source IPs when possible
3. **Disable payload logging** - Don't log sensitive data in production
4. **Rotate secrets regularly** - Update webhook secrets periodically
5. **Validate payloads** - Check expected fields exist before processing

## Testing

### Generate a test signature

```bash
SECRET="your-webhook-secret"
PAYLOAD='{"event":"test","data":{}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

curl -X POST http://localhost:3000/api/plugins/your-plugin/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

### Test with ngrok (for external services)

```bash
# Expose local server
ngrok http 3000

# Use the ngrok URL as your webhook endpoint
# https://abc123.ngrok.io/api/plugins/your-plugin/webhook
```

## File Structure

```
webhook-receiver/
├── manifest.json    # Plugin metadata and config schema
├── index.ts         # Plugin implementation
├── icon.svg         # Plugin icon
└── README.md        # This file
```
