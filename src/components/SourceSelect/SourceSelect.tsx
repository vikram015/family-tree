import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { Node } from "relatives-tree/lib/types";
import { SupabaseService } from "../../services/supabaseService";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  TextField,
} from "@mui/material";
import { useVillage } from "../hooks/useVillage";

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
  const [searchText, setSearchText] = useState<string>("");
  const [value, setValue] = React.useState<string>(() => {
    // Read tree ID from URL on initial load
    const params = new URLSearchParams(window.location.search);
    return params.get("tree") || "";
  });
  const { selectedVillage } = useVillage();

  // Filter items based on search text
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;

    const lowerSearch = searchText.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.caste?.toLowerCase().includes(lowerSearch) ||
        item.sub_caste?.toLowerCase().includes(lowerSearch) ||
        item.village_name?.toLowerCase().includes(lowerSearch),
    );
  }, [items, searchText]);

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
        onOpen={() => setSearchText("")}
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
          slotProps: {
            paper: {
              sx: {
                zIndex: 1300,
              },
            },
          },
        }}
      >
        <Box
          sx={{
            p: 1,
            pb: 0,
            position: "sticky",
            top: 0,
            zIndex: 1,
            backgroundColor: "background.paper",
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search trees..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            sx={{
              "& .MuiOutlinedInput-root": {
                fontSize: "0.875rem",
              },
            }}
          />
        </Box>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {renderMenuItem(item)}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography variant="body2" sx={{ color: "text.disabled" }}>
              No trees found
            </Typography>
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
});
