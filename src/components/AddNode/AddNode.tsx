import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Node, RelType } from "relatives-tree/lib/types";
import css from "./AddNode.modern.module.css";
import { FNode } from "../model/FNode";

interface CustomField {
  id: string;
  key: string;
  value: string;
}

interface AddNodeProps {
  targetId?: string; // id of node in relation to which we add (e.g. parent/child/spouse)
  onAdd?: (
    node: Partial<Node>,
    relation: "child" | "spouse" | "parent",
    targetId?: string,
    type?: RelType
  ) => void;
  onCancel?: () => void;
  nodes?: Readonly<FNode>[];
  noCard?: boolean; // disables card border/background if true
}

const AddNode: React.FC<AddNodeProps> = ({
  targetId,
  onAdd,
  onCancel,
  nodes,
  noCard = false,
}) => {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">(
    "male"
  );
  const [relation, setRelation] = useState<"child" | "spouse" | "parent">(
    "child"
  );
  const [selectedRelType, setSelectedRelType] = useState<RelType>(
    RelType.blood
  );
  const [relTypes, setRelTypes] = useState<RelType[]>([
    RelType.blood,
    RelType.adopted,
  ]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // other-parent selection for child relation
  const spouseOptions = useMemo(() => {
    if (!nodes || !targetId) return [];
    const target = nodes.find((n) => n.id === targetId);
    if (!target || !Array.isArray(target.spouses)) return [];
    return target.spouses
      .map((s) => nodes.find((n) => n.id === s.id))
      .filter(Boolean) as FNode[];
  }, [nodes, targetId]);

  const [selectedOtherParentId, setSelectedOtherParentId] = useState<string>(
    () => ""
  );
  useEffect(() => {
    // default to first spouse if available
    if (spouseOptions.length > 0) {
      setSelectedOtherParentId(spouseOptions[0].id);
    } else {
      setSelectedOtherParentId("");
    }
  }, [spouseOptions]);

  useEffect(() => {
    if (relation === "spouse") {
      setRelTypes([RelType.married, RelType.divorced]);
    } else if (relation === "child") {
      setRelTypes([RelType.blood, RelType.adopted]);
    } else if (relation === "parent") {
      setRelTypes([RelType.blood, RelType.adopted]);
    }
  }, [relation]);

  const addCustomField = useCallback(() => {
    setCustomFields((s) => [
      ...s,
      { id: String(Date.now()), key: "", value: "" },
    ]);
  }, []);

  const updateCustomField = useCallback(
    (id: string, key: string, value: string) => {
      setCustomFields((s) =>
        s.map((f) => (f.id === id ? { ...f, key, value } : f))
      );
    },
    []
  );

  const removeCustomField = useCallback((id: string) => {
    setCustomFields((s) => s.filter((f) => f.id !== id));
  }, []);

  const handleCancel = useCallback(() => {
    onCancel?.();
    // reset local form
    setName("");
    setDob("");
    setGender("");
    setRelation("child");
    setCustomFields([]);
  }, [onCancel]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      // minimal validation
      return;
    }

    const extra: Record<string, unknown> = {};
    for (const f of customFields) {
      if (f.key) extra[f.key] = f.value;
    }

    // prepare parents array: include targetId (if adding child) and optional other parent
    let parents: Array<{ id: string; type?: RelType }> = [];
    if (relation === "child" && targetId) {
      parents.push({ id: targetId, type: selectedRelType });
      if (selectedOtherParentId && selectedOtherParentId !== targetId) {
        parents.push({ id: selectedOtherParentId, type: selectedRelType });
      }
    }

    const newNode: Partial<any> = {
      name: name.trim(),
      dob: dob || undefined,
      gender: (gender as any) || undefined,
      children: [],
      parents: parents.length ? parents : undefined,
      spouses: [],
      ...extra,
    };

    onAdd?.(newNode, relation, targetId, selectedRelType);
    handleCancel();
  }, [
    name,
    dob,
    gender,
    customFields,
    relation,
    targetId,
    onAdd,
    handleCancel,
    selectedOtherParentId,
    selectedRelType,
  ]);

  return (
    <div className={noCard ? css.noCardRoot : css.root}>
      <div className={css.formHeading}>Add Family Member</div>
      <div className={css.formRow}>
        <label className={css.label}>Relation</label>
        <div className={css.radioGroup}>
          <label className={css.radioLabel}>
            <input
              type="radio"
              name="relation"
              value="child"
              checked={relation === "child"}
              onChange={() => setRelation("child")}
            />
            Child
          </label>
          <label className={css.radioLabel}>
            <input
              type="radio"
              name="relation"
              value="spouse"
              checked={relation === "spouse"}
              onChange={() => setRelation("spouse")}
            />
            Spouse
          </label>
          <label className={css.radioLabel}>
            <input
              type="radio"
              name="relation"
              value="parent"
              checked={relation === "parent"}
              onChange={() => setRelation("parent")}
            />
            Parent
          </label>
        </div>
      </div>
      <div className={css.formRow}>
        <label className={css.label}>Relation Type</label>
        <div className={css.radioGroup}>
          {relTypes.map((type) => (
            <label key={type} className={css.radioLabel}>
              <input
                type="radio"
                name="relationType"
                value={type}
                checked={selectedRelType === type}
                onChange={() => setSelectedRelType(type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>
      {relation === "child" && (
        <div className={css.formRow}>
          <label className={css.label}>Other parent</label>
          {spouseOptions.length > 0 ? (
            <select
              className={css.select}
              value={selectedOtherParentId}
              onChange={(e) => setSelectedOtherParentId(e.target.value)}
            >
              <option value="">None</option>
              {spouseOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ color: "#666" }}>No spouse found for target</span>
          )}
        </div>
      )}
      <div className={css.formRow}>
        <label className={css.label}>Name</label>
        <input
          className={`${css.input} ${css.nameInput}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
        />
      </div>
      <div className={css.formRow}>
        <label className={css.label}>Date of birth (optional)</label>
        <input
          className={css.input}
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          type="date"
        />
      </div>
      <div className={css.formRow}>
        <label className={css.label}>Gender</label>
        <select
          className={css.select}
          value={gender}
          onChange={(e) => setGender(e.target.value as any)}
        >
          <option value="">— select —</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div
        className={css.formRow}
        style={{
          flexDirection: "column",
          alignItems: "flex-start",
          marginTop: 10,
        }}
      >
        <strong style={{ fontSize: 13, color: "#2b2d42", marginBottom: 4 }}>
          Additional fields
        </strong>
        {customFields.map((f) => (
          <div key={f.id} className={css.addFieldRow}>
            <input
              className={css.input}
              placeholder="key"
              value={f.key}
              onChange={(e) => updateCustomField(f.id, e.target.value, f.value)}
              style={{ flex: "0 0 40%" }}
            />
            <input
              className={css.input}
              placeholder="value"
              value={f.value}
              onChange={(e) => updateCustomField(f.id, f.key, e.target.value)}
              style={{ flex: "1 1 auto" }}
            />
            <button
              type="button"
              className={css.removeFieldButton}
              onClick={() => removeCustomField(f.id)}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={css.addFieldButton}
          onClick={addCustomField}
        >
          + Add field
        </button>
      </div>
      <div className={css.buttonRow}>
        <button type="button" className={css.button} onClick={handleCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={`${css.button} ${css.primary}`}
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default AddNode;
