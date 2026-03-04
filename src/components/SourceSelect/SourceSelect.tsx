import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Node } from "relatives-tree/lib/types";
import { ApiService } from "../../services/apiService";
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
import { useAppSelector } from "../../store/hooks";
import { selectCastes, selectSubCastes } from "../../store/slices/casteSlice";

interface TreeItem {
  name: string;
  id: string;
  caste?: string;
  subCaste?: string;
  villageName?: string;
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
  const [trees, setTrees] = React.useState<any[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [value, setValue] = React.useState<string>(() => {
    // Read tree ID from URL on initial load
    const params = new URLSearchParams(window.location.search);
    return params.get("tree") || "";
  });
  const { selectedVillage, setSelectedVillage } = useVillage();
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);
  const casteMap = useMemo(
    () => new Map(castes.map((c: any) => [c.id, c.name])),
    [castes],
  );
  const subCasteMap = useMemo(
    () => new Map(subCastes.map((s: any) => [s.id, s.name])),
    [subCastes],
  );
  const initNotifiedTreeRef = useRef<string | null>(null);
  const sharedTreeResolvedRef = useRef<string | null>(null);
  const resolveSharedTreeOnInitRef = useRef(true);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const items = useMemo<TreeItem[]>(
    () =>
      trees.map((tree) => ({
        name: tree.name,
        id: tree.id,
        caste: casteMap.get(tree.caste) || tree.caste,
        subCaste: subCasteMap.get(tree.subCaste) || tree.subCaste,
        villageName: tree.village?.name || tree.villageName,
      })),
    [trees, casteMap, subCasteMap],
  );

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;

    const lowerSearch = searchText.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.caste?.toLowerCase().includes(lowerSearch) ||
        item.subCaste?.toLowerCase().includes(lowerSearch) ||
        item.villageName?.toLowerCase().includes(lowerSearch),
    );
  }, [items, searchText]);

  useEffect(() => {
    const loadTrees = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTreeId = params.get("tree");

        // If a shared tree link points to a tree in a different village,
        // switch village first so that tree appears in the filtered tree list.
        // Do this only once per URL tree value to avoid blocking manual village changes.
        if (
          resolveSharedTreeOnInitRef.current &&
          urlTreeId &&
          sharedTreeResolvedRef.current !== urlTreeId
        ) {
          try {
            const targetTree = await ApiService.getTreeWithDetails(urlTreeId);
            if (
              targetTree?.villageId &&
              targetTree.villageId !== selectedVillage
            ) {
              sharedTreeResolvedRef.current = urlTreeId;
              resolveSharedTreeOnInitRef.current = false;
              setSelectedVillage(targetTree.villageId);
              return;
            }
            sharedTreeResolvedRef.current = urlTreeId;
            resolveSharedTreeOnInitRef.current = false;
          } catch (err) {
            console.warn("Could not resolve shared tree village:", err);
            sharedTreeResolvedRef.current = urlTreeId;
            resolveSharedTreeOnInitRef.current = false;
          }
        }

        if (resolveSharedTreeOnInitRef.current && !urlTreeId) {
          resolveSharedTreeOnInitRef.current = false;
        }

        const sourceTrees = await ApiService.getTrees(selectedVillage);
        setTrees(sourceTrees);

        let nextValue = value;
        let notifyValue: string | null = null;

        // If URL has a valid tree in current list, sync local select only (no notify)
        if (urlTreeId && sourceTrees.some((s) => s.id === urlTreeId)) {
          nextValue = urlTreeId;
        }
        // Otherwise auto-select first only once and notify parent
        else if (sourceTrees.length > 0) {
          const first = sourceTrees[0];
          const currentExists = Boolean(
            nextValue && sourceTrees.some((s) => s.id === nextValue),
          );

          if (!currentExists) {
            nextValue = first.id;
            if (autoNotifyOnInit && initNotifiedTreeRef.current !== first.id) {
              initNotifiedTreeRef.current = first.id;
              notifyValue = first.id;
            }
          }
        }
        // If current tree is not in filtered list, clear selection
        else {
          nextValue = "";
          if (autoNotifyOnInit && initNotifiedTreeRef.current !== "") {
            initNotifiedTreeRef.current = "";
            notifyValue = "";
          }
        }

        if (nextValue !== value) {
          setValue(nextValue);
        }

        if (notifyValue !== null) {
          onChangeRef.current(notifyValue, []);
        }
      } catch (error) {
        console.error("Failed to load trees:", error);
        setTrees([]);
      }
    };

    loadTrees();
  }, [autoNotifyOnInit, selectedVillage, setSelectedVillage, value]);

  const changeHandler = useCallback(
    (event: any) => {
      const id = event.target.value;
      if (id === value) return;
      setValue(id);
      // pass the selected id; second param (nodes) is not available here so pass an empty array
      onChangeRef.current(id, []);
    },
    [value],
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
      {(item.caste || item.subCaste || item.villageName) && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {[item.caste, item.subCaste, item.villageName]
            .filter(Boolean)
            .join(" • ")}
        </Typography>
      )}
    </Box>
  );

  const selectedItem = getSelectedItem();

  return (
    <FormControl
      sx={{
        width: { xs: "100%", sm: "auto" },
        minWidth: { xs: "100%", sm: 320 },
        maxWidth: "calc(100vw - 32px)",
      }}
      size="small"
    >
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
                {[item.caste, item.subCaste, item.villageName]
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
