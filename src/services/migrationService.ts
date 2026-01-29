/**
 * Migration utility to move data from Firebase to Supabase
 * This should be run once before switching to Supabase
 * Updated schema: Uses normalized tables (state, district, village) and people_relations table
 * 
 * NOTE: Firebase IDs are not UUIDs, so we generate new UUIDs and maintain a mapping
 */

// NOTE: Firebase to Supabase migration is complete.

export const MigrationService = {
  /**
   * Migrate all states from Firebase to Supabase
   * DEPRECATED: Migration is complete.
   */
  async migrateStates(): Promise<{ success: number; failed: number }> {
    console.warn('migrateStates is deprecated - Firebase to Supabase migration is complete.');
    return { success: 0, failed: 0 };
  },

  /**
   * Migrate all villages from Firebase to Supabase
   * DEPRECATED: Migration is complete.
   */
  async migrateVillages(): Promise<{ success: number; failed: number }> {
    console.warn('migrateVillages is deprecated - Firebase to Supabase migration is complete.');
    return { success: 0, failed: 0 };
  },

  /**
   * Migrate all trees from Firebase to Supabase
   * DEPRECATED: Migration is complete.
   */
  async migrateTrees(): Promise<{ success: number; failed: number }> {
    console.warn('migrateTrees is deprecated - Firebase to Supabase migration is complete.');
    return { success: 0, failed: 0 };
  },

  /**
   * Migrate all people from Firebase to Supabase
   * DEPRECATED: Migration is complete.
   */
  async migratePeople(): Promise<{ success: number; failed: number }> {
    console.warn('migratePeople is deprecated - Firebase to Supabase migration is complete.');
    return { success: 0, failed: 0 };
  },

  /**
   * Migrate all relationships from Firebase to Supabase
   * DEPRECATED: Migration is complete.
   */
  async migrateRelationships(): Promise<{ success: number; failed: number }> {
    console.warn('migrateRelationships is deprecated - Firebase to Supabase migration is complete.');
    return { success: 0, failed: 0 };
  },

  /**
   * Migrate all businesses from Firebase to Supabase
   * DEPRECATED: Migration is complete.
   */
  async migrateBusinesses(): Promise<{ success: number; failed: number }> {
    console.warn('migrateBusinesses is deprecated - Firebase to Supabase migration is complete.');
    return { success: 0, failed: 0 };
  },

  /**
   * Migrate all business categories from Firebase to Supabase
   * DEPRECATED: Migration is complete.
   */
  async migrateBusinessCategories(): Promise<{ success: number; failed: number }> {
    console.warn('migrateBusinessCategories is deprecated - Firebase to Supabase migration is complete.');
    return { success: 0, failed: 0 };
  },

  /**
   * Run all migrations
   * DEPRECATED: Migration is complete.
   */
  async runAllMigrations(): Promise<void> {
    console.warn('runAllMigrations is deprecated - Firebase to Supabase migration is complete.');
    return Promise.resolve();
  },

  /**
   * Attempt to migrate from Firebase collection to Supabase table
   * DEPRECATED: Migration is complete.
   */
  async migrateFromFirestore(
    fbCollection: string,
    sbTable: string
  ): Promise<{ success: number; failed: number }> {
    console.warn(`migrateFromFirestore is deprecated - Firebase to Supabase migration is complete.`);
    return { success: 0, failed: 0 };
  },

  /**
   * Clear the ID mappings (useful between test runs)
   */
  clearMappings(): void {
    // No-op - ID mappings are no longer used
  },

  /**
   * Get the ID mappings
   */
  getIdMappings() {
    return {
      villages: new Map(),
      trees: new Map(),
      people: new Map(),
    };
  },
};
