declare module 'express-slow-down' {
  import { Request, Response, NextFunction, RequestHandler } from 'express';

  export interface SlowDownOptions {
    windowMs?: number;
    delayAfter?: number;
    delayMs?: number | ((hits: number) => number);
    maxDelayMs?: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    handler?: (req: Request, res: Response, next: NextFunction) => void;
    skip?: (req: Request) => boolean;
  }

  export interface SlowDownRequestHandler extends RequestHandler {
    (req: Request, res: Response, next: NextFunction): void;
  }

  export default function slowDown(options?: SlowDownOptions): SlowDownRequestHandler;
}
