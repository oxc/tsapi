import e from "express";

const SKIP_RESPONSE = Symbol();

export class EndpointResult<T> {
  private constructor(
    private readonly status: number | undefined,
    private readonly body: T | undefined,
  ) {
  }

  sendTo(res: e.Response): void {
    if (this.status !== undefined) {
      res.status(this.status);
    }
    if (this.body !== SKIP_RESPONSE) {
      res.json(this.body);
    }
  }

  static sendTo(res: e.Response, value: unknown): void {
    const result = value instanceof EndpointResult ? value : EndpointResult.ok(value);
    result.sendTo(res);
  }

  static ok<T>(body: T): EndpointResult<T> {
    return new EndpointResult<T>(200, body);
  }

  static created<T>(body: T): EndpointResult<T> {
    return new EndpointResult<T>(201, body);
  }

  static noContent(): EndpointResult<void> {
    return new EndpointResult<undefined>(204, undefined);
  }

  static notFound(): EndpointResult<void> {
    return new EndpointResult<undefined>(404, undefined);
  }

  static status<T>(status: number, body: T): EndpointResult<T> {
    return new EndpointResult<T>(status, body);
  }

  static skipResponse(): EndpointResult<void> {
    return new EndpointResult(undefined, SKIP_RESPONSE) as EndpointResult<void>;
  }
}
