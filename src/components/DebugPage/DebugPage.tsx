import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  CircularProgress,
} from "@mui/material";
import { runHierarchyMigrationForAllTrees } from "../../utils/hierarchyMigration";
import { populateVillageInfoForAllNodes } from "../../utils/populateVillageInfo";

export const DebugPage: React.FC = () => {
  const [villages, setVillages] = useState<any[]>([]);
  const [heritageData, setHeritageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get all villages
        const villagesRef = collection(db, "villages");
        const villageSnap = await getDocs(villagesRef);
        const villagesList: any[] = [];
        villageSnap.forEach((doc) => {
          villagesList.push({ id: doc.id, data: doc.data() });
        });
        console.log("Villages found:", villagesList);
        setVillages(villagesList);

        // Get heritage data for first village
        if (villagesList.length > 0) {
          const heritageRef = collection(db, "heritage");
          const heritageSnap = await getDocs(heritageRef);
          const heritageList: any[] = [];
          heritageSnap.forEach((doc) => {
            heritageList.push({ id: doc.id, data: doc.data() });
          });
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

  const handlePopulateVillageInfo = async () => {
    if (
      !window.confirm(
        "This will populate villageId and villageName for all family tree nodes based on their tree associations. Continue?",
      )
    ) {
      return;
    }

    setMigrating(true);
    setMigrationStatus("Starting village info population...");

    try {
      await populateVillageInfoForAllNodes();
      setMigrationStatus("✅ Village info population completed successfully!");
    } catch (err: any) {
      setMigrationStatus(`❌ Population failed: ${err.message}`);
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

          <Box sx={{ bgcolor: "#e3f2fd", p: 3, borderRadius: 1, mb: 4 }}>
            <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>
              Populate Village Information
            </Typography>
            <Typography variant="body2" paragraph>
              Populate villageId and villageName for all family tree nodes. This
              ensures each person is associated with their correct village for
              better search and filtering.
            </Typography>
            <Button
              variant="contained"
              color="info"
              onClick={handlePopulateVillageInfo}
              disabled={migrating}
              sx={{ mt: 2 }}
            >
              {migrating ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Processing...
                </>
              ) : (
                "Populate Village Info"
              )}
            </Button>
          </Box>

          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Villages in Database:
          </Typography>
          {villages.length === 0 ? (
            <Alert severity="warning">No villages found in database!</Alert>
          ) : (
            <Box sx={{ bgcolor: "#f5f5f5", p: 2, borderRadius: 1, mb: 3 }}>
              {villages.map((village, idx) => (
                <Box
                  key={idx}
                  sx={{ mb: 2, p: 1, bgcolor: "white", borderRadius: 0.5 }}
                >
                  <Typography variant="body2">
                    <strong>ID:</strong> {village.id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Data:</strong> {JSON.stringify(village.data)}
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
