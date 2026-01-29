/**
 * Utility to populate villageId and villageName for people nodes
 * This can be run from the Debug page to backfill missing village information
 */

import { supabase } from '../supabase';

export const populateVillageInfoForAllNodes = async (): Promise<void> => {
  try {
    console.log('Starting village info population for all nodes...');

    // Fetch all people from Supabase
    const { data: allPeople, error: fetchError } = await supabase
      .from('people')
      .select('*');

    if (fetchError) {
      throw new Error(`Failed to fetch people: ${fetchError.message}`);
    }

    if (!allPeople || allPeople.length === 0) {
      console.log('No documents found in people table');
      return;
    }

    // Group nodes by treeId
    const nodesByTree = new Map<string, any[]>();

    allPeople.forEach((person) => {
      const treeId = person.treeId;
      
      if (!treeId) {
        console.warn('Person without treeId:', person.id);
        return;
      }

      if (!nodesByTree.has(treeId)) {
        nodesByTree.set(treeId, []);
      }
      nodesByTree.get(treeId)!.push(person);
    });

    console.log(`Found ${nodesByTree.size} unique trees`);

    // For each tree, get village info and update nodes
    for (const [treeId, nodes] of nodesByTree) {
      console.log(`Processing tree: ${treeId} with ${nodes.length} nodes`);

      // Get village info from the tree document
      let villageId: string | null = null;
      let villageName: string | null = null;

      try {
        const { data: treeData, error: treeError } = await supabase
          .from('tree')
          .select('villageId, villageName')
          .eq('id', treeId)
          .single();

        if (treeError) {
          console.warn(`Could not fetch tree document ${treeId}:`, treeError);
        } else if (treeData) {
          villageId = treeData.villageId || null;
          villageName = treeData.villageName || null;
          console.log(`Tree ${treeId} has villageId: ${villageId}, villageName: ${villageName}`);
        }
      } catch (err) {
        console.warn(`Could not fetch tree document ${treeId}:`, err);
      }

      if (!villageId) {
        console.log(`Skipping tree ${treeId} - no villageId found`);
        continue;
      }

      // Update all nodes in this tree with village info
      const updates = nodes
        .filter((nodeEntry) => {
          // Only update if missing village info
          return !nodeEntry.villageId || (!nodeEntry.villageName && villageName) || (!nodeEntry.name_lowercase && nodeEntry.name);
        })
        .map((nodeEntry) => {
          const updatedNode: any = { ...nodeEntry };

          if (!nodeEntry.villageId) {
            updatedNode.villageId = villageId;
          }
          if (!nodeEntry.villageName && villageName) {
            updatedNode.villageName = villageName;
          }
          if (!nodeEntry.name_lowercase && nodeEntry.name) {
            updatedNode.name_lowercase = nodeEntry.name.toLowerCase();
          }

          return updatedNode;
        });

      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('people')
          .upsert(updates, { onConflict: 'id' });

        if (updateError) {
          console.error(`Failed to update nodes for tree ${treeId}:`, updateError);
        } else {
          console.log(`Tree ${treeId}: updated ${updates.length} nodes`);
        }
      }
    }

    console.log('✅ Village info population completed successfully');
  } catch (err) {
    console.error('❌ Failed to populate village info:', err);
    throw err;
  }
};
