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
  deceasedDate?: string;
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
  /** Whether the node name should render as a clickable "view details" target. */
  allowNameDetailsClick?: boolean;
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
    isMobile?: boolean,
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
  allowNameDetailsClick?: boolean;
  /**
   * Open the node action sheet on tap for ALL screen sizes (not just small
   * screens). Use with `renderNodeSheet` to drive a custom sheet on desktop.
   */
  alwaysShowNodeSheet?: boolean;
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
  /**
   * Custom content for the node action sheet. When provided, it replaces the
   * built-in action buttons — the caller owns the sheet body (e.g. the
   * onboarding preview supplies its Link/Request UI). `api.close()` dismisses
   * the sheet (which also expands the tree back to full height).
   */
  renderNodeSheet?: (
    node: TreeViewerNode,
    api: { close: () => void },
  ) => ReactNode;
}
