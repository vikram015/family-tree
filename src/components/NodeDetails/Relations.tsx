import React, { memo, useCallback, useState } from "react";
import { Relation } from "relatives-tree/lib/types";
import css from "./Relations.module.css";

interface RelationsProps {
  title: string;
  items: readonly any[];
  onSelect: (nodeId: string) => void;
  onHover: (nodeId: string) => void;
  onClear: () => void;
}

export const Relations = memo(function Relations({
  title,
  items,
  onSelect,
  onHover,
  onClear,
}: RelationsProps) {
  const selectHandler = useCallback(
    (id: string) => () => onSelect(id),
    [onSelect]
  );
  const hoverHandler = useCallback(
    (id: string) => () => onHover(id),
    [onHover]
  );
  const clearHandler = useCallback(() => onClear(), [onClear]);

  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div className={css.root}>
      <button
        className={css.collapseHeader}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`rel-list-${title}`}
      >
        <span className={css.collapseIcon} aria-hidden>
          {open ? "▼" : "►"}
        </span>
        {title}
        <span className={css.count}>({items.length})</span>
      </button>
      {open && (
        <ul className={css.list} id={`rel-list-${title}`}>
          {items.map((item, idx) => (
            <li
              key={idx}
              className={css.item}
              onClick={selectHandler(item.id)}
              onMouseEnter={hoverHandler(item.id)}
              onMouseLeave={clearHandler}
            >
              {item.name} ({item.type})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
