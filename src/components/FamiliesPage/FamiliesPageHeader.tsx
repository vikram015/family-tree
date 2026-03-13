import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { SourceSelect } from "../SourceSelect/SourceSelect";

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
  canManageInvites: boolean;
  hasStats: boolean;
  statCards: StatCard[];
  onShareTree: () => void;
  onOpenInviteDialog: () => void;
  onSourceChange: (value: string, nodes: readonly any[]) => void;
}

export function FamiliesPageHeader({
  isMobile,
  treeId,
  treeStatus,
  statusAlerts,
  canManageInvites,
  hasStats,
  statCards,
  onShareTree,
  onOpenInviteDialog,
  onSourceChange,
}: FamiliesPageHeaderProps) {
  return (
    <Box
      sx={{
        px: { xs: 1.25, sm: 2, md: 3 },
        pt: { xs: 0.75, sm: 1.5 },
        pb: { xs: 0.75, sm: 1.5 },
        borderBottom: "1px solid",
        borderColor: "divider",
        background: (theme) =>
          `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
      }}
    >
      <Stack spacing={{ xs: 0.875, sm: 1.25 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 0.875, sm: 1.25 }}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: { xs: 0.25, sm: 0.75 }, flexWrap: "wrap" }}
            >
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
            </Stack>
            {!isMobile && (
              <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 780 }}>
                {treeStatus.description}
              </Typography>
            )}
          </Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{ width: { xs: "100%", md: "auto" } }}
          >
            <Button
              variant="outlined"
              onClick={onShareTree}
              disabled={!treeId}
              fullWidth
              size={isMobile ? "small" : "medium"}
            >
              Share tree
            </Button>
            {canManageInvites && (
              <Button
                variant="contained"
                onClick={onOpenInviteDialog}
                fullWidth
                size={isMobile ? "small" : "medium"}
              >
                {isMobile ? "Invite" : "Invite collaborator"}
              </Button>
            )}
          </Stack>
        </Stack>

        {statusAlerts.length > 0 && (
          <Stack spacing={1}>
            {statusAlerts.map((item) => (
              <Alert key={item.key} severity={item.severity} onClose={item.onClose}>
                {item.text}
              </Alert>
            ))}
          </Stack>
        )}

        <Paper
          elevation={0}
          sx={{
            p: { xs: 1, sm: 1.5 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
          }}
        >
          <Stack spacing={{ xs: 0.75, sm: 1.25 }}>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={{ xs: 0.75, sm: 1.25 }}
              alignItems={{ xs: "stretch", lg: "center" }}
              justifyContent="space-between"
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.2 }}>
                  Active Tree
                </Typography>
                {!isMobile && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Select a tree, then tap any person to view details, edit, or add relatives.
                  </Typography>
                )}
              </Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ width: { xs: "100%", lg: "auto" } }}
              >
                <Box sx={{ minWidth: { xs: "100%", sm: 260 } }}>
                  <SourceSelect onChange={onSourceChange} />
                </Box>
                {!treeId && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Select a tree to begin browsing.
                  </Typography>
                )}
              </Stack>
            </Stack>

            {hasStats && !isMobile && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    md: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 1,
                }}
              >
                {statCards.map((card) => (
                  <Paper
                    key={card.key}
                    elevation={0}
                    sx={{
                      p: 1.25,
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: alpha(card.color, 0.18),
                      backgroundColor: alpha(card.color, 0.06),
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ color: card.color, display: "flex", alignItems: "center" }}>
                        {card.icon}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                          {card.value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {card.label}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
