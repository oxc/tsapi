/* eslint-disable */
import {
  ApiDefinition,
  ApiEndpoint,
  ApiEndpointMethods,
  ApiType,
} from "./index.js";
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

type inferOptionalZodProperty<
  E extends ApiEndpoint<any>,
  P extends keyof E["options"]
> = P extends keyof E["options"] ? inferZod<E["options"][P]> : undefined;

export type inferEndpointParams<E extends ApiEndpoint<any>> =
  inferOptionalZodProperty<E, "params">;
export type inferEndpointBody<E extends ApiEndpoint<any>> =
  inferOptionalZodProperty<E, "body">;
export type inferEndpointQuery<E extends ApiEndpoint<any>> =
  inferOptionalZodProperty<E, "query">;
export type inferEndpointOutput<E extends ApiEndpoint<any>> =
  inferOptionalZodProperty<E, "output">;

export type inferEndpointPathsWithMethod<
  Api extends ApiType,
  Method extends ApiEndpointMethods
> = {
  [Path in keyof Api["endpoints"]]: Api["endpoints"][Path][Method] extends ApiEndpoint<any>
    ? Path
    : never;
}[keyof Api["endpoints"] & string];
