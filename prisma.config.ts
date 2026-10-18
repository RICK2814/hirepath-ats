import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // generate never connects, so a placeholder keeps `npm install` working without a database
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
    // `prisma migrate dev` replays every migration (incl. CREATE EXTENSION pg_trgm) in a scratch DB.
    // Set SHADOW_DATABASE_URL to an empty DB where that is allowed; unset = Prisma creates a temporary one.
    ...(process.env.SHADOW_DATABASE_URL ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL } : {}),
  },
});
