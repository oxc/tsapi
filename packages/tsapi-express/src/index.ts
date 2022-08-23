/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiDefinition,
  ApiEndpoint,
  ApiEndpointKeys,
  ApiEndpointMethods,
  ApiEndpointOptions,
  ApiRouteKeys,
  ApiType,
  ApiWithEndpoint,
  EmptyApiType,
  FlatApiWithRoute,
} from "@oxc/tsapi-core";
import {
  inferApi,
  inferEndpoint,
  inferFlatApi,
  inferRoute,
  inferEndpointBody,
  inferEndpointOutput,
  inferEndpointParams,
  inferEndpointQuery,
} from "@oxc/tsapi-core/infer";
import { IRouter, Request, RequestHandler, Response, Router } from "express";

type EndpointArgs<E extends ApiEndpoint<any>> = {
  req: EndpointRequest<E>;
  res: EndpointResponse<E>;
  params: inferEndpointParams<E>;
  body: inferEndpointBody<E>;
  query: inferEndpointQuery<E>;
};

export type EndpointRequest<E extends ApiEndpoint<any>> = Request<
  inferEndpointParams<E>,
  inferEndpointOutput<E>,
  inferEndpointBody<E>,
  inferEndpointQuery<E>
>;

export type EndpointResponse<E extends ApiEndpoint<any>> = Response<
  inferEndpointOutput<E>
>;
export type EndpointHandler<E extends ApiEndpoint<any>> = (
  args: EndpointArgs<E>
) => PromiseLike<inferEndpointOutput<E>>;

function createEndpointHandler<Endpoint extends ApiEndpoint<any>>(
  endpoint: Endpoint,
  handler: EndpointHandler<Endpoint>
): RequestHandler<
  inferEndpointParams<Endpoint>,
  inferEndpointOutput<Endpoint>,
  inferEndpointBody<Endpoint>,
  inferEndpointQuery<Endpoint>
> {
  return async (req, res, next) => {
    const { params, body, query } = endpoint.options as ApiEndpointOptions;
    const args = {
      req: req,
    } as EndpointArgs<any>;
    try {
      if (params) args.params = await params.parseAsync(req.params);
      if (body) args.body = await body.parseAsync(req.body);
      if (query) args.query = await query.parseAsync(req.query);
      req.params = args.params;
      req.body = args.body;
      req.query = args.query;
      handler(args).then(
        (output) => {
          res.json(output);
        },
        (err) => {
          if (!err) {
            err = new Error(
              "returned promise was rejected but did not have a reason"
            );
          }
          next(err);
        }
      );
    } catch (err) {
      next(err);
    }
  };
}

type ImplementedApiWithEndpoint<
  ImplementedApi extends ApiType,
  Api extends ApiType,
  Path extends ApiEndpointKeys<Api, Method>,
  Method extends ApiEndpointMethods
> = ApiWithEndpoint<
  ImplementedApi,
  Path,
  Method,
  inferEndpoint<Api, Path, Method>
>;

type ImplementedApiWithRoute<
  ImplementedApi extends ApiType,
  Api extends ApiType,
  Path extends ApiRouteKeys<Api>
> = FlatApiWithRoute<ImplementedApi, Path, inferFlatApi<inferRoute<Api, Path>>>;

type EmptyImplementedApi = EmptyApiType;
type Builder<
  Api extends ApiType,
  FlatApi extends ApiType,
  ImplementedApi extends ApiType
> = (
  router: ApiRouter<Api, FlatApi, EmptyImplementedApi>
) => ApiRouter<Api, FlatApi, ImplementedApi>;
type BuilderOrRouter<
  Api extends ApiType,
  FlatApi extends ApiType,
  ImplementedApi extends ApiType
> =
  | ApiRouter<Api, FlatApi, ImplementedApi>
  | Builder<Api, FlatApi, ImplementedApi>;

export class ApiRouter<
  Api extends ApiType,
  FlatApi extends ApiType,
  ImplementedApi extends ApiType
> {
  private readonly actions: ((router: IRouter) => void)[] = [];

  constructor(readonly def: ApiDefinition<Api, FlatApi>) {}

  get = this.endpointFactory("get");

  post = this.endpointFactory("post");

  put = this.endpointFactory("put");

  patch = this.endpointFactory("patch");

  delete = this.endpointFactory("delete");

  private endpointFactory<Method extends ApiEndpointMethods>(
    method: Method
  ): <Path extends ApiEndpointKeys<FlatApi, Method>>(
    path: Path,
    handler: EndpointHandler<inferEndpoint<FlatApi, Path, Method>>
  ) => ApiRouter<
    Api,
    FlatApi,
    ImplementedApiWithEndpoint<ImplementedApi, FlatApi, Path, Method>
  > {
    return (path, handler) => {
      const endpoint = this.def.flatApi.endpoints[path][
        method
      ] as inferEndpoint<FlatApi, typeof path, Method>;
      const requestHandler = createEndpointHandler(endpoint, handler);
      this.actions.push((router) => router[method](path, requestHandler));
      return this;
    };
  }

  use<Path extends ApiRouteKeys<Api>>(
    path: Path,
    builderOrORouter: BuilderOrRouter<
      inferApi<inferRoute<Api, Path>>,
      inferFlatApi<inferRoute<Api, Path>>,
      ImplementedApiWithRoute<ImplementedApi, Api, Path>
    >
  ): ApiRouter<
    Api,
    FlatApi,
    ImplementedApiWithRoute<ImplementedApi, Api, Path>
  > {
    const api = this.def.api.routes[path] as inferRoute<Api, Path>;
    const apiRouter =
      typeof builderOrORouter === "function"
        ? builderOrORouter(new ApiRouter(api))
        : builderOrORouter;
    this.actions.push((router) =>
      router.use(path, apiRouter.applyTo(Router()))
    );
    return this;
  }

  applyTo(router: IRouter): IRouter {
    this.actions.forEach((action) => action(router));
    return router;
  }

  build(): IRouter {
    return this.applyTo(Router());
  }
}

export function implementApi<Def extends ApiDefinition<any, any>>(
  api: Def,
  builder: Builder<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>>
): ApiRouter<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>> {
  return builder(new ApiRouter(api));
}
