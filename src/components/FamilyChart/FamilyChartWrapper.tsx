import React, { useEffect, useRef } from "react";
// @ts-ignore - types might be loose
import { createChart } from "family-chart";
import "./family-chart.css"; // We will create this local forwarder
import { FNode } from "../model/FNode";
import { transformData } from "./utils";

interface FamilyChartWrapperProps {
  nodes: FNode[];
  rootId: string;
}

export const FamilyChartWrapper: React.FC<FamilyChartWrapperProps> = ({
  nodes,
  rootId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !nodes.length) return;

    // Clear previous content
    containerRef.current.innerHTML = "";

    try {
      const data = transformData(nodes);

      // Using the high-level createChart API which handles store/view internally
      const chart = createChart(containerRef.current, data);

      // Initialize with SVG renderer explicitly and configure content
      // @ts-ignore
      const card = chart.setCardSvg();
      // @ts-ignore
      if (card && typeof card.setCardDisplay === "function") {
        card.setCardDisplay([
          (d: any) => `${d.data["first name"]} ${d.data["last name"]}`,
          (d: any) => d.data["birthday"] || "",
        ]);
      }
      // Configure Spacing and Layout
      chart.setCardXSpacing(250); // Increase horizontal spacing
      chart.setCardYSpacing(150);
      
      // Attempt to sort spouses by children count or marriage date if possible (preserving order)
      // chart.setSortSpousesFunction(...)
      // Set the root node
      if (chart.store) {
        chart.store.updateMainId(rootId);
        chart.updateTree({ initial: true, tree_position: "fit" });
      } else {
        // Fallback if store is not directly accessible (though it should be)
        console.warn("Chart store not found, attempting direct update");
        // It might be that createChart returns an object with methods but typescript doesn't know about 'store' prop if it was private?
        // But d.ts said 'store: Store'.
      }
    } catch (err) {
      console.error("FamilyChart Init Error:", err);
    }
  }, [nodes, rootId]);

  return (
    <div
      ref={containerRef}
      className="f3"
      style={{
        width: "100%",
        height: "100vh", // Ensure full height
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
};
