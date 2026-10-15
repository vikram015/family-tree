import React from "react";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { alpha } from "@mui/material/styles";
import { SourceSelect } from "../SourceSelect/SourceSelect";
import { TreePersonSearch } from "./TreePersonSearch";
import type { FNode } from "../model/FNode";
import { pageGradient } from "../../theme/brand";

export type TreeStatus = {
  label: string;
  description: string;
  color: "default" | "success" | "info";
  icon: React.ReactElement;
};

export type StatusAlert = {
  key: string;
  severity: "info" | "warning" | "error" | "success";
  text: string;
  onClose?: () => void;
};

export type StatCard = {
  key: string;
  label: string;
  value: number;
  icon: React.ReactElement;
  color: string;
};

interface FamiliesPageHeaderProps {
  isMobile: boolean;
  treeId: string;
  treeStatus: TreeStatus;
  statusAlerts: StatusAlert[];
  hasStats: boolean;
  statCards: StatCard[];
  onSourceChange: (value: string, nodes: readonly any[]) => void;
  viewMode: "tree" | "timeline";
  onViewModeChange: (mode: "tree" | "timeline") => void;
  nodes: FNode[];
  onSearchSelect: (personId: string) => void;
  pendingRequestsCount?: number;
  onPendingRequestsClick?: () => void;
  /** Shown in place of the "Family Tree" title when `onBack` is set. */
  treeName?: string;
  /**
   * Phone layout: the tree was picked from the tree list, so the header leads
   * with a way back to it and the tree's name, and drops the tree picker.
   */
  onBack?: () => void;
}

export function FamiliesPageHeader({
  isMobile,
  treeId,
  treeStatus,
  statusAlerts,
  hasStats,
  statCards,
  onSourceChange,
  viewMode,
  onViewModeChange,
  nodes,
  onSearchSelect,
  pendingRequestsCount = 0,
  onPendingRequestsClick,
  treeName,
  onBack,
}: FamiliesPageHeaderProps) {
  return (
    <Box
      sx={{
        px: { xs: 1.25, sm: 2, md: 3 },
        pt: { xs: 0.75, sm: 1.5 },
        pb: { xs: 0.75, sm: 1.5 },
        // On a phone this is the screen's only bar (the app header is hidden
        // over a tree), so it is drawn as an app bar: a solid surface lifted
        // above the canvas by a shadow, not a strip of the page background.
        ...(onBack
          ? {
              position: "relative",
              zIndex: (theme) => theme.zIndex.appBar,
              bgcolor: "background.paper",
              boxShadow: "0 2px 4px -1px rgba(15,23,42,0.10), 0 4px 10px 0 rgba(15,23,42,0.08)",
            }
          : {
              borderBottom: "1px solid",
              borderColor: "divider",
              background: pageGradient,
            }),
      }}
    >
      <Stack spacing={{ xs: 0.875, sm: 1.25 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto minmax(0, 1fr)" },
            alignItems: { xs: "stretch", md: "center" },
            gap: { xs: 0.875, sm: 1.25 },
          }}
        >
          <Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                // The back bar keeps the name and the toggle on one line; the
                // name truncates instead of wrapping.
                flexWrap: onBack ? "nowrap" : "wrap",
                width: "100%",
                mb: { xs: 0.25, sm: 0.75 },
              }}
            >
              {onBack ? (
                <>
                  <IconButton
                    aria-label="Back to your trees"
                    onClick={onBack}
                    edge="start"
                    size="small"
                    sx={{ color: "text.primary" }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  <Typography
                    variant="h6"
                    noWrap
                    sx={{ fontWeight: 800, minWidth: 0, flex: "1 1 auto", ml: "4px !important" }}
                  >
                    {treeName || "Family Tree"}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant={isMobile ? "h6" : "h4"} sx={{ fontWeight: 800 }}>
                    Family Tree
                  </Typography>
                  <Chip
                    icon={treeStatus.icon}
                    label={treeStatus.label}
                    color={treeStatus.color}
                    variant={treeStatus.color === "default" ? "outlined" : "filled"}
                    size="small"
                  />
                </>
              )}
              {pendingRequestsCount > 0 && (
                <Chip
                  icon={<PendingActionsOutlinedIcon />}
                  label={`${pendingRequestsCount} pending`}
                  color="warning"
                  size="small"
                  clickable
                  onClick={onPendingRequestsClick}
                />
              )}
              {/* View toggle — sits next to the chip on desktop; pinned right (icon-only) on mobile. */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                size="small"
                onChange={(_e, value) => value && onViewModeChange(value)}
                sx={{ ml: { xs: "auto", md: 0 }, flexShrink: 0 }}
              >
                <ToggleButton value="tree" sx={{ textTransform: "none", px: { xs: 1, sm: 1.5 } }}>
                  <AccountTreeOutlinedIcon fontSize="small" sx={{ mr: { xs: 0, sm: 0.5 } }} />
                  {!isMobile && "Tree"}
                </ToggleButton>
                <ToggleButton value="timeline" sx={{ textTransform: "none", px: { xs: 1, sm: 1.5 } }}>
                  <TimelineOutlinedIcon fontSize="small" sx={{ mr: { xs: 0, sm: 0.5 } }} />
                  {!isMobile && "Timeline"}
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {!isMobile && !onBack && (
              <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 780 }}>
                {treeStatus.description}
              </Typography>
            )}
          </Box>

          {hasStats && (
            <Box
              sx={{
                display: { xs: "none", md: "grid" },
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 0.75,
                minWidth: { md: 360, lg: 440 },
                justifySelf: "center",
              }}
            >
              {statCards.map((card) => (
                <Paper
                  key={card.key}
                  elevation={0}
                  sx={{
                    px: 1,
                    py: 0.75,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: alpha(card.color, 0.18),
                    backgroundColor: alpha(card.color, 0.06),
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ color: card.color, display: "flex", alignItems: "center" }}>
                      {card.icon}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 800, lineHeight: 1.1 }}
                      >
                        {card.value}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          display: "block",
                          lineHeight: 1.1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {card.label}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Box>
          )}

          <Box
            sx={{
              minWidth: { xs: "100%", sm: 260, md: 320 },
              justifySelf: { xs: "stretch", md: "end" },
            }}
          >
            <Stack spacing={{ xs: 0.75, sm: 1 }}>
              {/* The tree list is the picker on phones. */}
              {!onBack && <SourceSelect onChange={onSourceChange} />}
              {nodes.length > 0 && (
                <TreePersonSearch nodes={nodes} onSelect={onSearchSelect} />
              )}
            </Stack>
          </Box>
        </Box>

        {statusAlerts.length > 0 && (
          <Stack spacing={1}>
            {statusAlerts.map((item) => (
              <Alert key={item.key} severity={item.severity} onClose={item.onClose}>
                {item.text}
              </Alert>
            ))}
          </Stack>
        )}

        {!treeId && !onBack && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Select a tree to begin browsing.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
