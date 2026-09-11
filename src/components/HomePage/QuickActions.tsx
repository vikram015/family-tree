import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { brand } from "../../theme/brand";
import { microLabelSx, panelSx } from "./homeTheme";

/**
 * The rail's closing panel: four things a custodian does often, one tap away.
 *
 * The design calls this the "custodian toolkit" and fills it with archive tools
 * this app doesn't have (GEDCOM export, a cold vault, an audit ledger). Rather
 * than render buttons that lead nowhere, these are the four real destinations
 * that fit the same role — growing the tree and keeping up with what it needs.
 */

interface QuickAction {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface QuickActionsProps {
  pendingRequests?: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ pendingRequests = 0 }) => {
  const actions: QuickAction[] = [
    { label: "Invite kin", to: "/families", icon: <GroupAddOutlinedIcon /> },
    { label: "Add photos", to: "/photos", icon: <AddPhotoAlternateOutlinedIcon /> },
    {
      label: "Requests",
      to: "/requests",
      icon: <PendingActionsOutlinedIcon />,
      badge: pendingRequests,
    },
    { label: "Add business", to: "/business", icon: <StorefrontOutlinedIcon /> },
  ];

  return (
    <Box sx={{ ...(panelSx as object), p: 2.5 }}>
      <Typography sx={{ ...(microLabelSx as object), mb: 1.5 }}>Quick actions</Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 1.25,
        }}
      >
        {actions.map((action) => (
          <ButtonBase
            key={action.to + action.label}
            component={Link}
            to={action.to}
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 0.75,
              px: 1.25,
              minHeight: 40,
              borderRadius: 2,
              border: "1px solid",
              borderColor: brand.border,
              bgcolor: brand.surface,
              color: brand.slate,
              textDecoration: "none",
              transition: "border-color 140ms ease, background-color 140ms ease",
              "@media (hover: hover)": {
                "&:hover": { borderColor: brand.primary, bgcolor: brand.primarySoft },
              },
              "& .MuiSvgIcon-root": { fontSize: 17, color: brand.primary },
            }}
          >
            {action.icon}
            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600 }}>
              {action.label}
            </Typography>
            {!!action.badge && action.badge > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  minWidth: 18,
                  height: 18,
                  px: 0.5,
                  borderRadius: 9,
                  bgcolor: "#fef3c7",
                  color: "#b45309",
                  border: "1px solid #fde68a",
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: "16px",
                  textAlign: "center",
                }}
              >
                {action.badge > 9 ? "9+" : action.badge}
              </Box>
            )}
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
};

export default QuickActions;
