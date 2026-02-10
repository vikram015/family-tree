import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Typography,
  Container,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import { DTreeComponent } from "../DTree/DTreeComponent";
import { NodeDetails } from "../NodeDetails/NodeDetails";
import AddNode from "../AddNode/AddNode";
import { getNodeHierarchy } from "../const";
import { SupabaseService } from "../../services/supabaseService";
import { FNode } from "../model/FNode";
import { Gender, RelType } from "relatives-tree/lib/types";
import { SourceSelect } from "../SourceSelect/SourceSelect";
import AddTree from "../AddTree/AddTree";
import { useAuth } from "../hooks/useAuth";

interface FamiliesPageProps {
  treeId: string;
  setTreeId: (id: string) => void;
  onSourceChange: (value: string, nodes: readonly any[]) => void;
  onCreate?: (id: string) => void;
}

export const FamiliesPage: React.FC<FamiliesPageProps> = ({
  treeId,
  setTreeId,
  onSourceChange,
  onCreate,
}) => {
  const { hasPermission } = useAuth();
  const [nodes, setNodes] = useState<Array<FNode>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rootId, setRootId] = useState("");
  const [selectId, setSelectId] = useState<string>();
  const [showAddStartingNode, setShowAddStartingNode] = useState(false);

  const loadTreeData = useCallback(
    async (keepRoot = false) => {
      if (!treeId || treeId === "") {
        setNodes([]);
        setSelectId(undefined);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Fetch complete tree from Supabase using the PostgreSQL function
        const treeData = await SupabaseService.getCompleteTreeById(treeId);
        // Convert tree data to FNode format
        const items: Readonly<FNode>[] = (treeData.members || []).map(
          (person: any) =>
            ({
              id: person.id,
              name: person.name,
              gender: person.gender as Gender,
              parents:
                person.parents?.map((p: any) => ({
                  id: p.id,
                  type: RelType.blood,
                })) || [],
              children:
                person.children?.map((c: any) => ({
                  id: c.id,
                  type: RelType.blood,
                })) || [],
              spouses:
                person.spouses?.map((s: any) => ({
                  id: s.id,
                  type: RelType.married,
                })) || [],
              siblings:
                person.siblings?.map((s: any) => ({
                  id: s.id,
                  type: RelType.blood,
                })) || [],
              treeId: person.tree_id || treeId,
            }) as FNode,
        );

        // Populate hierarchy for all nodes
        const itemsWithHierarchy = items.map((node) => ({
          ...node,
          hierarchy: getNodeHierarchy(node.id, items),
        }));

        setNodes(itemsWithHierarchy);
        setSelectId(undefined);

        if (items.length === 0) {
          setIsLoading(false);
          return;
        }

        // If keepRoot is true, we want to see if the current root ID is still valid in the new data.
        // We can access the current rootId via the state setter to make a decision,
        // OR we can just allow the caller to handle the root preservation logic?
        // No, the caller just says "reload data".

        // Let's use a functional state update to determine if we need to CHANGE the root.
        // But we need to calculate the *new potential root* first.

        // -------------------------------------------------------------
        // Root Selection Logic Refined

        // -------------------------------------------------------------
        // Root Selection Logic Refined
        // 1. Candidate must belong to the current tree.
        // 2. Candidate must have NO parents.
        // 3. If Candidate has a spouse in the SAME tree, that spouse must NOT have parents.
        //    (If the spouse has parents, then the spouse's lineage is the true root, and Candidate is just an in-law).
        // -------------------------------------------------------------

        const currentTreeId = treeId;
        const rawMembers = treeData.members || [];
        const memberMap = new Map(rawMembers.map((m: any) => [m.id, m]));

        // Step 1 & 2: Filter by Tree ID and No Parents
        const baseCandidates = rawMembers.filter((m: any) => {
          const isInCurrentTree = m.tree_id === currentTreeId;
          const hasNoParents = !m.parents || m.parents.length === 0;
          return isInCurrentTree && hasNoParents;
        });

        // Step 3: Filter out "In-Laws" (whose spouses are in-tree and have parents)
        const validCandidates = baseCandidates.filter((candidate: any) => {
          const spouses = candidate.spouses || [];

          // Check if ANY spouse disqualifies this candidate
          const isDisqualified = spouses.some((s: any) => {
            const spouseNode = memberMap.get(s.id);

            if (!spouseNode) return false; // Spouse data missing, ignore

            // Condition: Spouse is in the SAME tree
            if (spouseNode.tree_id === currentTreeId) {
              // Check if this spouse has parents (meaning the root is higher up on their side)
              if (spouseNode.parents && spouseNode.parents.length > 0) {
                return true; // Disqualify Candidate
              }
            }
            return false;
          });

          return !isDisqualified;
        });

        // Tie-Breaking: Use Descendant Count and Age
        const countDescendants = (
          nodeId: string,
          depth = 0,
          memo = new Map<string, number>(),
        ): number => {
          if (depth > 50) return 0;
          if (memo.has(nodeId)) return memo.get(nodeId)!;

          const node = memberMap.get(nodeId);
          if (!node || !node.children || node.children.length === 0) {
            memo.set(nodeId, 0);
            return 0;
          }

          let count = 0;
          node.children.forEach((child: any) => {
            count += 1 + countDescendants(child.id, depth + 1, memo);
          });

          memo.set(nodeId, count);
          return count;
        };

        const finalCandidates =
          validCandidates.length > 0 ? validCandidates : baseCandidates;

        // Sort candidates
        finalCandidates.sort((a: any, b: any) => {
          // Priority 1: Descendant Count
          const aDesc = countDescendants(a.id);
          const bDesc = countDescendants(b.id);
          if (aDesc !== bDesc) return bDesc - aDesc;

          // Priority 2: Creation Date (Oldest First)
          const aTime = new Date(a.created_at).getTime() || 0;
          const bTime = new Date(b.created_at).getTime() || 0;
          return aTime - bTime;
        });

        if (finalCandidates.length > 0) {
          const bestRootId = finalCandidates[0].id;
          setRootId((prevRoot) => {
            if (keepRoot && prevRoot && items.find((n) => n.id === prevRoot)) {
              return prevRoot;
            }
            return bestRootId;
          });
        } else if (items.length > 0) {
          const firstItemId = items[0].id;
          setRootId((prevRoot) => {
            if (keepRoot && prevRoot && items.find((n) => n.id === prevRoot)) {
              return prevRoot;
            }
            return firstItemId;
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error("FamiliesPage: Failed to load tree data:", error);
        setNodes([]);
        setIsLoading(false);
      }
    },
    [treeId],
  );

  useEffect(() => {
    loadTreeData();
  }, [loadTreeData]);

  const selected = useMemo(
    () => nodes.find((item) => item.id === selectId),
    [nodes, selectId],
  );

  const onUpdate = useCallback(
    async (nodeId: string, updates: Partial<FNode>) => {
      if (!hasPermission("admin", treeId)) {
        alert("You don't have permission to edit this family tree.");
        return;
      }

      try {
        // Update person with both core properties and additional details in one call
        await SupabaseService.updatePerson(nodeId, updates);
        // Refresh tree data but keep current root if valid
        await loadTreeData(true);
        // Clear selection to refresh the detail panel
        setSelectId(undefined);
      } catch (err) {
        console.error("Failed to update node:", err);
        alert(
          `Failed to update node: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    },
    [hasPermission, treeId, loadTreeData],
  );

  const onDelete = useCallback(
    async (nodeId: string) => {
      if (!hasPermission("admin", treeId)) {
        alert("You don't have permission to delete from this family tree.");
        return;
      }

      try {
        // Delete person using Supabase
        await SupabaseService.deletePerson(nodeId);
        // Refresh tree data but keep current root if valid
        await loadTreeData(true);
        // Clear selection
        setSelectId(undefined);
      } catch (err) {
        console.error("Failed to delete node:", err);
        alert(
          `Failed to delete node: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    },
    [hasPermission, treeId, loadTreeData],
  );

  const onAdd = useCallback(
    async (
      node: Partial<FNode>,
      relation: "child" | "spouse" | "parent",
      targetId?: string,
      type?: RelType,
      otherParentId?: string,
    ) => {
      if (!hasPermission("admin", treeId)) {
        alert("You don't have permission to add to this family tree.");
        return;
      }

      // Special handling for linking existing spouse
      if (node.id && relation === "spouse" && targetId) {
        try {
          setIsLoading(true);
          await SupabaseService.addSpouse(targetId, node.id);
          await loadTreeData(true);
        } catch (err) {
          console.error("Failed to link spouse:", err);
          alert(
            `Failed to link spouse: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          setIsLoading(false);
        }
        return;
      }

      try {
        // Separate custom fields from the node data
        const { customFields, ...coreNode } = node;

        // Map UI relation to database relation type
        // UI relations: "child" (new person is child of target), "spouse", "parent" (new person is parent of target)
        // DB relations: only 'parent' or 'spouse' with subtypes for blood/adopted/married/divorced
        let relationType: "parent" | "spouse" | undefined;
        let relatedPersonId: string | undefined;
        let relatedPersonId2: string | undefined;
        let isReverseRelation = false;

        if (relation === "child" && targetId) {
          // Adding a child to target: new_person → parent → target
          // Use the second parent from AddNode component if provided
          relationType = "parent";
          relatedPersonId = targetId;
          relatedPersonId2 = otherParentId; // From AddNode selection
          isReverseRelation = false;
        } else if (relation === "spouse" && targetId) {
          // Adding a spouse: only pass one target
          // relatedPersonId2 must remain NULL for spouse relationships
          relationType = "spouse";
          relatedPersonId = targetId;
          relatedPersonId2 = undefined; // NEVER pass second person for spouse
          isReverseRelation = false;
        } else if (relation === "parent" && targetId) {
          // Adding a parent to target: target → parent → new_person
          // We store it as: new_person is the related_person, but mark it as reverse
          relationType = "parent";
          relatedPersonId = targetId;
          isReverseRelation = true;
        }

        // Create person in Supabase using the add_person_to_tree procedure
        // This handles: person creation, relationship creation, and auto-spouse creation for children
        const newPerson = await SupabaseService.addPersonToTree(
          treeId,
          coreNode.name || "Unnamed",
          coreNode.gender,
          coreNode.dob,
          relationType,
          relatedPersonId,
          type,
          customFields, // Pass additional details
          isReverseRelation,
          relatedPersonId2,
        );

        // Reload tree data to ensure all relationships are accurately reflected
        // This is important for auto-created spouses and multiple parent relationships
        if (newPerson?.success && newPerson?.person_id) {
          await loadTreeData(true);
        }
      } catch (err) {
        console.error("Failed to add node:", err);
        alert(
          `Failed to add node: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    },
    [hasPermission, treeId, loadTreeData],
  );

  // Calculate tree statistics
  const statistics = useMemo(() => {
    const totalPeople = nodes.length;
    const maleCount = nodes.filter((n) => n.gender === Gender.male).length;
    const femaleCount = nodes.filter((n) => n.gender === Gender.female).length;
    const generationsSet = new Set<number>();

    nodes.forEach((node) => {
      if (node.hierarchy && node.hierarchy.length > 0) {
        generationsSet.add(node.hierarchy.length);
      }
    });

    const generations = generationsSet.size || 1;

    return {
      totalPeople,
      maleCount,
      femaleCount,
      generations,
    };
  }, [nodes]);

  return (
    <>
      <Helmet>
        <title>My Family Tree - Kinvia | Build Your Family Heritage</title>
        <meta
          name="description"
          content="Create and manage your interactive family tree. Visualize relationships, add family members, and preserve your family history on Kinvia."
        />
        <meta
          name="keywords"
          content="family tree, genealogy, family members, relationships, tree visualization, family history"
        />
        <meta property="og:title" content="My Family Tree - Kinvia" />
        <meta
          property="og:description"
          content="View and manage your interactive family tree with Kinvia."
        />
      </Helmet>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <SourceSelect onChange={onSourceChange} />
        <AddTree
          onCreate={(createdTreeId) => {
            // Move to the newly created tree
            setTreeId(createdTreeId);
            // Call parent onCreate callback if provided
            onCreate?.(createdTreeId);
          }}
        />
      </Box>
      {nodes.length > 0 && !isLoading && (
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            gap: 2,
            p: 1.5,
            px: 2,
            borderBottom: 1,
            borderColor: "divider",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {statistics.totalPeople}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              People
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              height: 20,
              borderLeft: "1px solid",
              borderColor: "divider",
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "error.main" }}
            >
              {statistics.femaleCount}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Female
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              height: 20,
              borderLeft: "1px solid",
              borderColor: "divider",
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "info.main" }}
            >
              {statistics.maleCount}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Male
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              height: 20,
              borderLeft: "1px solid",
              borderColor: "divider",
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "success.main" }}
            >
              {statistics.generations}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Generations
            </Typography>
          </Box>
        </Box>
      )}
      {isLoading ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Loading tree...
          </Typography>
        </Box>
      ) : nodes.length > 0 ? (
        <Box
          sx={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {rootId && nodes.find((n) => n.id === rootId) ? (
            <DTreeComponent
              nodes={nodes}
              rootId={rootId}
              onNodeClick={setSelectId}
              currentTreeId={treeId}
              onExternalTreeClick={(tid) => {
                if (
                  window.confirm(
                    "This person belongs to another family tree. Navigate to that tree?",
                  )
                ) {
                  onSourceChange(tid, []);
                }
              }}
            />
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <Typography>
                Unable to find root node. Please check tree data.
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        treeId &&
        treeId !== "" && (
          <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
            <Typography variant="h5" gutterBottom>
              This tree is empty.
            </Typography>
            <Box
              sx={{
                mt: 3,
                display: "flex",
                gap: 2,
                justifyContent: "center",
              }}
            >
              <Button
                variant="contained"
                onClick={() => setShowAddStartingNode(true)}
              >
                Create First Node
              </Button>
            </Box>
          </Container>
        )
      )}
      <Dialog
        open={showAddStartingNode}
        onClose={() => setShowAddStartingNode(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create First Person</DialogTitle>
        <DialogContent>
          <AddNode
            isFirstNode={true}
            onAdd={(node) => {
              // Pass as 'child' with no target - the onAdd handler will handle default case if we modify it,
              // OR we just pass appropriate dummy values that onAdd understands.
              // Looking at onAdd, it doesn't handle "no relation". I should update onAdd or pass dummy.
              // Actually, better to check onAdd logic.
              // If I pass relation="child" and targetId=undefined, it skips all if/else blocks and goes to default addPersonToTree.
              // addPersonToTree procedure handles null relations as root node.
              onAdd(node, "child", undefined); // "child" is just a placeholder type, won't be used logic-wise if targetId is missing
              setShowAddStartingNode(false);
            }}
            onCancel={() => setShowAddStartingNode(false)}
            noCard
          />
        </DialogContent>
      </Dialog>
      {selected && (
        <NodeDetails
          node={selected}
          nodes={nodes}
          onSelect={setSelectId}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
          treeId={treeId}
        />
      )}
    </>
  );
};
