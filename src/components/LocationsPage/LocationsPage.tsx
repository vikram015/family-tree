import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link, useSearchParams } from "react-router-dom";
import { ApiService } from "../../services/apiService";
import { brand } from "../../theme/brand";

/**
 * Browse families by where they come from.
 *
 * This is the surface that makes "trees are organised by location" visible
 * rather than implied — the job the header's location dropdown was trying and
 * failing to do in a control that showed one value and hid the set.
 *
 * Everything here is aggregate: place names, family names and counts. No person
 * appears, so it works signed-out and gives visitors a real reason to sign up —
 * they can see their village already has families recorded before committing.
 */

type DirectoryRow = Awaited<ReturnType<typeof ApiService.getLocationDirectory>>[number];
type DirectoryTree = Awaited<ReturnType<typeof ApiService.getTreesForDirectory>>[number];

const numberFmt = new Intl.NumberFormat();

export const LocationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLocationId = searchParams.get("location");

  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [trees, setTrees] = useState<DirectoryTree[]>([]);
  const [treesLoading, setTreesLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ApiService.getLocationDirectory()
      .then((data) => {
        if (active) setRows(data || []);
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedLocationId) {
      setTrees([]);
      return;
    }
    let active = true;
    setTreesLoading(true);
    ApiService.getTreesForDirectory(selectedLocationId)
      .then((data) => {
        if (active) setTrees(data || []);
      })
      .catch(() => {
        if (active) setTrees([]);
      })
      .finally(() => {
        if (active) setTreesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedLocationId]);

  // Filtering happens here rather than server-side: the directory is small
  // enough to hold, and local filtering keeps typing instant.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.locationName?.toLowerCase().includes(q) ||
        row.districtName?.toLowerCase().includes(q) ||
        row.stateName?.toLowerCase().includes(q),
    );
  }, [rows, query]);

  // State → district → locations, so the page shows the hierarchy as structure
  // instead of burying it inside a flat "village, district, state" string.
  const grouped = useMemo(() => {
    const states = new Map<string, { name: string; districts: Map<string, { name: string; locations: DirectoryRow[] }> }>();
    for (const row of filtered) {
      if (!states.has(row.stateId)) {
        states.set(row.stateId, { name: row.stateName, districts: new Map() });
      }
      const state = states.get(row.stateId)!;
      if (!state.districts.has(row.districtId)) {
        state.districts.set(row.districtId, { name: row.districtName, locations: [] });
      }
      state.districts.get(row.districtId)!.locations.push(row);
    }
    return states;
  }, [filtered]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          trees: acc.trees + (row.treeCount || 0),
          people: acc.people + (row.peopleCount || 0),
          locations: acc.locations + 1,
        }),
        { trees: 0, people: 0, locations: 0 },
      ),
    [rows],
  );

  const selected = rows.find((row) => row.locationId === selectedLocationId);

  return (
    <>
      <Helmet>
        <title>Browse family trees by location - Kinvia</title>
        <meta
          name="description"
          content="Explore the villages, districts and states where families have recorded their history on Kinvia."
        />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {!selectedLocationId ? (
          <>
            <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: 26, md: 34 }, mb: 1 }}>
              Families by location
            </Typography>
            <Typography sx={{ color: brand.slate, mb: 3, maxWidth: 620 }}>
              {loading
                ? "Loading the directory…"
                : `${numberFmt.format(totals.trees)} family trees and ${numberFmt.format(
                    totals.people,
                  )} people recorded across ${numberFmt.format(totals.locations)} places.`}
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="Search a village, district or state"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ maxWidth: 420, mb: 4, bgcolor: brand.surface }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            {loading ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress />
              </Box>
            ) : filtered.length === 0 ? (
              <Typography sx={{ color: brand.slateMuted }}>
                No places match “{query}”.
              </Typography>
            ) : (
              <Stack spacing={4}>
                {Array.from(grouped.entries()).map(([stateId, state]) => (
                  <Box key={stateId} component="section">
                    <Typography
                      component="h2"
                      sx={{ fontWeight: 800, fontSize: 20, mb: 1.5, color: brand.ink }}
                    >
                      {state.name}
                    </Typography>
                    <Stack spacing={2.5}>
                      {Array.from(state.districts.entries()).map(([districtId, district]) => (
                        <Box key={districtId}>
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: brand.slateMuted,
                              mb: 1,
                            }}
                          >
                            {district.name}
                          </Typography>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, minmax(0, 1fr))",
                                md: "repeat(3, minmax(0, 1fr))",
                              },
                              gap: 1.5,
                            }}
                          >
                            {district.locations.map((row) => (
                              <Box
                                key={row.locationId}
                                onClick={() =>
                                  setSearchParams({ location: row.locationId })
                                }
                                sx={{
                                  p: 1.75,
                                  borderRadius: 2,
                                  border: "1px solid",
                                  borderColor: brand.border,
                                  bgcolor: brand.surface,
                                  cursor: "pointer",
                                  transition: "border-color 150ms ease",
                                  "&:hover": { borderColor: brand.primary },
                                }}
                              >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                  <PlaceOutlinedIcon sx={{ fontSize: 18, color: brand.primary }} />
                                  <Typography sx={{ fontWeight: 700, color: brand.ink }} noWrap>
                                    {row.locationName}
                                  </Typography>
                                </Stack>
                                <Typography sx={{ fontSize: 13, color: brand.slateMuted }}>
                                  {row.treeCount} {row.treeCount === 1 ? "family" : "families"} ·{" "}
                                  {numberFmt.format(row.peopleCount)} people
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </>
        ) : (
          <>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => setSearchParams({})}
              sx={{ mb: 2, textTransform: "none", fontWeight: 700 }}
            >
              All locations
            </Button>

            <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: 24, md: 30 }, mb: 0.5 }}>
              {selected?.locationName || "This location"}
            </Typography>
            <Typography sx={{ color: brand.slate, mb: 3 }}>
              {[selected?.districtName, selected?.stateName].filter(Boolean).join(", ")}
            </Typography>

            {treesLoading ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress />
              </Box>
            ) : trees.length === 0 ? (
              <Typography sx={{ color: brand.slateMuted }}>
                No family trees recorded here yet.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {trees.map((tree) => (
                  <Box
                    key={tree.id}
                    component={Link}
                    to={`/families?tree=${tree.id}`}
                    sx={{
                      display: "block",
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: brand.border,
                      bgcolor: brand.surface,
                      textDecoration: "none",
                      color: "inherit",
                      "&:hover": { borderColor: brand.primary },
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, color: brand.ink, mb: 0.5 }}>
                      {tree.name}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={`${numberFmt.format(tree.peopleCount)} people`}
                        sx={{ bgcolor: brand.primarySoft, color: brand.primary, fontWeight: 600 }}
                      />
                      {tree.casteName && <Chip size="small" label={tree.casteName} />}
                      {tree.subCasteName && <Chip size="small" label={tree.subCasteName} />}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 4 }} />
            <Typography variant="body2" sx={{ color: brand.slateMuted }}>
              Opening a family tree requires an account, and the people in it are
              visible only to members and those they invite.
            </Typography>
          </>
        )}
      </Container>
    </>
  );
};

export default LocationsPage;
