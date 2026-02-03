# VerifyWise Plugin Marketplace

This repository contains the plugin marketplace for VerifyWise, including plugin registry, implementations, and documentation for building new plugins.

## Quick Links

| Document | Description |
|----------|-------------|
| [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md) | Complete guide to building plugins |
| [Framework Plugins Guide](docs/FRAMEWORK_PLUGINS.md) | Compliance framework plugin guide |
| [Plugin UI Guide](docs/PLUGIN_UI_GUIDE.md) | Building dynamic plugin UIs |
| [Architecture Overview](docs/ARCHITECTURE.md) | System architecture and data flow |
| [API Reference](docs/API_REFERENCE.md) | Plugin interface specifications |

## Repository Structure

```
plugin-marketplace/
├── plugins.json              # Plugin registry (marketplace manifest)
├── package.json              # Build scripts
├── plugins/                  # Plugin implementations
│   ├── mlflow/              # MLflow integration plugin
│   │   ├── index.ts         # Backend plugin code
│   │   ├── package.json     # Backend dependencies
│   │   ├── README.md        # Plugin documentation
│   │   └── ui/              # Frontend UI components
│   │       ├── src/         # React components
│   │       ├── vite.config.ts
│   │       └── package.json
│   ├── azure-ai-foundry/    # Azure AI Foundry plugin
│   ├── risk-import/         # Risk Import plugin
│   ├── slack/               # Slack integration plugin
│   │
│   │ # Framework plugins (compliance frameworks)
│   ├── gdpr/                # GDPR framework
│   │   ├── template.json    # Framework definition (chapters, sections)
│   │   ├── index.ts         # Auto-generated from template
│   │   ├── dist/            # Compiled backend
│   │   └── ui/dist/         # Shared UI bundle (copied from packages/)
│   ├── soc2/
│   ├── hipaa/
│   └── ...                  # 18 framework plugins total
│
├── packages/                 # Shared packages
│   ├── custom-framework-ui/  # Shared UI for all framework plugins
│   │   ├── src/             # React components
│   │   ├── dist/            # Compiled bundle (index.esm.js)
│   │   └── vite.config.ts
│   └── custom-framework-base/ # Shared backend for framework plugins
│
├── scripts/                  # Build scripts
│   ├── build-framework-plugins.js  # Builds all framework plugins
│   └── add-framework.js     # Helper to add new frameworks
│
├── docs/                    # Documentation
│   ├── PLUGIN_DEVELOPMENT_GUIDE.md
│   ├── PLUGIN_UI_GUIDE.md
│   ├── ARCHITECTURE.md
│   └── API_REFERENCE.md
└── README.md               # This file
```

## Quick Start: Creating a New Plugin

### 1. Create Plugin Directory

```bash
mkdir -p plugins/my-plugin/ui/src
```

### 2. Create Backend Plugin (`plugins/my-plugin/index.ts`)

```typescript
// Types for plugin routing
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
  buffer?: any;      // For binary data (files)
  filename?: string;
  contentType?: string;
  headers?: Record<string, string>;
}

// Required exports
export async function install(userId: number, tenantId: string, config: any, context: any) {
  // Create tables, initialize resources
  return { success: true, message: "Installed", installedAt: new Date().toISOString() };
}

export async function uninstall(userId: number, tenantId: string, context: any) {
  // Clean up tables, resources
  return { success: true, message: "Uninstalled", uninstalledAt: new Date().toISOString() };
}

export function validateConfig(config: any) {
  // Validate configuration
  return { valid: true, errors: [] };
}

export const metadata = {
  name: "My Plugin",
  version: "1.0.0",
  author: "Your Name",
  description: "Plugin description"
};

// Plugin Router - Define custom API endpoints
export const router: Record<string, (ctx: PluginRouteContext) => Promise<PluginRouteResponse>> = {
  "GET /items": async (ctx) => {
    // Handle GET /api/plugins/my-plugin/items
    return { data: { items: [] } };
  },
  "POST /items": async (ctx) => {
    // Handle POST /api/plugins/my-plugin/items
    return { status: 201, data: { created: true } };
  },
  "GET /items/:itemId": async (ctx) => {
    // ctx.params.itemId contains the URL parameter
    return { data: { id: ctx.params.itemId } };
  },
};
```

### 3. Add to Registry (`plugins.json`)

```json
{
  "key": "my-plugin",
  "name": "My Plugin",
  "displayName": "My Plugin",
  "description": "Short description",
  "version": "1.0.0",
  "category": "data_management",
  "pluginPath": "plugins/my-plugin",
  "entryPoint": "index.ts",
  "requiresConfiguration": true,
  "ui": {
    "bundleUrl": "/api/plugins/my-plugin/ui/dist/index.esm.js",
    "globalName": "PluginMyPlugin",
    "slots": [...]
  }
}
```

### 4. Build UI (if applicable)

```bash
cd plugins/my-plugin/ui
npm install
npm run build
```

See [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT_GUIDE.md) for complete instructions.

## Plugin Types

| Type | Description | Example |
|------|-------------|---------|
| **Standard** | Simple plugins without database tables | Slack |
| **Tenant-Scoped** | Plugins with per-tenant database tables | MLflow, Risk Import |
| **OAuth** | Plugins requiring OAuth authentication | Slack |

## Plugin Router System

Plugins can define custom API endpoints via the `router` export. All requests to `/api/plugins/:pluginKey/*` are automatically forwarded to the plugin's router.

### Route Pattern Format

Routes are defined as `"METHOD /path"` keys:

```typescript
export const router = {
  "GET /models": handleGetModels,           // GET /api/plugins/my-plugin/models
  "POST /sync": handleSync,                 // POST /api/plugins/my-plugin/sync
  "GET /models/:modelId": handleGetModel,   // GET /api/plugins/my-plugin/models/123
  "DELETE /items/:id": handleDelete,        // DELETE /api/plugins/my-plugin/items/456
};
```

### Route Context

Each handler receives a `PluginRouteContext` with:

| Property | Type | Description |
|----------|------|-------------|
| `tenantId` | string | Current tenant identifier |
| `userId` | number | Authenticated user ID |
| `organizationId` | number | User's organization ID |
| `method` | string | HTTP method (GET, POST, etc.) |
| `path` | string | Request path after plugin key |
| `params` | object | URL parameters (e.g., `:modelId`) |
| `query` | object | Query string parameters |
| `body` | any | Request body (for POST/PUT/PATCH) |
| `sequelize` | any | Database connection |
| `configuration` | object | Plugin's stored configuration |

### Response Types

Handlers return a `PluginRouteResponse`:

```typescript
// JSON response
return { data: { items: [...] } };

// Custom status code
return { status: 201, data: { created: true } };

// File download
return {
  buffer: fileBuffer,
  filename: "export.xlsx",
  contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

// Custom headers
return { data: {...}, headers: { "X-Custom": "value" } };
```

## Available Plugin Slots

Plugins can inject UI at these locations:

| Slot ID | Location | Render Types |
|---------|----------|--------------|
| `page.risks.actions` | Risk Management "Insert From" menu | `menuitem`, `modal` |
| `page.models.tabs` | Model Inventory tabs | `tab` |
| `page.plugin.config` | Plugin configuration panel | `card`, `inline` |
| `page.settings.tabs` | Settings page tabs | `tab` |
| `modal.framework.selection` | Add Framework modal | `card` |
| `page.framework-dashboard.custom` | Organizational Framework Dashboard | `card` |
| `page.controls.custom-framework` | Organizational Controls tab | `card` |
| `page.project-controls.custom-framework` | Project Controls tab | `card` |
| `page.dashboard.widgets` | Dashboard (future) | `widget` |
| `layout.sidebar.items` | Sidebar (future) | `menuitem` |

## Development vs Production

### Development (Local)
VerifyWise reads from local `plugins.json` and `plugins/` directory.

### Production (Git Repository)
VerifyWise fetches from remote Git repository:

```bash
PLUGIN_MARKETPLACE_URL=https://raw.githubusercontent.com/org/plugin-marketplace/main/plugins.json
```

## Current Plugins

### Integration Plugins

| Plugin | Category | Description |
|--------|----------|-------------|
| **Slack** | Communication | Real-time notifications via Slack |
| **MLflow** | ML Operations | ML model tracking and sync |
| **Azure AI Foundry** | ML Operations | Azure ML model tracking and sync |
| **Risk Import** | Data Management | Bulk import risks from Excel |

### Framework Plugins

Framework plugins provide compliance frameworks grouped by geographic region. All framework plugins share a common UI bundle from `packages/custom-framework-ui/`.

| Region | Frameworks |
|--------|------------|
| 🌐 **International** | ISO 27001, PCI-DSS, CIS Controls v8, AI Ethics, Data Governance |
| 🇺🇸 **United States** | SOC 2 Type II, HIPAA, CCPA, NIST CSF, Texas AI Act, Colorado AI Act, FTC AI Guidelines |
| 🇨🇦 **Canada** | Quebec Law 25 |
| 🇪🇺 **European Union** | GDPR, DORA, ALTAI |
| 🇦🇪 **United Arab Emirates** | UAE PDPL |
| 🇸🇦 **Saudi Arabia** | Saudi PDPL |
| 🇶🇦 **Qatar** | Qatar PDPL |
| 🇧🇭 **Bahrain** | Bahrain PDPL |

#### Building Framework Plugins

```bash
# Build shared UI (if UI code changed)
npm run build:custom-framework-ui

# Build all framework plugins (compiles backend + copies UI bundle)
npm run build:framework-plugins

# Or build everything at once
npm run build:all
```

The build script:
1. Auto-discovers framework plugins by looking for `template.json` files
2. Generates `index.ts` from each `template.json`
3. Compiles backend to `dist/index.js`
4. Copies shared UI from `packages/custom-framework-ui/dist/` to each plugin's `ui/dist/`

#### Adding a New Framework

1. Create `plugins/<framework-key>/template.json` with framework definition
2. Run `npm run build:framework-plugins`
3. Add entry to `plugins.json`
4. Commit and push (including `ui/dist/` folder)

See [Framework Plugins Guide](docs/FRAMEWORK_PLUGINS.md) for details.

### Framework Plugin Structure

```json
{
  "key": "gdpr",
  "name": "GDPR Compliance",
  "category": "compliance",
  "region": "European Union",
  "iconUrl": "plugins/gdpr/icon.svg",
  ...
}
```

Key fields for framework plugins:
- `category`: Must be `"compliance"` or have compliance/framework tags
- `region`: Geographic region (displayed with flag in UI)
- `iconUrl`: Local SVG icon path

## Event-Based Plugin Communication

Plugins can communicate with the main app using custom DOM events for decoupled integration:

```typescript
// Plugin emits event
window.dispatchEvent(
  new CustomEvent("myPluginEvent", {
    detail: { projectId: 123, data: {...} }
  })
);

// App listens (in React component)
useEffect(() => {
  const handler = (event: CustomEvent) => {
    if (event.detail?.projectId === project.id) {
      // Handle event
    }
  };
  window.addEventListener("myPluginEvent", handler);
  return () => window.removeEventListener("myPluginEvent", handler);
}, [project.id]);
```

### Event Naming Convention

- Use camelCase: `customFrameworkCountChanged`
- Include context: `projectId`, `userId`, etc.
- Be descriptive: `Changed`, `Added`, `Removed`

See [Custom Framework Import README](plugins/custom-framework-import/README.md) for a complete example.

## Contributing

1. Fork this repository
2. Create plugin in `plugins/` directory
3. Add entry to `plugins.json`
4. Submit pull request

See [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT_GUIDE.md) for detailed instructions.

## License

MIT License - See LICENSE file for details.
