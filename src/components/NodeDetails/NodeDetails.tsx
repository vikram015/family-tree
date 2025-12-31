import React, { memo, useCallback } from "react";
import classNames from "classnames";
import { RelType } from "relatives-tree/lib/types";
import css from "./NodeDetails.modern.module.css";
import AddNode from "../AddNode/AddNode";
import { FNode } from "../model/FNode";
import { Relations } from "./Relations";

interface NodeDetailsProps {
  node: Readonly<FNode>;
  nodes: Readonly<FNode>[];
  className?: string;
  onSelect: (nodeId: string | undefined) => void;
  onHover: (nodeId: string) => void;
  onClear: () => void;
  // new callback to receive created node + relation
  onAdd?: (
    node: Partial<FNode>,
    relation: "child" | "spouse" | "parent",
    targetId?: string,
    type?: RelType
  ) => void;
}

export const NodeDetails = memo(function NodeDetails({
  node,
  nodes,
  className,
  ...props
}: NodeDetailsProps) {
  const closeHandler = useCallback(() => props.onSelect(undefined), [props]);
  const relNodeMapper = useCallback(
    (rel: any) => ({
      ...nodes.find((n) => n.id === rel.id),
      type: rel.type,
    }),
    [nodes]
  );
  return (
    <section className={classNames(css.root, className)}>
      <header className={css.header}>
        <h3 className={css.title}>{node.name}</h3>
        <button className={css.close} onClick={closeHandler} title="Close">
          &#10005;
        </button>
      </header>
      <div>
        <Relations
          {...props}
          title="Parents"
          items={node.parents.map(relNodeMapper)}
        />
        <Relations
          {...props}
          title="Children"
          items={node.children.map(relNodeMapper)}
        />
        <Relations
          {...props}
          title="Siblings"
          items={node.siblings.map(relNodeMapper)}
        />
        <Relations
          {...props}
          title="Spouses"
          items={node.spouses.map(relNodeMapper)}
        />
      </div>
      <AddNode
        targetId={node.id}
        nodes={nodes}
        onAdd={props.onAdd}
        onCancel={props.onClear}
        noCard
      />
    </section>
  );
});
