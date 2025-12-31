import React, { useMemo, useState, useCallback, useEffect } from "react";
import treePackage from "relatives-tree/package.json";
import ReactFamilyTree from "react-family-tree";
import { PinchZoomPan } from "../PinchZoomPan/PinchZoomPan";
import { FamilyNode } from "../FamilyNode/FamilyNode";
import { NodeDetails } from "../NodeDetails/NodeDetails";
import { NODE_WIDTH, NODE_HEIGHT, update } from "../const";
import { getNodeStyle } from "./utils";

import css from "./App.module.css";
import { AuthProvider } from "../context/AuthContext";
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
import Header from "../Header/Header";
import { ContactPage } from "../Contact/ContactPage";

export default React.memo(function App() {
  const [nodes, setNodes] = useState<Array<FNode>>([
    {
      id: "loading",
      name: "Loading...",
      dob: "",
      parents: [],
      children: [],
      siblings: [],
      gender: Gender.male,
      hasSubTree: false,
      spouses: [],
      top: 0,
      left: 0,
    },
  ]);

  const firstNodeId = useMemo(() => nodes[0]?.id ?? "", [nodes]);
  const [rootId, setRootId] = useState(firstNodeId);
  const [treeId, setTreeId] = useState<string>(() => {
    // Read tree ID from URL on initial load
    const params = new URLSearchParams(window.location.search);
    return params.get("tree") || undefined;
  });
  const onChange = useCallback(
    (value: string, nodes: readonly Readonly<FNode>[]) => {
      setTreeId(value);
      // Update URL with tree ID
      if (value) {
        const params = new URLSearchParams(window.location.search);
        params.set("tree", value);
        window.history.pushState(
          {},
          "",
          `${window.location.pathname}?${params.toString()}`
        );
      } else {
        window.history.pushState({}, "", window.location.pathname);
      }
    },
    []
  );
  const [view, setView] = useState<"home" | "contact">(() =>
    window.location.pathname === "/contact" ? "contact" : "home"
  );
  useEffect(() => {
    const handler = () =>
      setView(window.location.pathname === "/contact" ? "contact" : "home");
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  const navigate = useCallback(
    (path: "/" | "/contact") => {
      if (path === "/contact") {
        window.history.pushState({}, "", "/contact");
        setView("contact");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (treeId) {
        params.set("tree", treeId);
      } else {
        params.delete("tree");
      }
      const search = params.toString();
      window.history.pushState({}, "", search ? `/?${search}` : "/");
      setView("home");
    },
    [treeId]
  );
  const [selectId, setSelectId] = useState<string>();
  const [hoverId, setHoverId] = useState<string>();
  const [startName, setStartName] = useState<string>("");

  const resetRootHandler = useCallback(
    () => setRootId(firstNodeId),
    [firstNodeId]
  );
  useEffect(() => {
    // if treeId is undefined, listen to whole collection; if it's null or string, filter for that value
    if (treeId) {
      const col = collection(db, "people");
      const q = query(col, where("treeId", "==", treeId));
      const unsub = onSnapshot(q, (snapshot) => {
        const items: Readonly<FNode>[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data() as Readonly<FNode>);
        });

        // always update nodes (may be empty) and clear selection/hover
        setNodes(items);
        setSelectId(undefined);
        setHoverId(undefined);

        // set root if we have candidates
        if (items.length === 0) return;
        const rootCandidate = items.find(
          (item) =>
            (item.parents?.length ?? 0) === 0 &&
            (item.spouses?.length ?? 0) === 0
        );
        if (rootCandidate) setRootId(rootCandidate.id);
      });
      return unsub;
    }
  }, [treeId]);

  const selected = useMemo(
    () => nodes.find((item) => item.id === selectId),
    [nodes, selectId]
  );
  const buildNewNode = useCallback((node: Partial<FNode>, newId: string) => {
    // Start with user-provided fields
    const base: any = { ...(node as any) };
    // Apply safe defaults that override undefined values
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
    // Remove any top-level undefineds (Firestore doesn't allow undefined)
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
      type?: RelType
    ) => {
      const newDocData: any = { ...(newNode as any) };

      // attach current selected treeId so new nodes are associated with the selected tree
      if (typeof treeId !== "undefined") {
        newDocData.treeId = treeId;
      } else {
        throw new Error("Cannot add node without selected treeId");
      }

      // ensure parents is an array by default (so spouse/new node won't get undefined)
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

      // Build parentIds: include target + any explicit parents passed in newNode.parents
      let parentIds: string[] = [];
      if (relation === "child") {
        const explicitParents = Array.isArray(newNode.parents)
          ? newNode.parents.map((p: any) => p.id).filter(Boolean)
          : [];
        parentIds = Array.from(new Set([targetId, ...explicitParents]));
      }

      // compute child ids to read (for updating siblings)
      let childIdsToRead: string[] = [];
      if (relation === "child") {
        // we'll read parent docs below and collect their children
      } else if (relation === "spouse") {
        const targetChildren = Array.isArray(targetData.children)
          ? targetData.children.map((c) => c.id)
          : [];
        const newChildrenProvided = Array.isArray(newNode.children)
          ? newNode.children.map((c) => c.id)
          : [];
        childIdsToRead = Array.from(
          new Set([...targetChildren, ...newChildrenProvided].filter(Boolean))
        );
      }

      // Read parent docs (if child) before writes
      const parentSnaps =
        relation === "child"
          ? await Promise.all(
              parentIds.map((id) => tx.get(doc(db, "people", id)))
            )
          : [];

      if (relation === "child") {
        // collect all child ids from all parents (before adding new child)
        const childrenFromParents = parentSnaps.flatMap((snap) =>
          snap.exists()
            ? (snap.data() as FNode).children.map((c: any) => c.id)
            : []
        );
        childIdsToRead = Array.from(
          new Set(childrenFromParents.filter(Boolean))
        );
      }

      const childSnaps = await Promise.all(
        childIdsToRead.map((id) => tx.get(doc(db, "people", id)))
      );

      // --- Writes: update every parent to include the new child ---
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

        // write parents array on new node
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

        // siblings = union of children of all parents (excluding new child)
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

        // update existing child docs to add new sibling entry
        for (const snap of childSnaps) {
          if (!snap.exists()) continue;
          const childRef = snap.ref;
          const childData = snap.data() as FNode;
          const childSiblings = Array.isArray(childData.siblings)
            ? [...childData.siblings]
            : [];
          if (!childSiblings.find((s) => s.id === newId)) {
            childSiblings.push({ id: newId, type: type ?? RelType.blood });
            tx.set(childRef, { siblings: childSiblings }, { merge: true });
          }
        }
      } else if (relation === "parent") {
        const targetParents = Array.isArray(targetData.parents)
          ? [...targetData.parents]
          : [];
        targetParents.push({ id: newId, type: type ?? RelType.blood });
        tx.set(targetRef, { parents: targetParents }, { merge: true });
        newDocData.children = [{ id: targetId!, type: type ?? RelType.blood }];
      } else if (relation === "spouse") {
        const targetSpouses = Array.isArray(targetData.spouses)
          ? [...targetData.spouses]
          : [];
        if (!targetSpouses.find((s) => s.id === newId))
          targetSpouses.push({ id: newId, type: "married" });

        const targetChildren = Array.isArray(targetData.children)
          ? [...targetData.children]
          : [];
        const newChildrenProvided = Array.isArray(newNode.children)
          ? [...newNode.children]
          : [];
        const mergedChildrenMap = new Map<string, any>();
        for (const c of [...targetChildren, ...newChildrenProvided]) {
          if (!c || !c.id) continue;
          mergedChildrenMap.set(c.id, {
            id: c.id,
            type: c.type ?? type ?? RelType.blood,
          });
        }
        const mergedChildren = Array.from(mergedChildrenMap.values());

        tx.set(
          targetRef,
          { spouses: targetSpouses, children: mergedChildren },
          { merge: true }
        );

        newDocData.spouses = [{ id: targetId, type: "married" }];
        newDocData.children = mergedChildren;

        for (const childSnap of childSnaps) {
          if (!childSnap.exists()) continue;
          const childRef = childSnap.ref;
          const childData = childSnap.data() as FNode;
          const parents = Array.isArray(childData.parents)
            ? [...childData.parents]
            : [];
          if (targetId && !parents.find((p) => p.id === targetId))
            parents.push({ id: targetId, type: type ?? RelType.blood });
          if (!parents.find((p) => p.id === newId))
            parents.push({ id: newId, type: type ?? RelType.blood });
          tx.set(childRef, { parents }, { merge: true });
        }
      }

      // ensure treeId is present on final write (in case it wasn't set earlier)
      if (typeof treeId !== "undefined") {
        newDocData.treeId = treeId;
      }
      // Final safety: strip any undefined values from top-level before write
      Object.keys(newDocData).forEach((k) => {
        if (newDocData[k] === undefined) delete newDocData[k];
      });

      tx.set(newRef, newDocData, { merge: true });
    },
    [treeId]
  );

  const optimisticUpdateLocal = useCallback(
    (
      newId: string,
      newNodeBuilt: Partial<FNode>,
      relation: "child" | "spouse" | "parent",
      targetId?: string,
      type?: RelType
    ) => {
      setNodes((prev) => {
        const byId = new Map<string, FNode>();
        prev.forEach((p) =>
          byId.set(p.id, {
            ...p,
            parents: Array.isArray(p.parents) ? [...p.parents] : [],
            children: Array.isArray(p.children) ? [...p.children] : [],
            spouses: Array.isArray(p.spouses) ? [...p.spouses] : [],
            siblings: Array.isArray(p.siblings) ? [...p.siblings] : [],
          })
        );

        const localNewNode: FNode = {
          id: newId,
          name: newNodeBuilt.name!,
          dob: (newNodeBuilt as any).dob ?? "",
          gender: (newNodeBuilt as any).gender ?? Gender.male,
          parents: Array.isArray(newNodeBuilt.parents)
            ? [...newNodeBuilt.parents]
            : [],
          children: Array.isArray(newNodeBuilt.children)
            ? [...newNodeBuilt.children]
            : [],
          spouses: Array.isArray(newNodeBuilt.spouses)
            ? [...newNodeBuilt.spouses]
            : [],
          siblings: Array.isArray(newNodeBuilt.siblings)
            ? [...newNodeBuilt.siblings]
            : [],
          hasSubTree: false,
          top: 0,
          left: 0,
          ...(newNodeBuilt as any),
          ...(typeof treeId !== "undefined" ? { treeId } : {}),
        };

        byId.set(newId, localNewNode);

        if (!targetId) return Array.from(byId.values());
        const target = byId.get(targetId);
        if (!target) return Array.from(byId.values());

        if (relation === "child") {
          // compute parent list (target + any explicit other parent)
          const parentList =
            Array.isArray(newNodeBuilt.parents) &&
            newNodeBuilt.parents.length > 0
              ? Array.from(new Set(newNodeBuilt.parents.map((p: any) => p.id)))
              : [targetId];

          // ensure each parent has the new child
          for (const pid of parentList) {
            const parentNode = byId.get(pid);
            if (!parentNode) continue;
            const already = parentNode.children?.find((c) => c.id === newId);
            const updatedParent = {
              ...parentNode,
              children: already
                ? [...(parentNode.children ?? [])]
                : [...(parentNode.children ?? []), { id: newId, type }],
            };
            byId.set(pid, updatedParent);
          }

          // siblings = union of children of all parents (excluding new child)
          const siblingIds = new Set<string>();
          for (const pid of parentList) {
            const pnode = byId.get(pid);
            if (!pnode) continue;
            for (const c of pnode.children ?? []) {
              if (c.id && c.id !== newId) siblingIds.add(c.id);
            }
          }
          const newSiblings = Array.from(siblingIds).map((id) => ({
            id,
            type,
          }));

          // update existing sibling nodes to include new child as sibling
          for (const sid of Array.from(siblingIds)) {
            const sNode = byId.get(sid);
            if (!sNode) continue;
            const exists = sNode.siblings?.find((s) => s.id === newId);
            const updatedSibling = {
              ...sNode,
              siblings: exists
                ? [...(sNode.siblings ?? [])]
                : [...(sNode.siblings ?? []), { id: newId, type }],
            };
            byId.set(sid, updatedSibling);
          }

          // insert new node with siblings set immutably
          const replacedNewNode = { ...localNewNode, siblings: newSiblings };
          byId.set(newId, replacedNewNode);
        } else if (relation === "parent") {
          const updatedTarget = {
            ...target,
            parents: [...(target.parents ?? []), { id: newId, type }],
          };
          const updatedNew = {
            ...localNewNode,
            children: [{ id: targetId, type }],
          };
          byId.set(targetId, updatedTarget);
          byId.set(newId, updatedNew);
        } else if (relation === "spouse") {
          const updatedTarget = {
            ...target,
            spouses: [
              ...(target.spouses ?? []),
              ...(target.spouses?.find((s) => s.id === newId)
                ? []
                : [{ id: newId, type: RelType.married as any }]),
            ],
          };
          const updatedNew = {
            // ensure parents is an array (empty if none)
            ...localNewNode,
            parents: Array.isArray(localNewNode.parents)
              ? [...localNewNode.parents]
              : [],
            spouses: [
              ...(localNewNode.spouses ?? []),
              { id: targetId, type: RelType.married as any },
            ],
          };

          const mergedChildrenMap = new Map<string, any>();
          for (const c of [
            ...(target.children ?? []),
            ...(localNewNode.children ?? []),
          ]) {
            if (!c?.id) continue;
            mergedChildrenMap.set(c.id, {
              id: c.id,
              type: c.type ?? type ?? RelType.blood,
            });
          }
          const mergedChildren = Array.from(mergedChildrenMap.values());

          updatedTarget.children = mergedChildren;
          updatedNew.children = mergedChildren;

          for (const childRel of mergedChildren) {
            const childNode = byId.get(childRel.id);
            if (!childNode) continue;
            const parents = [
              ...(childNode.parents ?? []),
              ...(targetId
                ? [{ id: targetId, type: type ?? RelType.blood }]
                : []),
              { id: newId, type: type ?? RelType.blood },
            ].filter((v, i, a) => i === a.findIndex((u) => u.id === v.id));
            byId.set(childRel.id, { ...childNode, parents });
          }

          byId.set(targetId, updatedTarget);
          byId.set(newId, updatedNew);
        }

        return Array.from(byId.values());
      });
    },
    [setNodes, treeId]
  );

  const onAdd = useCallback(
    async (
      node: Partial<FNode>,
      relation: "child" | "spouse" | "parent",
      targetId?: string,
      type?: RelType
    ) => {
      try {
        const colRef = collection(db, "people");
        const newRef = doc(colRef); // generated id
        const newId = newRef.id;
        const newNodeBuilt = buildNewNode(node, newId);
        // ensure selected treeId is attached to the newly created node before transaction
        if (typeof treeId !== "undefined") {
          (newNodeBuilt as any).treeId = treeId;
        }

        await runTransaction(db, async (tx) => {
          // applyRelationInTransaction will perform reads first and then all writes,
          // including writing the newRef document (so do NOT write newRef here).
          await applyRelationInTransaction(
            tx,
            newRef,
            newId,
            newNodeBuilt,
            relation,
            targetId,
            type
          );
        });

        optimisticUpdateLocal(newId, newNodeBuilt, relation, targetId, type);
      } catch (err) {
        console.error("Failed to add node:", err);
      }
    },
    [buildNewNode, applyRelationInTransaction, optimisticUpdateLocal]
  );
  return (
    <AuthProvider>
      <div className={css.root}>
        <Header
          onSourceChange={onChange}
          onCreate={(id) => setTreeId(id)}
          onContact={() => navigate("/contact")}
          onBackToTree={() => navigate("/")}
        />
        {view === "contact" ? (
          <ContactPage onBack={() => navigate("/")} />
        ) : (
          <>
            {nodes.length > 0 ? (
              <PinchZoomPan
                min={0.1}
                max={2.5}
                captureWheel
                className={css.wrapper}
              >
                <ReactFamilyTree
                  nodes={nodes as Readonly<FNode>[]}
                  rootId={rootId}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  className={css.tree}
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
              </PinchZoomPan>
            ) : (
              // when a tree is selected but has no nodes, show an option to add a standalone node
              typeof treeId !== "undefined" && (
                <div className={css.empty}>
                  <div>This tree is empty.</div>
                  <div>
                    <input
                      className={css.startInput}
                      placeholder="Name of root person"
                      value={startName}
                      onChange={(e) => setStartName(e.target.value)}
                    />
                    <button
                      className={css.startButton}
                      onClick={() => {
                        const name = startName.trim();
                        if (!name) return;
                        onAdd({ name }, "child");
                        setStartName("");
                      }}
                      disabled={startName.trim().length === 0}
                    >
                      Add starting node
                    </button>
                  </div>
                </div>
              )
            )}
            {/* Reset button removed as requested */}
            {selected && (
              <NodeDetails
                node={selected}
                nodes={nodes}
                onAdd={onAdd}
                className={css.details}
                onSelect={setSelectId}
                onHover={setHoverId}
                onClear={() => setHoverId(undefined)}
              />
            )}
          </>
        )}
      </div>
    </AuthProvider>
  );
});
