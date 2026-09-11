import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import Diversity2OutlinedIcon from "@mui/icons-material/Diversity2Outlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
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
 * Used/limit bar plus the earn-more-storage nudge, at the top of the Photos
 * page.
 *
 * The nudge is the point of the card: storage is earned by building a
 * relative's tree and linking it, so the banner is a call to action rather than
 * a note. It disappears once the account is at the ceiling.
 */
export function StorageQuotaWidget({ status }: StorageQuotaWidgetProps) {
  const { usedBytes, limitBytes, maxBytes, bonusPerActionBytes } = status;
  const percentUsed = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  const atMax = limitBytes >= maxBytes;
  const isNearOrOverLimit = percentUsed >= 90;

  return (
    <Box
      sx={{
        bgcolor: brand.surface,
        borderRadius: 3,
        border: "1px solid #dbeafe",
        boxShadow: "0 4px 20px -4px rgba(29, 78, 216, 0.06)",
        p: { xs: 2, sm: 2.5 },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: brand.ink }}>
            Photo storage
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              bgcolor: brand.primarySoft,
              border: "1px solid rgba(191, 219, 254, 0.9)",
              color: brand.primaryDark,
            }}
          >
            {atMax ? "Max space" : "Free tier"}
          </Box>
        </Stack>

        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 600,
            color: isNearOrOverLimit ? "#b45309" : brand.slate,
          }}
        >
          <Box
            component="span"
            sx={{ fontWeight: 800, color: isNearOrOverLimit ? "#b45309" : brand.primaryDark }}
          >
            {formatBytes(usedBytes)}
          </Box>{" "}
          used of{" "}
          <Box component="span" sx={{ color: brand.ink }}>
            {formatBytes(limitBytes)}
          </Box>
        </Typography>
      </Stack>

      <Box
        sx={{
          width: "100%",
          height: 10,
          borderRadius: 999,
          bgcolor: "#f1f5f9",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${percentUsed}%`,
            height: "100%",
            borderRadius: 999,
            transition: "width 300ms ease",
            background: isNearOrOverLimit
              ? "linear-gradient(to right, #d97706, #f59e0b)"
              : `linear-gradient(to right, ${brand.primaryDark}, ${brand.primary})`,
          }}
        />
      </Box>

      {!atMax && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 2.5,
            bgcolor: "#f8fafc",
            border: "1px solid #f1f5f9",
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <Diversity2OutlinedIcon sx={{ fontSize: 19, color: brand.accentDark, mt: "1px" }} />
            <Typography sx={{ fontSize: 13.5, color: brand.slate, lineHeight: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700, color: brand.ink }}>
                Unlock more space:
              </Box>{" "}
              build a relative&apos;s tree and link it to yours to get{" "}
              <Box component="span" sx={{ fontWeight: 700, color: brand.accentDark }}>
                +{formatBytes(bonusPerActionBytes)} free
              </Box>{" "}
              (up to {formatBytes(maxBytes)} total).
            </Typography>
          </Stack>

          <Typography
            component={Link}
            to="/families"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              color: brand.primaryDark,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Link a branch
            <ArrowForwardIcon sx={{ fontSize: 15 }} />
          </Typography>
        </Stack>
      )}

      {isNearOrOverLimit && (
        <Typography sx={{ mt: 1.25, fontSize: 12.5, color: "#b45309" }}>
          {atMax
            ? "You've reached your storage limit. A subscription option for more storage is coming soon."
            : "You're almost at your storage limit — build a relative's tree and link it to unlock more."}
        </Typography>
      )}
    </Box>
  );
}

export default StorageQuotaWidget;
