import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  CircularProgress,
} from "@mui/material";
import { runHierarchyMigrationForAllTrees } from "../../utils/hierarchyMigration";
import { MigrationService } from "../../services/migrationService";
import { backendApi } from "../../services/backendApi";

export const DebugPage: React.FC = () => {
  const [locations, setLocations] = useState<any[]>([]);
  const [heritageData, setHeritageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [migrationResults, setMigrationResults] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const locationsList = await backendApi.get<any[]>(
          "/api/lookup/locations",
        );

        console.log("Locations found:", locationsList);
        setLocations(locationsList || []);

        // Get heritage data
        if ((locationsList || []).length > 0) {
          const heritageList = (
            await Promise.all(
              (locationsList || []).map(async (location) => {
                try {
                  return await backendApi.get<any>(
                    `/api/heritage/${location.id}`,
                  );
                } catch {
                  return null;
                }
              }),
            )
          ).filter(Boolean);

          console.log("Heritage documents found:", heritageList);
          setHeritageData(heritageList);
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRunHierarchyMigration = async () => {
    if (
      !window.confirm(
        "This will update all family tree nodes with their hierarchy chain. This may take a while. Continue?",
      )
    ) {
      return;
    }

    setMigrating(true);
    setMigrationStatus("Starting hierarchy migration...");

    try {
      await runHierarchyMigrationForAllTrees();
      setMigrationStatus("✅ Migration completed successfully!");
    } catch (err: any) {
      setMigrationStatus(`❌ Migration failed: ${err.message}`);
      console.error(err);
    } finally {
      setMigrating(false);
    }
  };

  const handleFirebaseToSupabaseMigration = async () => {
    if (
      !window.confirm(
        "This will migrate all data from Firebase to Supabase. This includes states, locations, trees, people, relationships, and businesses. This may take a while. Continue?",
      )
    ) {
      return;
    }

    setMigrating(true);
    setMigrationStatus("Starting Firebase to Supabase migration...");
    setMigrationResults(null);

    try {
      const results = await MigrationService.runAllMigrations();
      setMigrationResults(results);
      setMigrationStatus(
        "✅ Firebase to Supabase migration completed successfully!",
      );
      console.log("Migration results:", results);
    } catch (err: any) {
      setMigrationStatus(`❌ Migration failed: ${err.message}`);
      console.error(err);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        Debug Information
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mt: 3, mb: 2 }}>
            🔧 Admin Tools
          </Typography>
          <Box sx={{ bgcolor: "#fff3cd", p: 3, borderRadius: 1, mb: 4 }}>
            <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>
              Hierarchy Migration
            </Typography>
            <Typography variant="body2" paragraph>
              Populate the hierarchy field for all family tree nodes. This adds
              a complete parent chain (ancestors) to each person in your family
              trees.
            </Typography>
            <Button
              variant="contained"
              color="warning"
              onClick={handleRunHierarchyMigration}
              disabled={migrating}
              sx={{ mt: 2 }}
            >
              {migrating ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Migrating...
                </>
              ) : (
                "Run Hierarchy Migration"
              )}
            </Button>
            {migrationStatus && (
              <Alert
                severity={migrationStatus.includes("✅") ? "success" : "error"}
                sx={{ mt: 2 }}
              >
                {migrationStatus}
              </Alert>
            )}
          </Box>

          <Box sx={{ bgcolor: "#f3e5f5", p: 3, borderRadius: 1, mb: 4 }}>
            <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>
              🚀 Firebase to Supabase Migration
            </Typography>
            <Typography variant="body2" paragraph>
              Migrate all data from Firebase to Supabase (states, locations,
              trees, people, relationships, and businesses). Run this only once.
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={handleFirebaseToSupabaseMigration}
              disabled={migrating}
              sx={{ mt: 2 }}
            >
              {migrating ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Migrating...
                </>
              ) : (
                "Run Full Migration"
              )}
            </Button>
            {migrationStatus && (
              <Alert
                severity={migrationStatus.includes("✅") ? "success" : "error"}
                sx={{ mt: 2 }}
              >
                {migrationStatus}
              </Alert>
            )}
            {migrationResults && (
              <Box sx={{ mt: 3, bgcolor: "white", p: 2, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Migration Results:
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    fontSize: "0.85rem",
                    overflow: "auto",
                    maxHeight: "300px",
                    p: 1,
                    bgcolor: "#f5f5f5",
                    borderRadius: 0.5,
                  }}
                >
                  {JSON.stringify(migrationResults, null, 2)}
                </Box>
              </Box>
            )}
          </Box>

          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Locations in Database:
          </Typography>
          {locations.length === 0 ? (
            <Alert severity="warning">No locations found in database!</Alert>
          ) : (
            <Box sx={{ bgcolor: "#f5f5f5", p: 2, borderRadius: 1, mb: 3 }}>
              {locations.map((location, idx) => (
                <Box
                  key={idx}
                  sx={{ mb: 2, p: 1, bgcolor: "white", borderRadius: 0.5 }}
                >
                  <Typography variant="body2">
                    <strong>ID:</strong> {location.id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Data:</strong> {JSON.stringify(location.data)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Heritage Documents in Database:
          </Typography>
          {!heritageData || heritageData.length === 0 ? (
            <Alert severity="warning">No heritage documents found!</Alert>
          ) : (
            <Box sx={{ bgcolor: "#f5f5f5", p: 2, borderRadius: 1, mb: 3 }}>
              {heritageData.map((doc: any, idx: number) => (
                <Box
                  key={idx}
                  sx={{ mb: 2, p: 1, bgcolor: "white", borderRadius: 0.5 }}
                >
                  <Typography variant="body2">
                    <strong>Document ID:</strong> {doc.id}
                  </Typography>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      whiteSpace: "pre-wrap",
                      fontSize: "0.8rem",
                      maxHeight: "200px",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(doc.data, null, 2)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
};

export default DebugPage;
