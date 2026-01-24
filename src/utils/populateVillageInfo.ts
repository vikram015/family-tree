/**
 * Utility to populate villageId and villageName for people nodes
 * This can be run from the Debug page to backfill missing village information
 */

import { db } from '../firebase';
import { collection, getDocs, query, where, writeBatch, doc, getDoc } from 'firebase/firestore';
import { FNode } from '../components/model/FNode';

export const populateVillageInfoForAllNodes = async (): Promise<void> => {
  try {
    console.log('Starting village info population for all nodes...');

    const peopleCol = collection(db, 'people');
    const peopleSnap = await getDocs(peopleCol);

    if (peopleSnap.empty) {
      console.log('No documents found in people collection');
      return;
    }

    // Group nodes by treeId
    const nodesByTree = new Map<string, any[]>();

    peopleSnap.docs.forEach((doc) => {
      const data = doc.data() as FNode;
      const treeId = data.treeId;
      
      if (!treeId) {
        console.warn('Node without treeId:', doc.id);
        return;
      }

      if (!nodesByTree.has(treeId)) {
        nodesByTree.set(treeId, []);
      }
      nodesByTree.get(treeId)!.push({ ref: doc.ref, data });
    });

    console.log(`Found ${nodesByTree.size} unique trees`);

    // For each tree, get village info and update nodes
    for (const [treeId, nodes] of nodesByTree) {
      console.log(`Processing tree: ${treeId} with ${nodes.length} nodes`);

      // Try to get village info from the tree document
      let villageId: string | null = null;
      let villageName: string | null = null;

      try {
        const treeDoc = await getDoc(doc(db, 'tree', treeId));
        if (treeDoc.exists()) {
          const treeData = treeDoc.data() as any;
          villageId = treeData.villageId || null;
          villageName = treeData.villageName || null;
          console.log(`Tree ${treeId} has villageId: ${villageId}, villageName: ${villageName}`);
        } else {
          console.warn(`Tree document not found: ${treeId}`);
        }
      } catch (err) {
        console.warn(`Could not fetch tree document ${treeId}:`, err);
      }

      if (!villageId) {
        console.log(`Skipping tree ${treeId} - no villageId found`);
        continue;
      }

      // Update all nodes in this tree with village info
      let batch = writeBatch(db);
      let ops = 0;
      const BATCH_SIZE = 500;

      for (const nodeEntry of nodes) {
        const updates: any = {};

        // Only add if not already set
        if (!nodeEntry.data.villageId) {
          updates.villageId = villageId;
        }
        if (!nodeEntry.data.villageName && villageName) {
          updates.villageName = villageName;
        }

        // Also ensure name_lowercase is populated
        if (!nodeEntry.data.name_lowercase && nodeEntry.data.name) {
          updates.name_lowercase = nodeEntry.data.name.toLowerCase();
        }

        if (Object.keys(updates).length > 0) {
          batch.update(nodeEntry.ref, updates);
          ops++;

          if (ops >= BATCH_SIZE) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
            console.log(`Batch committed for tree ${treeId}`);
          }
        }
      }

      if (ops > 0) {
        await batch.commit();
        console.log(`Tree ${treeId}: updated ${ops} nodes`);
      }
    }

    console.log('✅ Village info population completed successfully');
  } catch (err) {
    console.error('❌ Failed to populate village info:', err);
    throw err;
  }
};
