import React, { useState } from "react";
import { db } from "../../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import css from "./AddTree.module.css";

interface AddTreeProps {
  onCreate?: (treeId: string) => void;
}

export const AddTree: React.FC<AddTreeProps> = ({ onCreate }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      // create tree doc
      const treeRef = await addDoc(collection(db, "tree"), {
        treeName: name || "Default Tree",
        createdAt: serverTimestamp(),
      });
      const treeId = treeRef.id;

      setCreatedId(treeId);
      setName("");
      setShowModal(false);
      if (onCreate) onCreate(treeId);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      console.error("Failed to create tree:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setError(null);
    setCreatedId(null);
    setName("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (loading) return;
    setShowModal(false);
  };

  const isValid = name.trim().length >= 4 && name.trim().length <= 64;

  return (
    <div className={css.root}>
      <button onClick={openModal} className={`${css.button} ${css.primary}`}>
        Create tree
      </button>
      {showModal && (
        <div className={css.modalOverlay} onClick={closeModal}>
          <div
            className={css.modal}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className={css.modalTitle}>Create a new tree</div>
            <label className={css.modalLabel}>
              Tree name
              <input
                className={css.modalInput}
                placeholder="e.g. Sharma Family"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </label>
            <div className={css.modalActions}>
              <button
                className={`${css.button} ${css.secondary}`}
                onClick={closeModal}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={`${css.button} ${css.primary}`}
                onClick={submit}
                disabled={!isValid || loading}
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
            {error && <div className={css.error}>Error: {error}</div>}
          </div>
        </div>
      )}
      {createdId && <div className={css.success}>Created: {createdId}</div>}
      {error && !showModal && <div className={css.error}>Error: {error}</div>}
    </div>
  );
};

export default AddTree;
