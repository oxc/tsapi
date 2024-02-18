import { EndpointArgs } from "./index.js";

export type Middleware<ExtraArgs extends Record<string, any>> = (
  args: EndpointArgs<any>,
) => PromiseLike<ExtraArgs>;

export function middleware<A1 extends Record<string, any>, A2 extends Record<string, any>, A3 extends Record<string, any>, A4 extends Record<string, any>>(
  middleware1: Middleware<A1>,
  middleware2: Middleware<A2>,
  middleware3: Middleware<A3>,
  middleware4: Middleware<A4>,
): Middleware<A1 & A2 & A3 & A4>;
export function middleware<A1 extends Record<string, any>, A2 extends Record<string, any>, A3 extends Record<string, any>>(
  middleware1: Middleware<A1>,
  middleware2: Middleware<A2>,
  middleware3: Middleware<A3>,
): Middleware<A1 & A2 & A3>;
export function middleware<A1 extends Record<string, any>, A2 extends Record<string, any>>(
  middleware1: Middleware<A1>,
  middleware2: Middleware<A2>,
): Middleware<A1 & A2>;
export function middleware(...middlewares: Middleware<any>[]): Middleware<any> {
  return async (...args) => Object.assign({}, ...(await Promise.all(
    middlewares.map((middleware) => middleware(...args)),
  )));
}
