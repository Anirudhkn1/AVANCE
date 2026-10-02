import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Reads only: re-running one is always harmless. Writes are never retried —
// a write interrupted mid-flight may already have been applied.
const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

// Dropped / refused connections — common on a flaky network (e.g. a phone
// hotspot resetting idle sockets, or the session pooler briefly at its
// client cap while it times out connections the network silently dropped).
// P1001 can't reach server, P1002 timed out, P1017 server closed the
// connection, P2024 timed out waiting for a pooled connection.
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1017", "P2024"]);
const TRANSIENT_MESSAGE = /EMAXCONNSESSION|max clients reached|ConnectionReset|forcibly closed|connection reset|closed the connection/i;
const RETRY_DELAYS_MS = [250, 1000];

function isTransient(error: unknown) {
  const e = error as { code?: string; message?: string };
  return (e.code !== undefined && TRANSIENT_CODES.has(e.code)) || TRANSIENT_MESSAGE.test(e.message ?? "");
}

function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  // A query extension doesn't change any model types, so callers keep the
  // plain PrismaClient type (gamification.ts derives its Tx type from it).
  return base.$extends({
    query: {
      async $allOperations({ operation, args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (!READ_OPERATIONS.has(operation) || attempt >= RETRY_DELAYS_MS.length || !isTransient(error)) throw error;
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
          }
        }
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
