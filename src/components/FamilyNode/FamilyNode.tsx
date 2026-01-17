import React, { useCallback, useState, useRef } from "react";
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
  IconButton,
} from "@mui/material";
import { Person, Wc, ChildCare, MoreVert } from "@mui/icons-material";

interface FamilyNodeProps {
  node: FNode;
  isRoot: boolean;
  isHover?: boolean;
  onClick: (id: string) => void;
  onSubClick: (id: string) => void;
  onContextMenu?: (nodeId: string, event: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export const FamilyNode = React.memo(function FamilyNode({
  node,
  isRoot,
  isHover,
  onClick,
  onSubClick,
  onContextMenu,
  style,
}: FamilyNodeProps) {
  const [localHover, setLocalHover] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [dragStartPos, setDragStartPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Use refs to track touch and timer accurately without stale closures
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTouchDraggingRef = useRef(false);

  React.useEffect(() => {
    // Detect actual touch input (not just capability) by listening for touch events
    const handleTouchStart = () => setIsTouchDevice(true);
    const handleMouseMove = () => setIsTouchDevice(false);

    // Listen for global touch move to detect drag (pan/zoom library consumes card events)
    const handleGlobalTouchMove = (e: TouchEvent) => {
      console.log("🔍 Global touch move event fired!", {
        timerExists: !!longPressTimerRef.current,
        startPosExists: !!touchStartRef.current,
        touchesLength: e.touches.length,
      });
      // Check if this touch is related to our long press timer
      if (longPressTimerRef.current && touchStartRef.current) {
        const touch = e.touches[0];
        if (touch) {
          const moveDistance = Math.sqrt(
            Math.pow(touch.clientX - touchStartRef.current.x, 2) +
              Math.pow(touch.clientY - touchStartRef.current.y, 2)
          );
          console.log("✓ Global touch distance:", moveDistance);
          if (moveDistance > 5) {
            console.log("✓✓ Global touch moved > 5px, setting drag flag");
            isTouchDraggingRef.current = true;
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
              setLongPressTimer(null);
            }
          }
        }
      } else {
        console.log("⚠️ Conditions not met:", {
          timerExists: !!longPressTimerRef.current,
          startPosExists: !!touchStartRef.current,
        });
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleGlobalTouchMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
    };
  }, []);

  const clickHandler = useCallback(() => {
    // Don't trigger click if user was dragging
    if (isDragging) {
      setIsDragging(false);
      return;
    }
    onClick(node.id);
  }, [node.id, onClick, isDragging]);
  const clickSubHandler = useCallback(
    () => onSubClick(node.id),
    [node.id, onSubClick]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only track position for potential context menu (right-click) or drag detection
    if (e.button === 0) {
      // Left click: track for drag detection
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setIsDragging(false);
    } else if (e.button === 2) {
      // Right click: track for context menu
      setDragStartPos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Detect if user is dragging (moved > 5px since mouse down)
      if (dragStartPos) {
        const moveDistance = Math.sqrt(
          Math.pow(e.clientX - dragStartPos.x, 2) +
            Math.pow(e.clientY - dragStartPos.y, 2)
        );
        if (moveDistance > 5) {
          setIsDragging(true);
        }
      }
    },
    [dragStartPos]
  );

  const handleMouseUp = useCallback(() => {
    setDragStartPos(null);
    // Reset dragging flag after a short delay to avoid interfering with click
    setTimeout(() => setIsDragging(false), 100);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      console.log("Context menu requested");
      // Check if user dragged significantly (more than 5px in either direction)
      if (dragStartPos) {
        const moveDistance = Math.sqrt(
          Math.pow(e.clientX - dragStartPos.x, 2) +
            Math.pow(e.clientY - dragStartPos.y, 2)
        );
        if (moveDistance > 5) {
          // User dragged, don't open context menu
          return;
        }
      }

      e.preventDefault();
      e.stopPropagation();
      if (onContextMenu) {
        onContextMenu(node.id, e);
      }
    },
    [node.id, onContextMenu, dragStartPos]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      console.log("Touch start detected");
      if (!isTouchDevice || !onContextMenu) return;

      // Clear any existing timer from previous touch
      if (longPressTimerRef.current) {
        console.log("Clearing previous timer");
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // Reset drag flag for new touch
      isTouchDraggingRef.current = false;

      const touch = e.touches[0];
      const startPos = { x: touch.clientX, y: touch.clientY };

      // Store in both state and ref
      setTouchStartPos(startPos);
      touchStartRef.current = startPos;

      // Set timer that will fire context menu if not cleared
      const timer = setTimeout(() => {
        console.log("Timer fired, checking conditions", {
          timerMatches: longPressTimerRef.current === timer,
          isDragging: isTouchDraggingRef.current,
        });
        // Only trigger if timer is still active AND user didn't drag
        if (
          longPressTimerRef.current === timer &&
          !isTouchDraggingRef.current
        ) {
          console.log("Long press detected, opening context menu");
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          const fakeEvent = {
            clientX: startPos.x,
            clientY: startPos.y,
            preventDefault: () => {},
            stopPropagation: () => {},
          } as React.MouseEvent;
          onContextMenu(node.id, fakeEvent);
          longPressTimerRef.current = null;
        } else {
          console.log(
            "Timer callback skipped - drag detected or timer mismatch"
          );
        }
      }, 500);

      console.log("Timer set:", timer);
      setLongPressTimer(timer);
      longPressTimerRef.current = timer;
    },
    [isTouchDevice, node.id, onContextMenu]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      setLongPressTimer(null);
    }
    touchStartRef.current = null;
    setTouchStartPos(null);
    isTouchDraggingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    console.log("Touch move detected", {
      timerExists: !!longPressTimerRef.current,
      startPosExists: !!touchStartRef.current,
      isDragging: isTouchDraggingRef.current,
    });
    // Cancel long press if user moves finger more than 5px
    if (longPressTimerRef.current && touchStartRef.current) {
      const touch = e.touches[0];
      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - touchStartRef.current.x, 2) +
          Math.pow(touch.clientY - touchStartRef.current.y, 2)
      );
      console.log("Touch move distance:", moveDistance);
      if (moveDistance > 5) {
        console.log("Touch moved > 5px, setting drag flag and clearing timer");
        // User is dragging, set flag to prevent context menu from firing
        isTouchDraggingRef.current = true;
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        setLongPressTimer(null);
        touchStartRef.current = null;
        setTouchStartPos(null);
      }
    } else {
      console.log("Conditions not met for clearing timer:", {
        timerExists: !!longPressTimerRef.current,
        startPosExists: !!touchStartRef.current,
      });
    }
  }, []);

  // Disable tooltip on touch devices
  const showTooltip = !isTouchDevice && Boolean(localHover || isHover);

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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
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
          <CardContent
            sx={{ p: 1, "&:last-child": { pb: 1 }, position: "relative" }}
          >
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
                  flex: 1,
                  maxWidth: "calc(100% - 24px)", // Make room for the icon
                }}
              >
                {node.name}
              </Typography>
              {onContextMenu && !isTouchDevice && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e as any);
                  }}
                  sx={{
                    padding: 0.5,
                    ml: 0.5,
                    color: cardColors.iconColor,
                    opacity: localHover ? 1 : 0.6,
                    transition: "opacity 0.2s ease",
                    backgroundColor: localHover
                      ? "rgba(0,0,0,0.05)"
                      : "transparent",
                    "&:hover": {
                      opacity: 1,
                      backgroundColor: "rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  <MoreVert sx={{ fontSize: 18 }} />
                </IconButton>
              )}
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
