import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { supabase } from "../../supabase";
import { FNode } from "../model/FNode";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SourceSelect } from "../SourceSelect/SourceSelect";

interface DiagnosticResult {
  missingNodes: Array<{ id: string; referencedBy: string[] }>;
  brokenRelationships: Array<{
    nodeId: string;
    nodeName: string;
    issueType: string;
    missingIds: string[];
  }>;
  orphanedNodes: Array<{ id: string; name: string }>;
  validNodes: number;
  totalNodes: number;
}

export const DiagnosticPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const treeId = searchParams.get("tree");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const handleTreeChange = (newTreeId: string) => {
    if (newTreeId) {
      setSearchParams({ tree: newTreeId });
    } else {
      setSearchParams({});
    }
    setResult(null); // Clear previous results
  };

  const runDiagnostics = useCallback(async () => {
    if (!treeId) {
      alert("Please select a tree first");
      return;
    }

    setLoading(true);
    try {
      // Get all people for this tree from Supabase
      const { data: peopleData, error } = await supabase
        .from("people")
        .select("*")
        .eq("treeId", treeId);

      if (error) {
        throw new Error(`Failed to fetch people: ${error.message}`);
      }

      const nodes: Array<FNode & { id: string }> = (peopleData || []).map(
        (doc) => ({
          id: doc.id,
          ...doc,
        }),
      );

      // Create a map of existing node IDs
      const existingIds = new Set(nodes.map((n) => n.id));

      // Track all referenced IDs and who references them
      const referencedIds = new Map<string, string[]>();
      const missingNodesMap = new Map<string, string[]>();
      const brokenRelationships: DiagnosticResult["brokenRelationships"] = [];

      // Check each node's relationships
      nodes.forEach((node) => {
        const issues: string[] = [];
        const missingIds: string[] = [];

        // Check parents
        if (node.parents) {
          node.parents.forEach((parent) => {
            if (parent.id) {
              if (!referencedIds.has(parent.id)) {
                referencedIds.set(parent.id, []);
              }
              referencedIds.get(parent.id)!.push(node.id);

              if (!existingIds.has(parent.id)) {
                issues.push(`Missing parent: ${parent.id}`);
                missingIds.push(parent.id);
                if (!missingNodesMap.has(parent.id)) {
                  missingNodesMap.set(parent.id, []);
                }
                missingNodesMap.get(parent.id)!.push(node.id);
              }
            }
          });
        }

        // Check children
        if (node.children) {
          node.children.forEach((child) => {
            if (child.id) {
              if (!referencedIds.has(child.id)) {
                referencedIds.set(child.id, []);
              }
              referencedIds.get(child.id)!.push(node.id);

              if (!existingIds.has(child.id)) {
                issues.push(`Missing child: ${child.id}`);
                missingIds.push(child.id);
                if (!missingNodesMap.has(child.id)) {
                  missingNodesMap.set(child.id, []);
                }
                missingNodesMap.get(child.id)!.push(node.id);
              }
            }
          });
        }

        // Check spouses
        if (node.spouses) {
          node.spouses.forEach((spouse) => {
            if (spouse.id) {
              if (!referencedIds.has(spouse.id)) {
                referencedIds.set(spouse.id, []);
              }
              referencedIds.get(spouse.id)!.push(node.id);

              if (!existingIds.has(spouse.id)) {
                issues.push(`Missing spouse: ${spouse.id}`);
                missingIds.push(spouse.id);
                if (!missingNodesMap.has(spouse.id)) {
                  missingNodesMap.set(spouse.id, []);
                }
                missingNodesMap.get(spouse.id)!.push(node.id);
              }
            }
          });
        }

        // Check siblings
        if (node.siblings) {
          node.siblings.forEach((sibling) => {
            if (sibling.id) {
              if (!referencedIds.has(sibling.id)) {
                referencedIds.set(sibling.id, []);
              }
              referencedIds.get(sibling.id)!.push(node.id);

              if (!existingIds.has(sibling.id)) {
                issues.push(`Missing sibling: ${sibling.id}`);
                missingIds.push(sibling.id);
                if (!missingNodesMap.has(sibling.id)) {
                  missingNodesMap.set(sibling.id, []);
                }
                missingNodesMap.get(sibling.id)!.push(node.id);
              }
            }
          });
        }

        if (issues.length > 0) {
          brokenRelationships.push({
            nodeId: node.id,
            nodeName: node.name,
            issueType: "Missing References",
            missingIds: missingIds,
          });
        }
      });

      // Find orphaned nodes (nodes not referenced by anyone and have no parents)
      const orphanedNodes: DiagnosticResult["orphanedNodes"] = [];
      nodes.forEach((node) => {
        const isReferenced = referencedIds.has(node.id);
        const hasParents = node.parents && node.parents.length > 0;
        if (!isReferenced && !hasParents && nodes.length > 1) {
          orphanedNodes.push({ id: node.id, name: node.name });
        }
      });

      // Convert missing nodes map to array
      const missingNodes: DiagnosticResult["missingNodes"] = Array.from(
        missingNodesMap.entries(),
      ).map(([id, referencedBy]) => ({
        id,
        referencedBy,
      }));

      setResult({
        missingNodes,
        brokenRelationships,
        orphanedNodes,
        validNodes: nodes.length - brokenRelationships.length,
        totalNodes: nodes.length,
      });
    } catch (err) {
      console.error("Diagnostic error:", err);
      alert(`Failed to run diagnostics: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (treeId) {
      runDiagnostics();
    }
  }, [treeId, runDiagnostics]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Tree Diagnostics
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Select a family tree to analyze its data structure and relationships
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          p: 2,
          borderRadius: 1,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <SourceSelect onChange={handleTreeChange} />
        {treeId && (
          <Button
            variant="contained"
            onClick={runDiagnostics}
            disabled={loading}
          >
            {loading ? "Running..." : "Run Diagnostics"}
          </Button>
        )}
      </Box>

      {!treeId && (
        <Alert severity="info">
          Please select a tree from the dropdown above to run diagnostics.
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {result && !loading && treeId && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`Total Nodes: ${result.totalNodes}`}
                color="primary"
              />
              <Chip
                icon={<WarningIcon />}
                label={`Broken Relationships: ${result.brokenRelationships.length}`}
                color={
                  result.brokenRelationships.length > 0 ? "warning" : "default"
                }
              />
              <Chip
                icon={<ErrorIcon />}
                label={`Missing Nodes: ${result.missingNodes.length}`}
                color={result.missingNodes.length > 0 ? "error" : "default"}
              />
              <Chip
                icon={<WarningIcon />}
                label={`Orphaned Nodes: ${result.orphanedNodes.length}`}
                color={result.orphanedNodes.length > 0 ? "warning" : "default"}
              />
            </Box>
          </Paper>

          {result.missingNodes.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="error">
                  <ErrorIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                  Missing Nodes ({result.missingNodes.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="error" sx={{ mb: 2 }}>
                  These node IDs are referenced by other nodes but don't exist
                  in the database. They were likely deleted.
                </Alert>
                <List>
                  {result.missingNodes.map((missing) => (
                    <ListItem key={missing.id}>
                      <ListItemText
                        primary={`Node ID: ${missing.id}`}
                        secondary={`Referenced by: ${missing.referencedBy.join(
                          ", ",
                        )}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {result.brokenRelationships.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="warning.main">
                  <WarningIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                  Broken Relationships ({result.brokenRelationships.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  These nodes have references to missing people. You should edit
                  them to remove the broken references.
                </Alert>
                <List>
                  {result.brokenRelationships.map((broken) => (
                    <ListItem key={broken.nodeId}>
                      <ListItemText
                        primary={`${broken.nodeName} (${broken.nodeId})`}
                        secondary={`Missing: ${broken.missingIds.join(", ")}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {result.orphanedNodes.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="info.main">
                  <WarningIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                  Orphaned Nodes ({result.orphanedNodes.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="info" sx={{ mb: 2 }}>
                  These nodes exist but aren't connected to any other nodes.
                  They might be starting points or disconnected people.
                </Alert>
                <List>
                  {result.orphanedNodes.map((orphan) => (
                    <ListItem key={orphan.id}>
                      <ListItemText
                        primary={orphan.name}
                        secondary={`ID: ${orphan.id}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {result.missingNodes.length === 0 &&
            result.brokenRelationships.length === 0 && (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                ✓ No issues found! Your tree structure is healthy.
              </Alert>
            )}
        </>
      )}
    </Container>
  );
};
