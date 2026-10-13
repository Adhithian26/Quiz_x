import { config } from '../config';
import { IDatabase } from './types';
import { MemoryDatabase } from './memoryStore';
import { SupabaseDatabase } from './supabaseClient';

let dbInstance: IDatabase | null = null;

export function getDatabase(): IDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  if (config.hasSupabase) {
    console.log('[Database] Initializing Supabase PostgreSQL client at:', config.supabaseUrl);
    dbInstance = new SupabaseDatabase(config.supabaseUrl!, config.supabaseServiceRoleKey!);
  } else {
    console.log('[Database] Supabase credentials not provided. Using in-memory transactional database store (pre-seeded with AI Challenge Arena).');
    dbInstance = new MemoryDatabase();
  }

  return dbInstance;
}

export function resetDatabaseForTesting(): void {
  dbInstance = new MemoryDatabase();
}

export * from './types';
export * from './seedData';
