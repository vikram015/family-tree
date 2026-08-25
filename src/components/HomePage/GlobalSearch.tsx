import React, { useCallback, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  ClickAwayListener,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import StoreIcon from "@mui/icons-material/Store";
import TimelineIcon from "@mui/icons-material/Timeline";
import { ApiService } from "../../services/apiService";
import { FullScreenMobilePicker } from "../FullScreenMobilePicker";
import { brand } from "../../theme/brand";
import { avatarTint, initialsOf } from "./homeTheme";

/**
 * Search across people, businesses and professions.
 *
 * Lifted out of HomePage so the signed-in dashboard and the signed-out landing
 * page share one implementation — it's the app's only global search (the header
 * search covers locations only).
 *
 * On phones the field opens a full-screen picker; on desktop results drop below
 * the input. That split is what `FullScreenMobilePicker` exists for.
 */

interface SearchResult {
  id: string;
  name: string;
  type: "person" | "business" | "profession";
  /** For business/profession results, the associated (owner) person id. */
  personId?: string;
  treeId?: string;
  treeName?: string;
  personPhotoUrl?: string;
  gotra?: string;
  extra?: string;
  locationName?: string;
  casteName?: string;
  subCasteName?: string;
  parentHierarchy?: Array<{ id: string; name: string; generation: number }>;
}

function MetaPill({ value, accent }: { value?: string; accent?: "brand" | "slate" }) {
  if (!value) return null;
  const styles =
    accent === "brand"
      ? { bg: brand.primarySoft, color: brand.primary }
      : { bg: "#f1f5f9", color: brand.slate };

  return (
    <Box
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
      {value}
    </Box>
  );
}

export interface GlobalSearchProps {
  placeholder?: string;
  /** Caps the field on wide screens; the hero and landing use different widths. */
  maxWidth?: number | string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  placeholder = "Search family members, businesses...",
  maxWidth = 640,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    setShowResults(true);
    try {
      const rows = await ApiService.globalSearch(query.trim());

      const results: SearchResult[] = (rows || []).map((row: any) => {
        const lineageText =
          row.entityType === "person" && Array.isArray(row.parentHierarchy)
            ? row.parentHierarchy
                .slice(-5)
                .map((a: any) => a?.name)
                .filter(Boolean)
                .join(" -> ")
            : "";

        return {
          id: row.entityId,
          name: row.title || "Unknown",
          type: row.entityType,
          personId: row.personId || undefined,
          treeId: row.treeId,
          extra:
            row.entityType === "person"
              ? lineageText || "Lineage: N/A"
              : row.subtitle || undefined,
          treeName: row.treeName || undefined,
          personPhotoUrl: row.personPhotoUrl || undefined,
          gotra: row.gotra || undefined,
          locationName: row.locationName || undefined,
          casteName: row.casteName || undefined,
          subCasteName: row.subCasteName || undefined,
          parentHierarchy: row.parentHierarchy || [],
        };
      });

      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => performSearch(value), 300);
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    if (result.type === "person" && result.id) {
      navigate(`/profile/person/${result.id}`);
    } else if (result.type === "business") {
      // Open the business owner's profile when we know them; else the listing.
      navigate(result.personId ? `/profile/person/${result.personId}` : "/business");
    } else if (result.treeId) {
      navigate(`/families?tree=${result.treeId}`);
    } else if (result.type === "profession") {
      navigate("/business");
    }
  };

  const renderResults = (onPick?: () => void, floating = true) => {
    if (!showResults) return null;

    return (
      <Paper
        elevation={floating ? 8 : 0}
        sx={{
          position: floating ? "absolute" : "static",
          top: floating ? "100%" : "auto",
          left: 0,
          right: 0,
          zIndex: 1300,
          maxHeight: floating ? 420 : "none",
          overflow: "auto",
          mt: floating ? 0.5 : 1.5,
          borderRadius: 2,
        }}
      >
        {searchResults.length > 0 ? (
          <List dense disablePadding>
            {searchResults.map((result) => {
              const tint = avatarTint(result.name);
              return (
                <ListItem
                  key={`${result.type}-${result.id}`}
                  component="div"
                  onClick={() => {
                    onPick?.();
                    handleResultClick(result);
                  }}
                  sx={{
                    cursor: "pointer",
                    minHeight: 56,
                    "&:hover": { bgcolor: "action.hover" },
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 44 }}>
                    {result.type === "person" ? (
                      <Avatar
                        src={result.personPhotoUrl || undefined}
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: 12,
                          fontWeight: 700,
                          bgcolor: tint.bg,
                          color: tint.fg,
                        }}
                      >
                        {initialsOf(result.name) || "?"}
                      </Avatar>
                    ) : result.type === "profession" ? (
                      <TimelineIcon color="action" />
                    ) : (
                      <StoreIcon color="secondary" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Stack spacing={0.75}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {result.name}
                        </Typography>
                        {result.type === "person" &&
                          (result.locationName || result.gotra || result.casteName) && (
                            <Stack
                              direction="row"
                              spacing={0.75}
                              sx={{ flexWrap: "wrap", rowGap: 0.75 }}
                            >
                              <MetaPill value={result.locationName} accent="brand" />
                              <MetaPill value={result.casteName} accent="slate" />
                              <MetaPill value={result.gotra} accent="slate" />
                            </Stack>
                          )}
                      </Stack>
                    }
                    secondary={result.extra || undefined}
                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                  />
                  <Chip
                    label={
                      result.type === "person"
                        ? "Person"
                        : result.type === "profession"
                          ? "Profession"
                          : "Business"
                    }
                    size="small"
                    color={
                      result.type === "person"
                        ? "primary"
                        : result.type === "business"
                          ? "secondary"
                          : "default"
                    }
                    variant="outlined"
                    sx={{ ml: 1, flexShrink: 0 }}
                  />
                </ListItem>
              );
            })}
          </List>
        ) : !isSearching ? (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No results found for "{searchQuery}"
            </Typography>
          </Box>
        ) : null}
      </Paper>
    );
  };

  const inputProps = {
    startAdornment: (
      <InputAdornment position="start">
        <SearchIcon sx={{ color: brand.primary, mr: 1 }} />
      </InputAdornment>
    ),
    endAdornment: isSearching ? (
      <InputAdornment position="end">
        <CircularProgress size={18} />
      </InputAdornment>
    ) : null,
  };

  return (
    <FullScreenMobilePicker
      title="Search"
      closeLabel="Close search"
      dialogContent={({ closeDialog }) => (
        <>
          <TextField
            fullWidth
            autoFocus
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowResults(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                performSearch(searchQuery);
              }
            }}
            InputProps={inputProps}
            sx={{ bgcolor: brand.surface, borderRadius: 2 }}
          />
          {renderResults(closeDialog, false)}
        </>
      )}
    >
      {({ isMobile: mobilePicker, openDialog }) => (
        <ClickAwayListener onClickAway={() => !mobilePicker && setShowResults(false)}>
          <Box sx={{ maxWidth, position: "relative", width: "100%" }}>
            <TextField
              fullWidth
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onClick={openDialog}
              onFocus={() => {
                if (mobilePicker) {
                  openDialog();
                  return;
                }
                if (searchResults.length > 0) setShowResults(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  performSearch(searchQuery);
                }
              }}
              InputProps={inputProps}
              sx={{ bgcolor: brand.surface, borderRadius: 2 }}
              inputProps={{ readOnly: mobilePicker }}
            />
            {!mobilePicker && renderResults()}
          </Box>
        </ClickAwayListener>
      )}
    </FullScreenMobilePicker>
  );
};

export default GlobalSearch;
