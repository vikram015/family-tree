import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import ReactFamilyTree from "react-family-tree";
import { Box, TextField, Button, Typography, Container } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { FamilyNode } from "../FamilyNode/FamilyNode";
import { NodeDetails } from "../NodeDetails/NodeDetails";
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  populateHierarchyForAllNodes,
  getNodeHierarchy,
} from "../const";
import { getNodeStyle } from "../App/utils";
import { db } from "../../firebase";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  query,
  where,
} from "firebase/firestore";
import { FNode } from "../model/FNode";
import { Gender, RelType } from "relatives-tree/lib/types";
import { SourceSelect } from "../SourceSelect/SourceSelect";
import AddTree from "../AddTree/AddTree";
import { useAuth } from "../context/AuthContext";
import { useVillage } from "../context/VillageContext";

interface FamiliesPageProps {
  treeId: string;
  setTreeId: (id: string) => void;
  onSourceChange: (value: string, nodes: readonly any[]) => void;
  onCreate?: (id: string) => void;
}

export const FamiliesPage: React.FC<FamiliesPageProps> = ({
  treeId,
  setTreeId,
  onSourceChange,
  onCreate,
}) => {
  const [searchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { selectedVillage, villages } = useVillage();
  const [nodes, setNodes] = useState<Array<FNode>>([]);
  const firstNodeId = useMemo(() => nodes[0]?.id ?? "", [nodes]);
  const [rootId, setRootId] = useState(firstNodeId);
  const [selectId, setSelectId] = useState<string>();
  const [hoverId, setHoverId] = useState<string>();
  const [startName, setStartName] = useState<string>("");

  // Sync treeId with URL params
  useEffect(() => {
    const urlTreeId = searchParams.get("tree");
    if (urlTreeId && urlTreeId !== treeId) {
      setTreeId(urlTreeId);
    }
  }, [searchParams, treeId, setTreeId]);

  useEffect(() => {
    // Only load data if a specific tree ID is selected
    if (treeId && treeId !== "") {
      const col = collection(db, "people");
      const q = query(col, where("treeId", "==", treeId));
      const unsub = onSnapshot(q, (snapshot) => {
        const items: Readonly<FNode>[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as FNode;
          items.push({
            ...data,
            id: doc.id, // Ensure ID is always set from document ID
          } as Readonly<FNode>);
        });

        console.log("Loaded nodes:", items.length);
        console.log("First node:", items[0]);

        // Populate hierarchy for all nodes
        const itemsWithHierarchy = items.map((node) => ({
          ...node,
          hierarchy: getNodeHierarchy(node.id, items),
        }));

        setNodes(itemsWithHierarchy);
        setSelectId(undefined);
        setHoverId(undefined);

        if (items.length === 0) return;
        const rootCandidate = items.find(
          (item) =>
            (item.parents?.length ?? 0) === 0 &&
            (item.spouses?.length ?? 0) === 0,
        );
        if (rootCandidate) {
          console.log("Root node found:", rootCandidate.id);
          setRootId(rootCandidate.id);
        } else {
          console.log("No root node found, using first node");
          setRootId(items[0].id);
        }
      });
      return unsub;
    } else {
      setNodes([]);
      setSelectId(undefined);
      setHoverId(undefined);
    }
  }, [treeId]);

  const selected = useMemo(
    () => nodes.find((item) => item.id === selectId),
    [nodes, selectId],
  );

  const buildNewNode = useCallback((node: Partial<FNode>, newId: string) => {
    const base: any = { ...(node as any) };
    const built: any = {
      id: newId,
      name: base.name ?? "Unnamed",
      dob: base.dob ?? "",
      gender: base.gender ?? Gender.male,
      parents: Array.isArray(base.parents) ? base.parents : [],
      children: Array.isArray(base.children) ? base.children : [],
      spouses: Array.isArray(base.spouses) ? base.spouses : [],
      siblings: Array.isArray(base.siblings) ? base.siblings : [],
    };
    Object.keys(built).forEach((k) => {
      if (built[k] === undefined) delete built[k];
    });
    return built as Partial<FNode>;
  }, []);

  const applyRelationInTransaction = useCallback(
    async (
      tx: any,
      newRef: any,
      newId: string,
      newNode: Partial<FNode>,
      relation: "child" | "spouse" | "parent",
      targetId?: string,
      type?: RelType,
    ) => {
      const newDocData: any = { ...(newNode as any) };

      if (typeof treeId !== "undefined") {
        newDocData.treeId = treeId;
      } else {
        throw new Error("Cannot add node without selected treeId");
      }

      // Add village information if available
      if (selectedVillage) {
        newDocData.villageId = selectedVillage;
        // Find the village name from the villages array
        const villageObj = villages.find((v) => v.id === selectedVillage);
        if (villageObj) {
          newDocData.villageName = villageObj.name;
        }
      }

      // Add lowercase name for case-insensitive search
      if (newNode.name) {
        newDocData.name_lowercase = newNode.name.toLowerCase();
      }

      newDocData.parents = Array.isArray(newDocData.parents)
        ? newDocData.parents
        : [];

      if (!targetId) {
        tx.set(newRef, newDocData, { merge: true });
        return;
      }

      const targetRef = doc(db, "people", targetId);
      const targetSnap = await tx.get(targetRef);
      if (!targetSnap.exists()) {
        tx.set(newRef, newDocData, { merge: true });
        return;
      }
      const targetData = targetSnap.data() as FNode;

      let parentIds: string[] = [];
      if (relation === "child") {
        const explicitParents = Array.isArray(newNode.parents)
          ? newNode.parents.map((p: any) => p.id).filter(Boolean)
          : [];
        parentIds = Array.from(new Set([targetId, ...explicitParents]));
      }

      let childIdsToRead: string[] = [];
      if (relation === "child") {
      } else if (relation === "spouse") {
        const targetChildren = Array.isArray(targetData.children)
          ? targetData.children.map((c) => c.id)
          : [];
        const newChildrenProvided = Array.isArray(newNode.children)
          ? newNode.children.map((c) => c.id)
          : [];
        childIdsToRead = Array.from(
          new Set([...targetChildren, ...newChildrenProvided].filter(Boolean)),
        );
      }

      const parentSnaps =
        relation === "child"
          ? await Promise.all(
              parentIds.map((id) => tx.get(doc(db, "people", id))),
            )
          : [];

      if (relation === "child") {
        const childrenFromParents = parentSnaps.flatMap((snap) =>
          snap.exists()
            ? (snap.data() as FNode).children.map((c: any) => c.id)
            : [],
        );
        childIdsToRead = Array.from(
          new Set(childrenFromParents.filter(Boolean)),
        );
      }

      const childSnaps = await Promise.all(
        childIdsToRead.map((id) => tx.get(doc(db, "people", id))),
      );

      if (relation === "child") {
        for (let i = 0; i < parentIds.length; i++) {
          const pid = parentIds[i];
          const pref = doc(db, "people", pid);
          const psnap = parentSnaps[i];
          const pData = psnap.exists()
            ? (psnap.data() as FNode)
            : { children: [] };
          const existingChildren = Array.isArray(pData.children)
            ? [...pData.children]
            : [];
          if (!existingChildren.find((c) => c.id === newId)) {
            existingChildren.push({ id: newId, type: type ?? RelType.blood });
          }
          tx.set(pref, { children: existingChildren }, { merge: true });
        }

        if (Array.isArray(newNode.parents) && newNode.parents.length > 0) {
          newDocData.parents = newNode.parents.map((p: any) => ({
            id: p.id,
            type: p.type ?? type ?? RelType.blood,
          }));
        } else {
          newDocData.parents = parentIds.map((id) => ({
            id,
            type: type ?? RelType.blood,
          }));
        }

        // Copy ancestor hierarchy from the primary (male) parent
        const maleParentSnap = parentSnaps.find((snap) => {
          const pData = snap.exists() ? (snap.data() as FNode) : null;
          return pData && pData.gender === "male";
        });

        if (maleParentSnap && maleParentSnap.exists()) {
          const maleParentData = maleParentSnap.data() as FNode;
          // Copy parent's hierarchy and add the parent to it
          const parentHierarchy = Array.isArray(maleParentData.hierarchy)
            ? [...maleParentData.hierarchy]
            : [];
          parentHierarchy.push({
            name: maleParentData.name,
            id: maleParentSnap.id,
          });
          newDocData.hierarchy = parentHierarchy;
        }

        const siblingIds = new Set<string>();
        for (const snap of parentSnaps) {
          if (!snap.exists()) continue;
          const pd = snap.data() as FNode;
          for (const c of pd.children ?? []) {
            if (c.id && c.id !== newId) siblingIds.add(c.id);
          }
        }
        newDocData.siblings = Array.from(siblingIds).map((id) => ({
          id,
          type: type ?? RelType.blood,
        }));

        for (const csnap of childSnaps) {
          if (!csnap.exists()) continue;
          const cid = csnap.id;
          const cref = doc(db, "people", cid);
          const cData = csnap.data() as FNode;
          const existingSiblings = Array.isArray(cData.siblings)
            ? [...cData.siblings]
            : [];
          if (!existingSiblings.find((s) => s.id === newId)) {
            existingSiblings.push({ id: newId, type: type ?? RelType.blood });
          }
          tx.set(cref, { siblings: existingSiblings }, { merge: true });
        }
      } else if (relation === "spouse") {
        const existingSpouses = Array.isArray(targetData.spouses)
          ? [...targetData.spouses]
          : [];
        if (!existingSpouses.find((s) => s.id === newId)) {
          existingSpouses.push({ id: newId, type: type ?? RelType.married });
        }
        tx.set(targetRef, { spouses: existingSpouses }, { merge: true });

        const newSpouses = Array.isArray(newNode.spouses)
          ? [...newNode.spouses]
          : [];
        if (!newSpouses.find((s) => s.id === targetId)) {
          newSpouses.push({ id: targetId, type: type ?? RelType.married });
        }
        newDocData.spouses = newSpouses;

        if (childIdsToRead.length > 0) {
          const childrenRefs = childIdsToRead.map((id) => ({
            id,
            type: RelType.blood,
          }));
          newDocData.children = childrenRefs;
          for (const csnap of childSnaps) {
            if (!csnap.exists()) continue;
            const cid = csnap.id;
            const cref = doc(db, "people", cid);
            const cData = csnap.data() as FNode;
            const existingParents = Array.isArray(cData.parents)
              ? [...cData.parents]
              : [];
            if (!existingParents.find((p) => p.id === newId)) {
              existingParents.push({ id: newId, type: RelType.blood });
            }
            tx.set(cref, { parents: existingParents }, { merge: true });
          }
        }
      } else if (relation === "parent") {
        const existingChildren = Array.isArray(targetData.children)
          ? [...targetData.children]
          : [];
        if (!existingChildren.find((c) => c.id === targetId)) {
          existingChildren.push({ id: targetId, type: type ?? RelType.blood });
        }
        newDocData.children = existingChildren;

        const existingParents = Array.isArray(targetData.parents)
          ? [...targetData.parents]
          : [];
        if (!existingParents.find((p) => p.id === newId)) {
          existingParents.push({ id: newId, type: type ?? RelType.blood });
        }
        tx.set(targetRef, { parents: existingParents }, { merge: true });
      }

      tx.set(newRef, newDocData, { merge: true });
    },
    [treeId, selectedVillage, villages],
  );

  const onUpdate = useCallback(
    async (nodeId: string, updates: Partial<FNode>) => {
      // Check permission before updating
      if (!hasPermission("admin", treeId)) {
        alert("You don't have permission to edit this family tree.");
        return;
      }

      try {
        console.log("Updating node:", nodeId, "with updates:", updates);

        // Remove undefined values to avoid Firestore errors
        const cleanUpdates = Object.fromEntries(
          Object.entries(updates).filter(([, v]) => v !== undefined),
        );

        console.log("Clean updates:", cleanUpdates);

        // If name is being updated, also update name_lowercase
        if (cleanUpdates.name) {
          cleanUpdates.name_lowercase = (
            cleanUpdates.name as string
          ).toLowerCase();
        }

        const nodeRef = doc(db, "people", nodeId);
        await runTransaction(db, async (transaction) => {
          const nodeSnap = await transaction.get(nodeRef);
          if (!nodeSnap.exists()) {
            throw new Error("Node does not exist");
          }

          // Recalculate hierarchy after update
          const hierarchy = getNodeHierarchy(nodeId, nodes);

          transaction.update(nodeRef, { ...cleanUpdates, hierarchy });
          console.log("Transaction update completed");
        });

        console.log("Node updated successfully!");
      } catch (err) {
        console.error("Failed to update node:", err);
        alert(
          `Failed to update node: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    },
    [hasPermission, treeId, nodes],
  );

  const onDelete = useCallback(
    async (nodeId: string) => {
      // Check permission before deleting
      if (!hasPermission("admin", treeId)) {
        alert("You don't have permission to delete from this family tree.");
        return;
      }

      try {
        console.log("Deleting node:", nodeId);

        const nodeRef = doc(db, "people", nodeId);

        await runTransaction(db, async (transaction) => {
          const nodeSnap = await transaction.get(nodeRef);
          if (!nodeSnap.exists()) {
            throw new Error("Node does not exist");
          }

          const nodeData = nodeSnap.data() as FNode;
          console.log("Node to delete:", nodeData);

          // Only delete this specific node, not children or spouses
          // (This prevents cascading deletes that can corrupt the tree)
          transaction.delete(nodeRef);

          // Update all parents to remove this node from their children array
          if (nodeData.parents) {
            console.log("Updating parents:", nodeData.parents.length);
            for (const parent of nodeData.parents) {
              if (parent.id) {
                console.log("Processing parent:", parent.id);
                const parentRef = doc(db, "people", parent.id);
                const parentSnap = await transaction.get(parentRef);
                if (parentSnap.exists()) {
                  const parentData = parentSnap.data() as FNode;
                  console.log("Parent before update:", parentData.children);
                  const updatedChildren = (parentData.children || []).filter(
                    (child) => child.id !== nodeId,
                  );
                  console.log("Parent after filter:", updatedChildren);
                  transaction.update(parentRef, { children: updatedChildren });
                } else {
                  console.warn("Parent not found:", parent.id);
                }
              }
            }
          }

          // Update all children to remove this node from their parents array
          if (nodeData.children) {
            console.log("Updating children:", nodeData.children.length);
            for (const child of nodeData.children) {
              if (child.id) {
                const childRef = doc(db, "people", child.id);
                const childSnap = await transaction.get(childRef);
                if (childSnap.exists()) {
                  const childData = childSnap.data() as FNode;
                  const updatedParents = (childData.parents || []).filter(
                    (p) => p.id !== nodeId,
                  );
                  transaction.update(childRef, { parents: updatedParents });
                }
              }
            }
          }

          // Update all spouses to remove this node from their spouses array
          if (nodeData.spouses) {
            console.log("Updating spouses:", nodeData.spouses.length);
            for (const spouse of nodeData.spouses) {
              if (spouse.id) {
                const spouseRef = doc(db, "people", spouse.id);
                const spouseSnap = await transaction.get(spouseRef);
                if (spouseSnap.exists()) {
                  const spouseData = spouseSnap.data() as FNode;
                  const updatedSpouses = (spouseData.spouses || []).filter(
                    (s) => s.id !== nodeId,
                  );
                  transaction.update(spouseRef, { spouses: updatedSpouses });
                }
              }
            }
          }

          // Update all siblings to remove this node from their siblings array
          if (nodeData.siblings) {
            for (const sibling of nodeData.siblings) {
              if (sibling.id) {
                const siblingRef = doc(db, "people", sibling.id);
                const siblingSnap = await transaction.get(siblingRef);
                if (siblingSnap.exists()) {
                  const siblingData = siblingSnap.data() as FNode;
                  const updatedSiblings = (siblingData.siblings || []).filter(
                    (s) => s.id !== nodeId,
                  );
                  transaction.update(siblingRef, { siblings: updatedSiblings });
                }
              }
            }
          }

          console.log("Transaction delete completed");
        });

        console.log("Node deleted successfully!");
      } catch (err) {
        console.error("Failed to delete node:", err);
        alert(
          `Failed to delete node: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    },
    [hasPermission, treeId],
  );

  const onAdd = useCallback(
    async (
      node: Partial<FNode>,
      relation: "child" | "spouse" | "parent",
      targetId?: string,
      type?: RelType,
    ) => {
      // Check permission before adding
      if (!hasPermission("admin", treeId)) {
        alert("You don't have permission to add to this family tree.");
        return;
      }

      try {
        // Generate auto-generated ID using Firestore
        const newRef = doc(collection(db, "people"));
        const newId = newRef.id;
        const newNodeBuilt = buildNewNode(node, newId);

        await runTransaction(db, async (tx) => {
          await applyRelationInTransaction(
            tx,
            newRef,
            newId,
            newNodeBuilt,
            relation,
            targetId,
            type,
          );
        });
      } catch (err) {
        console.error("Failed to add node:", err);
      }
    },
    [buildNewNode, applyRelationInTransaction, hasPermission, treeId],
  );

  return (
    <>
      <Helmet>
        <title>My Family Tree - Kinvia | Build Your Family Heritage</title>
        <meta
          name="description"
          content="Create and manage your interactive family tree. Visualize relationships, add family members, and preserve your family history on Kinvia."
        />
        <meta
          name="keywords"
          content="family tree, genealogy, family members, relationships, tree visualization, family history"
        />
        <meta property="og:title" content="My Family Tree - Kinvia" />
        <meta
          property="og:description"
          content="View and manage your interactive family tree with Kinvia."
        />
      </Helmet>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <SourceSelect onChange={onSourceChange} />
        <AddTree onCreate={onCreate} />
      </Box>
      {nodes.length > 0 ? (
        <Box
          sx={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <TransformWrapper
            initialScale={1}
            minScale={0.1}
            maxScale={2.5}
            centerOnInit={true}
            limitToBounds={false}
            wheel={{ step: 0.1 }}
            doubleClick={{ disabled: false, mode: "reset" }}
            panning={{ disabled: false, velocityDisabled: true }}
            pinch={{ disabled: false }}
          >
            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
              }}
              contentStyle={{
                width: "100%",
                height: "100%",
                cursor: "grab",
              }}
            >
              {rootId && nodes.find((n) => n.id === rootId) ? (
                <ReactFamilyTree
                  nodes={nodes as Readonly<FNode>[]}
                  rootId={rootId}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  renderNode={(node: Readonly<FNode>) => (
                    <FamilyNode
                      key={node.id}
                      node={node}
                      isRoot={node.id === rootId}
                      isHover={node.id === hoverId}
                      onClick={setSelectId}
                      onSubClick={setRootId}
                      style={getNodeStyle(node)}
                    />
                  )}
                />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <Typography>
                    Unable to find root node. Please check tree data.
                  </Typography>
                </Box>
              )}
            </TransformComponent>
          </TransformWrapper>
        </Box>
      ) : (
        treeId &&
        treeId !== "" && (
          <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
            <Typography variant="h5" gutterBottom>
              This tree is empty.
            </Typography>
            <Box
              sx={{
                mt: 3,
                display: "flex",
                gap: 2,
                justifyContent: "center",
              }}
            >
              <TextField
                placeholder="Name of root person"
                value={startName}
                onChange={(e) => setStartName(e.target.value)}
                variant="outlined"
                size="medium"
              />
              <Button
                variant="contained"
                onClick={() => {
                  const name = startName.trim();
                  if (!name) return;
                  onAdd({ name }, "child");
                  setStartName("");
                }}
                disabled={startName.trim().length === 0}
              >
                Add starting node
              </Button>
            </Box>
          </Container>
        )
      )}
      <NodeDetails
        node={selected || null}
        nodes={nodes}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onSelect={setSelectId}
        onHover={setHoverId}
        onClear={() => setHoverId(undefined)}
      />
    </>
  );
};
