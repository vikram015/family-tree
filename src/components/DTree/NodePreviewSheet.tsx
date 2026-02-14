import React, { memo } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Slide,
  Paper,
  Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import Man2Icon from "@mui/icons-material/Man2";
import Woman2Icon from "@mui/icons-material/Woman2";
import { FNode } from "../model/FNode";

interface NodePreviewSheetProps {
  node: FNode | null;
  open: boolean;
  onClose: () => void;
  onViewDetails: (nodeId: string) => void;
}

/**
 * Bottom sheet preview that slides up when a node is tapped.
 * Shows person's name, gender icon, quick stats, and a "View Details" button.
 * Mobile-friendly: sits at the bottom, thumb-accessible.
 */
export const NodePreviewSheet: React.FC<NodePreviewSheetProps> = memo(
  ({ node, open, onClose, onViewDetails }) => {
    if (!node) return null;

    const genderColor =
      node.gender === "male"
        ? "#1565c0"
        : node.gender === "female"
          ? "#ad1457"
          : "#616161";

    const genderBg =
      node.gender === "male"
        ? "#e3f2fd"
        : node.gender === "female"
          ? "#fce4ec"
          : "#f5f5f5";

    const GenderIcon =
      node.gender === "male"
        ? Man2Icon
        : node.gender === "female"
          ? Woman2Icon
          : PersonIcon;

    const childrenCount = node.children?.length || 0;
    const spousesCount = node.spouses?.length || 0;
    const parentsCount = node.parents?.length || 0;

    return (
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: "hidden",
            maxHeight: "40vh",
            // Safe area for iOS
            paddingBottom: "env(safe-area-inset-bottom, 8px)",
          }}
        >
          {/* Drag handle */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              pt: 1,
              pb: 0.5,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(0,0,0,0.15)",
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              px: 2,
              pb: 1.5,
              pt: 0.5,
              gap: 1.5,
            }}
          >
            {/* Avatar / Photo */}
            <Avatar
              src={node.photo || undefined}
              sx={{
                width: 48,
                height: 48,
                bgcolor: genderBg,
                color: genderColor,
                border: `2px solid ${genderColor}20`,
              }}
            >
              {!node.photo && <GenderIcon sx={{ fontSize: 28 }} />}
            </Avatar>

            {/* Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {node.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: "block", mt: 0.25 }}
              >
                {[
                  parentsCount > 0 &&
                    `${parentsCount} parent${parentsCount > 1 ? "s" : ""}`,
                  childrenCount > 0 &&
                    `${childrenCount} child${childrenCount > 1 ? "ren" : ""}`,
                  spousesCount > 0 &&
                    `${spousesCount} spouse${spousesCount > 1 ? "s" : ""}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No relations"}
              </Typography>
              {node.dob && (
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", display: "block" }}
                >
                  Born: {node.dob}
                </Typography>
              )}
            </Box>

            {/* Close button */}
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: "text.secondary", alignSelf: "flex-start" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* View Details button */}
          <Box sx={{ px: 2, pb: 2 }}>
            <Button
              variant="contained"
              fullWidth
              size="medium"
              onClick={() => onViewDetails(node.id)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                py: 1,
              }}
            >
              View Details
            </Button>
          </Box>
        </Paper>
      </Slide>
    );
  },
);

NodePreviewSheet.displayName = "NodePreviewSheet";
