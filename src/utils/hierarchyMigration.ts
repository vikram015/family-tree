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

import { db } from '../firebase';
import { collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { FNode } from '../components/model/FNode';

/**
 * Build the hierarchy chain for a node by walking up the MALE parent chain only
 */
const buildHierarchyChain = (
  nodeId: string,
  nodesMap: Map<string, FNode>
): Array<{ name: string; id: string }> => {
  const hierarchy: Array<{ name: string; id: string }> = [];
  const visited = new Set<string>();
  let currentId: string | undefined = nodeId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = nodesMap.get(currentId);

    if (!node) break;

    // Find the first MALE parent in the hierarchy
    let maleParentId: string | undefined = undefined;
    
    if (node.parents && node.parents.length > 0) {
      for (const parent of node.parents) {
        const parentNode = nodesMap.get(parent.id);
        if (parentNode && parentNode.gender === 'male') {
          maleParentId = parent.id;
          break;
        }
      }
    }

    if (maleParentId) {
      const parentNode = nodesMap.get(maleParentId);
      if (parentNode) {
        hierarchy.unshift({ name: parentNode.name, id: maleParentId });
        currentId = maleParentId;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return hierarchy;
};

/**
 * Run hierarchy migration for a specific tree
 * This populates the hierarchy field, name_lowercase, villageId, and villageName for all nodes in the tree
 */
export const runHierarchyMigration = async (treeId: string): Promise<void> => {
  try {
    console.log(`Starting hierarchy migration for tree: ${treeId}`);

    // Try to get village info from the tree document
    let villageId: string | null = null;
    let villageName: string | null = null;

    try {
      const treeRef = await (await import('../firebase')).db;
      const treeDoc = await (await import('firebase/firestore')).getDoc(
        (await import('firebase/firestore')).doc(treeRef, 'tree', treeId)
      );
      
      if (treeDoc.exists()) {
        const treeData = treeDoc.data() as any;
        villageId = treeData.villageId || null;
        villageName = treeData.villageName || null;
        console.log(`Tree villageId: ${villageId}, villageName: ${villageName}`);
      }
    } catch (err) {
      console.warn('Could not fetch tree metadata:', err);
    }

    const peopleCol = collection(db, 'people');
    const q = query(peopleCol, where('treeId', '==', treeId));
    const peopleSnap = await getDocs(q);

    if (peopleSnap.empty) {
      console.log('No documents found in tree');
      return;
    }

    // Create a map of all nodes for quick lookup
    const nodesMap = new Map<string, FNode>();
    const allDocs = peopleSnap.docs;

    allDocs.forEach((docSnap) => {
      const data = docSnap.data() as FNode;
      nodesMap.set(docSnap.id, { ...data, id: docSnap.id });
    });

    console.log(`Found ${allDocs.length} nodes in tree`);

    // Build hierarchy for each node and prepare batch updates
    let batch = writeBatch(db);
    let ops = 0;
    let processedCount = 0;
    const BATCH_SIZE = 500;

    for (const docSnap of allDocs) {
      const nodeId = docSnap.id;
      const nodeData = docSnap.data() as FNode;
      const hierarchy = buildHierarchyChain(nodeId, nodesMap);
      
      // Create lowercase name for case-insensitive search
      const name_lowercase = nodeData.name ? nodeData.name.toLowerCase() : '';

      const updates: any = {
        hierarchy,
        name_lowercase,
      };

      // Always populate villageId and villageName if available from tree, otherwise keep existing values
      if (villageId && !nodeData.villageId) {
        updates.villageId = villageId;
      }
      if (villageName && !nodeData.villageName) {
        updates.villageName = villageName;
      }
      // If node already has these fields, they will be preserved by the batch update

      batch.update(docSnap.ref, updates);
      ops++;
      processedCount++;

      if (ops >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
        console.log(`Progress: ${processedCount}/${allDocs.length} nodes processed`);
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    console.log(`✅ Hierarchy migration completed successfully for ${processedCount} nodes`);
  } catch (err) {
    console.error('❌ Failed to run hierarchy migration:', err);
    throw err;
  }
};

/**
 * Run hierarchy migration for all trees
 */
export const runHierarchyMigrationForAllTrees = async (): Promise<void> => {
  try {
    console.log('Starting hierarchy migration for all trees...');

    const peopleCol = collection(db, 'people');
    const allPeopleSnap = await getDocs(peopleCol);

    if (allPeopleSnap.empty) {
      console.log('No documents found');
      return;
    }

    // Get unique tree IDs
    const treeIds = new Set<string>();
    allPeopleSnap.docs.forEach((doc) => {
      const data = doc.data() as FNode;
      if (data.treeId) {
        treeIds.add(data.treeId);
      }
    });

    console.log(`Found ${treeIds.size} trees to migrate`);

    // Run migration for each tree
    for (const treeId of treeIds) {
      await runHierarchyMigration(treeId);
    }

    console.log('✅ All tree migrations completed successfully');
  } catch (err) {
    console.error('❌ Failed to run migrations for all trees:', err);
    throw err;
  }
};
