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
  inferEndpointBodyOutput,
  inferEndpointOutputInput,
  inferEndpointParamsOutput,
  inferEndpointQueryOutput,
} from "@oxc/tsapi-core/infer";
import { IRouter, Request, RequestHandler, Response, Router } from "express";
import { Middleware } from "./middleware.js";

export { middleware, Middleware } from "./middleware.js";

export type EndpointArgs<E extends ApiEndpoint<any>> = {
  req: EndpointRequest<E>;
  res: EndpointResponse<E>;
  params: inferEndpointParamsOutput<E>;
  body: inferEndpointBodyOutput<E>;
  query: inferEndpointQueryOutput<E>;
};

export type EndpointRequest<E extends ApiEndpoint<any>> = Request<
  inferEndpointParamsOutput<E>,
  inferEndpointOutputInput<E>,
  inferEndpointBodyOutput<E>,
  inferEndpointQueryOutput<E>
>;

export type EndpointResponse<E extends ApiEndpoint<any>> = Response<inferEndpointOutputInput<E>>;
export type EndpointHandler<E extends ApiEndpoint<any>, ExtraArgs extends Record<string, any>> = (
  args: EndpointArgs<E> & ExtraArgs,
) => PromiseLike<inferEndpointOutputInput<E>>;

function createEndpointHandler<
  Endpoint extends ApiEndpoint<any>,
  ExtraArgs extends Record<string, any>,
>(
  endpoint: Endpoint,
  handler: EndpointHandler<Endpoint, ExtraArgs>,
  middleware: Middleware<ExtraArgs> | undefined,
): RequestHandler<
  inferEndpointParamsOutput<Endpoint>,
  inferEndpointOutputInput<Endpoint>,
  inferEndpointBodyOutput<Endpoint>,
  inferEndpointQueryOutput<Endpoint>
> {
  return async (req, res, next) => {
    const { params, body, query } = endpoint.options as ApiEndpointOptions;
    const args = {
      req, res,
    } as EndpointArgs<any>;
    try {
      if (params) args.params = await params.parseAsync(req.params);
      if (body) args.body = await body.parseAsync(req.body);
      if (query) args.query = await query.parseAsync(req.query);
      req.params = args.params;
      req.body = args.body;
      req.query = args.query;
      if (middleware) {
        const extraArgs = await middleware(args);
        Object.assign(args, extraArgs);
      }
      handler(args as EndpointArgs<any> & ExtraArgs).then(
        (output) => {
          res.json(output);
        },
        (err) => {
          if (!err) {
            err = new Error("returned promise was rejected but did not have a reason");
          }
          next(err);
        },
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
  Method extends ApiEndpointMethods,
> = ApiWithEndpoint<ImplementedApi, Path, Method, inferEndpoint<Api, Path, Method>>;

type ImplementedApiWithRoute<
  ImplementedApi extends ApiType,
  Api extends ApiType,
  Path extends ApiRouteKeys<Api>,
> = FlatApiWithRoute<ImplementedApi, Path, inferFlatApi<inferRoute<Api, Path>>>;

type EmptyImplementedApi = EmptyApiType;
type Builder<
  Api extends ApiType,
  FlatApi extends ApiType,
  ImplementedApi extends ApiType,
  ExtraArgs extends Record<string, any>,
> = (
  router: ApiRouter<Api, FlatApi, EmptyImplementedApi, ExtraArgs>,
) => ApiRouter<Api, FlatApi, ImplementedApi, ExtraArgs>;
type BuilderOrRouter<
  Api extends ApiType,
  FlatApi extends ApiType,
  ImplementedApi extends ApiType,
  ExtraArgs extends Record<string, any>,
> =
  | ApiRouter<Api, FlatApi, ImplementedApi, ExtraArgs>
  | Builder<Api, FlatApi, ImplementedApi, ExtraArgs>;

export class ApiRouter<
  Api extends ApiType,
  FlatApi extends ApiType,
  ImplementedApi extends ApiType,
  ExtraArgs extends Record<string, any>,
> {
  private readonly actions: ((router: IRouter) => void)[] = [];

  constructor(
    readonly def: ApiDefinition<Api, FlatApi>,
    private readonly middleware?: Middleware<ExtraArgs>,
  ) {}

  get = this.endpointFactory("get");

  post = this.endpointFactory("post");

  put = this.endpointFactory("put");

  patch = this.endpointFactory("patch");

  delete = this.endpointFactory("delete");

  private endpointFactory<Method extends ApiEndpointMethods>(
    method: Method,
  ): <Path extends ApiEndpointKeys<FlatApi, Method>>(
    path: Path,
    handler: EndpointHandler<inferEndpoint<FlatApi, Path, Method>, ExtraArgs>,
  ) => ApiRouter<
    Api,
    FlatApi,
    ImplementedApiWithEndpoint<ImplementedApi, FlatApi, Path, Method>,
    ExtraArgs
  > {
    return (path, handler) => {
      const endpoint = this.def.flatApi.endpoints[path][method] as inferEndpoint<
        FlatApi,
        typeof path,
        Method
      >;
      const requestHandler = createEndpointHandler(endpoint, handler, this.middleware);
      this.actions.push((router) => router[method](path, requestHandler));
      return this;
    };
  }

  use<Path extends ApiRouteKeys<Api>>(
    path: Path,
    builderOrORouter: BuilderOrRouter<
      inferApi<inferRoute<Api, Path>>,
      inferFlatApi<inferRoute<Api, Path>>,
      ImplementedApiWithRoute<ImplementedApi, Api, Path>,
      ExtraArgs
    >,
  ): ApiRouter<Api, FlatApi, ImplementedApiWithRoute<ImplementedApi, Api, Path>, ExtraArgs> {
    const api = this.def.api.routes[path] as inferRoute<Api, Path>;
    const apiRouter =
      typeof builderOrORouter === "function"
        ? builderOrORouter(new ApiRouter(api, this.middleware))
        : builderOrORouter;
    this.actions.push((router) => router.use(path, apiRouter.applyTo(Router())));
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
  builder: Builder<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>, {}>,
): ApiRouter<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>, {}>;
export function implementApi<
  Def extends ApiDefinition<any, any>,
  ExtraArgs extends Record<string, any>,
>(
  api: Def,
  middleware: Middleware<ExtraArgs>,
  builder: Builder<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>, ExtraArgs>,
): ApiRouter<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>, ExtraArgs>;
export function implementApi<
  Def extends ApiDefinition<any, any>,
  ExtraArgs extends Record<string, any>,
>(
  api: Def,
  middlewareOrBuilder:
    | Middleware<ExtraArgs>
    | Builder<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>, ExtraArgs>,
  builderOrUndefined?: Builder<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>, ExtraArgs>,
): ApiRouter<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>, ExtraArgs> {
  let middleware: Middleware<ExtraArgs> | undefined;
  let builder: Builder<inferApi<Def>, inferFlatApi<Def>, inferFlatApi<Def>, ExtraArgs>;
  if (!builderOrUndefined) {
    builder = middlewareOrBuilder as Builder<
      inferApi<Def>,
      inferFlatApi<Def>,
      inferFlatApi<Def>,
      ExtraArgs
    >;
    middleware = undefined;
  } else {
    builder = builderOrUndefined;
    middleware = middlewareOrBuilder as Middleware<ExtraArgs>;
  }
  return builder(new ApiRouter(api, middleware));
}

