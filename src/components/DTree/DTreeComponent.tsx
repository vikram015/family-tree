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
  });
  const hydratedPreferenceRef = useRef(false);
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

    const nextSnapshot = JSON.stringify(viewerPreferences);
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
      onPreferencesChange={setViewerPreferences}
      features={features}
      renderers={renderers}
      renderNodeSheet={renderNodeSheet}
    />
  );
};
