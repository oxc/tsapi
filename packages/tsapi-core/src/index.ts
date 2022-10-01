/* eslint-disable @typescript-eslint/no-explicit-any */
import { inferApi, inferFlatApi } from "./infer.js";
import { z, ZodObject } from "zod";

type ParamsDefinition = z.AnyZodObject;
type QueryDefinition = z.AnyZodObject;
type BodyDefinition = z.AnyZodObject;
type OutputDefinition = z.AnyZodObject;

type MergedParams<
  Params1 extends ParamsDefinition,
  Params2 extends ParamsDefinition
> = z.ZodObject<
  z.extendShape<Params1["_shape"], Params2["_shape"]>,
  Params1["_unknownKeys"],
  Params1["_catchall"]
>;

export type RouteOptions = {
  params?: ParamsDefinition;
};
export type ApiEndpointMethods = "get" | "post" | "put" | "patch" | "delete";
export type ApiEndpointOptions = {
  params?: ParamsDefinition;
  query?: QueryDefinition;
  body?: BodyDefinition;
  output?: OutputDefinition;
};

type PathType = string;

type ApiElement = ApiEndpoint<any> | ApiDefinition<any, any>;

type RoutesType = {
  [P in PathType]: ApiDefinition<any, any>;
};
type EndpointType = {
  [M in ApiEndpointMethods]?: ApiEndpoint<any>;
};
type EndpointsType = {
  [Path in PathType]: EndpointType;
};
export type ApiType = {
  routes: RoutesType;
  endpoints: EndpointsType;
};
export const EmptyApi = {
  routes: {},
  endpoints: {},
} as const;
export type EmptyApiType = typeof EmptyApi;

export type ApiWithEndpoint<
  Api extends ApiType,
  Path extends PathType,
  Method extends ApiEndpointMethods,
  Endpoint extends ApiEndpoint<any>
> = Omit<Api, "endpoints"> & {
  endpoints: Omit<Api["endpoints"], Path> & {
    [P in Path]: Omit<Api["endpoints"][Path], Method> & {
      [M in Method]: Endpoint;
    };
  };
};
export type ApiWithRoute<
  Api extends ApiType,
  Path extends PathType,
  Route extends ApiDefinition<any, any>
> = Omit<Api, "routes"> & {
  routes: Omit<Api["routes"], Path> & {
    [P in Path]: Route;
  };
};

type PrefixedEndpoints<FlatApi extends ApiType, Path extends PathType> = {
  [P in keyof FlatApi["endpoints"] as `${Path}${P &
    PathType}`]: FlatApi["endpoints"][P];
};

export type FlatApiWithRoute<
  FlatApi extends ApiType,
  Path extends PathType,
  FlatRoute extends ApiType
> = Omit<FlatApi, "endpoints"> & {
  endpoints: FlatApi["endpoints"] & PrefixedEndpoints<FlatRoute, Path>;
};

type Defined<T> = T extends undefined ? never : T;

type MergedOptions<
  Options extends RouteOptions,
  EndpointOptions extends ApiEndpointOptions
> = Omit<EndpointOptions, "params"> & {
  params: [EndpointOptions["params"], Options["params"]] extends [
    undefined,
    undefined
  ]
    ? undefined
    : Options["params"] extends undefined
    ? EndpointOptions["params"]
    : EndpointOptions["params"] extends undefined
    ? Options["params"]
    : MergedParams<
        Defined<Options["params"]>,
        Defined<EndpointOptions["params"]>
      >;
};

type EndpointWithMergedOptions<
  Endpoint extends ApiEndpoint<any>,
  Options extends RouteOptions
> = Omit<Endpoint, "options"> & {
  options: MergedOptions<Options, Endpoint["options"]>;
};

type RoutesWithOptions<
  Routes extends RoutesType,
  Options extends RouteOptions
> = {
  [P in keyof Routes]: ApiDefinition<
    ApiWithOptions<inferApi<Routes[P]>, Options>,
    ApiWithOptions<inferFlatApi<Routes[P]>, Options>
  >;
};
type EndpointsWithOptions<
  Endpoints extends EndpointsType,
  Options extends RouteOptions
> = {
  [Path in keyof Endpoints]: {
    [Method in keyof Endpoints[Path]]: EndpointWithMergedOptions<
      Endpoints[Path][Method] & ApiEndpoint<any>,
      Options
    >;
  };
};
type ApiWithOptions<Api extends ApiType, Options extends RouteOptions> = Omit<
  Api,
  "routes" | "endpoints"
> & {
  routes: RoutesWithOptions<Api["routes"], Options>;
  endpoints: EndpointsWithOptions<Api["endpoints"], Options>;
};

export type ApiEndpointKeys<
  Api extends ApiType,
  Method extends ApiEndpointMethods = any
> = {
  [E in keyof Api["endpoints"]]: Api["endpoints"][E] extends {
    [M in Method]: ApiEndpoint<any>;
  }
    ? E
    : never;
}[keyof Api["endpoints"] & string];
export type ApiRouteKeys<Api extends ApiType> = keyof Api["routes"] & string;

type BuilderOrDefinition<Api extends ApiType, FlatApi extends ApiType> =
  | ApiDefinition<Api, FlatApi>
  | ((
      api: ApiDefinition<EmptyApiType, EmptyApiType>
    ) => ApiDefinition<Api, FlatApi>);

function mergeParams<P1 extends ParamsDefinition, P2 extends ParamsDefinition>(
  params1: P1,
  params2: P2
): MergedParams<P1, P2> {
  return params1.merge(params2) as MergedParams<P1, P2>;
}

abstract class BaseApiElement {
  abstract mergeOptions<Options extends RouteOptions>(
    options: Options
  ): ApiElement;
}

export class ApiEndpoint<
  Options extends ApiEndpointOptions
> extends BaseApiElement {
  readonly type = "endpoint";

  constructor(readonly options: Options) {
    super();
    Object.freeze(options);
  }

  override mergeOptions<Opts extends RouteOptions>(
    options: Opts
  ): ApiEndpoint<MergedOptions<Opts, Options>> {
    if (!options.params) {
      return this as unknown as ApiEndpoint<MergedOptions<Opts, Options>>;
    }
    const mergedParams = this.options.params
      ? mergeParams(options.params, this.options.params)
      : options.params;
    const mergedOptions = {
      ...this.options,
      params: mergedParams,
    } as unknown as MergedOptions<Opts, Options>;
    return new ApiEndpoint(mergedOptions);
  }

  dumpObj(): any {
    const dumpZod = (zod: z.AnyZodObject): any =>
      Object.entries(zod.shape).reduce((acc, [key, def]) => {
        acc[key] = (def as any)._def.typeName;
        return acc;
      }, {} as any);

    const result: any = {};
    Object.keys(this.options).forEach((key) => {
      const value = this.options[key as keyof Options];
      if (value && value instanceof ZodObject) {
        result[key] = dumpZod(value);
      }
    });
    return result;
  }
}

export class ApiDefinition<
  Api extends ApiType,
  FlatApi extends ApiType
> extends BaseApiElement {
  readonly type = "route";

  private constructor(readonly api: Api, readonly flatApi: FlatApi) {
    super();
    Object.freeze(api);
    Object.freeze(flatApi);
  }

  get = this.endpointFactory("get");

  post = this.endpointFactory("post");

  put = this.endpointFactory("put");

  patch = this.endpointFactory("patch");

  delete = this.endpointFactory("delete");

  private endpointFactory<Method extends ApiEndpointMethods>(
    method: Method
  ): <Path extends string, EP extends ApiEndpointOptions>(
    path: Path,
    options: EP
  ) => ApiDefinition<
    ApiWithEndpoint<Api, Path, Method, ApiEndpoint<EP>>,
    ApiWithEndpoint<FlatApi, Path, Method, ApiEndpoint<EP>>
  > {
    return (path, options) => {
      const apiEndpoint = new ApiEndpoint(options);
      const apiWithEndpoint = <A extends ApiType>(api: A) => {
        const { endpoints, ...otherProps } = api;
        const { [path]: endpoint = {}, ...otherEndpoints } = endpoints;
        const { [method]: existingEndpoint, ...otherMethods } = endpoint;
        return {
          ...otherProps,
          endpoints: {
            ...otherEndpoints,
            [path]: {
              ...otherMethods,
              [method]: apiEndpoint,
            },
          },
        } as ApiWithEndpoint<A, typeof path, Method, typeof apiEndpoint>;
      };

      return new ApiDefinition(
        apiWithEndpoint(this.api),
        apiWithEndpoint(this.flatApi)
      );
    };
  }

  route<
    Path extends PathType,
    Route extends ApiType,
    FlatRoute extends ApiType
  >(
    path: Path,
    api: BuilderOrDefinition<Route, FlatRoute>
  ): ApiDefinition<
    ApiWithRoute<Api, Path, ApiDefinition<Route, FlatRoute>>,
    FlatApiWithRoute<FlatApi, Path, FlatRoute>
  > {
    const route = typeof api === "function" ? api(defineApi()) : api;

    return this.extendApiWithRoute(path, route);
  }

  routeWithParams<
    Path extends PathType,
    Params extends RouteOptions,
    Route extends ApiType,
    FlatRoute extends ApiType
  >(
    path: Path,
    options: Params,
    api: BuilderOrDefinition<Route, FlatRoute>
  ): ApiDefinition<
    ApiWithRoute<
      Api,
      Path,
      ApiDefinition<
        ApiWithOptions<Route, Params>,
        ApiWithOptions<FlatRoute, Params>
      >
    >,
    FlatApiWithRoute<FlatApi, Path, ApiWithOptions<FlatRoute, Params>>
  > {
    const subApi = typeof api === "function" ? api(defineApi()) : api;
    const routeWithOptions = subApi.mergeOptions(options);

    return this.extendApiWithRoute(path, routeWithOptions);
  }

  private extendApiWithRoute<
    Path extends PathType,
    Route extends ApiType,
    FlatRoute extends ApiType,
    RouteDefinition extends ApiDefinition<Route, FlatRoute>
  >(
    path: Path,
    route: RouteDefinition
  ): ApiDefinition<
    ApiWithRoute<Api, Path, RouteDefinition>,
    FlatApiWithRoute<FlatApi, Path, FlatRoute>
  > {
    const api = {
      ...this.api,
      routes: {
        ...this.api.routes,
        [path]: route,
      },
    } as unknown as ApiWithRoute<Api, Path, RouteDefinition>;
    const flatApi = {
      ...this.flatApi,
      endpoints: {
        ...this.flatApi.endpoints,
        ...ApiDefinition.reduce(
          route.flatApi.endpoints,
          (prefixedApi, element, endpointName) => ({
            ...prefixedApi,
            [`${path}${endpointName}`]: element,
          }),
          {} as PrefixedEndpoints<FlatRoute, Path>
        ),
      },
    } as FlatApiWithRoute<FlatApi, Path, FlatRoute>;
    return new ApiDefinition(api, flatApi);
  }

  private static reduce<V, I extends Record<PathType, V>, O>(
    elementsByPath: I,
    reducer: (acc: O, element: V, path: keyof I) => O,
    initial: O
  ): O {
    return Object.keys(elementsByPath).reduce((acc, path) => {
      const element = elementsByPath[path];
      return reducer(acc, element, path);
    }, initial);
  }

  override mergeOptions<Options extends RouteOptions>(
    options: Options
  ): ApiDefinition<
    ApiWithOptions<Api, Options>,
    ApiWithOptions<FlatApi, Options>
  > {
    const reduceEndpoints = <E extends EndpointsType>(endpoints: E) =>
      ApiDefinition.reduce(
        endpoints,
        (
          endpointsWithOptions: EndpointsWithOptions<E, Options>,
          methodEndpoints: EndpointType,
          path: keyof E
        ) => ({
          ...endpointsWithOptions,
          [path]: ApiDefinition.reduce(
            methodEndpoints,
            (acc, endpoint: ApiEndpoint<any>, method) => ({
              ...acc,
              [method]: endpoint.mergeOptions(options),
            }),
            {} as EndpointType
          ),
        }),
        {} as EndpointsWithOptions<E, Options>
      );
    const api = {
      ...this.api,
      routes: ApiDefinition.reduce(
        this.api.routes,
        (routesWithOptions, routes: ApiDefinition<any, any>, path) => ({
          ...routesWithOptions,
          [path]: routes.mergeOptions(options),
        }),
        {} as RoutesWithOptions<Api["routes"], Options>
      ),
      endpoints: reduceEndpoints(this.api.endpoints),
    } as ApiWithOptions<Api, Options>;
    const flatApi = {
      ...this.flatApi,
      endpoints: reduceEndpoints(this.flatApi.endpoints),
    } as ApiWithOptions<FlatApi, Options>;
    return new ApiDefinition(api, flatApi);
  }

  flatten(): ApiDefinition<FlatApi, FlatApi> {
    return new ApiDefinition(this.flatApi, this.flatApi);
  }

  dumpObj(flat = false): any {
    const api = flat ? this.flatApi : this.api;
    return [...Object.keys(api.routes), ...Object.keys(api.endpoints)]
      .sort()
      .reduce((r, endpointName) => {
        const element = api.routes[endpointName] || api.endpoints[endpointName];
        r[endpointName] = element.dumpObj(flat);
        return r;
      }, {} as any);
  }

  dump(flat = false): string {
    return JSON.stringify(this.dumpObj(flat), null, 2);
  }

  static empty(): ApiDefinition<EmptyApiType, EmptyApiType> {
    return new ApiDefinition(EmptyApi, EmptyApi);
  }
}

export function defineApi(): ApiDefinition<EmptyApiType, EmptyApiType> {
  return ApiDefinition.empty();
}
