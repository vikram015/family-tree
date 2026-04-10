import type { ReactNode } from "react";

export type TreeViewerLanguage = "hindi" | "english";

export type TreeViewerRelativeAction =
  | "father"
  | "mother"
  | "spouse"
  | "son"
  | "daughter";

export type TreeViewerRelation = Readonly<{
  id: string;
  type?: string;
  relationSubtype?: string;
  startDate?: string;
  endDate?: string;
}>;

export type TreeViewerNode = {
  id: string;
  name: string;
  alternateName?: string;
  dob?: string;
  gender?: string;
  photo?: string;
  hierarchy?: Array<{ name: string; id: string }>;
  treeId?: string;
  isAlive?: boolean;
  parents: TreeViewerRelation[];
  children: TreeViewerRelation[];
  spouses: TreeViewerRelation[];
  metadata?: Record<string, unknown>;
};

export type TreeViewerNodeRendererContext = {
  currentTreeId?: string;
  isMain?: boolean;
  isHighlighted?: boolean;
  isMobile?: boolean;
  canEditNode?: boolean;
};

export type TreeViewerRenderers = {
  renderNodeCardSvg?: (
    name: string,
    extra: any,
    id: string,
    nodeClass: string,
    context: TreeViewerNodeRendererContext,
  ) => string;
  renderPlaceholderCardSvg?: (
    name: string,
    extra: any,
    id: string,
    nodeClass: string,
  ) => string;
  renderMarriageNodeSvg?: (
    size: number,
    id: string,
    nodeClass: string,
    extra?: any,
  ) => string;
  renderHoverContent?: (node: TreeViewerNode) => ReactNode;
};

export type TreeViewerFeatureFlags = {
  allowToolbar?: boolean;
  allowShowFullTreeToggle?: boolean;
  allowShowSpousesToggle?: boolean;
  allowLanguageToggle?: boolean;
  allowFitControl?: boolean;
  allowCenterControl?: boolean;
  allowHoverPreview?: boolean;
  allowMobileActions?: boolean;
  allowPlaceholderActions?: boolean;
  allowExternalTreeNavigation?: boolean;
  allowEditAction?: boolean;
  allowDeleteAction?: boolean;
  allowViewDetailsAction?: boolean;
};

export interface TreeViewerProps {
  nodes: TreeViewerNode[];
  rootId: string;
  canEditTree?: boolean;
  canEditNode?: (nodeId: string) => boolean;
  autoExpandNodeId?: string | null;
  onAutoExpandHandled?: () => void;
  onNodeClick?: (nodeId: string) => void;
  onNodeFocus?: (nodeId: string) => void;
  onEditNode?: (nodeId: string) => void;
  onAddRelative?: (
    nodeId: string,
    relType: TreeViewerRelativeAction,
  ) => void;
  onViewDetails?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onExternalTreeClick?: (treeId: string, personId?: string) => void;
  currentTreeId?: string;
  highlightedPersonId?: string;
  onMobileSheetChange?: (open: boolean) => void;
  initialMainId?: string | null;
  initialShowFullTree?: boolean;
  initialShowSpouses?: boolean;
  initialLanguage?: TreeViewerLanguage;
  onPreferencesChange?: (value: {
    showFullTree: boolean;
    showSpouses: boolean;
    language: TreeViewerLanguage;
  }) => void;
  features?: TreeViewerFeatureFlags;
  renderers?: TreeViewerRenderers;
}
