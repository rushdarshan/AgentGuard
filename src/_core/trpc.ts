import { initTRPC, TRPCError } from "@trpc/server";
import type { Request, Response } from "express";

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

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export type { User };
