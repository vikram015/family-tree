/**
 * Hierarchy Migration Utility
 * 
 * This file provides utilities to migrate existing data in Firestore
 * by populating the hierarchy field for all nodes.
 * 
 * To run the migration:
 * 1. Import this module in your component
 * 2. Call runHierarchyMigration(treeId) when needed
 */

/**
 * Run hierarchy migration for a specific tree
 * This populates the hierarchy field, name_lowercase, villageId, and villageName for all nodes in the tree
 * 
 * DEPRECATED: Firebase migration is complete. Use Supabase directly.
 */
export const runHierarchyMigration = async (treeId: string): Promise<void> => {
  console.warn('runHierarchyMigration is deprecated - Firebase migration is complete. Use Supabase directly.');
  return Promise.resolve();
};

/**
 * Run hierarchy migration for all trees
 * DEPRECATED: Firebase migration is complete. Use Supabase directly.
 */
export const runHierarchyMigrationForAllTrees = async (): Promise<void> => {
  console.warn('runHierarchyMigrationForAllTrees is deprecated - Firebase migration is complete. Use Supabase directly.');
  return Promise.resolve();
};
