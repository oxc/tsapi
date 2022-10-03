import { defineApi } from "@oxc/tsapi-core";
import { z } from "zod";
import { ApiClient } from "../index.js";
import { beforeEach, expect, jest } from "@jest/globals";

const booksApi = defineApi().get("/:bookId", {
  params: z.object({ bookId: z.string() }),
});

const otherApi = defineApi()
  .get("/", {
    output: z.object({ message: z.string() }),
  })
  .route("/books", booksApi);

const demoApi = defineApi()
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
      limit: z.number(),
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
            })
            .route("/books", booksApi)
      )
  )
  .route("/books", booksApi)
  .route("/other", otherApi);

const requestMaker = {
  makeRequest: jest.fn() as any,
};

const client = new ApiClient(demoApi, requestMaker);

describe("api client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call a top-level get method without params", async () => {
    await client.get("/users")();
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "get",
      "/users",
      undefined,
      undefined,
      undefined
    );
  });

  it('should call a top-level get method with params"', async () => {
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

  it("should make a top-level get method with a query", async () => {
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

  it("should make a top-level post method with a body", async () => {
    await client.post("/users")({
      body: { name: "John" },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "post",
      "/users",
      undefined,
      undefined,
      { name: "John" }
    );
  });

  it("should make a nested put method with a body", async () => {
    await client.put("/entry/")({
      body: { name: "John" },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "put",
      "/entry/",
      undefined,
      undefined,
      { name: "John" }
    );
  });

  it("should make a nested get method with params", async () => {
    await client.get("/entry/:id/")({
      params: { id: 123 },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "get",
      "/entry/:id/",
      { id: 123 },
      undefined,
      undefined
    );
  });

  it("should make a nested patch method with a body", async () => {
    await client.patch("/entry/:id/")({
      params: { id: 123 },
      body: { name: "John" },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "patch",
      "/entry/:id/",
      { id: 123 },
      undefined,
      { name: "John" }
    );
  });

  it("should make a nested delete method", async () => {
    await client.delete("/entry/:id/")({
      params: { id: 123 },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "delete",
      "/entry/:id/",
      { id: 123 },
      undefined,
      undefined
    );
  });

  it("should make a nested get method with merged params", async () => {
    await client.get("/entry/:id/sub/:subid/")({
      params: { id: 123, subid: 456 },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "get",
      "/entry/:id/sub/:subid/",
      { id: 123, subid: 456 },
      undefined,
      undefined
    );
  });

  it("should make a call to top-level booksApi", async () => {
    await client.get("/books/:bookId")({
      params: { bookId: "123" },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "get",
      "/books/:bookId",
      { bookId: "123" },
      undefined,
      undefined
    );
  });

  it("should make a call to booksApi", async () => {
    await client.get("/other/books/:bookId")({
      params: { bookId: "123" },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "get",
      "/other/books/:bookId",
      { bookId: "123" },
      undefined,
      undefined
    );
  });

  it("should make a call to booksApi in nested route", async () => {
    await client.get("/entry/:id/books/:bookId")({
      params: { id: 123, bookId: "456" },
    });
    expect(requestMaker.makeRequest).toHaveBeenCalledWith(
      "get",
      "/entry/:id/books/:bookId",
      { id: 123, bookId: "456" },
      undefined,
      undefined
    );
  });
});
