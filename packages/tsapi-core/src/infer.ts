/* eslint-disable */
import { ApiDefinition, ApiEndpoint, ApiEndpointMethods, ApiType } from "./index.js";
import { z } from "zod";

type inferZodInput<T> = T extends z.ZodType ? z.input<T> : T extends undefined ? undefined : never;

type inferZodOutput<T> = T extends z.ZodType
  ? z.output<T>
  : T extends undefined
  ? undefined
  : never;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferApi<T extends ApiDefinition<any, any>> = T extends ApiDefinition<infer Api, any>
  ? Api
  : never;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferFlatApi<T extends ApiDefinition<any, any>> = T extends ApiDefinition<
  any,
  infer FlatApi
>
  ? FlatApi
  : never;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferEndpoint<
  Api extends ApiType,
  Path extends keyof Api["endpoints"],
  Method extends keyof Api["endpoints"][Path],
> = Api["endpoints"][Path][Method] extends ApiEndpoint<any>
  ? Api["endpoints"][Path][Method]
  : never;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type inferRoute<
  Api extends ApiType,
  Path extends keyof Api["routes"],
> = Api["routes"][Path] extends ApiDefinition<any, any> ? Api["routes"][Path] : never;

type inferOptionalZodInputProperty<
  E extends ApiEndpoint<any>,
  P extends keyof E["options"],
> = P extends keyof E["options"] ? inferZodInput<E["options"][P]> : void;

type inferOptionalZodOutputProperty<
  E extends ApiEndpoint<any>,
  P extends keyof E["options"],
> = P extends keyof E["options"] ? inferZodOutput<E["options"][P]> : void;

export type inferEndpointParamsInput<E extends ApiEndpoint<any>> = inferOptionalZodInputProperty<
  E,
  "params"
>;
export type inferEndpointBodyInput<E extends ApiEndpoint<any>> = inferOptionalZodInputProperty<
  E,
  "body"
>;
export type inferEndpointQueryInput<E extends ApiEndpoint<any>> = inferOptionalZodInputProperty<
  E,
  "query"
>;
export type inferEndpointOutputInput<E extends ApiEndpoint<any>> = inferOptionalZodInputProperty<
  E,
  "output"
>;

export type inferEndpointParamsOutput<E extends ApiEndpoint<any>> = inferOptionalZodOutputProperty<
  E,
  "params"
>;
export type inferEndpointBodyOutput<E extends ApiEndpoint<any>> = inferOptionalZodOutputProperty<
  E,
  "body"
>;
export type inferEndpointQueryOutput<E extends ApiEndpoint<any>> = inferOptionalZodOutputProperty<
  E,
  "query"
>;
export type inferEndpointOutputOutput<E extends ApiEndpoint<any>> = inferOptionalZodOutputProperty<
  E,
  "output"
>;

export type inferEndpointPathsWithMethod<Api extends ApiType, Method extends ApiEndpointMethods> = {
  [Path in keyof Api["endpoints"]]: Api["endpoints"][Path][Method] extends ApiEndpoint<any>
    ? Path
    : never;
}[keyof Api["endpoints"] & string];
