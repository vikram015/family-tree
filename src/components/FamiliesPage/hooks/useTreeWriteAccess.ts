import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiService } from "../../../services/apiService";
import type { TreeWriteScope } from "../../../services/apiService";
import type { FNode } from "../../model/FNode";

interface UseTreeWriteAccessParams {
  treeId: string;
  currentUser: { uid?: string } | null | undefined;
  nodes: FNode[];
  locationId?: string;
  isSuperAdmin: () => boolean;
  hasPermission: (requiredRole?: any, locationId?: string) => boolean;
}

/**
 * Resolves what the current user may edit in the active tree. Owns the
 * `treeWriteScope` fetch and derives the permission flags plus the per-node
 * `canEditNode` predicate used across the Families page.
 *
 * `setTreeWriteScope` is exposed so the invite-accept flow can seed a freshly
 * granted scope without waiting for a refetch.
 */
export function useTreeWriteAccess({
  treeId,
  currentUser,
  nodes,
  locationId,
  isSuperAdmin,
  hasPermission,
}: UseTreeWriteAccessParams) {
  const [treeWriteScope, setTreeWriteScope] = useState<TreeWriteScope | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    if (!treeId || !currentUser) {
      setTreeWriteScope(null);
      return () => {
        active = false;
      };
    }

    ApiService.getTreeWriteScope(treeId)
      .then((scope) => {
        if (!active) return;
        setTreeWriteScope(scope);
      })
      .catch((error) => {
        if (!active) return;
        console.warn("Failed to load tree write scope:", error);
        setTreeWriteScope({ treeId, canWriteAll: false, rootPersonIds: [] });
      });

    return () => {
      active = false;
    };
  }, [treeId, currentUser]);

  const isSuperAdminUser = isSuperAdmin();
  const hasLocationAdminAccess = hasPermission("admin", locationId);
  const hasBranchWriteScope = Boolean(
    treeWriteScope?.canWriteAll || treeWriteScope?.rootPersonIds.length,
  );
  const canWriteCurrentTree = Boolean(
    currentUser && (isSuperAdminUser || hasLocationAdminAccess || hasBranchWriteScope),
  );
  const canWriteAnyBranch =
    canWriteCurrentTree &&
    (isSuperAdminUser ||
      Boolean(treeWriteScope?.canWriteAll || treeWriteScope?.rootPersonIds.length));
  const canCreateRootNode =
    canWriteCurrentTree && (isSuperAdminUser || Boolean(treeWriteScope?.canWriteAll));
  const canManageInvites = Boolean(
    canWriteCurrentTree && (isSuperAdminUser || treeWriteScope?.canWriteAll),
  );

  const editableNodeIds = useMemo(() => {
    const editable = new Set<string>();
    if (!canWriteCurrentTree) return editable;
    if (isSuperAdminUser) {
      nodes.forEach((node) => editable.add(node.id));
      return editable;
    }
    if (!treeWriteScope) return editable;
    if (treeWriteScope.canWriteAll) {
      nodes.forEach((node) => editable.add(node.id));
      return editable;
    }

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const queue = [...treeWriteScope.rootPersonIds];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || editable.has(currentId)) continue;
      editable.add(currentId);
      const current = nodeMap.get(currentId);
      (current?.spouses || []).forEach((spouse) => {
        if (spouse?.id) {
          editable.add(spouse.id);
        }
      });
      (current?.children || []).forEach((child) => {
        if (child?.id && !editable.has(child.id)) {
          queue.push(child.id);
        }
      });
    }
    return editable;
  }, [canWriteCurrentTree, isSuperAdminUser, treeWriteScope, nodes]);

  const canEditNode = useCallback(
    (nodeId?: string | null) => {
      if (!nodeId || !canWriteCurrentTree) return false;
      if (isSuperAdminUser) return true;
      if (!treeWriteScope) return false;
      if (treeWriteScope.canWriteAll) return true;
      return editableNodeIds.has(nodeId);
    },
    [canWriteCurrentTree, isSuperAdminUser, treeWriteScope, editableNodeIds],
  );

  return {
    treeWriteScope,
    setTreeWriteScope,
    isSuperAdminUser,
    canWriteCurrentTree,
    canWriteAnyBranch,
    canCreateRootNode,
    canManageInvites,
    editableNodeIds,
    canEditNode,
  };
}
