// noinspection JSUnusedGlobalSymbols

import {
  ApiDefinition,
  ApiEndpoint,
  ApiEndpointMethods,
  ApiType,
  OutputDefinition,
} from "@oxc/tsapi-core";
import {
  inferEndpoint,
  inferEndpointBodyInput,
  inferEndpointOutputOutput,
  inferEndpointParamsInput,
  inferEndpointPathsWithMethod,
  inferEndpointQueryInput,
} from "@oxc/tsapi-core/infer";
import { HasRequiredKeys, Simplify } from "type-fest";

type Params = Record<string, string>;
type Query = Record<string, string>;
type Body = {};
export type SyncMakeRequest<Args extends {} = {}> = (
  method: string,
  path: string,
  args: {
    params: Params | undefined;
    query: Query | undefined;
    body: Body | undefined;
    endpoint: ApiEndpoint<any>;
  } & Args,
) => any;
export type AsyncMakeRequest<Args extends {} = {}> = (
  method: string,
  path: string,
  args: {
    params: Params | undefined;
    query: Query | undefined;
    body: Body | undefined;
    endpoint: ApiEndpoint<any>;
  } & Args,
) => Promise<any>;

export class SyncApiClient<FlatApi extends ApiType, Args extends {}> {
  constructor(
    readonly def: ApiDefinition<any, FlatApi>,
    private readonly makeRequest: SyncMakeRequest<Args>,
  ) {}

  get = this.endpointCallerFactory("get");

  post = this.endpointCallerFactory("post");

  put = this.endpointCallerFactory("put");

  patch = this.endpointCallerFactory("patch");

  delete = this.endpointCallerFactory("delete");

  private endpointCallerFactory<Method extends ApiEndpointMethods>(
    method: Method,
  ): <Path extends inferEndpointPathsWithMethod<FlatApi, Method>>(
    path: Path,
  ) => SyncEndpointCaller<inferEndpoint<FlatApi, Path, Method>, Args> {
    return (path) => {
      const endpoint = this.def.flatApi.endpoints[path][method]!;
      const outputValidator = endpoint.options.output as OutputDefinition | undefined;
      return ((args: EndpointArgs<any, Args>) => {
        const result = this.makeRequest(method, path, {
          ...args,
          endpoint,
        } as any);
        if (outputValidator) {
          return outputValidator.parse(result);
        }
      }) as any;
    };
  }
}

export class AsyncApiClient<FlatApi extends ApiType, Args extends {}> {
  constructor(
    readonly def: ApiDefinition<any, FlatApi>,
    private readonly makeRequest: AsyncMakeRequest<Args>,
  ) {}

  get = this.endpointCallerFactory("get");

  post = this.endpointCallerFactory("post");

  put = this.endpointCallerFactory("put");

  patch = this.endpointCallerFactory("patch");

  delete = this.endpointCallerFactory("delete");

  private endpointCallerFactory<Method extends ApiEndpointMethods>(
    method: Method,
  ): <Path extends inferEndpointPathsWithMethod<FlatApi, Method>>(
    path: Path,
  ) => AsyncEndpointCaller<inferEndpoint<FlatApi, Path, Method>, Args> {
    return (path) => {
      const endpoint = this.def.flatApi.endpoints[path][method]!;
      const outputValidator = endpoint.options.output as OutputDefinition | undefined;

      return (async (args: EndpointArgs<any, Args>) => {
        const result = await this.makeRequest(method, path, {
          ...args,
          endpoint,
        } as any);
        if (outputValidator) {
          return await outputValidator.parseAsync(result);
        }
      }) as any;
    };
  }
}

type SyncEndpointCaller<Endpoint extends ApiEndpoint<any>, Args extends {}> = HasRequiredKeys<
  EndpointArgs<Endpoint, Args>
> extends true
  ? (args: EndpointArgs<Endpoint, Args>) => inferEndpointOutputOutput<Endpoint>
  : (args?: EndpointArgs<Endpoint, Args>) => inferEndpointOutputOutput<Endpoint>;
type AsyncEndpointCaller<Endpoint extends ApiEndpoint<any>, Args extends {}> = HasRequiredKeys<
  EndpointArgs<Endpoint, Args>
> extends true
  ? (args: EndpointArgs<Endpoint, Args>) => Promise<inferEndpointOutputOutput<Endpoint>>
  : (args?: EndpointArgs<Endpoint, Args>) => Promise<inferEndpointOutputOutput<Endpoint>>;

type EndpointArgs<Endpoint extends ApiEndpoint<any>, Args extends {}> = Optionalify<
  {
    params: inferEndpointParamsInput<Endpoint>;
    query: inferEndpointQueryInput<Endpoint>;
    body: inferEndpointBodyInput<Endpoint>;
  } & Omit<Args, "params" | "query" | "body" | "endpoint">
>;

type IsAllOptional<T> = undefined extends T ? true : Partial<T> extends T ? true : false;

type MandatoryPropertyKeys<T> = {
  [P in keyof T]: IsAllOptional<T[P]> extends true ? never : P;
}[keyof T];

/**
 * returns a type with a property of name Param and type T, which is optional IFF all properties in T are optional
 */
type Optionalify<T> = Simplify<{
  [P in MandatoryPropertyKeys<T>]-?: T[P];
}> &
  Partial<T>;
