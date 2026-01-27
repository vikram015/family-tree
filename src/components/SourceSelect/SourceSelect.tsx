import React, { memo, useCallback, useEffect, useMemo } from "react";
import type { Node } from "relatives-tree/lib/types";
import { SupabaseService } from "../../services/supabaseService";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import { useVillage } from "../context/VillageContext";

interface TreeItem {
  name: string;
  id: string;
  caste?: string;
  sub_caste?: string;
  village_name?: string;
}

interface SourceSelectProps {
  onChange: (value: string, nodes: readonly Readonly<Node>[]) => void;
  autoNotifyOnInit?: boolean; // if false, do not call onChange during initial snapshot sync
}

export const SourceSelect = memo(function SourceSelect({
  onChange,
  autoNotifyOnInit = true,
}: SourceSelectProps) {
  console.log("SourceSelect: Rendering component");
  const [items, setItems] = React.useState<TreeItem[]>([]);
  const [value, setValue] = React.useState<string>(() => {
    // Read tree ID from URL on initial load
    const params = new URLSearchParams(window.location.search);
    return params.get("tree") || "";
  });
  const { selectedVillage } = useVillage();

  // Memoize the onChange callback to prevent effect from re-running unnecessarily
  const memoizedOnChange = useCallback(onChange, [onChange]);

  useEffect(() => {
    const loadTrees = async () => {
      try {
        let trees = await SupabaseService.getTrees(selectedVillage);

        // No need to filter again since getTrees now handles it
        const sources: TreeItem[] = trees.map((tree) => ({
          name: tree.name,
          id: tree.id,
          caste: tree.caste,
          sub_caste: tree.sub_caste,
          village_name: tree.village?.name || tree.villageName,
        }));
        setItems(sources);

        // If value from URL exists and is valid, use it
        const urlTreeId = new URLSearchParams(window.location.search).get(
          "tree",
        );
        if (urlTreeId && sources.some((s) => s.id === urlTreeId)) {
          setValue(urlTreeId);
          if (autoNotifyOnInit) memoizedOnChange(urlTreeId, []);
        }
        // Otherwise auto-select first source if none selected yet
        else if (sources.length > 0 && !value) {
          const first = sources[0];
          setValue(first.id);
          if (autoNotifyOnInit) memoizedOnChange(first.id, []);
        }
        // If current tree is not in filtered list, clear selection
        else if (value && !sources.some((s) => s.id === value)) {
          setValue("");
          memoizedOnChange("", []);
        }
      } catch (error) {
        console.error("Failed to load trees:", error);
        setItems([]);
      }
    };

    loadTrees();
  }, [memoizedOnChange, autoNotifyOnInit, selectedVillage, value]);

  const changeHandler = useCallback(
    (event: any) => {
      const id = event.target.value;
      setValue(id);
      // pass the selected id; second param (nodes) is not available here so pass an empty array
      onChange(id, []);
    },
    [onChange],
  );

  const formatTreeLabel = (item: TreeItem): string => {
    const parts = [item.name];
    if (item.caste) parts.push(item.caste);
    if (item.sub_caste) parts.push(item.sub_caste);
    if (item.village_name) parts.push(item.village_name);
    return parts.join(" - ");
  };

  const getSelectedItem = (): TreeItem | undefined => {
    return items.find((item) => item.id === value);
  };

  const renderMenuItem = (item: TreeItem) => (
    <Box sx={{ py: 0.75 }}>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          color: "text.primary",
        }}
      >
        {item.name}
      </Typography>
      {(item.caste || item.sub_caste || item.village_name) && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {[item.caste, item.sub_caste, item.village_name]
            .filter(Boolean)
            .join(" • ")}
        </Typography>
      )}
    </Box>
  );

  const selectedItem = getSelectedItem();

  return (
    <FormControl sx={{ minWidth: 350 }} size="small">
      <InputLabel id="source-select-label">Family Tree</InputLabel>
      <Select
        labelId="source-select-label"
        id="source-select"
        value={value}
        label="Family Tree"
        onChange={changeHandler}
        renderValue={(selected) => {
          if (!selected) {
            return (
              <Typography sx={{ color: "text.disabled" }}>
                Select a tree...
              </Typography>
            );
          }
          const item = selectedItem;
          if (!item) return selected;
          return (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "text.primary",
                }}
              >
                {item.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {[item.caste, item.sub_caste, item.village_name]
                  .filter(Boolean)
                  .join(" • ")}
              </Typography>
            </Box>
          );
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: 400,
              "& .MuiMenuItem-root": {
                py: 0.5,
              },
            },
          },
        }}
      >
        {items.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {renderMenuItem(item)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
});
