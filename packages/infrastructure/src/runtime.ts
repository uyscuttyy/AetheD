import { PrismaClient } from "@prisma/client";
import { InMemoryCommerceRepository, InMemoryDatasetRepository, type CommerceRepository, type DatasetRepository } from "../../domain/src/index.js";
import { PrismaDatasetRepository } from "./prisma-dataset-repository.js";
import { PrismaCommerceRepository } from "./prisma-commerce-repository.js";

let prismaClient: PrismaClient | undefined;

export type RuntimePersistence = {
  repository: DatasetRepository;
  commerceRepository: CommerceRepository;
  provider: "memory" | "postgresql";
  close: () => Promise<void>;
};

export function createRuntimePersistence(input: { provider: "memory" | "postgresql"; databaseUrl?: string | undefined }): RuntimePersistence {
  if (input.provider === "memory") return { repository: new InMemoryDatasetRepository(), commerceRepository: new InMemoryCommerceRepository(), provider: "memory", close: async () => undefined };
  if (!input.databaseUrl) throw new Error("DATABASE_URL is required when PERSISTENCE_PROVIDER=postgresql");
  prismaClient ??= new PrismaClient({ datasources: { db: { url: input.databaseUrl } } });
  return {
    repository: new PrismaDatasetRepository(prismaClient),
    commerceRepository: new PrismaCommerceRepository(prismaClient),
    provider: "postgresql",
    close: async () => {
      if (prismaClient) await prismaClient.$disconnect();
      prismaClient = undefined;
    }
  };
}
