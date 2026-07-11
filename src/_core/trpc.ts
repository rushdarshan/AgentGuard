import { initTRPC, TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import { log } from "./logger";

interface User {
  id: number;
  openId: string;
  name?: string | null;
  email?: string | null;
  role: "user" | "admin";
}

export interface Context {
  user?: User;
  req: Request;
  res: Response;
}

const t = initTRPC.context<Context>().create();

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  if (path !== "system.logs") { // Avoid spamming the logs page polling
    if (result.ok) {
      log.info(`[trpc] ${type} ${path}`, { durationMs });
    } else {
      log.error(`[trpc] ${type} ${path}`, { durationMs, error: result.error.message });
    }
  }
  return result;
});

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const router = t.router;
export const publicProcedure = t.procedure.use(loggerMiddleware);
export const protectedProcedure = t.procedure.use(loggerMiddleware).use(isAuthenticated);
export type { User };
