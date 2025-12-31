import React, { useEffect, useState } from "react";
import { SourceSelect } from "../SourceSelect/SourceSelect";
import AddTree from "../AddTree/AddTree";
import css from "./Header.module.css";

interface HeaderProps {
  onSourceChange: (value: string, nodes: readonly any[]) => void;
  onCreate?: (id: string) => void;
  onContact?: () => void;
  onBackToTree?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSourceChange,
  onCreate,
  onContact,
  onBackToTree,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSourceChange = (value: string, nodes: readonly any[]) => {
    onSourceChange(value, nodes);
    setMenuOpen(false);
  };

  const handleCreateTree = (id: string) => {
    if (onCreate) onCreate(id);
    setMenuOpen(false);
  };

  const handleBackToTree = () => {
    if (onBackToTree) onBackToTree();
    setMenuOpen(false);
  };

  const handleContact = () => {
    if (onContact) onContact();
    setMenuOpen(false);
  };
  console.log(menuOpen);
  return (
    <header className={css.header}>
      <h1 className={css.title}>🌳 गंगवा वंशावली</h1>
      <div className={css.spacer} />
      <button
        className={css.menuToggle}
        aria-label="Toggle menu"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Desktop controls */}
      <div className={css.controlsDesktop}>
        <SourceSelect onChange={onSourceChange} />
        <AddTree onCreate={onCreate} />
        {onBackToTree && (
          <button className={css.backBtn} onClick={onBackToTree}>
            Back to Tree
          </button>
        )}
        {onContact && (
          <button className={css.contactBtn} onClick={onContact}>
            Contact
          </button>
        )}
      </div>

      {/* Mobile dropdown panel */}
      <div className={`${css.menuPanel} ${menuOpen ? css.open : ""}`}>
        <div className={css.menuRow}>
          <SourceSelect onChange={handleSourceChange} autoNotifyOnInit={false} />
        </div>
        <div className={css.menuRow}>
          <AddTree onCreate={handleCreateTree} />
        </div>
        <div className={css.menuRow}>
          {onBackToTree && (
            <button className={css.backBtn} onClick={handleBackToTree}>
              Back to Tree
            </button>
          )}
          {onContact && (
            <button className={css.contactBtn} onClick={handleContact}>
              Contact
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
