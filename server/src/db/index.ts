import { config } from '../config';
import { IDatabase } from './types';
import { MemoryDatabase } from './memoryStore';
import { MongoDatabase } from './mongoClient';

let dbInstance: IDatabase | null = null;

export function getDatabase(): IDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  if (config.hasMongo) {
    console.log('[Database] Initializing MongoDB database adapter...');
    dbInstance = new MongoDatabase(config.mongoUri!);
  } else {
    console.log('[Database] MongoDB URI not provided. Using in-memory transactional database store (pre-seeded with AI Challenge Arena).');
    dbInstance = new MemoryDatabase();
  }

  return dbInstance;
}

export function resetDatabaseForTesting(): void {
  dbInstance = new MemoryDatabase();
}

export * from './types';
export * from './seedData';
