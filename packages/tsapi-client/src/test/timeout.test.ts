import { describe, expect, it, jest } from "@jest/globals";
import { SyncApiClient, SyncMakeRequest } from "../index.js";
import { ApiEndpoint, defineApi } from "@oxc/tsapi-core";
import { z } from "zod";

const demoApi = defineApi().get("/user/:id", {
  params: z.object({ id: z.number() }),
  output: z.object({ id: z.number(), name: z.string() }),
});

describe("a client with extra makeRequest args", () => {
  const timeoutMakeRequest = jest.fn<SyncMakeRequest<{ timeout: number }>>();
  const timeoutClient = new SyncApiClient(demoApi, timeoutMakeRequest);

  it("should allow to pass timeout to makeRequest", () => {
    timeoutMakeRequest.mockReturnValueOnce({
      id: 123,
      name: "John",
    });

    timeoutClient.get("/user/:id")({
      params: { id: 123 },
      timeout: 60000,
    });
    expect(timeoutMakeRequest).toHaveBeenCalledWith("get", "/user/:id", {
      params: { id: 123 },
      query: undefined,
      body: undefined,
      endpoint: expect.any(ApiEndpoint),
      timeout: 60000,
    });
  });
});
