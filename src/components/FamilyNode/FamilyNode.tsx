import React, { useCallback, useState } from "react";
import classNames from "classnames";
import css from "./FamilyNode.module.css";
import { FNode } from "../model/FNode";

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

  return (
    <div className={css.root} style={style}>
      <div
        className={classNames(
          css.inner,
          css[node.gender],
          isRoot && css.isRoot,
          isHover && css.isHover
        )}
        onClick={clickHandler}
        onMouseEnter={() => setLocalHover(true)}
        onMouseLeave={() => setLocalHover(false)}
      >
        <div className={css.id}>{node.name}</div>
      </div>

      {showTooltip && (
        <div className={css.tooltip} role="dialog" aria-hidden={!showTooltip}>
          <div className={css.tooltipName}>{node.name}</div>
          {node.dob && <div className={css.tooltipDob}>DOB: {node.dob}</div>}
          <div className={css.tooltipMeta}>
            Parents: {Array.isArray(node.parents) ? node.parents.length : 0} •
            Children: {Array.isArray(node.children) ? node.children.length : 0}{" "}
            • Spouses: {Array.isArray(node.spouses) ? node.spouses.length : 0}
          </div>
        </div>
      )}

      {node.hasSubTree && (
        <div
          className={classNames(css.sub, css[node.gender])}
          onClick={clickSubHandler}
        />
      )}
    </div>
  );
});
