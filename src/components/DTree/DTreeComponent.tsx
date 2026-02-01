import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { FNode } from "../model/FNode";
import dTree from "./dTree";
import "./dTree.css";

interface DTreeNode {
  name: string;
  class?: string;
  textClass?: string;
  depthOffset?: number;
  marriages?: Array<{
    spouse: {
      name: string;
      class?: string;
      textClass?: string;
      extra?: any;
    };
    children?: DTreeNode[];
  }>;
  children?: DTreeNode[];
  extra?: any;
}

interface DTreeComponentProps {
  nodes: FNode[];
  rootId: string;
  onNodeClick: (nodeId: string) => void;
}

export const DTreeComponent: React.FC<DTreeComponentProps> = ({
  nodes,
  rootId,
  onNodeClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const prevRootIdRef = useRef<string | null>(null);
  const prevZoomRef = useRef<any>(null);

  // Convert FNode format to dTree format
  const convertToTreeFormat = (
    personId: string,
    visited = new Set<string>(),
  ): DTreeNode | null => {
    if (visited.has(personId)) return null;
    visited.add(personId);

    const person = nodes.find((n) => n.id === personId);
    if (!person) return null;

    const treeNode: DTreeNode = {
      name: person.name,
      class:
        person.gender === "male"
          ? "man"
          : person.gender === "female"
            ? "woman"
            : "person",
      textClass: "nodeText",
      depthOffset: 0,
      extra: {
        id: person.id,
        dob: person.dob,
        gender: person.gender,
        hierarchy: person.hierarchy,
        parentsCount: person.parents?.length || 0,
        childrenCount: person.children?.length || 0,
        spousesCount: person.spouses?.length || 0,
      },
    };

    // If person has spouses, create marriages with children
    if (person.spouses && person.spouses.length > 0) {
      treeNode.marriages = [];

      person.spouses.forEach((spouse, index) => {
        const spouseNode = nodes.find((n) => n.id === spouse.id);
        if (!spouseNode) return;

        // Find children that belong to this specific marriage
        const marriageChildren: DTreeNode[] = [];

        person.children?.forEach((child) => {
          if (visited.has(child.id)) return;

          const childNode = nodes.find((n) => n.id === child.id);
          if (!childNode) return;

          // Check if this child belongs to this marriage
          // A child belongs to a marriage if one parent is the person and the other is the spouse
          const hasPersonAsParent = childNode.parents?.some(
            (p) => p.id === person.id,
          );
          const hasSpouseAsParent = childNode.parents?.some(
            (p) => p.id === spouse.id,
          );

          if (hasPersonAsParent && hasSpouseAsParent) {
            const childTreeNode = convertToTreeFormat(child.id, visited);
            if (childTreeNode) {
              marriageChildren.push(childTreeNode);
            }
          }
        });

        treeNode.marriages.push({
          spouse: {
            name: spouseNode.name,
            class:
              spouseNode.gender === "male"
                ? "man"
                : spouseNode.gender === "female"
                  ? "woman"
                  : "person",
            textClass: "nodeText",
            extra: {
              id: spouseNode.id,
              dob: spouseNode.dob,
              gender: spouseNode.gender,
              hierarchy: spouseNode.hierarchy,
              parentsCount: spouseNode.parents?.length || 0,
              childrenCount: spouseNode.children?.length || 0,
              spousesCount: spouseNode.spouses?.length || 0,
            },
          },
          children: marriageChildren.length > 0 ? marriageChildren : undefined,
        });
      });
    }
    // If no spouses but has children, add them directly
    else if (person.children && person.children.length > 0) {
      const children: DTreeNode[] = [];

      person.children.forEach((child) => {
        const childTreeNode = convertToTreeFormat(child.id, visited);
        if (childTreeNode) {
          children.push(childTreeNode);
        }
      });

      if (children.length > 0) {
        treeNode.children = children;
      }
    }

    return treeNode;
  };

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Clear previous tree (safeguard, though cleanup handles it)
    d3.select(containerRef.current).selectAll("*").remove();

    const rootNode = convertToTreeFormat(rootId);
    if (!rootNode) {
      console.error("Could not find root node with ID:", rootId);
      console.error(
        "Available nodes:",
        nodes.map((n) => ({ id: n.id, name: n.name })),
      );
      return;
    }

    console.log("Root node structure:", JSON.stringify(rootNode, null, 2));

    try {
      // Set a unique ID for the container
      const containerId = "dtree-container";
      containerRef.current.id = containerId;

      console.log(
        "Initializing dTree with data:",
        JSON.stringify(rootNode, null, 2),
      );

      treeRef.current = dTree.init([rootNode], {
        target: `#${containerId}`,
        width: 1200,
        height: 800,
        debug: true,
        margin: {
          top: 80,
          right: 90,
          bottom: 20,
          left: 90,
        },
        nodeWidth: 120,
        callbacks: {
          nodeClick: (name: string, extra: any, id: string) => {
            console.log("Node clicked:", { name, extra, id });
            if (extra && extra.id) {
              onNodeClick(extra.id);
            }
          },
        },
      });

      console.log("dTree initialized:", treeRef.current);

      // Restore zoom state if root hasn't changed
      if (
        rootId === prevRootIdRef.current &&
        prevZoomRef.current &&
        treeRef.current
      ) {
        try {
          if (typeof treeRef.current.getBuilder === "function") {
            const builder = treeRef.current.getBuilder();
            if (builder && builder.zoom && builder.svg) {
              console.log("Restoring zoom state:", prevZoomRef.current);
              builder.svg.call(builder.zoom.transform, prevZoomRef.current);
            }
          }
        } catch (e) {
          console.warn("Failed to restore zoom state:", e);
        }
      }

      // Update ref to current root
      prevRootIdRef.current = rootId;
    } catch (error) {
      console.error("Error rendering dTree:", error);
      setError("Error rendering family tree. Please try refreshing the page.");
    }

    // Cleanup function: Capture zoom state BEFORE removing elements
    return () => {
      if (containerRef.current) {
        const svgElement = containerRef.current.querySelector("svg");
        if (svgElement) {
          prevZoomRef.current = d3.zoomTransform(svgElement);
        }
        d3.select(containerRef.current).selectAll("*").remove();
      }
    };
  }, [nodes, rootId, onNodeClick]);

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
      }}
    />
  );
};
