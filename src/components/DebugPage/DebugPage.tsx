import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Container, Typography, Box, Alert } from "@mui/material";

export const DebugPage: React.FC = () => {
  const [villages, setVillages] = useState<any[]>([]);
  const [heritageData, setHeritageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
