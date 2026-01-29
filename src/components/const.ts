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
 * 
 * NOTE: This was used for Firebase to Supabase migration.
 * Data is now in Supabase. Use Supabase functions for any hierarchy updates.
 */
export const populateHierarchyForAllNodes = async (treeId: string, villageId?: string): Promise<void> => {
  console.warn('populateHierarchyForAllNodes is deprecated - Firebase migration is complete. Use Supabase directly.');
  return Promise.resolve();
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
