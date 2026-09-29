import { env } from "@mon/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Points at the compiled output rather than src: drizzle-kit transpiles to
  // CommonJS, where the explicit ".js" specifiers that NodeNext ESM requires
  // cannot be resolved. `pnpm generate` builds first, so this stays in sync.
  schema: "./dist/schema/index.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  strict: true,
  verbose: true,
});
