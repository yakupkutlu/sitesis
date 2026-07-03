import { type NextFunction, type Request, type Response } from "express";

type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler(handler: AsyncRouteHandler) {
  return (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}