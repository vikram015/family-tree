import React, { useMemo, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import MaleOutlinedIcon from "@mui/icons-material/MaleOutlined";
import FemaleOutlinedIcon from "@mui/icons-material/FemaleOutlined";
import { Gender } from "relatives-tree/lib/types";
import type { FNode } from "../model/FNode";

interface TreePersonSearchProps {
  nodes: FNode[];
  /** Called with the selected person's id. Acts as a navigation trigger, not a form field. */
  onSelect: (personId: string) => void;
  size?: "small" | "medium";
  placeholder?: string;
}

const MAX_RESULTS = 30;

/**
 * Instant, in-tree person search. Filters the already-loaded `nodes` client-side
 * (name + Hindi name), so there's no network round-trip. Selecting a result is a
 * one-shot action: it fires `onSelect(id)` and clears the field rather than holding
 * a value — the parent focuses/centers that person in the tree or timeline.
 */
export function TreePersonSearch({
  nodes,
  onSelect,
  size = "small",
  placeholder = "Search people…",
}: TreePersonSearchProps) {
  const [inputValue, setInputValue] = useState("");

  const options = useMemo(
    () =>
      [...nodes].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [nodes],
  );

  const nodeById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  // The father is the male parent (falling back to the first parent when gender
  // is unknown) — mirrors the male-line hierarchy used elsewhere in the tree.
  const getFather = (node?: FNode): FNode | undefined => {
    const parents = node?.parents || [];
    for (const parent of parents) {
      const parentNode = nodeById.get(parent.id);
      if (parentNode?.gender === Gender.male) return parentNode;
    }
    return parents[0] ? nodeById.get(parents[0].id) : undefined;
  };

  // Bolds the first occurrence of `query` inside `text` — mirrors the
  // substring match used in filterOptions above.
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    const trimmedQuery = query.trim();
    if (!text || !trimmedQuery) return text;
    const index = text.toLowerCase().indexOf(trimmedQuery.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <Box component="strong" sx={{ fontWeight: 800, color: "primary.main" }}>
          {text.slice(index, index + trimmedQuery.length)}
        </Box>
        {text.slice(index + trimmedQuery.length)}
      </>
    );
  };

  return (
    <Autocomplete<FNode, false, false, false>
      fullWidth
      size={size}
      options={options}
      value={null}
      inputValue={inputValue}
      autoHighlight
      openOnFocus
      blurOnSelect
      clearOnBlur
      handleHomeEndKeys
      onInputChange={(_e, value, reason) => {
        // "reset" fires right after a selection — keep the field cleared then.
        if (reason !== "reset") setInputValue(value);
      }}
      getOptionLabel={(option) => option.name || ""}
      getOptionKey={(option) => option.id}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      filterOptions={(opts, state) => {
        const query = state.inputValue.trim().toLowerCase();
        if (!query) return [];
        return opts
          .filter(
            (o) =>
              (o.name || "").toLowerCase().includes(query) ||
              (o.nameHindi || "").toLowerCase().includes(query),
          )
          .slice(0, MAX_RESULTS);
      }}
      onChange={(_e, value) => {
        if (value) {
          onSelect(value.id);
          setInputValue("");
        }
      }}
      noOptionsText={
        inputValue.trim() ? "No matching person" : "Type a name to search"
      }
      renderOption={(props, option, state) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & {
          key?: React.Key;
        };
        // Show up to two ancestors — father, then grandfather — when available.
        const father = getFather(option);
        const grandfather = getFather(father);
        const path = [father?.name, grandfather?.name]
          .filter(Boolean)
          .join(" › ");
        const isFemale = option.gender === Gender.female;
        return (
          <Box
            component="li"
            key={key}
            {...rest}
            sx={{ gap: 1, alignItems: "center" }}
          >
            <Avatar
              src={option.photo || undefined}
              sx={{
                width: 28,
                height: 28,
                fontSize: 13,
                bgcolor: isFemale ? "error.light" : "info.light",
              }}
            >
              {isFemale ? (
                <FemaleOutlinedIcon sx={{ fontSize: 16 }} />
              ) : (
                <MaleOutlinedIcon sx={{ fontSize: 16 }} />
              )}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {highlightMatch(option.name || "", state.inputValue)}
                {option.nameHindi ? (
                  <> ({highlightMatch(option.nameHindi, state.inputValue)})</>
                ) : (
                  ""
                )}
              </Typography>
              {path && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: "block" }}
                >
                  {path}
                </Typography>
              )}
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start" sx={{ ml: 0.5 }}>
                <SearchOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      )}
    />
  );
}
