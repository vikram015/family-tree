import React, { memo, useCallback, useEffect } from "react";
import type { Node } from "relatives-tree/lib/types";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useVillage } from "../context/VillageContext";

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
  const { selectedVillage } = useVillage();

  useEffect(() => {
    const treeRef = collection(db, "tree");

    // Filter trees by village if a village is selected
    const q = selectedVillage
      ? query(treeRef, where("villageId", "==", selectedVillage))
      : treeRef;

    const uunsub = onSnapshot(q, (snapshot) => {
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
      // If current tree is not in filtered list, clear selection
      else if (value && !sources.some((s) => s.id === value)) {
        setValue("");
        onChange("", []);
      }
    });
    return () => uunsub();
  }, [onChange, value, autoNotifyOnInit, selectedVillage]);

  const changeHandler = useCallback(
    (event: any) => {
      const id = event.target.value;
      setValue(id);
      // pass the selected id; second param (nodes) is not available here so pass an empty array
      onChange(id, []);
    },
    [onChange]
  );

  return (
    <FormControl sx={{ minWidth: 200 }} size="small">
      <InputLabel id="source-select-label">Source</InputLabel>
      <Select
        labelId="source-select-label"
        id="source-select"
        value={value}
        label="Source"
        onChange={changeHandler}
      >
        <MenuItem value="">— select —</MenuItem>
        {items.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});
