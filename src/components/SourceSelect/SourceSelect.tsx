import React, { memo, useCallback, ChangeEvent, useEffect } from "react";
import type { Node } from "relatives-tree/lib/types";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import css from "./SourceSelect.module.css";

interface SourceSelectProps {
  onChange: (value: string, nodes: readonly Readonly<Node>[]) => void;
  autoNotifyOnInit?: boolean; // if false, do not call onChange during initial snapshot sync
}

export const SourceSelect = memo(function SourceSelect({
  onChange,
  autoNotifyOnInit = true,
}: SourceSelectProps) {
  const [items, setItems] = React.useState<Array<{ name: string; id: string }>>(
    []
  );
  const [value, setValue] = React.useState<string>(() => {
    // Read tree ID from URL on initial load
    const params = new URLSearchParams(window.location.search);
    return params.get("tree") || "";
  });
  useEffect(() => {
    const treeRef = collection(db, "tree");
    const uunsub = onSnapshot(treeRef, (snapshot) => {
      const sources: typeof items = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sources.push({ name: data.treeName, id: doc.id });
      });
      setItems(sources);

      // If value from URL exists and is valid, use it
      const urlTreeId = new URLSearchParams(window.location.search).get("tree");
      if (urlTreeId && sources.some((s) => s.id === urlTreeId)) {
        setValue(urlTreeId);
        if (autoNotifyOnInit) onChange(urlTreeId, []);
      }
      // Otherwise auto-select first source if none selected yet
      else if (sources.length > 0 && !value) {
        const first = sources[0];
        setValue(first.id);
        if (autoNotifyOnInit) onChange(first.id, []);
      }
    });
    return () => uunsub();
  }, [onChange, value, autoNotifyOnInit]);
  const changeHandler = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const id = event.target.value;
      setValue(id);
      // pass the selected id; second param (nodes) is not available here so pass an empty array
      onChange(id, []);
    },
    [onChange]
  );

  return (
    <div className={css.root}>
      <label className={css.label} htmlFor="source-select">
        Source:
      </label>
      <select
        id="source-select"
        className={css.select}
        value={value}
        onChange={changeHandler}
      >
        <option value="">— select —</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
});
