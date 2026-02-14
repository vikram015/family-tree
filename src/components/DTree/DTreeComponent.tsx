import React, { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import { FNode } from "../model/FNode";
import dTree from "./dTree";
import TreeBuilder from "./builder";
import "./dTree.css";
import {
  renderNodeCardSvg,
  renderMarriageNodeSvg,
  renderPlaceholderCardSvg,
  CARD_DIM,
} from "./NodeCard";

interface DTreeNode {
  name: string;
  class?: string;
  textClass?: string;
  depthOffset?: number;
  marriages?: Array<{
    spouse: {
      name: string;
      class?: string;
      textClass?: string;
      extra?: any;
    };
    children?: DTreeNode[];
  }>;
  children?: DTreeNode[];
  extra?: any;
}

interface DTreeComponentProps {
  nodes: FNode[];
  rootId: string;
  onNodeClick: (nodeId: string) => void;
  onEditNode?: (nodeId: string) => void;
  onAddRelative?: (
    nodeId: string,
    relType: "father" | "mother" | "spouse" | "son" | "daughter",
  ) => void;
  onExternalTreeClick?: (treeId: string) => void;
  currentTreeId?: string;
}

export const DTreeComponent: React.FC<DTreeComponentProps> = ({
  nodes,
  rootId,
  onNodeClick,
  onEditNode,
  onAddRelative,
  onExternalTreeClick,
  currentTreeId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const prevRootIdRef = useRef<string | null>(null);
  const prevZoomRef = useRef<any>(null);
  const prevTreeIdRef = useRef<string | undefined>(currentTreeId);
  // Track previous mainId so we only auto-center when mainId actually changes
  const prevMainIdRef = useRef<string | null>(null);

  // Expand/collapse state: which node is the "main" focused node
  const [mainId, setMainId] = useState<string | null>(null);
  // Ref to track mainId for the renderer callback (avoids stale closure)
  const mainIdRef = useRef<string | null>(null);
  // Track which node has placeholder "add relative" nodes shown in the tree
  const [addMenuNodeId, setAddMenuNodeId] = useState<string | null>(null);
  const addMenuNodeIdRef = useRef<string | null>(null);
  // When true, the full tree is shown without any collapse behaviour
  const [showFullTree, setShowFullTree] = useState(true);

  // Mobile detection — narrow viewport
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const isMobileRef = useRef(isMobile);

  // Bottom sheet state for mobile (shows Edit / Add Relative actions)
  const [mobileSheetNodeId, setMobileSheetNodeId] = useState<string | null>(
    null,
  );
  const mobileSheetNode = mobileSheetNodeId
    ? nodes.find((n) => n.id === mobileSheetNodeId) || null
    : null;

  // Keep refs in sync
  useEffect(() => {
    mainIdRef.current = mainId;
  }, [mainId]);
  useEffect(() => {
    addMenuNodeIdRef.current = addMenuNodeId;
  }, [addMenuNodeId]);

  // Keep isMobile in sync and listen for resize
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleNodeTap = useCallback(
    (nodeId: string) => {
      // Check window width directly to ensure mobile check is always fresh
      const isSmallScreen = window.innerWidth < 768;

      // On small screens, show action bar with edit/add actions
      if (isSmallScreen) {
        setMobileSheetNodeId(nodeId);
      } else {
        // On larger screens, ensure we clear any mobile sheet state
        setMobileSheetNodeId(null);
      }

      // When full tree mode is on, skip expand/collapse
      if (showFullTree) return;

      // If tapping the same node that's already focused, do nothing extra
      if (mainId === nodeId) {
        return;
      }

      // Close any open add-menu when switching focus
      setAddMenuNodeId(null);
      // Focus this node (expand/collapse)
      setMainId(nodeId);
    },
    [mainId, showFullTree],
  );

  // Stable ref so touch/click handlers always call the latest handleNodeTap
  // without needing it in useEffect deps (avoids cascading tree rebuilds)
  const handleNodeTapRef = useRef(handleNodeTap);
  useEffect(() => {
    handleNodeTapRef.current = handleNodeTap;
  }, [handleNodeTap]);

  useEffect(() => {
    // Event delegation for icons and placeholder clicks
    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // --- External tree link ---
      const linkButton = target.closest(".external-tree-icon");
      if (linkButton) {
        e.preventDefault();
        e.stopPropagation();
        const tid = linkButton.getAttribute("data-tree-id");
        if (tid && onExternalTreeClick) {
          onExternalTreeClick(tid);
        }
        return;
      }

      // --- Placeholder "add relative" card clicked ---
      const placeholderTarget = target.closest(".placeholder-click-target");
      if (placeholderTarget) {
        e.preventDefault();
        e.stopPropagation();
        const relType = placeholderTarget.getAttribute("data-rel-type") as
          | "father"
          | "mother"
          | "spouse"
          | "son"
          | "daughter";
        const targetNodeId = placeholderTarget.getAttribute(
          "data-target-node-id",
        );
        if (relType && targetNodeId && onAddRelative) {
          setAddMenuNodeId(null);
          onAddRelative(targetNodeId, relType);
        }
        return;
      }

      // --- Edit icon ---
      const editIcon = target.closest(".node-edit-icon");
      if (editIcon) {
        e.preventDefault();
        e.stopPropagation();
        const nodeId = editIcon.getAttribute("data-node-id");
        if (nodeId && onEditNode) {
          onEditNode(nodeId);
        }
        return;
      }

      // --- Add icon (toggle placeholder nodes in tree) ---
      const addIcon = target.closest(".node-add-icon");
      if (addIcon) {
        e.preventDefault();
        e.stopPropagation();
        const nodeId = addIcon.getAttribute("data-node-id");
        if (nodeId) {
          setAddMenuNodeId((prev) => (prev === nodeId ? null : nodeId));
        }
        return;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("click", handleContainerClick);
    }

    // --- Mobile touch tap detection ---
    // D3 zoom can consume touch events, preventing click from firing on nodes.
    // We detect a quick tap (short duration, minimal movement) on a node card
    // and call handleNodeTap directly.
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const dt = Date.now() - touchStartTime;
      if (dt > 300 || e.changedTouches.length !== 1) return; // not a quick tap

      const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (dx > 10 || dy > 10) return; // finger moved too much — it was a pan

      const target = document.elementFromPoint(
        e.changedTouches[0].clientX,
        e.changedTouches[0].clientY,
      ) as Element | null;
      if (!target) return;

      // Check if tap landed on a node card (find closest g.node with __data__)
      const nodeG = target.closest("g.node") as any;
      if (nodeG && nodeG.__data__) {
        const d = nodeG.__data__;
        if (
          d.data?.extra?.id &&
          !d.data?.extra?._placeholder &&
          !d.data?.isMarriage
        ) {
          handleNodeTapRef.current(d.data.extra.id);
        }
      }
    };

    if (container) {
      // Use capture phase to ensure we catch touch events even if D3 stops propagation
      container.addEventListener("touchstart", handleTouchStart, {
        passive: true,
        capture: true,
      });
      container.addEventListener("touchend", handleTouchEnd, {
        passive: true,
        capture: true,
      });
    }

    return () => {
      if (container) {
        container.removeEventListener("click", handleContainerClick);
        container.removeEventListener("touchstart", handleTouchStart, {
          capture: true,
        });
        container.removeEventListener("touchend", handleTouchEnd, {
          capture: true,
        });
      }
    };
  }, [onExternalTreeClick, onEditNode, onAddRelative]);

  // Helper: check if 'ancestorId' is an ancestor of 'targetId'
  // Traverses parent links AND spouse connections so that a spouse from
  // a different tree is still reachable via their partner in the current tree.
  const isAncestorOf = (ancestorId: string, targetId: string): boolean => {
    const visited = new Set<string>();
    const queue = [targetId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const node = nodes.find((n) => n.id === currentId);
      if (!node) continue;
      // Traverse parent links
      for (const parent of node.parents || []) {
        if (parent.id === ancestorId) return true;
        queue.push(parent.id);
      }
      // Also traverse spouse connections — if this node is a spouse of
      // someone else, that partner is an implicit path to the root.
      for (const n of nodes) {
        if (n.spouses?.some((s) => s.id === currentId) && !visited.has(n.id)) {
          if (n.id === ancestorId) return true;
          queue.push(n.id);
        }
      }
    }
    return false;
  };

  // Convert FNode format to dTree format
  // When mainId is set, we collapse branches that aren't on the path to mainId
  const convertToTreeFormat = (
    personId: string,
    visited = new Set<string>(),
    depth = 0,
  ): DTreeNode | null => {
    if (visited.has(personId)) return null;
    visited.add(personId);

    const person = nodes.find((n) => n.id === personId);
    if (!person) return null;

    // Determine if this node is the focused "main" node
    const isMainNode = mainId === personId;
    const isOnMainPath = mainId ? isAncestorOf(personId, mainId) : true; // no mainId = show everything

    // Expand/collapse logic:
    // - If showFullTree is on, always expand everything
    // - If no mainId set, show everything (no collapse)
    // - If mainId is set:
    //   - Always expand ancestors of mainId (path to root)
    //   - Always expand mainId's own children/spouses (depth 1)
    //   - Collapse other branches (don't expand their children)
    const shouldExpandChildren =
      showFullTree || !mainId || isOnMainPath || isMainNode;

    const treeNode: DTreeNode = {
      name: person.name,
      class:
        person.gender === "male"
          ? "man"
          : person.gender === "female"
            ? "woman"
            : "person",
      textClass: "nodeText",
      depthOffset: 0,
      extra: {
        id: person.id,
        dob: person.dob,
        gender: person.gender,
        hierarchy: person.hierarchy,
        treeId: person.treeId,
        photo: person.photo,
        isAlive: person.isAlive,
        parentsCount: person.parents?.length || 0,
        childrenCount: person.children?.length || 0,
        spousesCount: person.spouses?.length || 0,
      },
    };

    // Check if this node has the add-menu open (placeholder nodes should appear)
    // On mobile, placeholders are skipped — the bottom sheet handles add-relative actions directly
    const showPlaceholders =
      !isMobileRef.current && addMenuNodeIdRef.current === personId;

    // If person has spouses, create marriages with children
    if (person.spouses && person.spouses.length > 0) {
      treeNode.marriages = [];

      person.spouses.forEach((spouse, index) => {
        const spouseNode = nodes.find((n) => n.id === spouse.id);
        if (!spouseNode) return;

        // Find children that belong to this specific marriage
        const marriageChildren: DTreeNode[] = [];

        if (shouldExpandChildren) {
          person.children?.forEach((child) => {
            if (visited.has(child.id)) return;

            const childNode = nodes.find((n) => n.id === child.id);
            if (!childNode) return;

            // Check if this child belongs to this marriage
            // A child belongs to a marriage if one parent is the person and the other is the spouse
            const hasPersonAsParent = childNode.parents?.some(
              (p) => p.id === person.id,
            );
            const hasSpouseAsParent = childNode.parents?.some(
              (p) => p.id === spouse.id,
            );

            if (hasPersonAsParent && hasSpouseAsParent) {
              const childTreeNode = convertToTreeFormat(
                child.id,
                visited,
                depth + 1,
              );
              if (childTreeNode) {
                marriageChildren.push(childTreeNode);
              }
            }
          });
        } // end shouldExpandChildren

        // Inject child placeholders (son/daughter) into every marriage
        // when either the main person OR the spouse has their add-menu open
        const showSpousePlaceholders =
          !isMobileRef.current && addMenuNodeIdRef.current === spouseNode.id;
        if (showPlaceholders || showSpousePlaceholders) {
          // Target the node whose add icon was clicked
          const placeholderTarget = showSpousePlaceholders
            ? spouseNode.id
            : personId;
          marriageChildren.push({
            name: "Add Son",
            class: "man",
            textClass: "nodeText",
            extra: {
              _placeholder: true,
              _placeholderType: "son",
              _targetNodeId: placeholderTarget,
            },
          });
          marriageChildren.push({
            name: "Add Daughter",
            class: "woman",
            textClass: "nodeText",
            extra: {
              _placeholder: true,
              _placeholderType: "daughter",
              _targetNodeId: placeholderTarget,
            },
          });
        }

        treeNode.marriages.push({
          spouse: {
            name: spouseNode.name,
            class:
              spouseNode.gender === "male"
                ? "man"
                : spouseNode.gender === "female"
                  ? "woman"
                  : "person",
            textClass: "nodeText",
            extra: {
              id: spouseNode.id,
              dob: spouseNode.dob,
              gender: spouseNode.gender,
              hierarchy: spouseNode.hierarchy,
              treeId: spouseNode.treeId,
              photo: spouseNode.photo,
              isAlive: spouseNode.isAlive,
              parentsCount: spouseNode.parents?.length || 0,
              childrenCount: spouseNode.children?.length || 0,
              spousesCount: spouseNode.spouses?.length || 0,
            },
          },
          children: marriageChildren.length > 0 ? marriageChildren : undefined,
        });
      });

      // Add a placeholder spouse marriage if placeholders are shown
      if (showPlaceholders) {
        const spouseClass = person.gender === "female" ? "man" : "woman";
        treeNode.marriages.push({
          spouse: {
            name: "Add Spouse",
            class: spouseClass,
            textClass: "nodeText",
            extra: {
              _placeholder: true,
              _placeholderType: "spouse",
              _targetNodeId: personId,
            },
          },
          children: undefined,
        });
      }
    }
    // If no spouses but has children, add them directly
    else if (
      shouldExpandChildren &&
      person.children &&
      person.children.length > 0
    ) {
      const children: DTreeNode[] = [];

      person.children.forEach((child) => {
        const childTreeNode = convertToTreeFormat(child.id, visited, depth + 1);
        if (childTreeNode) {
          children.push(childTreeNode);
        }
      });

      // Inject child placeholders
      if (showPlaceholders) {
        children.push({
          name: "Add Son",
          class: "man",
          textClass: "nodeText",
          extra: {
            _placeholder: true,
            _placeholderType: "son",
            _targetNodeId: personId,
          },
        });
        children.push({
          name: "Add Daughter",
          class: "woman",
          textClass: "nodeText",
          extra: {
            _placeholder: true,
            _placeholderType: "daughter",
            _targetNodeId: personId,
          },
        });
      }

      if (children.length > 0) {
        treeNode.children = children;
      }
    }
    // No spouses and no children — inject all placeholders as a single marriage
    // with son/daughter as children of that marriage (avoids layout conflicts
    // from having both treeNode.marriages and treeNode.children simultaneously)
    else if (showPlaceholders) {
      const spouseClass = person.gender === "female" ? "man" : "woman";
      treeNode.marriages = [
        {
          spouse: {
            name: "Add Spouse",
            class: spouseClass,
            textClass: "nodeText",
            extra: {
              _placeholder: true,
              _placeholderType: "spouse",
              _targetNodeId: personId,
            },
          },
          children: [
            {
              name: "Add Son",
              class: "man",
              textClass: "nodeText",
              extra: {
                _placeholder: true,
                _placeholderType: "son",
                _targetNodeId: personId,
              },
            },
            {
              name: "Add Daughter",
              class: "woman",
              textClass: "nodeText",
              extra: {
                _placeholder: true,
                _placeholderType: "daughter",
                _targetNodeId: personId,
              },
            },
          ],
        },
      ];
    }

    return treeNode;
  };

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Check if user has switched to a completely different tree
    const isNewTree = prevTreeIdRef.current !== currentTreeId;
    const hasRendered = containerRef.current.querySelector("svg") !== null;
    const shouldAnimate = isNewTree || !hasRendered;

    // Capture zoom state explicitly before clearing, ONLY if it's the same tree context
    let currentZoom: any = null;

    if (!isNewTree) {
      const existingSvg = containerRef.current.querySelector("svg");
      if (existingSvg) {
        currentZoom = d3.zoomTransform(existingSvg);
      } else {
        // Fallback to cleanup ref if DOM is already empty
        currentZoom = prevZoomRef.current;
      }
    } else {
      // Reset zoom for new tree so it centers correctly
      currentZoom = null;
      prevZoomRef.current = null;
    }

    // Clear previous tree
    d3.select(containerRef.current).selectAll("*").remove();

    const rootNode = convertToTreeFormat(rootId);
    if (!rootNode) {
      console.error("Could not find root node with ID:", rootId);
      return;
    }

    try {
      // Set a unique ID for the container
      const containerId = "dtree-container";
      containerRef.current.id = containerId;

      const containerWidth = containerRef.current.clientWidth || 1200;
      const containerHeight = containerRef.current.clientHeight || 800;

      // dynamic sizing calculation
      const margin = {
        top: 80,
        right: 90,
        bottom: 20,
        left: 90,
      };

      const width = Math.max(containerWidth - margin.left - margin.right, 300);
      const height = Math.max(
        containerHeight - margin.top - margin.bottom,
        300,
      );

      treeRef.current = dTree.init([rootNode], {
        target: `#${containerId}`,
        width: width,
        height: height,
        debug: true,
        duration: 0,
        margin: margin,
        nodeWidth: CARD_DIM.w,
        callbacks: {
          nodeClick: (
            name: string,
            extra: any,
            id: string,
            event?: MouseEvent,
          ) => {
            // Skip expand/collapse if the click was on an action icon or placeholder
            if (event) {
              const target = event.target as Element;
              if (
                target.closest(".node-edit-icon") ||
                target.closest(".node-add-icon") ||
                target.closest(".placeholder-click-target") ||
                target.closest(".external-tree-icon")
              ) {
                return;
              }
            }
            // Skip expand/collapse for placeholder nodes
            if (extra?._placeholder) {
              return;
            }
            if (extra && extra.id) {
              handleNodeTapRef.current(extra.id);
            }
          },
          nodeRenderer: (
            name: string,
            x: number,
            y: number,
            height: number,
            width: number,
            extra: any,
            id: string,
            nodeClass: string,
            textClass: string,
            textRenderer: Function,
          ) => {
            // Placeholder "add relative" cards get a special dashed-border renderer
            if (extra?._placeholder) {
              return renderPlaceholderCardSvg(name, extra, id, nodeClass);
            }
            const isMain = mainIdRef.current === extra?.id;
            return renderNodeCardSvg(
              name,
              extra,
              id,
              nodeClass,
              currentTreeId,
              isMain,
              isMobileRef.current,
            );
          },
          marriageRenderer: (
            x: number,
            y: number,
            height: number,
            width: number,
            extra: any,
            id: string,
            nodeClass: string,
          ) => {
            return renderMarriageNodeSvg(
              Math.min(height, width),
              id,
              nodeClass,
            );
          },
        },
      });

      // Determine if mainId actually changed (vs just addMenuNodeId toggling)
      const mainIdChanged = mainId !== prevMainIdRef.current;

      // Restore zoom state when tree structure hasn't fundamentally changed
      // (e.g. only addMenuNodeId toggled, or no mainId set)
      if (currentZoom && treeRef.current && (!mainId || !mainIdChanged)) {
        try {
          if (typeof treeRef.current.getBuilder === "function") {
            const builder = treeRef.current.getBuilder();
            if (builder && builder.zoom && builder.svg) {
              builder.svg.call(builder.zoom.transform, currentZoom);
            }
          }
        } catch (e) {
          console.warn("Failed to restore zoom state:", e);
        }
      }

      // Auto-center on the focused mainId node only when mainId actually changed
      if (mainId && mainIdChanged && treeRef.current && containerRef.current) {
        try {
          const svg = containerRef.current.querySelector("svg");
          if (svg) {
            // Find the <g> node whose extra.id matches mainId
            const allNodes = svg.querySelectorAll("g.node");
            let targetEl: SVGGElement | null = null;
            allNodes.forEach((g) => {
              const textEl = g.querySelector("text");
              // We stored extra.id in the node data; match via the g element's __data__
              const d = (g as any).__data__;
              if (d?.data?.extra?.id === mainId) {
                targetEl = g as SVGGElement;
              }
            });

            if (targetEl && typeof treeRef.current.getBuilder === "function") {
              const builder = treeRef.current.getBuilder();
              if (builder && builder.zoom && builder.svg) {
                const transform = (targetEl as SVGGElement).getAttribute(
                  "transform",
                );
                const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
                if (match) {
                  const nodeX = parseFloat(match[1]);
                  const nodeY = parseFloat(match[2]);
                  const cw = containerRef.current!.clientWidth;
                  const ch = containerRef.current!.clientHeight;
                  // Center the target node in the viewport
                  const scale = 1;
                  const tx = cw / 2 - nodeX * scale;
                  const ty = ch / 2 - nodeY * scale;
                  const newTransform = d3.zoomIdentity
                    .translate(tx, ty)
                    .scale(scale);
                  builder.svg
                    .transition()
                    .duration(300)
                    .call(builder.zoom.transform, newTransform);
                }
              }
            }
          }
        } catch (e) {
          console.warn("Failed to center on mainId node:", e);
        }
      }

      // Update refs to current state
      prevRootIdRef.current = rootId;
      prevTreeIdRef.current = currentTreeId;
      prevMainIdRef.current = mainId;
    } catch (error) {
      console.error("Error rendering dTree:", error);
      setError("Error rendering family tree. Please try refreshing the page.");
    }

    // Cleanup function: Capture zoom state BEFORE removing elements
    return () => {
      if (containerRef.current) {
        const svgElement = containerRef.current.querySelector("svg");
        if (svgElement) {
          prevZoomRef.current = d3.zoomTransform(svgElement);
        }
        d3.select(containerRef.current).selectAll("*").remove();
      }
    };
  }, [nodes, rootId, mainId, addMenuNodeId]);

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Toggle to show the full tree without collapse */}
      <label
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255,255,255,0.92)",
          padding: "4px 10px",
          borderRadius: 6,
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          fontSize: 13,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={showFullTree}
          onChange={(e) => {
            const checked = e.target.checked;
            setShowFullTree(checked);
            if (checked) {
              // Clear collapse focus so the full tree renders
              setMainId(null);
            }
          }}
          style={{ cursor: "pointer" }}
        />
        Show Full Tree
      </label>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          touchAction: "none",
          cursor: "grab",
        }}
      />

      {/* Mobile inline action bar — no backdrop, tree shrinks to make room */}
      {mobileSheetNode && (
        <div
          style={{
            width: "100%",
            background: "#fff",
            borderTop: "1px solid #e0e0e0",
            padding: "8px 12px calc(8px + env(safe-area-inset-bottom))",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
            animation: "slideUp 0.15s ease-out",
            flexShrink: 0,
          }}
        >
          {/* Node name + close */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>
              {mobileSheetNode.name}
            </span>
            <button
              onClick={() => setMobileSheetNodeId(null)}
              style={{
                background: "none",
                border: "none",
                fontSize: 18,
                color: "#999",
                cursor: "pointer",
                padding: "2px 6px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          {/* Action buttons — single row */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                setMobileSheetNodeId(null);
                onEditNode?.(mobileSheetNode.id);
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                border: "1px solid #1976d2",
                borderRadius: 8,
                background: "#e3f2fd",
                color: "#1565c0",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => {
                const nid = mobileSheetNode.id;
                setMobileSheetNodeId(null);
                onAddRelative?.(nid, "spouse");
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                border: "1px solid #4caf50",
                borderRadius: 8,
                background: "#e8f5e9",
                color: "#2e7d32",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              💍 Spouse
            </button>
            <button
              onClick={() => {
                const nid = mobileSheetNode.id;
                setMobileSheetNodeId(null);
                onAddRelative?.(nid, "son");
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                border: "1px solid #1976d2",
                borderRadius: 8,
                background: "#e3f2fd",
                color: "#1565c0",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              👦 Son
            </button>
            <button
              onClick={() => {
                const nid = mobileSheetNode.id;
                setMobileSheetNodeId(null);
                onAddRelative?.(nid, "daughter");
              }}
              style={{
                flex: 1,
                padding: "10px 0",
                border: "1px solid #e91e63",
                borderRadius: 8,
                background: "#fce4ec",
                color: "#c2185b",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              👧 Daughter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
