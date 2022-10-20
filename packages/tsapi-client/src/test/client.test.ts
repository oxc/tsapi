import { ApiEndpoint, defineApi } from "@oxc/tsapi-core";
import { z } from "zod";
import {
  AsyncApiClient,
  AsyncMakeRequest,
  SyncApiClient,
  SyncMakeRequest,
} from "../index.js";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const booksApi = defineApi().get("/:bookId", {
  params: z.object({ bookId: z.string() }),
});

const otherApi = defineApi((api) =>
  api
    .get("/", {
      output: z.object({ message: z.string() }),
    })
    .route("/books", booksApi)
);

const demoApi = defineApi((api) =>
  api
    .get("/users", {
      output: z.object({
        users: z.array(z.object({ id: z.number(), name: z.string() })),
      }),
    })
    .post("/users", {
      body: z.object({ name: z.string() }),
      output: z.object({ id: z.number() }),
    })
    .get("/user/:id", {
      params: z.object({ id: z.number() }),
      output: z.object({ id: z.number(), name: z.string() }),
    })
    .get("/entries", {
      query: z.object({
        limit: z.number().optional(),
        since: z.number().optional(),
      }),
      output: z.object({}),
    })
    .route("/entry", (route) =>
      route
        .put("/", {
          body: z.object({ name: z.string() }),
          output: z.object({ id: z.number() }),
        })
        .routeWithParams(
          "/:id",
          { params: z.object({ id: z.number() }) },
          (route) =>
            route
              .get("/", {
                output: z.object({ id: z.number(), name: z.string() }),
              })
              .patch("/", {
                body: z.object({ name: z.string() }),
              })
              .delete("/", {})
              .get("/sub/:subid/", {
                params: z.object({ subid: z.number() }),
                output: z.object({ fullId: z.string() }),
              })
              .route("/books", booksApi)
        )
    )
    .route("/books", booksApi)
    .route("/other", otherApi)
);

const syncMakeRequest = jest.fn<SyncMakeRequest>();
const syncClient = new SyncApiClient(demoApi, syncMakeRequest);
const asyncMakeRequest = jest.fn<AsyncMakeRequest>();
const asyncClient = new AsyncApiClient(demoApi, asyncMakeRequest);

describe.each([
  {
    title: "sync api client",
    // forcing the async type here otherwise Typescript inference will max out
    client: syncClient as unknown as typeof asyncClient,
    makeRequest: syncMakeRequest,
    mockReturnValue: (value: any) => syncMakeRequest.mockReturnValue(value),
  } as const,
  {
    title: "async api client",
    client: asyncClient,
    makeRequest: asyncMakeRequest,
    mockReturnValue: (value: any) => asyncMakeRequest.mockResolvedValue(value),
  } as const,
] as const)("$title", ({ client, makeRequest, mockReturnValue }) => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call a top-level get method without params", async () => {
    mockReturnValue({
      users: [],
    });
    await client.get("/users")();
    expect(makeRequest).toHaveBeenCalledWith("get", "/users", {
      params: undefined,
      query: undefined,
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it('should call a top-level get method with params"', async () => {
    mockReturnValue({
      id: 123,
      name: "John",
    });

    await client.get("/user/:id")({
      params: { id: 123 },
    });
    expect(makeRequest).toHaveBeenCalledWith("get", "/user/:id", {
      params: { id: 123 },
      query: undefined,
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a top-level get method with a query", async () => {
    mockReturnValue({});

    await client.get("/entries")({
      query: { limit: 5 },
    });
    expect(makeRequest).toHaveBeenCalledWith("get", "/entries", {
      params: undefined,
      query: { limit: 5 },
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should allow to omit the query if all parameters are optional", async () => {
    mockReturnValue({});

    await client.get("/entries")();
    expect(makeRequest).toHaveBeenCalledWith("get", "/entries", {
      params: undefined,
      query: undefined,
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a top-level post method with a body", async () => {
    mockReturnValue({
      id: 123,
    });

    await client.post("/users")({
      body: { name: "John" },
    });
    expect(makeRequest).toHaveBeenCalledWith("post", "/users", {
      params: undefined,
      query: undefined,
      body: {
        name: "John",
      },
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a nested put method with a body", async () => {
    mockReturnValue({
      id: 123,
    });

    await client.put("/entry/")({
      body: { name: "John" },
    });
    expect(makeRequest).toHaveBeenCalledWith("put", "/entry/", {
      params: undefined,
      query: undefined,
      body: {
        name: "John",
      },
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a nested get method with params", async () => {
    mockReturnValue({
      id: 123,
      name: "John",
    });

    await client.get("/entry/:id/")({
      params: { id: 123 },
    });
    expect(makeRequest).toHaveBeenCalledWith("get", "/entry/:id/", {
      params: { id: 123 },
      query: undefined,
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a nested patch method with a body", async () => {
    await client.patch("/entry/:id/")({
      params: { id: 123 },
      body: { name: "John" },
    });
    expect(makeRequest).toHaveBeenCalledWith("patch", "/entry/:id/", {
      params: { id: 123 },
      query: undefined,
      body: {
        name: "John",
      },
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a nested delete method", async () => {
    await client.delete("/entry/:id/")({
      params: { id: 123 },
    });
    expect(makeRequest).toHaveBeenCalledWith("delete", "/entry/:id/", {
      params: { id: 123 },
      query: undefined,
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a nested get method with merged params", async () => {
    mockReturnValue({
      fullId: "123/456",
    });

    await client.get("/entry/:id/sub/:subid/")({
      params: { id: 123, subid: 456 },
    });
    expect(makeRequest).toHaveBeenCalledWith("get", "/entry/:id/sub/:subid/", {
      params: { id: 123, subid: 456 },
      query: undefined,
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a call to top-level booksApi", async () => {
    await client.get("/books/:bookId")({
      params: { bookId: "123" },
    });
    expect(makeRequest).toHaveBeenCalledWith("get", "/books/:bookId", {
      params: { bookId: "123" },
      query: undefined,
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a call to booksApi", async () => {
    await client.get("/other/books/:bookId")({
      params: { bookId: "123" },
    });
    expect(makeRequest).toHaveBeenCalledWith("get", "/other/books/:bookId", {
      params: { bookId: "123" },
      query: undefined,
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
    });
  });

  it("should make a call to booksApi in nested route", async () => {
    await client.get("/entry/:id/books/:bookId")({
      params: { id: 123, bookId: "456" },
    });
    expect(makeRequest).toHaveBeenCalledWith(
      "get",
      "/entry/:id/books/:bookId",
      {
        params: { id: 123, bookId: "456" },
        query: undefined,
        body: undefined,
        endpoint: expect.any(ApiEndpoint),
      }
    );
  });
});
