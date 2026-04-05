/**
 * Tests for Azure AI Foundry plugin
 *
 * Covers:
 * - GET /discover (Agent Discovery)
 * - GET /models (Model Inventory)
 * - GET /models/:deploymentId (Model by ID)
 * - POST /sync (Model Sync)
 *
 * Run: npx jest plugins/azure-ai-foundry/index.test.ts
 */

import { router } from "./index";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock sequelize
const mockQuery = jest.fn();
const mockSequelize = { query: mockQuery };

const baseCtx = {
  tenantId: "test-tenant",
  userId: 1,
  organizationId: 1,
  method: "GET",
  path: "/discover",
  params: {},
  query: {},
  body: {},
  sequelize: mockSequelize,
  configuration: {
    project_endpoint: "https://test.services.ai.azure.com/api/projects/test-project",
    api_key: "test-api-key",
  },
};

describe("GET /discover", () => {
  const discover = router["GET /discover"];

  beforeEach(() => {
    mockFetch.mockReset();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns empty array when plugin is not configured", async () => {
    const ctx = { ...baseCtx, configuration: {} };
    const result = await discover(ctx);

    expect(result.status).toBe(200);
    expect(result.data).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty array when project_endpoint is missing", async () => {
    const ctx = { ...baseCtx, configuration: { api_key: "key" } };
    const result = await discover(ctx);

    expect(result.data).toEqual([]);
  });

  it("returns empty array when api_key is missing", async () => {
    const ctx = { ...baseCtx, configuration: { project_endpoint: "https://test.com" } };
    const result = await discover(ctx);

    expect(result.data).toEqual([]);
  });

  it("calls Azure API with correct URL and headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await discover(baseCtx);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.services.ai.azure.com/api/projects/test-project/assistants?api-version=v1&limit=100",
      {
        method: "GET",
        headers: {
          "api-key": "test-api-key",
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("strips trailing slash from project_endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const ctx = {
      ...baseCtx,
      configuration: {
        project_endpoint: "https://test.com/project/",
        api_key: "key",
      },
    };
    await discover(ctx);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://test.com/project/assistants"),
      expect.any(Object)
    );
  });

  it("maps a full agent response to primitive format", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "asst_abc123",
            name: "Customer Support Agent",
            model: "gpt-4o",
            instructions: "You are a helpful customer support agent.",
            tools: [
              { type: "code_interpreter" },
              { type: "file_search" },
              { type: "function", function: { name: "get_order_status" } },
            ],
            file_ids: ["file_1", "file_2"],
            metadata: { owner: "user@company.com" },
            created_at: 1712000000,
          },
        ],
      }),
    });

    const result = await discover(baseCtx);

    expect(result.status).toBe(200);
    expect(result.data).toHaveLength(1);

    const primitive = result.data[0];
    expect(primitive.external_id).toBe("asst_abc123");
    expect(primitive.display_name).toBe("Customer Support Agent");
    expect(primitive.primitive_type).toBe("ai_agent");
    expect(primitive.owner_id).toBe("user@company.com");
    expect(primitive.permissions).toEqual([
      "code_interpreter",
      "file_search",
      "function:get_order_status",
    ]);
    expect(primitive.last_activity).toBe(new Date(1712000000 * 1000).toISOString());
    expect(primitive.metadata.source).toBe("azure_ai_foundry");
    expect(primitive.metadata.model).toBe("gpt-4o");
    expect(primitive.metadata.instructions_preview).toBe("You are a helpful customer support agent.");
    expect(primitive.metadata.tools_count).toBe(3);
    expect(primitive.metadata.file_ids_count).toBe(2);
  });

  it("handles agent with no name (falls back to ID)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: "asst_no_name", tools: [], created_at: null }],
      }),
    });

    const result = await discover(baseCtx);

    expect(result.data[0].display_name).toBe("asst_no_name");
    expect(result.data[0].permissions).toEqual([]);
    expect(result.data[0].last_activity).toBeNull();
  });

  it("handles agent with no tools", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: "asst_1", name: "Simple Agent", model: "gpt-4o" }],
      }),
    });

    const result = await discover(baseCtx);

    expect(result.data[0].permissions).toEqual([]);
    expect(result.data[0].metadata.tools_count).toBe(0);
  });

  it("handles function tool with no name", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "asst_1",
            name: "Agent",
            tools: [{ type: "function" }],
            created_at: 1700000000,
          },
        ],
      }),
    });

    const result = await discover(baseCtx);

    expect(result.data[0].permissions).toEqual(["function:unknown"]);
  });

  it("maps unknown tool types directly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "asst_1",
            name: "Agent",
            tools: [
              { type: "bing_grounding" },
              { type: "azure_ai_search" },
              { type: "some_future_tool" },
            ],
            created_at: 1700000000,
          },
        ],
      }),
    });

    const result = await discover(baseCtx);

    expect(result.data[0].permissions).toEqual([
      "bing_grounding",
      "azure_ai_search",
      "some_future_tool",
    ]);
  });

  it("truncates long instructions to 200 chars", async () => {
    const longInstructions = "A".repeat(500);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: "asst_1", name: "Agent", instructions: longInstructions, created_at: 1700000000 }],
      }),
    });

    const result = await discover(baseCtx);

    expect(result.data[0].metadata.instructions_preview).toHaveLength(200);
  });

  it("handles multiple agents", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: "asst_1", name: "Agent 1", created_at: 1700000000 },
          { id: "asst_2", name: "Agent 2", created_at: 1700000001 },
          { id: "asst_3", name: "Agent 3", created_at: 1700000002 },
        ],
      }),
    });

    const result = await discover(baseCtx);

    expect(result.data).toHaveLength(3);
    expect(result.data.map((p: any) => p.external_id)).toEqual(["asst_1", "asst_2", "asst_3"]);
  });

  it("returns empty array on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const result = await discover(baseCtx);

    expect(result.status).toBe(200);
    expect(result.data).toEqual([]);
  });

  it("returns empty array on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await discover(baseCtx);

    expect(result.status).toBe(200);
    expect(result.data).toEqual([]);
  });

  it("returns empty array when API returns no data field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await discover(baseCtx);

    expect(result.data).toEqual([]);
  });
});

describe("GET /models", () => {
  const getModels = router["GET /models"];

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns models from the database", async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, deployment_name: "gpt-4o", model_name: "gpt-4o", organization_id: 1 },
      { id: 2, deployment_name: "ada-002", model_name: "text-embedding-ada-002", organization_id: 1 },
    ]);

    const result = await getModels(baseCtx);

    expect(result.status).toBe(200);
    expect(result.data.configured).toBe(true);
    expect(result.data.models).toHaveLength(2);
  });

  it("returns configured:false when table does not exist", async () => {
    mockQuery.mockRejectedValueOnce(new Error('relation "azure_ai_model_records" does not exist'));

    const result = await getModels(baseCtx);

    expect(result.status).toBe(200);
    expect(result.data.configured).toBe(false);
    expect(result.data.models).toEqual([]);
  });

  it("returns empty models array when no records exist", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const result = await getModels(baseCtx);

    expect(result.data.configured).toBe(true);
    expect(result.data.models).toEqual([]);
  });
});

describe("GET /models/:deploymentId", () => {
  const getModelById = router["GET /models/:deploymentId"];

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns a specific model", async () => {
    const model = { id: 1, deployment_name: "gpt-4o", model_name: "gpt-4o" };
    mockQuery.mockResolvedValueOnce([model]);

    const ctx = { ...baseCtx, params: { deploymentId: "1" } };
    const result = await getModelById(ctx);

    expect(result.status).toBe(200);
    expect(result.data).toEqual(model);
  });

  it("returns 404 when model not found", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const ctx = { ...baseCtx, params: { deploymentId: "999" } };
    const result = await getModelById(ctx);

    expect(result.status).toBe(404);
  });
});

describe("POST /sync", () => {
  const syncModels = router["POST /sync"];

  it("returns 400 when not configured", async () => {
    const ctx = { ...baseCtx, configuration: {} };
    const result = await syncModels(ctx);

    expect(result.status).toBe(400);
    expect(result.data.success).toBe(false);
  });

  it("returns 400 when api_key is missing", async () => {
    const ctx = { ...baseCtx, configuration: { project_endpoint: "https://test.com" } };
    const result = await syncModels(ctx);

    expect(result.status).toBe(400);
  });
});
