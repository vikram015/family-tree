import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Stack,
  Avatar,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { ApiService } from "../../services/apiService";

interface PersonSearchResult {
  id: string;
  name: string;
  gender?: string;
  dob?: string;
  photoUrl?: string;
  treeId: string;
  treeName?: string;
  hierarchy: any[];
  gotra?: string;
  locationName?: string;
  casteName?: string;
  subCasteName?: string;
}

function getInitials(value?: string): string {
  if (!value) return "?";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function renderMetaPill(label: string, value?: string, accent?: "teal" | "amber" | "slate") {
  if (!value) return null;

  const styles =
    accent === "teal"
      ? { bg: "#ecfeff", color: "#0f766e" }
      : accent === "amber"
        ? { bg: "#fff7ed", color: "#b45309" }
        : { bg: "#f1f5f9", color: "#475569" };

  return (
    <Box
      key={`${label}-${value}`}
      sx={{
        px: 0.9,
        py: 0.45,
        borderRadius: 999,
        bgcolor: styles.bg,
        color: styles.color,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <Box component="span">{value}</Box>
    </Box>
  );
}

export type PersonSearchValueChangeSource = "input" | "select";

interface PersonSearchFieldProps {
  label?: string;
  placeholder?: string;
  searchValue: string;
  onSearchValueChange: (
    value: string,
    meta?: { source: PersonSearchValueChangeSource },
  ) => void;
  onPersonSelect: (person: PersonSearchResult) => void;
  selectedPerson?: PersonSearchResult | any | null;
  locationId?: string;
  treeId?: string;
  /** When set, only candidates of this gender are shown in the results. */
  filterGender?: string;
  disabled?: boolean;
  autoSearch?: boolean;
  minSearchLength?: number;
  hideSearchButton?: boolean;
  noResultsText?: string;
  startIcon?: React.ReactNode;
}

export const PersonSearchField: React.FC<PersonSearchFieldProps> = ({
  label = "Select Person",
  placeholder = "Enter name and search",
  searchValue,
  onSearchValueChange,
  onPersonSelect,
  selectedPerson,
  locationId,
  treeId,
  filterGender,
  disabled = false,
  autoSearch = false,
  minSearchLength = 1,
  hideSearchButton = false,
  noResultsText = "No results found",
  startIcon,
}) => {
  const [searchResults, setSearchResults] = useState<PersonSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const latestSearchRef = useRef(0);
  const skipNextAutoSearchRef = useRef(false);

  const handleSearch = useCallback(async () => {
    const trimmedSearch = searchValue.trim();
    const hasScope = Boolean(treeId || locationId);

    if (!hasScope || trimmedSearch.length < minSearchLength) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setShowResults(true);
    const searchId = ++latestSearchRef.current;

    try {
      const results = await ApiService.searchPeopleWithHierarchy(trimmedSearch, {
        treeId,
        locationId,
      });

      if (searchId !== latestSearchRef.current) {
        return;
      }

      const normalizedFilterGender = (filterGender || "").toLowerCase();
      const peopleSearchResults: PersonSearchResult[] = results
        .map((person: any) => ({
          id: person.personId,
          name: person.personName,
          gender: person.gender,
          dob: person.dob,
          photoUrl: person.photoUrl,
          treeId: person.treeId,
          treeName: person.treeName,
          hierarchy: person.parentHierarchy || [],
          gotra: person.gotra,
          locationName: person.locationName,
          casteName: person.casteName,
          subCasteName: person.subCasteName,
        }))
        // When a gender filter is active, only show candidates of that gender
        // (keep those with unknown gender so incomplete records aren't hidden).
        .filter(
          (person) =>
            !normalizedFilterGender ||
            !person.gender ||
            person.gender.toLowerCase() === normalizedFilterGender,
        );

      setSearchResults(peopleSearchResults);
    } catch (error) {
      console.error("Error searching people:", error);
      if (searchId === latestSearchRef.current) {
        setSearchResults([]);
      }
    }
  }, [minSearchLength, searchValue, treeId, locationId, filterGender]);

  const handlePersonClick = (person: PersonSearchResult) => {
    setSearchResults([]);
    setShowResults(false);
    skipNextAutoSearchRef.current = true;
    onSearchValueChange(person.name, { source: "select" });
    onPersonSelect(person);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    if (!autoSearch) {
      return;
    }

    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      handleSearch();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [autoSearch, handleSearch]);

  return (
    <Box sx={{ position: "relative", width: "100%", mb: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", width: "100%" }}
      >
        <TextField
          label={label}
          value={searchValue}
          onChange={(e) =>
            onSearchValueChange(e.target.value, { source: "input" })
          }
          onKeyPress={handleKeyPress}
          fullWidth
          placeholder={placeholder}
          size="medium"
          autoComplete="off"
          disabled={disabled}
          InputProps={
            startIcon
              ? {
                  startAdornment: (
                    <InputAdornment position="start">
                      {startIcon}
                    </InputAdornment>
                  ),
                }
              : undefined
          }
        />
        {!hideSearchButton && (
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={disabled}
            startIcon={<SearchIcon />}
            sx={{
              height: 56,
              minWidth: 100,
              whiteSpace: "nowrap",
            }}
          >
            Search
          </Button>
        )}
      </Stack>

      {/* Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <Paper
          sx={{
            mt: 1,
            maxHeight: 300,
            overflow: "auto",
            border: "1px solid #ddd",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            position: "absolute",
            width: "100%",
            zIndex: 10,
          }}
        >
          <Typography
            variant="caption"
            sx={{ p: 1, display: "block", color: "#666" }}
          >
            Found {searchResults.length} result
            {searchResults.length !== 1 ? "s" : ""}
          </Typography>
          {searchResults.map((person) => (
            <Box
              key={person.id}
              onClick={() => handlePersonClick(person)}
              sx={{
                p: 2,
                borderBottom: "1px solid #eee",
                cursor: "pointer",
                backgroundColor: "#fff",
                transition: "backgroundColor 0.2s",
                "&:hover": { backgroundColor: "#f5f5f5" },
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar
                  src={person.photoUrl || undefined}
                  sx={{
                    width: 42,
                    height: 42,
                    fontSize: 15,
                    fontWeight: 700,
                    bgcolor: person.gender === "female" ? "#ffe4ef" : "#e0f2fe",
                    color: person.gender === "female" ? "#be185d" : "#0369a1",
                    mt: 0.25,
                  }}
                >
                  {getInitials(person.name)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                    {person.name}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ flexWrap: "wrap", rowGap: 0.75, mb: 0.75 }}
                  >
                    {renderMetaPill("Location", person.locationName, "teal")}
                    {renderMetaPill("Caste", person.casteName, "slate")}
                    {renderMetaPill("Sub caste", person.gotra || person.subCasteName, "slate")}
                  </Stack>
                  <Typography variant="caption" sx={{ color: "#999", mt: 0.5 }}>
                    🧬{" "}
                    {person.hierarchy && person.hierarchy.length > 0
                      ? person.hierarchy
                          .slice(-5)
                          .map((a: any) => a.name)
                          .join(" → ")
                      : "No ancestry data"}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Paper>
      )}

      {showResults && searchResults.length === 0 && (
        <Paper
          sx={{
            mt: 1,
            p: 2,
            border: "1px solid #ddd",
            textAlign: "center",
            position: "absolute",
            width: "100%",
            zIndex: 10,
          }}
        >
          <Typography variant="body2" color="textSecondary">
            {noResultsText}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
