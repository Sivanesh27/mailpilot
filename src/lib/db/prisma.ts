import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getSanitizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // Strip whitespace and accidental surrounding quotes from dashboard copy-paste
  url = url.trim().replace(/^["']|["']$/g, '').trim();
  return url;
}

const sanitizedUrl = getSanitizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: sanitizedUrl ? { db: { url: sanitizedUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
