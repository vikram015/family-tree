import { db } from '../firebase';
import { supabase } from '../supabase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { FNode } from '../components/model/FNode';
import { v4 as uuidv4 } from 'uuid';

/**
 * Migration utility to move data from Firebase to Supabase
 * This should be run once before switching to Supabase
 * Updated schema: Uses normalized tables (state, district, village) and people_relations table
 * 
 * NOTE: Firebase IDs are not UUIDs, so we generate new UUIDs and maintain a mapping
 */

// Maps to store Firebase ID -> Supabase UUID conversions
const idMappings = {
  villages: new Map<string, string>(), // Firebase village ID -> Supabase UUID
  trees: new Map<string, string>(),    // Firebase tree ID -> Supabase UUID
  people: new Map<string, string>(),   // Firebase person ID -> Supabase UUID
};

export const MigrationService = {
  /**
   * Migrate all states from Firebase to Supabase
   */
  async migrateStates(): Promise<{ success: number; failed: number }> {
    console.log('Starting states migration...');
    let success = 0;
    let failed = 0;

    try {
      // Try to get unique states from villages data
      const villagesSnapshot = await getDocs(collection(db, 'villages'));
      const stateSet = new Set<string>();

      villagesSnapshot.docs.forEach((doc) => {
        const state = doc.data().state;
        if (state) stateSet.add(state);
      });

      for (const stateName of stateSet) {
        try {
          const stateData = {
            name: stateName,
            created_at: new Date(),
            modified_at: new Date(),
          };

          const { error } = await supabase
            .from('state')
            .insert([stateData]);

          if (error) {
            console.warn(`Failed to migrate state ${stateName}:`, error);
            failed++;
          } else {
            success++;
          }
        } catch (err) {
          console.error(`Error processing state ${stateName}:`, err);
          failed++;
        }
      }

      console.log(`States migration complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (err) {
      console.error('States migration error:', err);
      throw err;
    }
  },

  /**
   * Migrate all villages from Firebase to Supabase
   */
  async migrateVillages(): Promise<{ success: number; failed: number }> {
    console.log('Starting villages migration...');
    let success = 0;
    let failed = 0;

    try {
      const snapshot = await getDocs(collection(db, 'villages'));
      
      for (const docSnapshot of snapshot.docs) {
        try {
          // Get state_id by looking up state name
          const stateName = docSnapshot.data().state;
          let state_id = null;

          if (stateName) {
            const { data: stateData } = await supabase
              .from('state')
              .select('id')
              .eq('name', stateName)
              .single();
            state_id = stateData?.id || null;
          }

          // Generate new UUID for this village (Firebase ID is not a UUID)
          const newVillageId = uuidv4();
          
          // Store mapping of Firebase ID -> Supabase UUID
          idMappings.villages.set(docSnapshot.id, newVillageId);

          const villageData = {
            id: newVillageId,
            name: docSnapshot.data().name,
            district_id: state_id,
            created_at: new Date(),
            modified_at: new Date(),
          };

          const { error } = await supabase
            .from('village')
            .insert([villageData]);

          if (error) {
            console.warn(`Failed to migrate village ${docSnapshot.id}:`, error);
            failed++;
          } else {
            success++;
          }
        } catch (err) {
          console.error(`Error processing village ${docSnapshot.id}:`, err);
          failed++;
        }
      }

      console.log(`Villages migration complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (err) {
      console.error('Villages migration error:', err);
      throw err;
    }
  },

  /**
   * Migrate all trees from Firebase to Supabase
   */
  async migrateTrees(): Promise<{ success: number; failed: number }> {
    console.log('Starting trees migration...');
    let success = 0;
    let failed = 0;

    try {
      const snapshot = await getDocs(collection(db, 'tree'));
      console.log(`Found ${snapshot.docs.length} trees to migrate`);
      
      for (const docSnapshot of snapshot.docs) {
        try {
          // Get village_id from mapping (convert Firebase ID to Supabase UUID)
          const firebaseVillageId = docSnapshot.data().villageId;
          const village_id = firebaseVillageId ? idMappings.villages.get(firebaseVillageId) : null;

          if (firebaseVillageId && !village_id) {
            console.warn(`Tree ${docSnapshot.id} references unmapped village ${firebaseVillageId}. Village may not have been migrated.`);
          }

          // Generate new UUID for this tree
          const newTreeId = uuidv4();
          
          // Store mapping of Firebase ID -> Supabase UUID
          idMappings.trees.set(docSnapshot.id, newTreeId);

          const treeData = {
            id: newTreeId,
            name: docSnapshot.data().treeName,
            village_id: village_id || null,
            description: docSnapshot.data().description || null,
            caste: docSnapshot.data().caste || null,
            sub_caste: docSnapshot.data().sub_caste || null,
            created_by: docSnapshot.data().createdBy || null,
            created_at: docSnapshot.data().createdAt?.toDate?.() || new Date(),
            modified_at: docSnapshot.data().updatedAt?.toDate?.() || new Date(),
          };

          const { error } = await supabase
            .from('tree')
            .insert([treeData]);

          if (error) {
            console.warn(`Failed to migrate tree ${docSnapshot.id}:`, error);
            console.warn(`Tree data was:`, treeData);
            // Still store the mapping even if insert failed, so people can reference it
            failed++;
          } else {
            console.log(`✓ Migrated tree ${docSnapshot.id} → ${newTreeId}`);
            success++;
          }
        } catch (err) {
          console.error(`Error processing tree ${docSnapshot.id}:`, err);
          failed++;
        }
      }

      console.log(`Trees migration complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (err) {
      console.error('Trees migration error:', err);
      throw err;
    }
  },

  /**
   * Migrate all people from Firebase to Supabase
   * Note: Relationships are migrated separately after people are inserted
   */
  async migratePeople(): Promise<{ success: number; failed: number }> {
    console.log('Starting people migration...');
    let success = 0;
    let failed = 0;

    try {
      const snapshot = await getDocs(collection(db, 'people'));
      console.log(`Found ${snapshot.docs.length} people to migrate`);
      
      for (const docSnapshot of snapshot.docs) {
        try {
          const firebaseData = docSnapshot.data() as FNode;
          
          // Get tree_id from mapping (convert Firebase ID to Supabase UUID)
          const firebaseTreeId = firebaseData.treeId;
          const tree_id = firebaseTreeId ? idMappings.trees.get(firebaseTreeId) : null;

          if (!firebaseTreeId) {
            console.warn(`Person ${docSnapshot.id} (${firebaseData.name}) has no treeId, skipping`);
            failed++;
            continue;
          }

          if (!tree_id) {
            console.warn(`Person ${docSnapshot.id} (${firebaseData.name}) references unmapped tree ${firebaseTreeId}. Tree may not have been migrated.`);
            failed++;
            continue;
          }

          // Generate new UUID for this person
          const newPersonId = uuidv4();
          
          // Store mapping of Firebase ID -> Supabase UUID
          idMappings.people.set(docSnapshot.id, newPersonId);
          
          const personData = {
            id: newPersonId,
            name: firebaseData.name,
            gender: firebaseData.gender || null,
            dob: firebaseData.dob || null,
            tree_id: tree_id,
            created_at: new Date(),
            modified_at: new Date(),
          };

          const { error } = await supabase
            .from('people')
            .insert([personData]);

          if (error) {
            console.warn(`Failed to migrate person ${docSnapshot.id} (${firebaseData.name}):`, error);
            console.warn(`Person data was:`, personData);
            failed++;
          } else {
            console.log(`✓ Migrated person ${docSnapshot.id} (${firebaseData.name}) → ${newPersonId}`);
            success++;
          }
        } catch (err) {
          console.error(`Error processing person ${docSnapshot.id}:`, err);
          failed++;
        }
      }

      console.log(`People migration complete: ${success} success, ${failed} failed`);
      console.log(`People ID mappings: ${idMappings.people.size} mappings created`);
      return { success, failed };
    } catch (err) {
      console.error('People migration error:', err);
      throw err;
    }
  },

  /**
   * Migrate all relationships from Firebase to Supabase
   * This runs after people are migrated
   */
  async migrateRelationships(): Promise<{ success: number; failed: number }> {
    console.log('Starting relationships migration...');
    let success = 0;
    let failed = 0;

    try {
      const snapshot = await getDocs(collection(db, 'people'));
      
      for (const docSnapshot of snapshot.docs) {
        try {
          const firebaseData = docSnapshot.data() as FNode;
          
          // Get mapped person ID from Firebase ID
          const personId = idMappings.people.get(docSnapshot.id);
          if (!personId) {
            console.warn(`No mapped person ID for Firebase ID ${docSnapshot.id}`);
            continue;
          }

          // Migrate parent relationships
          if (firebaseData.parents && Array.isArray(firebaseData.parents)) {
            for (const parent of firebaseData.parents) {
              if (parent.id) {
                // Get mapped parent ID from Firebase ID
                const parentPersonId = idMappings.people.get(parent.id);
                if (!parentPersonId) {
                  console.warn(`No mapped person ID for parent Firebase ID ${parent.id}`);
                  continue;
                }

                try {
                  const relationData = {
                    person_id: personId,
                    related_person_id: parentPersonId,
                    relation_type: 'parent',
                    created_at: new Date(),
                    modified_at: new Date(),
                  };

                  const { error } = await supabase
                    .from('people_relations')
                    .insert([relationData]);

                  if (!error) {
                    success++;
                  } else {
                    failed++;
                  }
                } catch (err) {
                  failed++;
                }
              }
            }
          }

          // Migrate spouse relationships
          if (firebaseData.spouses && Array.isArray(firebaseData.spouses)) {
            for (const spouse of firebaseData.spouses) {
              if (spouse.id) {
                // Get mapped spouse ID from Firebase ID
                const spousePersonId = idMappings.people.get(spouse.id);
                if (!spousePersonId) {
                  console.warn(`No mapped person ID for spouse Firebase ID ${spouse.id}`);
                  continue;
                }

                try {
                  const relationData = {
                    person_id: personId,
                    related_person_id: spousePersonId,
                    relation_type: 'spouse',
                    created_at: new Date(),
                    modified_at: new Date(),
                  };

                  const { error } = await supabase
                    .from('people_relations')
                    .insert([relationData]);

                  if (!error) {
                    success++;
                  } else {
                    failed++;
                  }
                } catch (err) {
                  failed++;
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error processing relationships for person ${docSnapshot.id}:`, err);
        }
      }

      console.log(`Relationships migration complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (err) {
      console.error('Relationships migration error:', err);
      throw err;
    }
  },

  /**
   * Migrate all businesses from Firebase to Supabase
   */
  async migrateBusinesses(): Promise<{ success: number; failed: number }> {
    console.log('Starting businesses migration...');
    let success = 0;
    let failed = 0;

    try {
      const snapshot = await getDocs(collection(db, 'businesses'));
      
      for (const docSnapshot of snapshot.docs) {
        try {
          const firebaseData = docSnapshot.data();
          
          // Get mapped people_id from Firebase owner ID
          const firebaseOwnerId = firebaseData.ownerId;
          const people_id = firebaseOwnerId ? idMappings.people.get(firebaseOwnerId) : null;
          
          const businessData = {
            id: uuidv4(), // Generate new UUID for business
            name: firebaseData.name,
            category: firebaseData.category || null,
            description: firebaseData.description || null,
            people_id: people_id || null,
            created_at: firebaseData.created_at?.toDate?.() || new Date(),
            modified_at: firebaseData.updated_at?.toDate?.() || new Date(),
          };

          const { error } = await supabase
            .from('business')
            .insert([businessData]);

          if (error) {
            console.warn(`Failed to migrate business ${docSnapshot.id}:`, error);
            failed++;
          } else {
            success++;
          }
        } catch (err) {
          console.error(`Error processing business ${docSnapshot.id}:`, err);
          failed++;
        }
      }

      console.log(`Businesses migration complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (err) {
      console.error('Businesses migration error:', err);
      throw err;
    }
  },

  /**
   * Migrate all business categories from Firebase to Supabase
   */
  async migrateBusinessCategories(): Promise<{ success: number; failed: number }> {
    console.log('Starting business categories migration...');
    let success = 0;
    let failed = 0;

    try {
      const snapshot = await getDocs(collection(db, 'businessCategories'));
      
      for (const docSnapshot of snapshot.docs) {
        try {
          const categoryData = {
            id: docSnapshot.id,
            name: docSnapshot.data().name,
            description: docSnapshot.data().description || null,
            created_at: new Date(),
          };

          const { error } = await supabase
            .from('business_categories')
            .insert([categoryData]);

          if (error) {
            console.warn(`Failed to migrate category ${docSnapshot.id}:`, error);
            failed++;
          } else {
            success++;
          }
        } catch (err) {
          console.error(`Error processing category ${docSnapshot.id}:`, err);
          failed++;
        }
      }

      console.log(`Business categories migration complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (err) {
      console.error('Business categories migration error:', err);
      throw err;
    }
  },

  /**
   * Run full migration in the correct order
   */
  async runFullMigration() {
    console.log('='.repeat(50));
    console.log('STARTING FULL FIREBASE TO SUPABASE MIGRATION');
    console.log('='.repeat(50));

    const results: Record<string, { success: number; failed: number }> = {};

    try {
      // Migrate states first (no dependencies)
      results.states = await this.migrateStates();
      console.log(`📊 ID Mappings after states: Villages=${idMappings.villages.size}`);
      console.log('');

      // Migrate villages (depends on states)
      results.villages = await this.migrateVillages();
      console.log(`📊 ID Mappings after villages: Villages=${idMappings.villages.size}`);
      console.log('');

      // Migrate trees (depends on villages)
      results.trees = await this.migrateTrees();
      console.log(`📊 ID Mappings after trees: Villages=${idMappings.villages.size}, Trees=${idMappings.trees.size}`);
      console.log('');

      // Migrate business categories (no dependencies)
      results.businessCategories = await this.migrateBusinessCategories();
      console.log('');

      // Migrate people (depends on trees)
      results.people = await this.migratePeople();
      console.log(`📊 ID Mappings after people: Villages=${idMappings.villages.size}, Trees=${idMappings.trees.size}, People=${idMappings.people.size}`);
      console.log('');

      // Migrate relationships (depends on people)
      results.relationships = await this.migrateRelationships();
      console.log('');

      // Migrate businesses (depends on people)
      results.businesses = await this.migrateBusinesses();
      console.log('');

      console.log('='.repeat(50));
      console.log('MIGRATION COMPLETE');
      console.log('='.repeat(50));
      console.table(results);

      const totalSuccess = Object.values(results).reduce((sum, r) => sum + r.success, 0);
      const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);

      console.log(`\nTotal: ${totalSuccess} success, ${totalFailed} failed`);

      // Additional diagnostic output
      console.log('\n📋 Final ID Mapping Summary:');
      console.log(`   Villages: ${idMappings.villages.size} mappings`);
      console.log(`   Trees: ${idMappings.trees.size} mappings`);
      console.log(`   People: ${idMappings.people.size} mappings`);

      if (totalFailed > 0) {
        console.warn(`⚠️ ${totalFailed} records failed to migrate. Check console for details.`);
      } else {
        console.log('✅ Migration successful!');
      }

      return results;
    } catch (err) {
      console.error('MIGRATION FAILED:', err);
      throw err;
    }
  },

  /**
   * Verify migration by comparing counts
   */
  async verifyMigration() {
    console.log('Verifying migration...');

    const firebaseCollections = ['villages', 'tree', 'people', 'businesses', 'businessCategories'];
    const supabaseTables = ['village', 'tree', 'people', 'business', 'business_categories'];

    const verification: Record<string, { firebase: number; supabase: number; match: boolean }> = {};

    for (let i = 0; i < firebaseCollections.length; i++) {
      const fbCollection = firebaseCollections[i];
      const sbTable = supabaseTables[i];

      // Count Firebase records
      const fbSnapshot = await getDocs(collection(db, fbCollection));
      const firebaseCount = fbSnapshot.size;

      // Count Supabase records
      const { count: supabaseCount, error } = await supabase
        .from(sbTable)
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.error(`Error counting ${sbTable}:`, error);
        verification[fbCollection] = { firebase: firebaseCount, supabase: 0, match: false };
      } else {
        const match = firebaseCount === (supabaseCount || 0);
        verification[fbCollection] = {
          firebase: firebaseCount,
          supabase: supabaseCount || 0,
          match,
        };
      }
    }

    console.log('Migration Verification Results:');
    console.table(verification);

    const allMatch = Object.values(verification).every((v) => v.match);
    if (allMatch) {
      console.log('✅ All records migrated successfully!');
    } else {
      console.warn('⚠️ Some record counts do not match. Review the results above.');
    }

    return verification;
  },
};
