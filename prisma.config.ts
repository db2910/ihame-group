import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // This installed Prisma version's config type has no separate
    // `directUrl` — only one datasource.url. So: the CLI (migrate,
    // introspect, studio) uses the *direct*, non-pooled connection here,
    // while the running app uses the *pooled* DATABASE_URL exclusively via
    // the driver adapter in src/lib/db.ts. pgbouncer's transaction pooling
    // mode doesn't support the session-level features migrations need,
    // which is exactly why these two need to differ.
    url: env("DIRECT_URL"),
  },
});
