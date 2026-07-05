import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { VirtualElement } from "@popperjs/core";
import { select } from "d3-selection";
import { zoomIdentity, zoomTransform } from "d3-zoom";
import "d3-transition";
import MuiBox from "@mui/material/Box";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Popper from "@mui/material/Popper";
import Popover from "@mui/material/Popover";
import IconButton from "@mui/material/IconButton";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import dTree from "./dTree";
import "./dTree.css";
import {
  renderNodeCardSvg,
  renderMarriageNodeSvg,
  renderPlaceholderCardSvg,
  CARD_DIM,
} from "../../components/DTree/NodeCard";
import type {
  TreeViewerFeatureFlags,
  TreeViewerLanguage,
  TreeViewerNode,
  TreeViewerProps,
  TreeViewerRelation,
  TreeViewerRenderers,
} from "./types";

const TREE_INTERACTION_HINT_KEY = "kinvia-tree-interaction-hint-dismissed";

function createVirtualAnchor(element: Element): any {
  return element;
}

interface DTreeNode {
  name: string;
  class?: string;
  textClass?: string;
  depthOffset?: number;
  marriages?: Array<{
    extra?: any;
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

const isAnniversaryToday = (dateValue?: string) => {
  if (!dateValue) return false;

  const normalized = dateValue.trim();
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let month: number | undefined;
  let day: number | undefined;

  if (dateOnlyMatch) {
    month = Number(dateOnlyMatch[2]);
    day = Number(dateOnlyMatch[3]);
  } else {
    const parsedDate = new Date(normalized);
    if (Number.isNaN(parsedDate.getTime())) return false;
    month = parsedDate.getMonth() + 1;
    day = parsedDate.getDate();
  }

  const today = new Date();
  return month === today.getMonth() + 1 && day === today.getDate();
};

export const TreeViewer: React.FC<TreeViewerProps> = ({
  nodes,
  rootId,
  canEditTree = true,
  canEditNode,
  autoExpandNodeId,
  onAutoExpandHandled,
  onNodeClick,
  onNodeFocus,
  onEditNode,
  onAddRelative,
  onViewDetails,
  onDelete,
  onExternalTreeClick,
  currentTreeId,
  highlightedPersonId,
  onMobileSheetChange,
  initialMainId = null,
  initialShowFullTree = true,
  initialShowSpouses = true,
  initialLanguage = "hindi",
  onPreferencesChange,
  features,
  renderers,
  renderNodeSheet,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const prevRootIdRef = useRef<string | null>(null);
  const prevZoomRef = useRef<any>(null);
  const prevTreeIdRef = useRef<string | undefined>(currentTreeId);
  // Track previous mainId so we only auto-center when mainId actually changes
  const prevMainIdRef = useRef<string | null>(null);
  // Track one-time URL focus requests so re-renders don't keep re-centering.
  const prevHighlightedFocusKeyRef = useRef<string | null>(null);

  // Track if we have centered on the initial mainId in collapsed mode
  const hasCenteredInitialRef = useRef(false);

  // Expand/collapse state: which node is the "main" focused node
  const [mainId, setMainId] = useState<string | null>(initialMainId);
  // Ref to track mainId for the renderer callback (avoids stale closure)
  const mainIdRef = useRef<string | null>(initialMainId);
  // Per-marriage collapse state for multi-spouse people. Keyed by
  // `${personId}::${spouseId}`. A key being present means that marriage's
  // children are collapsed (hidden) even when the branch is otherwise expanded.
  const [collapsedMarriages, setCollapsedMarriages] = useState<Set<string>>(
    () => new Set(),
  );
  // Ref mirror so the click callback can read the latest value without a stale closure.
  const collapsedMarriagesRef = useRef<Set<string>>(collapsedMarriages);
  useEffect(() => {
    collapsedMarriagesRef.current = collapsedMarriages;
  }, [collapsedMarriages]);
  // Track which node has placeholder "add relative" nodes shown in the tree
  const [addMenuNodeId, setAddMenuNodeId] = useState<string | null>(null);
  const addMenuNodeIdRef = useRef<string | null>(null);
  // When true, the full tree is shown without any collapse behaviour
  const [showFullTree, setShowFullTree] = useState(initialShowFullTree);
  const [showSpouses, setShowSpouses] = useState(initialShowSpouses);
  const [treeLanguage, setTreeLanguage] =
    useState<TreeViewerLanguage>(initialLanguage);
  const [treeControlsAnchorEl, setTreeControlsAnchorEl] =
    useState<HTMLElement | null>(null);
  const effectiveFeatures: Required<TreeViewerFeatureFlags> = useMemo(
    () => ({
      allowToolbar: features?.allowToolbar ?? true,
      allowShowFullTreeToggle: features?.allowShowFullTreeToggle ?? true,
      allowShowSpousesToggle: features?.allowShowSpousesToggle ?? true,
      allowLanguageToggle: features?.allowLanguageToggle ?? true,
      allowFitControl: features?.allowFitControl ?? true,
      allowCenterControl: features?.allowCenterControl ?? true,
      allowHoverPreview: features?.allowHoverPreview ?? true,
      allowMobileActions: features?.allowMobileActions ?? true,
      allowPlaceholderActions: features?.allowPlaceholderActions ?? true,
      allowExternalTreeNavigation: features?.allowExternalTreeNavigation ?? true,
      allowEditAction: features?.allowEditAction ?? true,
      allowDeleteAction: features?.allowDeleteAction ?? true,
      allowViewDetailsAction: features?.allowViewDetailsAction ?? true,
      allowNameDetailsClick: features?.allowNameDetailsClick ?? true,
      alwaysShowNodeSheet: features?.alwaysShowNodeSheet ?? false,
    }),
    [features],
  );
  const effectiveRenderers: TreeViewerRenderers = useMemo(
    () => ({
      renderNodeCardSvg:
        renderers?.renderNodeCardSvg ??
        ((name, extra, id, nodeClass, context) =>
          renderNodeCardSvg(
            name,
            extra,
            id,
            nodeClass,
            context.currentTreeId,
            context.isMain,
            context.isHighlighted,
            context.isMobile,
            context.canEditNode ?? true,
            context.allowNameDetailsClick ?? true,
          )),
      renderPlaceholderCardSvg:
        renderers?.renderPlaceholderCardSvg ?? renderPlaceholderCardSvg,
      renderMarriageNodeSvg:
        renderers?.renderMarriageNodeSvg ?? renderMarriageNodeSvg,
      renderHoverContent: renderers?.renderHoverContent,
    }),
    [renderers],
  );

  // Catch the asynchronously loaded profile ID and apply it once.
  const hasAppliedInitialFocusRef = useRef(Boolean(initialMainId));
  useEffect(() => {
    if (initialMainId && !hasAppliedInitialFocusRef.current) {
      setMainId(initialMainId);
      setShowFullTree(initialShowFullTree);
      hasAppliedInitialFocusRef.current = true;
    }
  }, [initialMainId, initialShowFullTree]);

  useEffect(() => {
    setShowSpouses(initialShowSpouses);
  }, [initialShowSpouses]);

  useEffect(() => {
    setTreeLanguage(initialLanguage);
  }, [initialLanguage]);

  useEffect(() => {
    if (!highlightedPersonId && !initialMainId) {
      setShowFullTree(initialShowFullTree);
    }
  }, [highlightedPersonId, initialMainId, initialShowFullTree]);

  // Mobile detection — narrow viewport
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const isMobileRef = useRef(isMobile);
  // Timestamp of last tap handled by the touchend handler.
  // Used to suppress the synthetic click that the browser fires after touch,
  // which would otherwise hit a different node (the tree is rebuilt between
  // the touchend and the click because expand/collapse changes the layout).
  const lastTouchTapRef = useRef(0);

  // Bottom sheet state for mobile (shows Edit / Add Relative actions)
  const [mobileSheetNodeId, setMobileSheetNodeId] = useState<string | null>(
    null,
  );
  const [hoverInfo, setHoverInfo] = useState<{
    node: TreeViewerNode;
    anchorEl: Element;
  } | null>(null);
  const [showInteractionHint, setShowInteractionHint] = useState(false);
  const mobileSheetNode = mobileSheetNodeId
    ? nodes.find((n) => n.id === mobileSheetNodeId) || null
    : null;
  const parentNodes = mobileSheetNode
    ? mobileSheetNode.parents
        .map((p) => nodes.find((n) => n.id === p.id))
        .filter(Boolean)
    : [];
  const hasFather = parentNodes.some((p) => p?.gender === "male");
  const hasMother = parentNodes.some((p) => p?.gender === "female");
  const showFatherButton = !hasFather;
  const showMotherButton = !hasMother;
  const parentActionCount =
    (showFatherButton ? 1 : 0) + (showMotherButton ? 1 : 0) + 1;
  const parentActionColumns = `repeat(${parentActionCount}, 1fr)`;
  const isExternalNode = Boolean(
    currentTreeId &&
    mobileSheetNode?.treeId &&
    mobileSheetNode.treeId !== currentTreeId,
  );
  const isNodeEditable = useCallback(
    (nodeId?: string | null) => {
      if (!canEditTree || !nodeId) return false;
      return canEditNode ? canEditNode(nodeId) : true;
    },
    [canEditTree, canEditNode],
  );
  const canEditMobileNode = Boolean(mobileSheetNode && !isExternalNode && isNodeEditable(mobileSheetNode.id));
  const isTreeControlsOpen = Boolean(treeControlsAnchorEl);

  useEffect(() => {
    onPreferencesChange?.({
      showFullTree,
      showSpouses,
      language: treeLanguage,
    });
  }, [onPreferencesChange, showFullTree, showSpouses, treeLanguage]);

  const getPreferredName = useCallback(
    (person?: Pick<TreeViewerNode, "name" | "alternateName"> | null) => {
      if (!person) return "";
      if (treeLanguage === "hindi") {
        return person.alternateName?.trim() || person.name?.trim() || "";
      }
      return person.name?.trim() || person.alternateName?.trim() || "";
    },
    [treeLanguage],
  );

  const insertPlaceholdersNearMiddle = (
    list: DTreeNode[],
    placeholders: DTreeNode[],
  ) => {
    if (placeholders.length === 0) return;
    const insertIndex = Math.max(0, Math.floor(list.length / 2));
    list.splice(insertIndex, 0, ...placeholders);
  };

  const getParentFlags = (targetId: string) => {
    const targetNode = nodes.find((n) => n.id === targetId);
    const parentNodes = targetNode
      ? targetNode.parents
          .map((p) => nodes.find((n) => n.id === p.id))
          .filter(Boolean)
      : [];
    return {
      hasFather: parentNodes.some((p) => p?.gender === "male"),
      hasMother: parentNodes.some((p) => p?.gender === "female"),
    };
  };

  const buildParentPlaceholders = (targetId: string): DTreeNode[] => {
    const { hasFather, hasMother } = getParentFlags(targetId);
    const placeholders: DTreeNode[] = [];
    if (!hasFather) {
      placeholders.push({
        name: "Add Father",
        class: "man",
        textClass: "nodeText",
        extra: {
          _placeholder: true,
          _placeholderType: "father",
          _targetNodeId: targetId,
        },
      });
    }
    if (!hasMother) {
      placeholders.push({
        name: "Add Mother",
        class: "woman",
        textClass: "nodeText",
        extra: {
          _placeholder: true,
          _placeholderType: "mother",
          _targetNodeId: targetId,
        },
      });
    }
    return placeholders;
  };

  useEffect(() => {
    if (!onMobileSheetChange) return;
    onMobileSheetChange(
      effectiveFeatures.allowMobileActions &&
        Boolean(mobileSheetNodeId) &&
        (isMobileRef.current || effectiveFeatures.alwaysShowNodeSheet),
    );
  }, [
    effectiveFeatures.allowMobileActions,
    effectiveFeatures.alwaysShowNodeSheet,
    mobileSheetNodeId,
    onMobileSheetChange,
  ]);

  useEffect(() => {
    if (!rootId) return;

    try {
      const hasSeenHint = window.localStorage.getItem(TREE_INTERACTION_HINT_KEY);
      if (!hasSeenHint) {
        setShowInteractionHint(true);
      }
    } catch {
      setShowInteractionHint(true);
    }
  }, [rootId]);

  useEffect(() => {
    if (!showInteractionHint) return;

    const container = containerRef.current;
    if (!container) return;

    const dismissHint = () => {
      setShowInteractionHint(false);
      try {
        window.localStorage.setItem(TREE_INTERACTION_HINT_KEY, "1");
      } catch {
        // ignore storage failures
      }
    };

    const autoHideTimer = window.setTimeout(dismissHint, 7000);

    container.addEventListener("pointerdown", dismissHint, { once: true });
    container.addEventListener("wheel", dismissHint, { once: true });
    container.addEventListener("touchstart", dismissHint, { once: true });

    return () => {
      window.clearTimeout(autoHideTimer);
      container.removeEventListener("pointerdown", dismissHint);
      container.removeEventListener("wheel", dismissHint);
      container.removeEventListener("touchstart", dismissHint);
    };
  }, [showInteractionHint]);

  // Keep refs in sync
  useEffect(() => {
    mainIdRef.current = mainId;
  }, [mainId]);
  useEffect(() => {
    addMenuNodeIdRef.current = addMenuNodeId;
  }, [addMenuNodeId]);

  // Parent-driven focus request after add-child.
  // In collapsed mode, this expands the requested node's branch.
  useEffect(() => {
    if (!autoExpandNodeId) return;

    if (!showFullTree) {
      setAddMenuNodeId(null);
      setMainId(autoExpandNodeId);
    }

    onAutoExpandHandled?.();
  }, [autoExpandNodeId, showFullTree, onAutoExpandHandled]);

  // Keep isMobile in sync and listen for resize
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Center viewport on a person node (by their UUID, not dTree internal id).
  // Preserves the current zoom level and only pans.
  const centerOnNode = useCallback((personId: string) => {
    const getNodePosition = (nodeEl: SVGGElement): { x: number; y: number } | null => {
      const data = (nodeEl as any).__data__;
      if (typeof data?.x === "number" && typeof data?.y === "number") {
        return { x: data.x, y: data.y };
      }
      const transform = nodeEl.getAttribute("transform") || "";
      const match = transform.match(
        /translate\(\s*([-\d.]+)(?:[\s,]+)([-\d.]+)\s*\)/,
      );
      if (!match) return null;
      return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    };

    if (!containerRef.current || !treeRef.current) return;
    try {
      const svg = containerRef.current.querySelector("svg");
      if (!svg) return;
      const allGs = svg.querySelectorAll("g.node");
      let targetG: SVGGElement | null = null;
      allGs.forEach((g) => {
        const d = (g as any).__data__;
        if (d?.data?.extra?.id === personId) {
          targetG = g as SVGGElement;
        }
      });
      if (!targetG) return;
      const builder =
        typeof treeRef.current.getBuilder === "function"
          ? treeRef.current.getBuilder()
          : null;
      if (!builder?.zoom || !builder?.svg) return;
      const nodePos = getNodePosition(targetG as SVGGElement);
      if (!nodePos) return;
      const nodeX = nodePos.x;
      const nodeY = nodePos.y;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      // Keep current zoom scale so we only pan
      const currentTransform = zoomTransform(svg);
      const scale = currentTransform.k;
      const tx = cw / 2 - nodeX * scale;
      const ty = ch / 2 - nodeY * scale;
      const newTransform = zoomIdentity.translate(tx, ty).scale(scale);
      builder.svg
        .transition()
        .duration(300)
        .call(builder.zoom.transform, newTransform);
    } catch (e) {
      // silent
    }
  }, []);
  const centerOnNodeRef = useRef(centerOnNode);
  useEffect(() => {
    centerOnNodeRef.current = centerOnNode;
  }, [centerOnNode]);

  const fitTreeToViewport = useCallback((duration = 300) => {
    if (!treeRef.current || typeof treeRef.current.zoomToFit !== "function") {
      return;
    }
    try {
      treeRef.current.zoomToFit(duration);
    } catch (e) {
      console.warn("Failed to fit tree to viewport:", e);
    }
  }, []);

  const centerTreeInViewport = useCallback((duration = 300) => {
    if (!containerRef.current || !treeRef.current) return;

    try {
      const svg = containerRef.current.querySelector("svg");
      const builder =
        typeof treeRef.current.getBuilder === "function"
          ? treeRef.current.getBuilder()
          : null;
      if (!svg || !builder?.zoom || !builder?.svg || !builder?.g) return;

      const currentTransform = zoomTransform(svg);
      const scale = currentTransform.k;
      const groupBounds = builder.g.node().getBBox();
      const groupCenterX = groupBounds.x + groupBounds.width / 2;
      const groupCenterY = groupBounds.y + groupBounds.height / 2;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const tx = cw / 2 - groupCenterX * scale;
      const ty = ch / 2 - groupCenterY * scale;

      builder.svg
        .transition()
        .duration(duration)
        .call(builder.zoom.transform, zoomIdentity.translate(tx, ty).scale(scale));
    } catch (e) {
      console.warn("Failed to center tree in viewport:", e);
    }
  }, []);

  const resetTreeViewport = useCallback((duration = 300) => {
    if (!treeRef.current || typeof treeRef.current.resetZoom !== "function") {
      return;
    }
    try {
      treeRef.current.resetZoom(duration);
    } catch (e) {
      console.warn("Failed to reset tree viewport:", e);
    }
  }, []);

  // When the action sheet opens/closes, the in-flow sheet resizes the tree
  // container (it shrinks to make room, and grows back when dismissed). There
  // is no ResizeObserver on the container, so re-center explicitly within the
  // new visible area — this keeps the focused node from hiding behind the
  // sheet and makes "center" honor the tree container, not the whole viewport.
  const sheetRecenterInitRef = useRef(false);
  useEffect(() => {
    if (!sheetRecenterInitRef.current) {
      // Skip the initial mount; the load-time centering owns the first layout.
      sheetRecenterInitRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      if (mobileSheetNodeId) {
        centerOnNodeRef.current(mobileSheetNodeId);
      } else if (showFullTree) {
        centerTreeInViewport(220);
      } else if (mainId) {
        centerOnNodeRef.current(mainId);
      } else if (rootId) {
        centerOnNodeRef.current(rootId);
      }
    }, 90);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileSheetNodeId]);

  const handleNodeTap = useCallback(
    (nodeId: string) => {
      // Check window width directly to ensure mobile check is always fresh
      const isSmallScreen = window.innerWidth < 768;
      // The sheet is used on small screens, or on any screen when the caller
      // opts in via `alwaysShowNodeSheet` (e.g. the onboarding preview supplies
      // a custom sheet body on desktop too).
      const useSheet =
        effectiveFeatures.allowMobileActions &&
        (isSmallScreen || effectiveFeatures.alwaysShowNodeSheet);

      onNodeClick?.(nodeId);

      // Show the action sheet with node actions / custom content
      if (useSheet) {
        setMobileSheetNodeId(nodeId);
      } else {
        // Otherwise ensure any open sheet is cleared
        setMobileSheetNodeId(null);
      }

      // In full-tree mode, center immediately and skip expand/collapse.
      // In collapsed mode, center only once after expansion/rebuild to avoid
      // double-pan flicker.
      if (showFullTree) {
        centerOnNodeRef.current(nodeId);
        return;
      }

      // Per-spouse collapse: tapping a spouse of the currently focused person
      // toggles just that marriage's children, leaving other marriages expanded
      // (instead of switching focus to the spouse).
      const handledByMobileSheet = useSheet;
      if (!handledByMobileSheet && mainId && nodeId !== mainId) {
        const focusedNode = nodes.find((n) => n.id === mainId);
        if (focusedNode?.spouses?.some((s) => s.id === nodeId)) {
          const key = `${mainId}::${nodeId}`;
          setCollapsedMarriages((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
          return;
        }
      }

      // If tapping the same node that's already focused, do nothing extra
      if (mainId === nodeId) {
        return;
      }

      // Close any open add-menu when switching focus
      setAddMenuNodeId(null);
      // Focus this node (expand/collapse)
      setMainId(nodeId);
      onNodeFocus?.(nodeId);
    },
    [
      effectiveFeatures.allowMobileActions,
      effectiveFeatures.alwaysShowNodeSheet,
      mainId,
      nodes,
      onNodeClick,
      onNodeFocus,
      showFullTree,
    ],
  );

  // Stable ref so touch/click handlers always call the latest handleNodeTap
  // without needing it in useEffect deps (avoids cascading tree rebuilds)
  const handleNodeTapRef = useRef(handleNodeTap);
  useEffect(() => {
    handleNodeTapRef.current = handleNodeTap;
  }, [handleNodeTap]);

  useEffect(() => {
    const formatDate = (value?: string) => {
      if (!value) return "";
      const raw = String(value).trim();
      const datePart = raw.includes("T") ? raw.split("T")[0] : raw;
      const parts = datePart.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        if (y.length === 4) return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      }
      return value;
    };

    // Event delegation for icons and placeholder clicks
    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setHoverInfo(null);

      // --- Node name clicked: open the same details panel as double-click ---
      const nodeName = target.closest(".node-name-click-target");
      if (
        nodeName &&
        effectiveFeatures.allowNameDetailsClick &&
        effectiveFeatures.allowViewDetailsAction &&
        onViewDetails
      ) {
        e.preventDefault();
        e.stopPropagation();
        const nodeId = nodeName.getAttribute("data-node-id");
        if (nodeId) {
          onViewDetails(nodeId);
        }
        return;
      }

      // --- External tree link ---
      const linkButton = target.closest(".external-tree-icon");
      if (linkButton) {
        e.preventDefault();
        e.stopPropagation();
        const tid = linkButton.getAttribute("data-tree-id");
        const pid = linkButton.getAttribute("data-person-id");
        if (
          effectiveFeatures.allowExternalTreeNavigation &&
          tid &&
          onExternalTreeClick
        ) {
          onExternalTreeClick(tid, pid || undefined);
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
        if (
          effectiveFeatures.allowPlaceholderActions &&
          relType &&
          targetNodeId &&
          isNodeEditable(targetNodeId) &&
          onAddRelative
        ) {
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
        if (
          effectiveFeatures.allowEditAction &&
          nodeId &&
          isNodeEditable(nodeId) &&
          onEditNode
        ) {
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
        if (
          effectiveFeatures.allowPlaceholderActions &&
          nodeId &&
          isNodeEditable(nodeId)
        ) {
          setAddMenuNodeId((prev) => (prev === nodeId ? null : nodeId));
        }
        return;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("click", handleContainerClick);
    }

    const handleContainerMouseMove = (e: MouseEvent) => {
      if (isMobileRef.current || !effectiveFeatures.allowHoverPreview) return;
      const target = e.target as Element | null;
      if (!target) return;
      if (
        target.closest(".node-edit-icon") ||
        target.closest(".node-add-icon") ||
        target.closest(".readonly-badge") ||
        target.closest(".external-tree-icon") ||
        target.closest(".placeholder-click-target")
      ) {
        setHoverInfo((prev) => prev !== null ? null : prev);
        return;
      }
      const nodeG = target.closest("g.node") as any;
      if (!nodeG || !nodeG.__data__) {
        setHoverInfo((prev) => prev !== null ? null : prev);
        return;
      }
      const d = nodeG.__data__;
      if (d.data?.extra?._placeholder || d.data?.isMarriage || !d.data?.extra?.id) {
        setHoverInfo((prev) => prev !== null ? null : prev);
        return;
      }
      const hovered = nodes.find((n) => n.id === d.data.extra.id);
      if (!hovered) {
        setHoverInfo(null);
        return;
      }
      // Capture the mouse coordinates at the time of hover entry.
      // This creates a perfectly stable VirtualElement that Popper.js strictly supports
      // without triggering SVG offsetParent bugs or 60fps renders.
      const initialClientX = e.clientX;
      const initialClientY = e.clientY;
      
      setHoverInfo((prev) => {
        if (prev && prev.node.id === hovered.id) {
          return prev;
        }
        return {
          node: {
            ...hovered,
            dob: formatDate(hovered.dob),
          },
          anchorEl: {
            getBoundingClientRect: () => ({
              top: initialClientY,
              left: initialClientX,
              right: initialClientX,
              bottom: initialClientY,
              width: 0,
              height: 0,
              x: initialClientX,
              y: initialClientY,
            }),
          } as any,
        };
      });
    };

    const handleContainerMouseLeave = () => {
      setHoverInfo(null);
    };

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

      const nodeName = target.closest(".node-name-click-target");
      if (
        nodeName &&
        effectiveFeatures.allowNameDetailsClick &&
        effectiveFeatures.allowViewDetailsAction &&
        onViewDetails
      ) {
        const nodeId = nodeName.getAttribute("data-node-id");
        if (nodeId) {
          lastTouchTapRef.current = Date.now();
          onViewDetails(nodeId);
        }
        return;
      }

      // Check if tap landed on a node card (find closest g.node with __data__)
      const nodeG = target.closest("g.node") as any;
      if (nodeG && nodeG.__data__) {
        const d = nodeG.__data__;
        if (
          d.data?.extra?.id &&
          !d.data?.extra?._placeholder &&
          !d.data?.isMarriage
        ) {
          // Mark the time so the upcoming synthetic click is suppressed
          lastTouchTapRef.current = Date.now();
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
      container.addEventListener("mousemove", handleContainerMouseMove);
      container.addEventListener("mouseleave", handleContainerMouseLeave);
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
        container.removeEventListener("mousemove", handleContainerMouseMove);
        container.removeEventListener("mouseleave", handleContainerMouseLeave);
      }
    };
  }, [
    effectiveFeatures.allowEditAction,
    effectiveFeatures.allowExternalTreeNavigation,
    effectiveFeatures.allowHoverPreview,
    effectiveFeatures.allowNameDetailsClick,
    effectiveFeatures.allowPlaceholderActions,
    effectiveFeatures.allowViewDetailsAction,
    onExternalTreeClick,
    onEditNode,
    onViewDetails,
    onAddRelative,
    isNodeEditable,
    nodes,
  ]);

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
      if (showSpouses) {
        // Also traverse spouse connections — if this node is a spouse of
        // someone else, that partner is an implicit path to the root.
        for (const n of nodes) {
          if (n.spouses?.some((s) => s.id === currentId) && !visited.has(n.id)) {
            if (n.id === ancestorId) return true;
            queue.push(n.id);
          }
        }
      }
    }
    return false;
  };

  // Convert normalized tree-viewer node format to dTree format
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
    const canEditCurrentPerson = isNodeEditable(personId);
    const visibleSpouses = showSpouses ? person.spouses || [] : [];

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
      name: getPreferredName(person),
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
        nameEnglish: person.name,
        nameHindi: person.alternateName,
        preferredName: getPreferredName(person),
        dob: person.dob,
        gender: person.gender,
        hierarchy: person.hierarchy,
        treeId: person.treeId,
        photo: person.photo,
        isAlive: person.isAlive,
        parentsCount: person.parents?.length || 0,
        childrenCount: person.children?.length || 0,
        spousesCount: person.spouses?.length || 0,
        canEditNode: canEditCurrentPerson,
        isReadOnly: !canEditCurrentPerson,
      },
    };

    // Check if this node has the add-menu open (placeholder nodes should appear)
    // On mobile, placeholders are skipped — the bottom sheet handles add-relative actions directly
    const showPlaceholders =
      !isMobileRef.current &&
      effectiveFeatures.allowPlaceholderActions &&
      isNodeEditable(personId) &&
      addMenuNodeIdRef.current === personId;
    const shouldWrapWithParentPlaceholders =
      showPlaceholders && (!person.parents || person.parents.length === 0);
    const addMenuChildId = addMenuNodeIdRef.current;
    const addMenuChild = addMenuChildId
      ? nodes.find((n) => n.id === addMenuChildId)
      : null;
    const addMissingParentForChild = Boolean(
      addMenuChild &&
      addMenuChild.parents?.length === 1 &&
      addMenuChild.parents.some((p) => p.id === personId) &&
      !isMobileRef.current,
    );

    // If person has spouses, create marriages with children
    if (visibleSpouses.length > 0) {
      treeNode.marriages = [];

      visibleSpouses.forEach((spouse: TreeViewerRelation) => {
        const spouseNode = nodes.find((n) => n.id === spouse.id);
        if (!spouseNode) return;
        const canEditSpouseNode = isNodeEditable(spouseNode.id);

        // A child belongs to this marriage when one parent is the person and the
        // other is this specific spouse.
        const belongsToThisMarriage = (childNode: TreeViewerNode | undefined) => {
          if (!childNode) return false;
          const hasPersonAsParent = childNode.parents?.some(
            (p) => p.id === person.id,
          );
          const hasSpouseAsParent = childNode.parents?.some(
            (p) => p.id === spouse.id,
          );
          return Boolean(hasPersonAsParent && hasSpouseAsParent);
        };

        // Count of children for THIS marriage only (independent of expand state),
        // so each spouse link shows its own count instead of the person's total.
        const marriageChildCount = (person.children || []).reduce(
          (acc, child) =>
            belongsToThisMarriage(nodes.find((n) => n.id === child.id))
              ? acc + 1
              : acc,
          0,
        );

        // This marriage can be individually collapsed even when the branch is expanded.
        const isMarriageCollapsed = collapsedMarriages.has(
          `${person.id}::${spouse.id}`,
        );

        // Find children that belong to this specific marriage
        const marriageChildren: DTreeNode[] = [];

        if (shouldExpandChildren && !isMarriageCollapsed) {
          person.children?.forEach((child) => {
            if (visited.has(child.id)) return;
            if (addMissingParentForChild && child.id === addMenuChildId) {
              return;
            }

            const childNode = nodes.find((n) => n.id === child.id);
            if (!childNode) return;

            if (belongsToThisMarriage(childNode)) {
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
        } // end shouldExpandChildren && !isMarriageCollapsed

        // Inject child placeholders (son/daughter) into every marriage
        // when either the main person OR the spouse has their add-menu open
        const showSpousePlaceholders =
          !isMobileRef.current &&
          effectiveFeatures.allowPlaceholderActions &&
          isNodeEditable(spouseNode.id) &&
          addMenuNodeIdRef.current === spouseNode.id;
        if (showPlaceholders || showSpousePlaceholders) {
          // Target the node whose add icon was clicked
          const placeholderTarget = showSpousePlaceholders
            ? spouseNode.id
            : personId;
          // When adding relatives from the spouse card, only show child actions.
          // Parent placeholders are relevant to the primary node add flow.
          const parentPlaceholders = showSpousePlaceholders
            ? []
            : showPlaceholders && shouldWrapWithParentPlaceholders
              ? []
              : buildParentPlaceholders(placeholderTarget);
          const childPlaceholders: DTreeNode[] = [
            {
              name: "Add Son",
              class: "man",
              textClass: "nodeText",
              extra: {
                _placeholder: true,
                _placeholderType: "son",
                _targetNodeId: placeholderTarget,
              },
            },
            {
              name: "Add Daughter",
              class: "woman",
              textClass: "nodeText",
              extra: {
                _placeholder: true,
                _placeholderType: "daughter",
                _targetNodeId: placeholderTarget,
              },
            },
          ];
          const allPlaceholders = [...parentPlaceholders, ...childPlaceholders];
          insertPlaceholdersNearMiddle(marriageChildren, allPlaceholders);
        }

        treeNode.marriages.push({
          extra: {
            relationType: spouse.type,
            isAnniversary: spouse.type === "married" && isAnniversaryToday(spouse.startDate),
            hasDeceasedPartner:
              person.isAlive === false || spouseNode.isAlive === false,
            isReadOnly: !canEditCurrentPerson || !canEditSpouseNode,
          },
          spouse: {
            name: getPreferredName(spouseNode),
            class:
              spouseNode.gender === "male"
                ? "man"
                : spouseNode.gender === "female"
                  ? "woman"
                  : "person",
            textClass: "nodeText",
            extra: {
              id: spouseNode.id,
              nameEnglish: spouseNode.name,
              nameHindi: spouseNode.alternateName,
              preferredName: getPreferredName(spouseNode),
              dob: spouseNode.dob,
              gender: spouseNode.gender,
              hierarchy: spouseNode.hierarchy,
              treeId: spouseNode.treeId,
              photo: spouseNode.photo,
              isAlive: spouseNode.isAlive,
              parentsCount: spouseNode.parents?.length || 0,
              // Per-marriage child count (children shared by this person + spouse),
              // not the spouse's total children across all relationships.
              childrenCount: marriageChildCount,
              spousesCount: spouseNode.spouses?.length || 0,
              canEditNode: canEditSpouseNode,
              isReadOnly: !canEditSpouseNode,
            },
          },
          children: marriageChildren.length > 0 ? marriageChildren : undefined,
        });
      });

      // Add a placeholder spouse marriage if placeholders are shown
      if (showPlaceholders && showSpouses) {
        const spouseClass = person.gender === "female" ? "man" : "woman";
        treeNode.marriages.push({
          extra: {
            _placeholder: true,
          },
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
        const parentPlaceholders = shouldWrapWithParentPlaceholders
          ? []
          : buildParentPlaceholders(personId);
        const childPlaceholders: DTreeNode[] = [
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
        ];
        const allPlaceholders = [...parentPlaceholders, ...childPlaceholders];
        insertPlaceholdersNearMiddle(children, allPlaceholders);
      }

      if (addMissingParentForChild && addMenuChildId) {
        const missingParent = buildParentPlaceholders(addMenuChildId)[0];
        if (missingParent) {
          const childNode = convertToTreeFormat(
            addMenuChildId,
            visited,
            depth + 1,
          );
          if (childNode) {
            insertPlaceholdersNearMiddle(children, [childNode]);
          }
          treeNode.marriages = [
            {
              spouse: {
                name: missingParent.name,
                class: missingParent.class,
                textClass: missingParent.textClass,
                extra: missingParent.extra,
              },
              children: children.length > 0 ? children : undefined,
            },
          ];
        } else if (children.length > 0) {
          treeNode.children = children;
        }
      } else if (children.length > 0) {
        if (showPlaceholders && showSpouses) {
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
              children,
            },
          ];
        } else {
          treeNode.children = children;
        }
      }
    }
    // No spouses and no children — inject all placeholders as a single marriage
    // with son/daughter as children of that marriage (avoids layout conflicts
    // from having both treeNode.marriages and treeNode.children simultaneously)
    else if (showPlaceholders && showSpouses) {
      const spouseClass = person.gender === "female" ? "man" : "woman";
      const parentPlaceholders = shouldWrapWithParentPlaceholders
        ? []
        : buildParentPlaceholders(personId);
      const childPlaceholders: DTreeNode[] = [
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
      ];
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
          children: [...parentPlaceholders, ...childPlaceholders],
        },
      ];
    }
    else if (showPlaceholders) {
      const parentPlaceholders = shouldWrapWithParentPlaceholders
        ? []
        : buildParentPlaceholders(personId);
      const childPlaceholders: DTreeNode[] = [
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
      ];
      treeNode.children = [...parentPlaceholders, ...childPlaceholders];
    }

    // If we used parent placeholders above, do not also add them in child lists
    if (shouldWrapWithParentPlaceholders) {
      const parentPlaceholders = buildParentPlaceholders(personId);
      if (parentPlaceholders.length > 0) {
        const primaryParent = parentPlaceholders[0];
        const secondaryParent = parentPlaceholders[1];
        const wrapper: DTreeNode = {
          name: primaryParent.name,
          class: primaryParent.class,
          textClass: primaryParent.textClass,
          depthOffset: 0,
          extra: primaryParent.extra,
        };

        if (secondaryParent) {
          wrapper.marriages = [
            {
              spouse: {
                name: secondaryParent.name,
                class: secondaryParent.class,
                textClass: secondaryParent.textClass,
                extra: secondaryParent.extra,
              },
              children: [treeNode],
            },
          ];
        } else {
          wrapper.children = [treeNode];
        }

        return wrapper;
      }
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
        currentZoom = zoomTransform(existingSvg);
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
    select(containerRef.current).selectAll("*").remove();

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
        nodeHeight: CARD_DIM.h,
        callbacks: {
          nodeClick: (
            name: string,
            extra: any,
            id: string,
            event?: MouseEvent,
          ) => {
            // If the touchend handler already processed this tap, skip the
            // synthetic click — the tree may have been rebuilt in between,
            // so the node under the pointer can be a completely different person.
            if (Date.now() - lastTouchTapRef.current < 600) {
              return;
            }
            // Skip expand/collapse if the click was on an action icon or placeholder
            if (event) {
              const target = event.target as Element;
              if (
                target.closest(".node-edit-icon") ||
                target.closest(".node-add-icon") ||
                (effectiveFeatures.allowNameDetailsClick &&
                  effectiveFeatures.allowViewDetailsAction &&
                  target.closest(".node-name-click-target")) ||
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
              return effectiveRenderers.renderPlaceholderCardSvg?.(
                name,
                extra,
                id,
                nodeClass,
              );
            }
            const isMain = mainIdRef.current === extra?.id;
            const isHighlighted = highlightedPersonId === extra?.id;
            return effectiveRenderers.renderNodeCardSvg?.(
              name,
              extra,
              id,
              nodeClass,
              {
                currentTreeId: effectiveFeatures.allowExternalTreeNavigation
                  ? currentTreeId
                  : undefined,
                isMain,
                isHighlighted,
                isMobile: isMobileRef.current,
                canEditNode: isNodeEditable(extra?.id),
                allowNameDetailsClick: effectiveFeatures.allowNameDetailsClick,
              },
            );
          },
          nodeDblClick: (name: string, extra: any, id: string) => {
            if (extra?.id && onViewDetails) {
              onViewDetails(extra.id);
            }
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
            return effectiveRenderers.renderMarriageNodeSvg?.(
              Math.min(height, width),
              id,
              nodeClass,
              extra,
            );
          },
        },
      });

      // Determine if mainId actually changed (vs just addMenuNodeId toggling)
      const mainIdChanged = mainId !== prevMainIdRef.current;
      const highlightedFocusKey =
        highlightedPersonId && currentTreeId
          ? `${currentTreeId}:${highlightedPersonId}`
          : highlightedPersonId || null;
      const shouldCenterOnHighlighted =
        Boolean(highlightedPersonId) &&
        highlightedFocusKey !== prevHighlightedFocusKeyRef.current;

      // Restore previous zoom/pan state after rebuild so collapsed-mode focus
      // changes don't jump to the default transform before centering.
      if (currentZoom && treeRef.current) {
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

      if (showFullTree) {
        if (shouldCenterOnHighlighted) {
          setTimeout(() => {
            resetTreeViewport(0);
            setTimeout(() => centerOnNodeRef.current(highlightedPersonId), 500); // Allow D3 to render nodes
          }, 0);
        } else if (shouldAnimate) {
          setTimeout(() => {
            resetTreeViewport(isMobileRef.current ? 0 : 250);
          }, 0);
        }
      }

      // Auto-center on the focused mainId only when mainId actually changed,
      // or if we have never successfully centered on it before.
      if (!showFullTree && mainId && (mainIdChanged || !hasCenteredInitialRef.current)) {
        setTimeout(() => {
          centerOnNodeRef.current(mainId);
          hasCenteredInitialRef.current = true;
        }, 500); // Allow D3 to render nodes
      }

      // URL-driven focus (tree navigation/search) should center exactly once per key.
      if (!showFullTree && highlightedPersonId && shouldCenterOnHighlighted) {
        setTimeout(() => {
          centerOnNodeRef.current(highlightedPersonId);
        }, 500); // Allow D3 to render nodes
      }

      // Update refs to current state
      prevRootIdRef.current = rootId;
      prevTreeIdRef.current = currentTreeId;
      prevMainIdRef.current = mainId;
      prevHighlightedFocusKeyRef.current = highlightedFocusKey;
    } catch (error) {
      console.error("Error rendering dTree:", error);
      setError("Error rendering family tree. Please try refreshing the page.");
    }

    // Cleanup function: Capture zoom state BEFORE removing elements
    return () => {
      if (containerRef.current) {
        const svgElement = containerRef.current.querySelector("svg");
        if (svgElement) {
          prevZoomRef.current = zoomTransform(svgElement);
        }
        select(containerRef.current).selectAll("*").remove();
      }
    };
  }, [
    nodes,
    rootId,
    mainId,
    collapsedMarriages,
    addMenuNodeId,
    isMobile,
    isNodeEditable,
    currentTreeId,
    showFullTree,
    showSpouses,
    treeLanguage,
    highlightedPersonId,
    effectiveFeatures.allowExternalTreeNavigation,
    effectiveFeatures.allowNameDetailsClick,
    effectiveFeatures.allowPlaceholderActions,
    effectiveFeatures.allowViewDetailsAction,
    effectiveRenderers,
    onViewDetails,
  ]);

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
      {effectiveFeatures.allowToolbar && (
      <label
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          left: isMobile ? 10 : "auto",
          width: isMobile ? "calc(100% - 20px)" : "auto",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "space-between" : "flex-start",
          gap: 8,
          background: "rgba(255,255,255,0.92)",
          padding: isMobile ? "6px 8px" : "4px 10px",
          borderRadius: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          fontSize: 13,
          userSelect: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            minWidth: 0,
          }}
        >
          {effectiveFeatures.allowShowFullTreeToggle && (
          <input
            type="checkbox"
            checked={showFullTree}
            onChange={(e) => {
              const checked = e.target.checked;
              setShowFullTree(checked);
              if (checked) {
                setMainId(null);
                setTimeout(() => {
                  resetTreeViewport(isMobile ? 0 : 250);
                }, 0);
              }
            }}
            style={{ cursor: "pointer" }}
          />
          )}
          {effectiveFeatures.allowShowFullTreeToggle && (
            <span style={{ fontWeight: 600, color: "#333" }}>Show Full Tree</span>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {effectiveFeatures.allowFitControl && (
          <Button
            size="small"
            variant="text"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!showFullTree) return;
              fitTreeToViewport(isMobile ? 0 : 250);
            }}
            disabled={!showFullTree}
            sx={{
              minWidth: 0,
              px: 1,
              py: 0.25,
              visibility: showFullTree ? "visible" : "hidden",
            }}
          >
            Fit
          </Button>
          )}
          {effectiveFeatures.allowCenterControl && (
          <Button
            size="small"
            variant="text"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (showFullTree) {
                centerTreeInViewport(isMobile ? 0 : 250);
              } else if (mainId) {
                centerOnNodeRef.current(mainId);
              } else if (rootId) {
                centerOnNodeRef.current(rootId);
              }
            }}
            sx={{ minWidth: 0, px: 1, py: 0.25 }}
          >
            Center
          </Button>
          )}
          {(effectiveFeatures.allowLanguageToggle ||
            effectiveFeatures.allowShowSpousesToggle) && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTreeControlsAnchorEl(e.currentTarget);
            }}
            sx={{ ml: 0.25 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          )}
        </Box>
      </label>
      )}
      <Popover
        open={isTreeControlsOpen}
        anchorEl={treeControlsAnchorEl}
        onClose={() => setTreeControlsAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 0.75,
            minWidth: 220,
            borderRadius: 2,
            p: 1,
          },
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ px: 1, pt: 0.5, pb: 0.75, fontWeight: 700 }}
        >
          More tree controls
        </Typography>
        {effectiveFeatures.allowLanguageToggle && (
        <FormControl
          size="small"
          fullWidth
          sx={{ px: 1, pb: 1, pt: 0.25 }}
        >
          <InputLabel id="tree-language-label">Language</InputLabel>
          <Select
            labelId="tree-language-label"
            value={treeLanguage}
            label="Language"
            onChange={(event) => {
              setTreeLanguage(event.target.value as TreeViewerLanguage);
            }}
          >
            <MenuItem value="hindi">Hindi</MenuItem>
            <MenuItem value="english">English</MenuItem>
          </Select>
        </FormControl>
        )}
        {effectiveFeatures.allowShowSpousesToggle && (
        <FormControlLabel
          sx={{ mx: 0, px: 1, width: "100%", justifyContent: "space-between" }}
          labelPlacement="start"
          control={
            <Switch
              checked={showSpouses}
              onChange={(e) => {
                setShowSpouses(e.target.checked);
              }}
            />
          }
          label="Show Spouse"
        />
        )}
      </Popover>
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

      {showInteractionHint && effectiveFeatures.allowToolbar && (
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            left: { xs: 12, sm: 16 },
            right: { xs: 12, sm: "auto" },
            bottom: { xs: 18, sm: 22 },
            zIndex: 35,
            maxWidth: 320,
            px: 1.5,
            py: 1.25,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.14)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.25 }}>
            Explore the tree
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.35 }}>
            {isMobile
              ? "Drag to move around the tree. Pinch to zoom in or out."
              : "Click and drag to move around the tree. Use your mouse wheel to zoom."}
          </Typography>
        </Paper>
      )}

      {hoverInfo && !isMobile && effectiveFeatures.allowHoverPreview && (
        <Popper
          open
          anchorEl={hoverInfo.anchorEl}
          placement="top"
          modifiers={[
            { name: "offset", options: { offset: [0, 10] } },
            { name: "flip", options: { fallbackPlacements: ["bottom", "right", "left"] } },
            { name: "preventOverflow", options: { padding: 12 } },
          ]}
          sx={{ zIndex: 1500, pointerEvents: "none" }}
        >
          <Paper
            elevation={6}
            sx={{
              px: 1.25,
              py: 1,
              maxWidth: 320,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "rgba(255,255,255,0.96)",
            }}
          >
            {effectiveRenderers.renderHoverContent ? (
              effectiveRenderers.renderHoverContent(hoverInfo.node)
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {getPreferredName(hoverInfo.node)}
                </Typography>
                {hoverInfo.node.dob && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Born: {hoverInfo.node.dob}
                  </Typography>
                )}
                <Typography variant="caption" display="block" color="text.secondary">
                  Parents: {hoverInfo.node.parents?.length || 0} | Children:{" "}
                  {hoverInfo.node.children?.length || 0} | Spouses:{" "}
                  {hoverInfo.node.spouses?.length || 0}
                </Typography>
                {Array.isArray(hoverInfo.node.hierarchy) &&
                  hoverInfo.node.hierarchy.length > 0 && (
                    <>
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{
                          mt: 0.6,
                          pt: 0.5,
                          borderTop: "1px solid",
                          borderColor: "divider",
                          fontWeight: 600,
                        }}
                      >
                        Ancestry:
                      </Typography>
                      <MuiBox sx={{ ml: 0.5, mt: 0.25 }}>
                        {hoverInfo.node.hierarchy.map((ancestor, index) => (
                          <Typography
                            key={`${ancestor.id}-${index}`}
                            variant="caption"
                            display="block"
                            color="text.secondary"
                            sx={{ fontSize: "0.72rem" }}
                          >
                            {"↑ ".repeat(hoverInfo.node.hierarchy!.length - index)}
                            {ancestor.name}
                          </Typography>
                        ))}
                      </MuiBox>
                    </>
                  )}
              </>
            )}
          </Paper>
        </Popper>
      )}

      {/* In-flow action sheet — occupies layout space so the tree above shrinks
          to make room (and grows back when dismissed), rather than overlaying. */}
      {mobileSheetNode && effectiveFeatures.allowMobileActions && (
        <div
          style={{
            position: "relative",
            zIndex: 20,
            width: "100%",
            flexShrink: 0,
            maxHeight: "62%",
            overflowY: "auto",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: "8px 16px calc(16px + env(safe-area-inset-bottom))",
            boxShadow: "0 -10px 30px rgba(15, 23, 42, 0.14)",
            animation: "slideUp 0.18s ease-out",
          }}
        >
          {/* Drag handle affordance */}
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              background: "#cbd5e1",
              margin: "2px auto 10px",
            }}
          />
          {renderNodeSheet ? (
            renderNodeSheet(mobileSheetNode, {
              close: () => setMobileSheetNodeId(null),
            })
          ) : (
          <>
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
              {getPreferredName(mobileSheetNode)}
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
          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isExternalNode
                  ? "1fr 1fr"
                  : canEditMobileNode
                    ? "1fr 1fr 1fr"
                    : "1fr",
                gap: 6,
              }}
            >
              {effectiveFeatures.allowViewDetailsAction && onViewDetails && (
              <button
                onClick={() => {
                  setMobileSheetNodeId(null);
                  onViewDetails?.(mobileSheetNode.id);
                }}
                style={{
                  padding: "10px 0",
                  border: "1px solid #455a64",
                  borderRadius: 8,
                  background: "#eceff1",
                  color: "#263238",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                View
              </button>
              )}
              {isExternalNode ? (
                <button
                  onClick={() => {
                    if (effectiveFeatures.allowExternalTreeNavigation) {
                      const tid = mobileSheetNode.treeId;
                      setMobileSheetNodeId(null);
                      if (tid) {
                        onExternalTreeClick?.(tid, mobileSheetNode.id);
                      }
                    }
                  }}
                  style={{
                    padding: "10px 0",
                    border: "1px solid #00796b",
                    borderRadius: 8,
                    background: "#e0f2f1",
                    color: "#00695c",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Open Tree
                </button>
              ) : canEditMobileNode ? (
                <>
                  {effectiveFeatures.allowEditAction && onEditNode && (
                  <button
                    onClick={() => {
                      setMobileSheetNodeId(null);
                      onEditNode?.(mobileSheetNode.id);
                    }}
                    style={{
                      padding: "10px 0",
                      border: "1px solid #1976d2",
                      borderRadius: 8,
                      background: "#e3f2fd",
                      color: "#1565c0",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  )}
                  {effectiveFeatures.allowDeleteAction && onDelete && (
                  <button
                    onClick={() => {
                      setMobileSheetNodeId(null);
                      onDelete?.(mobileSheetNode.id);
                    }}
                    style={{
                      padding: "10px 0",
                      border: "1px solid #d32f2f",
                      borderRadius: 8,
                      background: "#ffebee",
                      color: "#c62828",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                  )}
                </>
              ) : null}
            </div>
            {canEditMobileNode &&
              effectiveFeatures.allowPlaceholderActions &&
              onAddRelative && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: parentActionColumns,
                    gap: 6,
                  }}
                >
                  {showFatherButton && (
                    <button
                      onClick={() => {
                        const nid = mobileSheetNode.id;
                        setMobileSheetNodeId(null);
                        onAddRelative?.(nid, "father");
                      }}
                      style={{
                        padding: "10px 0",
                        border: "1px solid #6d4c41",
                        borderRadius: 8,
                        background: "#efebe9",
                        color: "#5d4037",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Add Father
                    </button>
                  )}
                  {showMotherButton && (
                    <button
                      onClick={() => {
                        const nid = mobileSheetNode.id;
                        setMobileSheetNodeId(null);
                        onAddRelative?.(nid, "mother");
                      }}
                      style={{
                        padding: "10px 0",
                        border: "1px solid #6a1b9a",
                        borderRadius: 8,
                        background: "#f3e5f5",
                        color: "#6a1b9a",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Add Mother
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const nid = mobileSheetNode.id;
                      setMobileSheetNodeId(null);
                      onAddRelative?.(nid, "spouse");
                    }}
                    style={{
                      padding: "10px 0",
                      border: "1px solid #4caf50",
                      borderRadius: 8,
                      background: "#e8f5e9",
                      color: "#2e7d32",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Add Spouse
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                  }}
                >
                  <button
                    onClick={() => {
                      const nid = mobileSheetNode.id;
                      setMobileSheetNodeId(null);
                      onAddRelative?.(nid, "son");
                    }}
                    style={{
                      padding: "10px 0",
                      border: "1px solid #1976d2",
                      borderRadius: 8,
                      background: "#e3f2fd",
                      color: "#1565c0",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Add Son
                  </button>
                  <button
                    onClick={() => {
                      const nid = mobileSheetNode.id;
                      setMobileSheetNodeId(null);
                      onAddRelative?.(nid, "daughter");
                    }}
                    style={{
                      padding: "10px 0",
                      border: "1px solid #e91e63",
                      borderRadius: 8,
                      background: "#fce4ec",
                      color: "#c2185b",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Add Daughter
                  </button>
                </div>
              </>
            )}
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};
