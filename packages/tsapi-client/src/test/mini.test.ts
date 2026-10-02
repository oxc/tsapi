import { describe, expect, it, jest } from "@jest/globals";
import { AsyncApiClient, AsyncMakeRequest, SyncApiClient, SyncMakeRequest } from "../index.js";
import { defineApi } from "@oxc/tsapi-core";
import { z, ZodObject } from "zod";
import * as zm from "zod/mini";
import * as core from "zod/v4/core";

const miniApi = defineApi((api) =>
  api
    .get("/users", {
      output: zm.object({ users: zm.array(zm.object({ id: zm.number(), name: zm.string() })) }),
    })
    .routeWithParams("/user/:id", { params: zm.object({ id: zm.number() }) }, (route) =>
      route.get("/book/:bookId", {
        params: zm.object({ bookId: zm.string() }),
        output: zm.object({ title: zm.string() }),
      }),
    ),
);

const mixedApi = defineApi((api) =>
  api.routeWithParams("/user/:id", { params: z.object({ id: z.number() }) }, (route) =>
    route.get("/book/:bookId", {
      params: zm.object({ bookId: zm.string() }),
    }),
  ),
);

describe("schemas from zod/mini", () => {
  const syncMakeRequest = jest.fn<SyncMakeRequest>();
  const syncClient = new SyncApiClient(miniApi, syncMakeRequest);
  const asyncMakeRequest = jest.fn<AsyncMakeRequest>();
  const asyncClient = new AsyncApiClient(miniApi, asyncMakeRequest);

  it("parses the output with the sync client", () => {
    syncMakeRequest.mockReturnValueOnce({ users: [{ id: 1, name: "John", extra: true }] });

    expect(syncClient.get("/users")()).toEqual({ users: [{ id: 1, name: "John" }] });
  });

  it("parses the output with the async client", async () => {
    asyncMakeRequest.mockResolvedValueOnce({ users: [] });

    await expect(asyncClient.get("/users")()).resolves.toEqual({ users: [] });
  });

  it("rejects output the schema does not describe, with a zod error", () => {
    syncMakeRequest.mockReturnValueOnce({ users: "nobody" });

    expect(() => syncClient.get("/users")()).toThrow(core.$ZodError);
  });

  it("merges a route's params into its endpoints' params, staying mini", () => {
    syncMakeRequest.mockReturnValueOnce({ title: "Moby Dick" });

    syncClient.get("/user/:id/book/:bookId")({ params: { id: 1, bookId: "md" } });

    const calls = syncMakeRequest.mock.calls;
    const params = calls[calls.length - 1][2].endpoint.options.params!;
    expect(Object.keys(params._zod.def.shape)).toEqual(["id", "bookId"]);
    expect(params).toBeInstanceOf(core.$ZodObject);
    expect(params).not.toBeInstanceOf(ZodObject);
  });

  it("merges classic route params with mini endpoint params into a classic schema", () => {
    const endpoint = mixedApi.flatApi.endpoints["/user/:id/book/:bookId"].get;
    const params = endpoint.options.params;

    expect(Object.keys(params._zod.def.shape)).toEqual(["id", "bookId"]);
    expect(params).toBeInstanceOf(ZodObject);
  });
});
