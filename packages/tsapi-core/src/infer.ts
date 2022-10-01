/* eslint-disable */
import { ApiDefinition, ApiEndpoint, ApiType } from "./index.js";
import { z } from "zod";

type inferZod<T> = T extends z.AnyZodObject
  ? z.infer<T>
  : T extends undefined
  ? undefined
  : never;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferApi<T extends ApiDefinition<any, any>> =
  T extends ApiDefinition<infer Api, any> ? Api : never;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferFlatApi<T extends ApiDefinition<any, any>> =
  T extends ApiDefinition<any, infer FlatApi> ? FlatApi : never;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferEndpoint<
  Api extends ApiType,
  Path extends keyof Api["endpoints"],
  Method extends keyof Api["endpoints"][Path]
> = Api["endpoints"][Path][Method] extends ApiEndpoint<any>
  ? Api["endpoints"][Path][Method]
  : never;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferRoute<
  Api extends ApiType,
  Path extends keyof Api["routes"]
> = Api["routes"][Path] extends ApiDefinition<any, any>
  ? Api["routes"][Path]
  : never;

export type inferEndpointParams<E extends ApiEndpoint<any>> = inferZod<
  E["options"]["params"]
>;
export type inferEndpointBody<E extends ApiEndpoint<any>> = inferZod<
  E["options"]["body"]
>;
export type inferEndpointQuery<E extends ApiEndpoint<any>> = inferZod<
  E["options"]["query"]
>;
export type inferEndpointOutput<E extends ApiEndpoint<any>> = inferZod<
  E["options"]["output"]
>;
