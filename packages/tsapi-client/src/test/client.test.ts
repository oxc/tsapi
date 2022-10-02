import { defineApi } from "@oxc/tsapi-core";
import { z } from "zod";
import { ApiClient } from "../index.js";
import { beforeEach, expect, jest } from "@jest/globals";

const demoApi = defineApi()
  .get("/users", {
    output: z.object({
      users: z.array(z.object({ id: z.number(), name: z.string() })),
    }),
  })
  .get("/user/:id", {
    params: z.object({ id: z.number() }),
    output: z.object({ id: z.number(), name: z.string() }),
  })
  .get("/entries", {
    query: z.object({
      limit: z.number(),
      since: z.number().optional(),
    }),
    output: z.object({}),
  });

const requestMaker = {
  makeRequest: jest.fn() as any,
};

const client = new ApiClient(demoApi, requestMaker);

describe("api client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call a simple get method without params", async () => {
    await client.get("/users")({});
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "get",
      "/users",
      undefined,
      undefined,
      undefined
    );
  });

  it('should call a simple get method with params"', async () => {
    await client.get("/user/:id")({
      params: { id: 123 },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "get",
      "/user/:id",
      { id: 123 },
      undefined,
      undefined
    );
  });

  it("should make a simple get method with a query", async () => {
    await client.get("/entries")({
      query: { limit: 5 },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "get",
      "/entries",
      undefined,
      { limit: 5 },
      undefined
    );
  });
});
