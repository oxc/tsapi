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
type SyncMakeRequest = <P extends Params, Q extends Query, B, O>(
  method: string,
  path: string,
  params: P | undefined,
  query: Q | undefined,
  body: B | undefined
) => O;
type AsyncMakeRequest = <P extends Params, Q extends Query, B, O>(
  method: string,
  path: string,
  params: P | undefined,
  query: Q | undefined,
  body: B | undefined
) => Promise<O>;

export class SyncApiClient<FlatApi extends ApiType> {
  constructor(
    readonly def: ApiDefinition<any, FlatApi>,
    private readonly makeRequest: SyncMakeRequest
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
  ) => SyncEndpointCaller<inferEndpoint<FlatApi, Path, Method>> {
    return (path) => {
      const outputValidator = this.def.flatApi.endpoints[path][method]!.options
        .output as OutputDefinition | undefined;
      return ((args) => {
        const { params, query, body } = args ?? {};
        const result = this.makeRequest(method, path, params, query, body);
        if (outputValidator) {
          return outputValidator.parse(result);
        }
      }) as SyncEndpointCaller<any>;
    };
  }
}

export class AsyncApiClient<FlatApi extends ApiType> {
  constructor(
    readonly def: ApiDefinition<any, FlatApi>,
    private readonly makeRequest: AsyncMakeRequest
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
  ) => AsyncEndpointCaller<inferEndpoint<FlatApi, Path, Method>> {
    return (path) => {
      const outputValidator = this.def.flatApi.endpoints[path][method]!.options
        .output as OutputDefinition | undefined;

      return (async (args) => {
        const { params, query, body } = args ?? {};
        const result = await this.makeRequest(
          method,
          path,
          params,
          query,
          body
        );
        if (outputValidator) {
          return await outputValidator.parseAsync(result);
        }
      }) as AsyncEndpointCaller<any>;
    };
  }
}

type SyncEndpointCaller<Endpoint extends ApiEndpoint<any>> = HasRequiredKeys<
  EndpointArgs<Endpoint>
> extends true
  ? (args: EndpointArgs<Endpoint>) => inferEndpointOutput<Endpoint>
  : (args?: EndpointArgs<Endpoint>) => inferEndpointOutput<Endpoint>;
type AsyncEndpointCaller<Endpoint extends ApiEndpoint<any>> = HasRequiredKeys<
  EndpointArgs<Endpoint>
> extends true
  ? (args: EndpointArgs<Endpoint>) => Promise<inferEndpointOutput<Endpoint>>
  : (args?: EndpointArgs<Endpoint>) => Promise<inferEndpointOutput<Endpoint>>;

type EndpointArgs<Endpoint extends ApiEndpoint<any>> = Optionalify<{
  params: inferEndpointParams<Endpoint>;
  query: inferEndpointQuery<Endpoint>;
  body: inferEndpointBody<Endpoint>;
}>;

type MandatoryPropertyKeys<T> = {
  [P in keyof T]: undefined extends T[P] ? never : P;
}[keyof T];

/**
 * returns a type with all properties that can be undefined marked as optional
 */
type Optionalify<T> = {
  [P in MandatoryPropertyKeys<T>]-?: T[P];
} & Partial<T>;
