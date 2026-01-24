import { Gender, RelType, type Node } from 'relatives-tree/lib/types';
import { db } from '../firebase';
import { addDoc, collection, deleteField, writeBatch, getDocs, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { FNode } from './model/FNode';

export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 80;

/**
 * Build the hierarchy chain for a node by walking up the MALE parent chain only
 * Returns array of {name, id} for all male ancestors up to root
 */
export const buildHierarchy = async (
  nodeId: string,
  allNodes: Map<string, FNode>
): Promise<Array<{ name: string; id: string }>> => {
  const hierarchy: Array<{ name: string; id: string }> = [];
  const visited = new Set<string>();
  let currentId: string | undefined = nodeId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = allNodes.get(currentId);

    if (!node) break;

    // Find the first MALE parent in the hierarchy
    let maleParentId: string | undefined = undefined;
    
    if (node.parents && node.parents.length > 0) {
      for (const parent of node.parents) {
        const parentNode = allNodes.get(parent.id);
        if (parentNode && parentNode.gender === 'male') {
          maleParentId = parent.id;
          break;
        }
      }
    }

    if (maleParentId) {
      const parentNode = allNodes.get(maleParentId);
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
 * Populate hierarchy field for all nodes in a tree
 * This function walks through all nodes and builds their parent chain
 * Also populates villageId, villageName, and name_lowercase fields
 */
export const populateHierarchyForAllNodes = async (treeId: string, villageId?: string): Promise<void> => {
  try {
    const peopleCol = collection(db, 'people');
    const peopleSnap = await getDocs(peopleCol);

    if (peopleSnap.empty) {
      console.log('No documents found in people collection');
      return;
    }

    // Create a map of all nodes for quick lookup
    const nodesMap = new Map<string, FNode>();
    const allDocs = peopleSnap.docs;

    allDocs.forEach((docSnap) => {
      const data = docSnap.data() as FNode;
      nodesMap.set(docSnap.id, { ...data, id: docSnap.id });
    });

    // Filter to only process nodes from the current tree
    let treeNodes = allDocs.filter((doc) => {
      const data = doc.data() as FNode;
      return data.treeId === treeId;
    });

    // If villageId is provided, filter further
    if (villageId) {
      treeNodes = treeNodes.filter((doc) => {
        const data = doc.data() as FNode;
        return data.villageId === villageId;
      });
    }

    console.log(`Processing ${treeNodes.length} nodes for tree ${treeId}${villageId ? ` and village ${villageId}` : ''}`);

    // Build hierarchy for each node and prepare batch updates
    let batch = writeBatch(db);
    let ops = 0;
    const BATCH_SIZE = 500;

    for (const docSnap of treeNodes) {
      const nodeId = docSnap.id;
      const nodeData = docSnap.data() as FNode;
      const hierarchy = await buildHierarchy(nodeId, nodesMap);
      
      // Create lowercase name for case-insensitive search
      const name_lowercase = nodeData.name ? nodeData.name.toLowerCase() : '';

      const updates: any = {
        hierarchy,
        name_lowercase,
      };

      // Always include villageId and villageName if they exist
      if (nodeData.villageId) {
        updates.villageId = nodeData.villageId;
      }
      if (nodeData.villageName) {
        updates.villageName = nodeData.villageName;
      }

      batch.update(docSnap.ref, updates);
      ops++;

      if (ops >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
        console.log(`Processed batch of ${BATCH_SIZE} nodes...`);
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    console.log('Hierarchy population completed successfully');
  } catch (err) {
    console.error('Failed to populate hierarchy:', err);
    throw err;
  }
};

/**
 * Build hierarchy for a single node (for real-time use)
 * Only follows MALE parent lineage
 */
export const getNodeHierarchy = (
  nodeId: string,
  allNodes: FNode[]
): Array<{ name: string; id: string }> => {
  const nodesMap = new Map<string, FNode>();
  allNodes.forEach((node) => nodesMap.set(node.id, node));

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


export const URL_LABEL = 'URL (Gist, Paste.bin, ...)';
