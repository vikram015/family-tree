import React, { useCallback, useState } from "react";
import classNames from "classnames";
import css from "./FamilyNode.module.css";
import { FNode } from "../model/FNode";
import {
  Card,
  CardContent,
  Typography,
  Tooltip,
  Chip,
  Box,
} from "@mui/material";
import { Person, Wc, ChildCare } from "@mui/icons-material";

interface FamilyNodeProps {
  node: FNode;
  isRoot: boolean;
  isHover?: boolean;
  onClick: (id: string) => void;
  onSubClick: (id: string) => void;
  style?: React.CSSProperties;
}

export const FamilyNode = React.memo(function FamilyNode({
  node,
  isRoot,
  isHover,
  onClick,
  onSubClick,
  style,
}: FamilyNodeProps) {
  const [localHover, setLocalHover] = useState(false);
  const clickHandler = useCallback(() => onClick(node.id), [node.id, onClick]);
  const clickSubHandler = useCallback(
    () => onSubClick(node.id),
    [node.id, onSubClick]
  );

  const showTooltip = Boolean(localHover || isHover);

  // Define colors based on gender
  const getCardColors = () => {
    if (node.gender === "male") {
      return {
        background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
        borderColor: isRoot
          ? "rgba(25, 118, 210, 0.5)"
          : "rgba(25, 118, 210, 0.3)",
        color: "#0d47a1",
        iconColor: "#1976d2",
      };
    } else if (node.gender === "female") {
      return {
        background: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
        borderColor: isRoot
          ? "rgba(194, 24, 91, 0.5)"
          : "rgba(194, 24, 91, 0.3)",
        color: "#880e4f",
        iconColor: "#c2185b",
      };
    }
    // Default/neutral colors
    return {
      background: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
      borderColor: isRoot ? "rgba(97, 97, 97, 0.5)" : "rgba(97, 97, 97, 0.3)",
      color: "#424242",
      iconColor: "#616161",
    };
  };

  const cardColors = getCardColors();

  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {node.name}
      </Typography>
      {node.dob && (
        <Typography
          variant="caption"
          sx={{ display: "block", mb: 0.5, opacity: 0.85 }}
        >
          DOB: {node.dob}
        </Typography>
      )}
      <Typography variant="caption" sx={{ opacity: 0.72 }}>
        Parents: {Array.isArray(node.parents) ? node.parents.length : 0} •
        Children: {Array.isArray(node.children) ? node.children.length : 0} •
        Spouses: {Array.isArray(node.spouses) ? node.spouses.length : 0}
      </Typography>
    </Box>
  );

  return (
    <div className={css.root} style={style}>
      <Tooltip
        title={tooltipContent}
        arrow
        open={showTooltip}
        placement="top"
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: "rgba(15, 23, 42, 0.96)",
              "& .MuiTooltip-arrow": {
                color: "rgba(15, 23, 42, 0.96)",
              },
            },
          },
        }}
      >
        <Card
          className={classNames(
            css.inner,
            css[node.gender],
            isRoot && css.isRoot,
            isHover && css.isHover
          )}
          onClick={clickHandler}
          onMouseEnter={() => setLocalHover(true)}
          onMouseLeave={() => setLocalHover(false)}
          elevation={isHover ? 8 : 3}
          sx={{
            cursor: "pointer",
            transition: "all 0.2s ease",
            borderRadius: "10px 0",
            background: cardColors.background,
            border: `2px solid ${cardColors.borderColor}`,
            "&:hover": {
              transform: "translateY(-2px)",
            },
          }}
        >
          <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {node.gender === "male" ? (
                <Person sx={{ fontSize: 16, color: cardColors.iconColor }} />
              ) : node.gender === "female" ? (
                <Wc sx={{ fontSize: 16, color: cardColors.iconColor }} />
              ) : null}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: cardColors.color,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {node.name}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Tooltip>

      {node.hasSubTree && (
        <Chip
          className={classNames(css.sub, css[node.gender])}
          onClick={clickSubHandler}
          size="small"
          icon={<ChildCare sx={{ fontSize: 12 }} />}
          sx={{
            position: "absolute",
            top: 6,
            right: 14,
            height: 20,
            background: cardColors.background,
            borderColor: cardColors.borderColor,
            "& .MuiChip-icon": { ml: 0.5, color: cardColors.iconColor },
          }}
        />
      )}
    </div>
  );
});
