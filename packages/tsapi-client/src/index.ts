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
  inferEndpointBody,
  inferEndpointOutput,
  inferEndpointParams,
  inferEndpointPathsWithMethod,
  inferEndpointQuery,
} from "@oxc/tsapi-core/infer";
import { HasRequiredKeys } from "type-fest";

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
  } & Args
) => any;
export type AsyncMakeRequest<Args extends {} = {}> = (
  method: string,
  path: string,
  args: {
    params: Params | undefined;
    query: Query | undefined;
    body: Body | undefined;
    endpoint: ApiEndpoint<any>;
  } & Args
) => Promise<any>;

export class SyncApiClient<FlatApi extends ApiType, Args extends {}> {
  constructor(
    readonly def: ApiDefinition<any, FlatApi>,
    private readonly makeRequest: SyncMakeRequest<Args>
  ) {}

  get = this.endpointCallerFactory("get");

  post = this.endpointCallerFactory("post");

  put = this.endpointCallerFactory("put");

  patch = this.endpointCallerFactory("patch");

  delete = this.endpointCallerFactory("delete");

  private endpointCallerFactory<Method extends ApiEndpointMethods>(
    method: Method
  ): <Path extends inferEndpointPathsWithMethod<FlatApi, Method>>(
    path: Path
  ) => SyncEndpointCaller<inferEndpoint<FlatApi, Path, Method>, Args> {
    return (path) => {
      const endpoint = this.def.flatApi.endpoints[path][method]!;
      const outputValidator = endpoint.options.output as
        | OutputDefinition
        | undefined;
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
    private readonly makeRequest: AsyncMakeRequest<Args>
  ) {}

  get = this.endpointCallerFactory("get");

  post = this.endpointCallerFactory("post");

  put = this.endpointCallerFactory("put");

  patch = this.endpointCallerFactory("patch");

  delete = this.endpointCallerFactory("delete");

  private endpointCallerFactory<Method extends ApiEndpointMethods>(
    method: Method
  ): <Path extends inferEndpointPathsWithMethod<FlatApi, Method>>(
    path: Path
  ) => AsyncEndpointCaller<inferEndpoint<FlatApi, Path, Method>, Args> {
    return (path) => {
      const endpoint = this.def.flatApi.endpoints[path][method]!;
      const outputValidator = endpoint.options.output as
        | OutputDefinition
        | undefined;

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

type SyncEndpointCaller<
  Endpoint extends ApiEndpoint<any>,
  Args extends {}
> = HasRequiredKeys<EndpointArgs<Endpoint, Args>> extends true
  ? (args: EndpointArgs<Endpoint, Args>) => inferEndpointOutput<Endpoint>
  : (args?: EndpointArgs<Endpoint, Args>) => inferEndpointOutput<Endpoint>;
type AsyncEndpointCaller<
  Endpoint extends ApiEndpoint<any>,
  Args extends {}
> = HasRequiredKeys<EndpointArgs<Endpoint, Args>> extends true
  ? (
      args: EndpointArgs<Endpoint, Args>
    ) => Promise<inferEndpointOutput<Endpoint>>
  : (
      args?: EndpointArgs<Endpoint, Args>
    ) => Promise<inferEndpointOutput<Endpoint>>;

type EndpointArgs<
  Endpoint extends ApiEndpoint<any>,
  Args extends {}
> = Optionalify<
  {
    params: inferEndpointParams<Endpoint>;
    query: inferEndpointQuery<Endpoint>;
    body: inferEndpointBody<Endpoint>;
  } & Omit<Args, "params" | "query" | "body" | "endpoint">
>;

type MandatoryPropertyKeys<T> = {
  [P in keyof T]: undefined extends T[P] ? never : P;
}[keyof T];

/**
 * returns a type with all properties that can be undefined marked as optional
 */
type Optionalify<T> = {
  [P in MandatoryPropertyKeys<T>]-?: T[P];
} & Partial<T>;
