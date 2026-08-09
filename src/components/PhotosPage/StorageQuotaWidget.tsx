import React from "react";
import { Box, Paper, Stack, Typography, LinearProgress, Tooltip, IconButton } from "@mui/material";
import Diversity2OutlinedIcon from "@mui/icons-material/Diversity2Outlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { StorageQuotaStatus } from "../../services/apiService";
import { brand } from "../../theme/brand";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

interface StorageQuotaWidgetProps {
  status: StorageQuotaStatus;
}

/**
 * Used/limit bar plus the earn-more-storage nudge. Sits at the top of the
 * Photos page. Deliberately compact on mobile — a single tight row plus a
 * thin bar; the full explanation collapses behind an info icon there instead
 * of a paragraph, matching the desktop version's tip text.
 */
export function StorageQuotaWidget({ status }: StorageQuotaWidgetProps) {
  const { usedBytes, limitBytes, maxBytes, bonusPerActionBytes } = status;
  const percentUsed = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  const atMax = limitBytes >= maxBytes;
  const isNearOrOverLimit = percentUsed >= 90;

  const tipText = `Build a relative's tree and link it to yours to unlock +${formatBytes(
    bonusPerActionBytes,
  )}, up to ${formatBytes(maxBytes)} total.`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.25, sm: 2.5 },
        borderRadius: 2,
        borderColor: brand.border,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: { xs: 0.5, sm: 1 } }}>
        <Stack direction="row" alignItems="center" spacing={0.25}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, fontSize: { xs: "0.85rem", sm: "1rem" } }}
          >
            Storage
          </Typography>
          {!atMax && (
            <Tooltip title={tipText}>
              <IconButton size="small" sx={{ p: 0.25, display: { xs: "inline-flex", sm: "none" } }}>
                <InfoOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            color: isNearOrOverLimit ? "warning.dark" : "text.secondary",
          }}
        >
          {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={percentUsed}
        color={isNearOrOverLimit ? "warning" : "primary"}
        sx={{ height: { xs: 5, sm: 8 }, borderRadius: 999 }}
      />

      {!atMax && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: 1.5, color: brand.accentDark, cursor: "default", display: { xs: "none", sm: "flex" } }}
        >
          <Diversity2OutlinedIcon fontSize="small" />
          <Typography variant="body2">{tipText}</Typography>
        </Stack>
      )}

      {isNearOrOverLimit && (
        <Box sx={{ mt: { xs: 0.75, sm: 1 } }}>
          <Typography variant="caption" color="warning.dark" sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
            {atMax
              ? "You've reached your storage limit. A subscription option for more storage is coming soon."
              : "You're almost at your storage limit — build a relative's tree and link it to unlock more."}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default StorageQuotaWidget;
