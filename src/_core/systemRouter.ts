import { router, publicProcedure } from "./trpc";

export const systemRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    version: "1.0.0",
  })),
});
