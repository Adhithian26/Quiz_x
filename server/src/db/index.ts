import { config } from '../config';
import { IDatabase } from './types';
import { MemoryDatabase } from './memoryStore';
import { SupabaseDatabase } from './supabaseClient';
import { MongoDatabase } from './mongoClient';

let dbInstance: IDatabase | null = null;

export function getDatabase(): IDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  if (config.hasMongo) {
    console.log('[Database] Initializing MongoDB database adapter...');
    dbInstance = new MongoDatabase(config.mongoUri!);
  } else if (config.hasSupabase) {
    console.log('[Database] Initializing Supabase PostgreSQL client at:', config.supabaseUrl);
    dbInstance = new SupabaseDatabase(config.supabaseUrl!, config.supabaseServiceRoleKey!);
  } else {
    console.log('[Database] Database credentials not provided. Using in-memory transactional database store (pre-seeded with AI Challenge Arena).');
    dbInstance = new MemoryDatabase();
  }

  return dbInstance;
}

export function resetDatabaseForTesting(): void {
  dbInstance = new MemoryDatabase();
}

export * from './types';
export * from './seedData';
