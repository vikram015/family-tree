import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { ApiService } from "../../services/apiService";

interface PersonSearchResult {
  id: string;
  name: string;
  gender?: string;
  dob?: string;
  treeId: string;
  hierarchy: any[];
  villageName?: string;
  casteName?: string;
  subCasteName?: string;
}

interface PersonSearchFieldProps {
  label?: string;
  placeholder?: string;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onPersonSelect: (person: PersonSearchResult) => void;
  selectedPerson?: PersonSearchResult | any | null;
  villageId?: string;
  treeId?: string;
  disabled?: boolean;
  autoSearch?: boolean;
  minSearchLength?: number;
  hideSearchButton?: boolean;
  noResultsText?: string;
}

export const PersonSearchField: React.FC<PersonSearchFieldProps> = ({
  label = "Select Person",
  placeholder = "Enter name and search",
  searchValue,
  onSearchValueChange,
  onPersonSelect,
  selectedPerson,
  villageId,
  treeId,
  disabled = false,
  autoSearch = false,
  minSearchLength = 1,
  hideSearchButton = false,
  noResultsText = "No results found",
}) => {
  const [searchResults, setSearchResults] = useState<PersonSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const latestSearchRef = useRef(0);

  const handleSearch = useCallback(async () => {
    const trimmedSearch = searchValue.trim();
    const hasScope = Boolean(treeId || villageId);

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
        villageId,
      });

      if (searchId !== latestSearchRef.current) {
        return;
      }

      const peopleSearchResults: PersonSearchResult[] = results.map(
        (person: any) => ({
          id: person.personId,
          name: person.personName,
          gender: person.gender,
          dob: person.dob,
          treeId: person.treeId,
          hierarchy: person.parentHierarchy || [],
          villageName: person.villageName,
          casteName: person.casteName,
          subCasteName: person.subCasteName,
        }),
      );

      setSearchResults(peopleSearchResults);
    } catch (error) {
      console.error("Error searching people:", error);
      if (searchId === latestSearchRef.current) {
        setSearchResults([]);
      }
    }
  }, [minSearchLength, searchValue, treeId, villageId]);

  const handlePersonClick = (person: PersonSearchResult) => {
    onPersonSelect(person);
    setSearchResults([]);
    setShowResults(false);
    onSearchValueChange(person.name);
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
          onChange={(e) => onSearchValueChange(e.target.value)}
          onKeyPress={handleKeyPress}
          fullWidth
          placeholder={placeholder}
          size="medium"
          autoComplete="off"
          disabled={disabled}
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
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {person.name}
                {[person.villageName, person.casteName, person.subCasteName]
                  .filter(Boolean)
                  .join(" • ") && (
                  <>
                    {" "}
                    •{" "}
                    {[person.villageName, person.casteName, person.subCasteName]
                      .filter(Boolean)
                      .join(" • ")}
                  </>
                )}
              </Typography>
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

