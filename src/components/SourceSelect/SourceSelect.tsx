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
import { useSearchParams } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import { selectCastes, selectSubCastes } from "../../store/slices/casteSlice";

interface TreeItem {
  name: string;
  id: string;
  caste?: string;
  subCaste?: string;
  locationName?: string;
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
  const [searchParams] = useSearchParams();
  const urlTreeId = searchParams.get("tree") || "";
  const [trees, setTrees] = React.useState<any[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [value, setValue] = React.useState<string>(urlTreeId);
  const [selectedTreePreview, setSelectedTreePreview] = useState<TreeItem | null>(null);
  const valueRef = useRef(value);
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
  const previousUrlTreeIdRef = useRef<string>(urlTreeId);
  const loadRequestIdRef = useRef(0);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (previousUrlTreeIdRef.current !== urlTreeId) {
      previousUrlTreeIdRef.current = urlTreeId;
      sharedTreeResolvedRef.current = null;
      setSelectedTreePreview(null);
    }

    if (urlTreeId !== value) {
      setValue(urlTreeId);
    }
  }, [urlTreeId, value]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const items = useMemo<TreeItem[]>(
    () =>
      trees.map((tree) => ({
        name: tree.name,
        id: tree.id,
        caste: casteMap.get(tree.caste) || tree.caste,
        subCaste: subCasteMap.get(tree.subCaste) || tree.subCaste,
        locationName: tree.location?.name || tree.locationName,
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
        item.locationName?.toLowerCase().includes(lowerSearch),
    );
  }, [items, searchText]);

  useEffect(() => {
    const loadTrees = async () => {
      const requestId = ++loadRequestIdRef.current;
      try {
        const sourceTrees = await ApiService.getTrees();
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        setTrees(sourceTrees);

        // The list is scoped by ACCESS, so a tree reached another way — a shared
        // link, or following a spouse who married in from another family — will
        // not be in it. Resolve that one tree separately so the selector still
        // shows its name instead of going blank. Cached per tree id so switching
        // back and forth does not refetch.
        const outsideTreeId =
          urlTreeId && !sourceTrees.some((s) => s.id === urlTreeId) ? urlTreeId : null;

        if (!outsideTreeId) {
          setSelectedTreePreview(null);
          sharedTreeResolvedRef.current = null;
        } else if (sharedTreeResolvedRef.current !== outsideTreeId) {
          try {
            const targetTree = await ApiService.getTreeWithDetails(outsideTreeId);
            if (loadRequestIdRef.current !== requestId) {
              return;
            }
            if (targetTree?.id) {
              setSelectedTreePreview({
                id: targetTree.id,
                name: targetTree.name || "Selected tree",
                caste: casteMap.get(targetTree.caste) || targetTree.caste,
                subCaste:
                  subCasteMap.get(targetTree.subCaste) || targetTree.subCaste,
                locationName: targetTree.location?.name,
              });
            }
          } catch (err) {
            if (loadRequestIdRef.current !== requestId) {
              return;
            }
            console.warn("Could not resolve tree reached by link:", err);
          }
          sharedTreeResolvedRef.current = outsideTreeId;
        }

        let nextValue = valueRef.current;
        let notifyValue: string | null = null;

        // Keep the URL's tree when it is one of ours, and ALSO when it is a tree
        // we reached from outside the list (a shared link, or a spouse who
        // married in). Without that second case the fallback below would bounce
        // the user straight back to their own first tree.
        if (urlTreeId && (sourceTrees.some((s) => s.id === urlTreeId) || outsideTreeId)) {
          nextValue = urlTreeId;
        }
        // Otherwise auto-select first only once and notify parent.
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

        if (nextValue !== valueRef.current) {
          setValue(nextValue);
        }

        if (notifyValue !== null) {
          onChangeRef.current(notifyValue, []);
        }
      } catch (error) {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        console.error("Failed to load trees:", error);
        setTrees([]);
      }
    };

    loadTrees();
  }, [autoNotifyOnInit, casteMap, subCasteMap, urlTreeId]);

  const changeHandler = useCallback(
    (event: any) => {
      const id = event.target.value;
      if (id === value) return;
      setValue(id);
      setSelectedTreePreview(null);
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
      {(item.caste || item.subCaste || item.locationName) && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {[item.caste, item.subCaste, item.locationName]
            .filter(Boolean)
            .join(" • ")}
        </Typography>
      )}
    </Box>
  );

  const selectedItem = getSelectedItem();
  const renderItem = selectedItem || selectedTreePreview;

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
          const item = renderItem;
          if (!item) {
            return (
              <Typography sx={{ color: "text.secondary" }}>
                Loading selected tree...
              </Typography>
            );
          }
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
                {[item.caste, item.subCaste, item.locationName]
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
