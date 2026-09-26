import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchUserPreference,
  selectUserPreference,
  selectUserPreferenceLoaded,
  updateUserPreference,
} from "../../store/slices/userPreferenceSlice";
import { TreeViewer } from "../../lib/tree-viewer/TreeViewer";
import type {
  TreeViewerLanguage,
  TreeViewerNodeShape,
  TreeViewerNode,
  TreeViewerProps,
} from "../../lib/tree-viewer/types";
import {
  renderMarriageNodeSvg,
  renderNodeCardSvg,
  renderPlaceholderCardSvg,
} from "./NodeCard";
import { FNode } from "../model/FNode";

export interface DTreeComponentProps {
  nodes: FNode[];
  rootId: string;
  canEditTree?: boolean;
  canEditNode?: (nodeId: string) => boolean;
  autoExpandNodeId?: string | null;
  onAutoExpandHandled?: () => void;
  onNodeClick: (nodeId: string) => void;
  onEditNode?: (nodeId: string) => void;
  onAddRelative?: (
    nodeId: string,
    relType: "father" | "mother" | "spouse" | "son" | "daughter",
  ) => void;
  onViewDetails?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onExternalTreeClick?: (treeId: string, personId?: string) => void;
  currentTreeId?: string;
  highlightedPersonId?: string;
  onMobileSheetChange?: (open: boolean) => void;
  initialMainId?: string | null;
  initialShowFullTree?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  allowNameDetailsClick?: boolean;
  allowHoverPreview?: boolean;
  /** Open the node action sheet on any screen size (not just mobile). */
  alwaysShowNodeSheet?: boolean;
  /** Custom content for the node action sheet (replaces the default actions). */
  renderNodeSheet?: TreeViewerProps["renderNodeSheet"];
}

function normalizePreferenceLanguage(
  language?: string | null,
): TreeViewerLanguage {
  return language?.trim().toLowerCase() === "english" ? "english" : "hindi";
}

function serializePreferenceLanguage(
  language: TreeViewerLanguage,
): "Hindi" | "English" {
  return language === "english" ? "English" : "Hindi";
}

function toTreeViewerNode(
  node: FNode,
): TreeViewerNode {
  return {
    id: node.id,
    name: node.name?.trim() || node.nameHindi?.trim() || "",
    alternateName: node.nameHindi?.trim() || node.name?.trim() || "",
    dob: node.dob,
    gender: node.gender,
    photo: node.photo,
    hierarchy: node.hierarchy,
    treeId: node.treeId,
    isAlive: node.isAlive,
    deceasedDate: node.deceasedDate,
    parents: (node.parents || []).map((parent) => ({
      id: parent.id,
      type: parent.type,
    })),
    children: (node.children || []).map((child) => ({
      id: child.id,
      type: child.type,
    })),
    spouses: (node.spouses || []).map((spouse) => ({
      id: spouse.id,
      type: spouse.type,
      relationSubtype: node.relationSubtype,
      startDate: node.relationStartDate,
      endDate: node.relationEndDate,
    })),
    metadata: {
      sourceName: node.name,
      sourceAlternateName: node.nameHindi,
    },
  };
}

/** Where the browser remembers the card layout between visits. */
const NODE_SHAPE_STORAGE_KEY = "kinvia:treeNodeShape";

/**
 * The card layout to open the tree with.
 *
 * Compact is the default. A wide card spends the whole row on each person, so
 * siblings sit far apart and a generation runs off the screen; the compact card
 * fits the same generation in a fraction of the width, which is what most
 * people want to see first.
 *
 * An explicit "horizontal" is honoured rather than overridden — anyone who
 * already picked Wide cards keeps them. Only an absent or unreadable value
 * falls through to the default, so changing it here does not reach back and
 * change a choice somebody made.
 */
function readStoredNodeShape(): TreeViewerNodeShape {
  try {
    const stored = window.localStorage.getItem(NODE_SHAPE_STORAGE_KEY);
    if (stored === "horizontal") return "horizontal";
    if (stored === "vertical") return "vertical";
    return "vertical";
  } catch {
    // Private mode, blocked storage: no stored preference to honour.
    return "vertical";
  }
}

export const DTreeComponent: React.FC<DTreeComponentProps> = ({
  nodes,
  rootId,
  canEditTree = true,
  canEditNode,
  autoExpandNodeId,
  onAutoExpandHandled,
  onNodeClick,
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
  isFullscreen,
  onToggleFullscreen,
  allowNameDetailsClick = true,
  allowHoverPreview = false,
  alwaysShowNodeSheet = false,
  renderNodeSheet,
}) => {
  const dispatch = useAppDispatch();
  const { currentUser } = useAuth();
  const userPreference = useAppSelector(selectUserPreference);
  const userPreferenceLoaded = useAppSelector(selectUserPreferenceLoaded);
  const [viewerPreferences, setViewerPreferences] = useState({
    showFullTree: initialShowFullTree,
    showSpouses: true,
    language: "hindi" as TreeViewerLanguage,
    nodeShape: readStoredNodeShape(),
  });
  const hydratedPreferenceRef = useRef(false);
  // Node shape lives in the browser rather than the account preference row:
  // it is a view setting for this screen, and adding it server-side would mean
  // a schema change for something that does not need to follow the user across
  // devices. Swap this for the API the day it should.
  useEffect(() => {
    try {
      window.localStorage.setItem(NODE_SHAPE_STORAGE_KEY, viewerPreferences.nodeShape);
    } catch {
      // Private mode or storage disabled — the choice just won't persist.
    }
  }, [viewerPreferences.nodeShape]);
  const savedPreferenceSnapshotRef = useRef("");

  useEffect(() => {
    if (!currentUser) {
      hydratedPreferenceRef.current = false;
      savedPreferenceSnapshotRef.current = "";
      return;
    }

    dispatch(fetchUserPreference());
  }, [currentUser, dispatch]);

  useEffect(() => {
    if (!currentUser || !userPreferenceLoaded || hydratedPreferenceRef.current) {
      return;
    }

    const nextPreferences = {
      showFullTree:
        typeof userPreference?.showFullTree === "boolean"
          ? userPreference.showFullTree
          : initialShowFullTree,
      showSpouses:
        typeof userPreference?.showSpouse === "boolean"
          ? userPreference.showSpouse
          : true,
      language: normalizePreferenceLanguage(userPreference?.language),
    };

    savedPreferenceSnapshotRef.current = JSON.stringify(nextPreferences);
    hydratedPreferenceRef.current = true;

    setViewerPreferences((current) => ({
      ...current,
      showFullTree:
        highlightedPersonId || initialMainId
          ? current.showFullTree
          : nextPreferences.showFullTree,
      showSpouses: nextPreferences.showSpouses,
      language: nextPreferences.language,
    }));
  }, [
    currentUser,
    highlightedPersonId,
    initialMainId,
    initialShowFullTree,
    userPreference,
    userPreferenceLoaded,
  ]);

  useEffect(() => {
    if (!currentUser || !hydratedPreferenceRef.current) {
      return;
    }

    const nextSnapshot = JSON.stringify({
      showFullTree: viewerPreferences.showFullTree,
      showSpouses: viewerPreferences.showSpouses,
      language: viewerPreferences.language,
    });
    if (nextSnapshot === savedPreferenceSnapshotRef.current) {
      return;
    }

    savedPreferenceSnapshotRef.current = nextSnapshot;
    dispatch(
      updateUserPreference({
        showFullTree: viewerPreferences.showFullTree,
        showSpouse: viewerPreferences.showSpouses,
        language: serializePreferenceLanguage(viewerPreferences.language),
      }),
    ).catch((error: any) => {
      console.warn("Failed to save tree viewer preference:", error);
    });
  }, [currentUser, dispatch, viewerPreferences]);

  const viewerNodes = useMemo(
    () =>
      nodes.map((node) => toTreeViewerNode(node)),
    [nodes],
  );

  const renderers: TreeViewerProps["renderers"] = useMemo(
    () => ({
      renderNodeCardSvg: (name, extra, id, nodeClass, context) =>
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
          // Without this the viewer's layout choice never reaches the card:
          // this renderer overrides the viewer's default one, so anything it
          // forgets to forward is silently dropped.
          context.nodeShape ?? "vertical",
        ),
      renderPlaceholderCardSvg,
      renderMarriageNodeSvg,
    }),
    [],
  );

  const features: TreeViewerProps["features"] = useMemo(
    () => ({ allowNameDetailsClick, allowHoverPreview, alwaysShowNodeSheet }),
    [allowNameDetailsClick, allowHoverPreview, alwaysShowNodeSheet],
  );

  return (
    <TreeViewer
      nodes={viewerNodes}
      rootId={rootId}
      canEditTree={canEditTree}
      canEditNode={canEditNode}
      autoExpandNodeId={autoExpandNodeId}
      onAutoExpandHandled={onAutoExpandHandled}
      onNodeClick={onNodeClick}
      onEditNode={onEditNode}
      onAddRelative={onAddRelative}
      onViewDetails={onViewDetails}
      onDelete={onDelete}
      onExternalTreeClick={onExternalTreeClick}
      currentTreeId={currentTreeId}
      highlightedPersonId={highlightedPersonId}
      onMobileSheetChange={onMobileSheetChange}
      initialMainId={initialMainId}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      initialShowFullTree={viewerPreferences.showFullTree}
      initialShowSpouses={viewerPreferences.showSpouses}
      initialLanguage={viewerPreferences.language}
      initialNodeShape={viewerPreferences.nodeShape}
      onPreferencesChange={setViewerPreferences}
      features={features}
      renderers={renderers}
      renderNodeSheet={renderNodeSheet}
    />
  );
};
