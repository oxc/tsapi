import {
  ApiDefinition,
  ApiEndpoint,
  ApiEndpointMethods,
  ApiType,
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

export type RequestMaker = {
  makeRequest<
    Params extends Record<string, string>,
    Query extends Record<string, string>,
    Body,
    Output
  >(
    method: string,
    path: string,
    params: Params | undefined,
    query: Query | undefined,
    body: Body | undefined
  ): Promise<Output>;
};

// noinspection JSUnusedGlobalSymbols
export class ApiClient<FlatApi extends ApiType> {
  constructor(
    readonly def: ApiDefinition<any, FlatApi>,
    private readonly requestMaker: RequestMaker
  ) {}

  get = this.createEndpointCaller("get");

  post = this.createEndpointCaller("post");

  put = this.createEndpointCaller("put");

  patch = this.createEndpointCaller("patch");

  delete = this.createEndpointCaller("delete");

  private createEndpointCaller<Method extends ApiEndpointMethods>(
    method: Method
  ): <Path extends inferEndpointPathsWithMethod<FlatApi, Method>>(
    path: Path
  ) => EndpointCaller<inferEndpoint<FlatApi, Path, Method>> {
    return (path) =>
      (async (args) => {
        const { params, query, body } = args ?? {};
        return this.requestMaker.makeRequest(method, path, params, query, body);
      }) as EndpointCaller<any>;
  }
}

type EndpointCaller<Endpoint extends ApiEndpoint<any>> = HasRequiredKeys<
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
