import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { brand } from "../../theme/brand";

/**
 * A horizontal strip that only behaves like a carousel when it has to.
 *
 * The dashboard's strips used a grid that scrolled on phones and reflowed into
 * rows on desktop. That reflow is what made a long week of birthdays either
 * wrap into a second row that unbalanced the page, or silently truncate.
 *
 * Here the track always scrolls, and the arrows are the only thing conditional:
 * they appear when the content is genuinely wider than its box, and each one
 * hides again at the end it has reached. A strip that fits looks exactly like a
 * plain row — no controls, no scrollbar, nothing to suggest there is more.
 *
 * Overflow is measured rather than assumed from a breakpoint, because whether
 * six cards fit depends on the window, the rail, and how many cards there are.
 */

export interface CarouselProps {
  children: React.ReactNode;
  /** Track-relative width of each item; the card decides its own height. */
  itemWidth?: { xs: string; sm: string; md: string };
  "aria-label"?: string;
}

export const Carousel: React.FC<CarouselProps> = ({
  children,
  itemWidth = { xs: "86%", sm: "48%", md: "calc((100% - 32px) / 3)" },
  "aria-label": ariaLabel,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // 1px of slack: sub-pixel layout makes an exactly-fitting track report a
    // scrollWidth a fraction larger, which would show an arrow that does nothing.
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(maxScroll > 1 && el.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();

    // Remeasure on anything that can change the answer: the window, the box
    // itself (the rail appears at xl), and cards arriving after a fetch.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));

    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure, children]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // A page is most of the visible width, so the card at the edge stays in
    // view as an anchor instead of jumping past it.
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrowSx = {
    position: "absolute" as const,
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 2,
    width: 36,
    height: 36,
    bgcolor: brand.surface,
    border: "1px solid rgba(15, 23, 42, 0.1)",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
    color: brand.ink,
    // Touch devices scroll by swiping; arrows there only cover the cards.
    display: { xs: "none", md: "inline-flex" },
    "&:hover": { bgcolor: brand.surface },
  };

  return (
    <Box sx={{ position: "relative" }}>
      {canScrollLeft && (
        <IconButton
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
          sx={{ ...arrowSx, left: -14 }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      )}

      <Box
        ref={trackRef}
        role="group"
        aria-label={ariaLabel}
        sx={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: itemWidth,
          gap: { xs: 1.25, md: 2 },
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          // Bleed to the container edge on phones so cards don't look clipped.
          mx: { xs: -2, md: 0 },
          px: { xs: 2, md: 0 },
          pb: { xs: 1, md: 0 },
          "& > *": { scrollSnapAlign: "start" },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {children}
      </Box>

      {canScrollRight && (
        <IconButton
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
          sx={{ ...arrowSx, right: -14 }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};

export default Carousel;
