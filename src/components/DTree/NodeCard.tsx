import React from "react";

interface NodeCardProps {
  name: string;
  extra: any;
  nodeClass: string;
  textClass: string;
  currentTreeId?: string;
  id: string;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  name,
  extra,
  nodeClass,
  textClass,
  currentTreeId,
  id,
}) => {
  const gender = extra?.gender || "";
  const genderClass =
    gender === "male" ? "male" : gender === "female" ? "female" : "person";
  const showExternalTreeLink =
    currentTreeId && extra && extra.treeId && extra.treeId !== currentTreeId;

  const MaleIcon = () => (
    <svg className="gender-icon male" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 7c2.67 0 8 1.34 8 4v3H4v-3c0-2.66 5.33-4 8-4z" />
    </svg>
  );

  const FemaleIcon = () => (
    <svg className="gender-icon female" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.94 8.31C13.62 7.52 12.85 7 12 7s-1.62.52-1.94 1.31L7 16h2l1.25-3h3.5L15 16h2l-3.06-7.69zM11.5 11l.5-1.5.5 1.5h-1z" />
      <circle cx="12" cy="4" r="2" />
    </svg>
  );

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        position: "relative",
        overflow: "visible",
      }}
      className={nodeClass}
      id={`node${id}`}
    >
      <p
        style={{ textAlign: "center" }}
        className={`${textClass} ${genderClass}`}
      >
        {gender === "male" && <MaleIcon />}
        {gender === "female" && <FemaleIcon />}
        <span>{name}</span>
      </p>

      {/* Tooltip */}
      <div className="node-tooltip">
        <div className="tooltip-name">{name}</div>
        {extra?.dob && <div className="tooltip-dob">DOB: {extra.dob}</div>}
        <div className="tooltip-stats">
          Parents: {extra?.parentsCount || 0} • Children:{" "}
          {extra?.childrenCount || 0} • Spouses: {extra?.spousesCount || 0}
        </div>

        {extra?.hierarchy && extra.hierarchy.length > 0 && (
          <>
            <div className="tooltip-ancestry-title">Ancestry:</div>
            <div className="tooltip-ancestry">
              {extra.hierarchy.map((h: any, i: number) => {
                const arrow = "↑ ".repeat(extra.hierarchy.length - i);
                const style =
                  i < extra.hierarchy.length - 1 ? { marginBottom: "2px" } : {};
                return (
                  <div
                    key={i}
                    style={{ fontSize: "0.7rem", opacity: 0.85, ...style }}
                  >
                    {arrow} {h.name}
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div className="tooltip-meta">Click to view details</div>
      </div>

      {/* External Tree Link */}
      {showExternalTreeLink && (
        <div
          className="external-tree-icon"
          title="Go to linked Family Tree"
          data-tree-id={extra.treeId}
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            width: "24px",
            height: "24px",
            background: "white",
            borderRadius: "50%",
            border: "2px solid #1976d2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 100,
            fontSize: "14px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          🔗
        </div>
      )}
    </div>
  );
};
