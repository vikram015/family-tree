import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Typography,
  Container,
  CircularProgress,
} from "@mui/material";
import { DTreeComponent } from "../DTree/DTreeComponent";
import { NodeDetails } from "../NodeDetails/NodeDetails";
import { NODE_WIDTH, NODE_HEIGHT, getNodeHierarchy } from "../const";
import { getNodeStyle } from "../App/utils";
import { SupabaseService } from "../../services/supabaseService";
import { FNode } from "../model/FNode";
import { Gender, RelType } from "relatives-tree/lib/types";
import { SourceSelect } from "../SourceSelect/SourceSelect";
import AddTree from "../AddTree/AddTree";
import AddNode from "../AddNode/AddNode";
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
  const firstNodeId = useMemo(() => nodes[0]?.id ?? "", [nodes]);
  const [rootId, setRootId] = useState(firstNodeId);
  const [selectId, setSelectId] = useState<string>();
  const [hoverId, setHoverId] = useState<string>();
  const [showAddStartingNode, setShowAddStartingNode] = useState(false);

  useEffect(() => {
    // Only load data if a specific tree ID is selected
    if (treeId && treeId !== "") {
      const loadTreeData = async () => {
        try {
          console.log(
            "FamiliesPage: Starting to load tree data for treeId:",
            treeId,
          );
          setIsLoading(true);
          // Fetch complete tree from Supabase using the PostgreSQL function
          const treeData = await SupabaseService.getCompleteTreeById(treeId);
          console.log("FamiliesPage: Tree data loaded:", treeData);
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
                treeId: treeId,
              }) as FNode,
          );
          console.log(
            "FamiliesPage: Converted tree data to FNode format, items count:",
            items.length,
          );
          // Populate hierarchy for all nodes
          const itemsWithHierarchy = items.map((node) => ({
            ...node,
            hierarchy: getNodeHierarchy(node.id, items),
          }));

          setNodes(itemsWithHierarchy);
          setSelectId(undefined);
          setHoverId(undefined);

          if (items.length === 0) {
            console.log("FamiliesPage: No items in tree");
            setIsLoading(false);
            return;
          }
          const rootCandidate = items.find(
            (item) =>
              (item.parents?.length ?? 0) === 0 &&
              (item.spouses?.length ?? 0) === 0,
          );
          if (rootCandidate) {
            setRootId(rootCandidate.id);
          } else {
            setRootId(items[0].id);
          }
          setIsLoading(false);
          console.log("FamiliesPage: Tree data loaded and state updated.");
        } catch (error) {
          console.error("FamiliesPage: Failed to load tree data:", error);
          setNodes([]);
          setIsLoading(false);
        }
      };

      loadTreeData();
    } else {
      setNodes([]);
      setSelectId(undefined);
      setHoverId(undefined);
      setIsLoading(false);
    }
  }, [treeId]);

  // Load additional details when a node is selected
  useEffect(() => {
    console.log("Selected node ID changed to:", selectId);
    if (selectId && nodes.length > 0) {
      const selectedNode = nodes.find((item) => item.id === selectId);
      if (selectedNode) {
        const loadAdditionalDetails = async () => {
          console.log("Loading additional details for node:", selectId);
          try {
            const additionalDetails =
              await SupabaseService.getPersonAdditionalDetails(selectId);
            // Update the selected node with additional details
            setNodes((prevNodes) =>
              prevNodes.map((node) =>
                node.id === selectId
                  ? { ...node, customFields: additionalDetails }
                  : node,
              ),
            );
          } catch (error) {
            console.error("Failed to load additional details:", error);
          }
        };

        loadAdditionalDetails();
      }
    }
  }, [selectId, nodes]);

  const selected = useMemo(
    () => nodes.find((item) => item.id === selectId),
    [nodes, selectId],
  );

  const onUpdate = useCallback(
    async (nodeId: string, updates: Partial<FNode>) => {
      console.log("Updating node:", nodeId, "with updates:", updates);
      // Check permission before updating
      if (!hasPermission("admin", treeId)) {
        alert("You don't have permission to edit this family tree.");
        return;
      }

      try {
        // Update person with both core properties and additional details in one call
        await SupabaseService.updatePerson(nodeId, updates);

        // Update local state instead of fetching from database
        setNodes((prevNodes) => {
          const nodeIndex = prevNodes.findIndex((n) => n.id === nodeId);
          if (nodeIndex === -1) return prevNodes;

          const currentNode = prevNodes[nodeIndex];
          const updatedNodes = [...prevNodes];

          // Update the current node's core properties
          const updatedNode = { ...currentNode };
          if (updates.name) updatedNode.name = updates.name;
          if (updates.gender) updatedNode.gender = updates.gender;
          if (updates.dob) updatedNode.dob = updates.dob;
          if (updates.customFields)
            updatedNode.customFields = updates.customFields;

          // Handle parent relationship changes
          if (updates.parents) {
            const oldParentIds = (currentNode.parents || []).map((p) => p.id);
            const newParentIds = (updates.parents || []).map((p) => p.id);

            // Remove from old parents' children arrays
            oldParentIds.forEach((parentId) => {
              if (!newParentIds.includes(parentId)) {
                const parentIndex = updatedNodes.findIndex(
                  (n) => n.id === parentId,
                );
                if (parentIndex !== -1) {
                  updatedNodes[parentIndex] = {
                    ...updatedNodes[parentIndex],
                    children: (updatedNodes[parentIndex].children || []).filter(
                      (c) => c.id !== nodeId,
                    ),
                  };
                }
              }
            });

            // Add to new parents' children arrays
            newParentIds.forEach((parentId) => {
              if (!oldParentIds.includes(parentId)) {
                const parentIndex = updatedNodes.findIndex(
                  (n) => n.id === parentId,
                );
                if (parentIndex !== -1) {
                  updatedNodes[parentIndex] = {
                    ...updatedNodes[parentIndex],
                    children: [
                      ...(updatedNodes[parentIndex].children || []),
                      { id: nodeId, type: RelType.blood },
                    ],
                  };
                }
              }
            });

            updatedNode.parents = updates.parents;
          }

          // Handle children relationship changes
          if (updates.children) {
            const oldChildIds = (currentNode.children || []).map((c) => c.id);
            const newChildIds = (updates.children || []).map((c) => c.id);

            // Remove from old children's parents arrays
            oldChildIds.forEach((childId) => {
              if (!newChildIds.includes(childId)) {
                const childIndex = updatedNodes.findIndex(
                  (n) => n.id === childId,
                );
                if (childIndex !== -1) {
                  updatedNodes[childIndex] = {
                    ...updatedNodes[childIndex],
                    parents: (updatedNodes[childIndex].parents || []).filter(
                      (p) => p.id !== nodeId,
                    ),
                  };
                }
              }
            });

            // Add to new children's parents arrays
            newChildIds.forEach((childId) => {
              if (!oldChildIds.includes(childId)) {
                const childIndex = updatedNodes.findIndex(
                  (n) => n.id === childId,
                );
                if (childIndex !== -1) {
                  updatedNodes[childIndex] = {
                    ...updatedNodes[childIndex],
                    parents: [
                      ...(updatedNodes[childIndex].parents || []),
                      { id: nodeId, type: RelType.blood },
                    ],
                  };
                }
              }
            });

            updatedNode.children = updates.children;
          }

          // Handle spouse relationship changes
          if (updates.spouses) {
            const oldSpouseIds = (currentNode.spouses || []).map((s) => s.id);
            const newSpouseIds = (updates.spouses || []).map((s) => s.id);

            // Remove from old spouses' spouses arrays
            oldSpouseIds.forEach((spouseId) => {
              if (!newSpouseIds.includes(spouseId)) {
                const spouseIndex = updatedNodes.findIndex(
                  (n) => n.id === spouseId,
                );
                if (spouseIndex !== -1) {
                  updatedNodes[spouseIndex] = {
                    ...updatedNodes[spouseIndex],
                    spouses: (updatedNodes[spouseIndex].spouses || []).filter(
                      (s) => s.id !== nodeId,
                    ),
                  };
                }
              }
            });

            // Add to new spouses' spouses arrays
            newSpouseIds.forEach((spouseId) => {
              if (!oldSpouseIds.includes(spouseId)) {
                const spouseIndex = updatedNodes.findIndex(
                  (n) => n.id === spouseId,
                );
                if (spouseIndex !== -1) {
                  updatedNodes[spouseIndex] = {
                    ...updatedNodes[spouseIndex],
                    spouses: [
                      ...(updatedNodes[spouseIndex].spouses || []),
                      { id: nodeId, type: RelType.married },
                    ],
                  };
                }
              }
            });

            updatedNode.spouses = updates.spouses;
          }

          // Handle sibling relationship changes
          if (updates.siblings) {
            const oldSiblingIds = (currentNode.siblings || []).map((s) => s.id);
            const newSiblingIds = (updates.siblings || []).map((s) => s.id);

            // Remove from old siblings' siblings arrays
            oldSiblingIds.forEach((siblingId) => {
              if (!newSiblingIds.includes(siblingId)) {
                const siblingIndex = updatedNodes.findIndex(
                  (n) => n.id === siblingId,
                );
                if (siblingIndex !== -1) {
                  updatedNodes[siblingIndex] = {
                    ...updatedNodes[siblingIndex],
                    siblings: (
                      updatedNodes[siblingIndex].siblings || []
                    ).filter((s) => s.id !== nodeId),
                  };
                }
              }
            });

            // Add to new siblings' siblings arrays
            newSiblingIds.forEach((siblingId) => {
              if (!oldSiblingIds.includes(siblingId)) {
                const siblingIndex = updatedNodes.findIndex(
                  (n) => n.id === siblingId,
                );
                if (siblingIndex !== -1) {
                  updatedNodes[siblingIndex] = {
                    ...updatedNodes[siblingIndex],
                    siblings: [
                      ...(updatedNodes[siblingIndex].siblings || []),
                      { id: nodeId, type: RelType.blood },
                    ],
                  };
                }
              }
            });

            updatedNode.siblings = updates.siblings;
          }

          // Recalculate hierarchy after update
          updatedNode.hierarchy = getNodeHierarchy(nodeId, updatedNodes);
          updatedNodes[nodeIndex] = updatedNode;

          return updatedNodes;
        });

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
    [hasPermission, treeId],
  );

  const onDelete = useCallback(
    async (nodeId: string) => {
      console.log("Deleting node1:", nodeId);
      // Check permission before deleting
      if (!hasPermission("admin", treeId)) {
        alert("You don't have permission to delete from this family tree.");
        return;
      }

      try {
        console.log("Deleting node:", nodeId);

        // Delete person using Supabase
        await SupabaseService.deletePerson(nodeId);

        // Update local state instead of fetching from database
        setNodes((prevNodes) => {
          const nodeToDelete = prevNodes.find((n) => n.id === nodeId);
          if (!nodeToDelete) return prevNodes;

          // Remove the node
          const updatedNodes = prevNodes.filter((n) => n.id !== nodeId);

          // Update all parents to remove this node from their children array
          if (nodeToDelete.parents) {
            for (const parent of nodeToDelete.parents) {
              const parentIndex = updatedNodes.findIndex(
                (n) => n.id === parent.id,
              );
              if (parentIndex !== -1) {
                updatedNodes[parentIndex] = {
                  ...updatedNodes[parentIndex],
                  children: (updatedNodes[parentIndex].children || []).filter(
                    (c) => c.id !== nodeId,
                  ),
                };
              }
            }
          }

          // Update all children to remove this node from their parents array
          if (nodeToDelete.children) {
            for (const child of nodeToDelete.children) {
              const childIndex = updatedNodes.findIndex(
                (n) => n.id === child.id,
              );
              if (childIndex !== -1) {
                updatedNodes[childIndex] = {
                  ...updatedNodes[childIndex],
                  parents: (updatedNodes[childIndex].parents || []).filter(
                    (p) => p.id !== nodeId,
                  ),
                };
              }
            }
          }

          // Update all spouses to remove this node from their spouses array
          if (nodeToDelete.spouses) {
            for (const spouse of nodeToDelete.spouses) {
              const spouseIndex = updatedNodes.findIndex(
                (n) => n.id === spouse.id,
              );
              if (spouseIndex !== -1) {
                updatedNodes[spouseIndex] = {
                  ...updatedNodes[spouseIndex],
                  spouses: (updatedNodes[spouseIndex].spouses || []).filter(
                    (s) => s.id !== nodeId,
                  ),
                };
              }
            }
          }

          // Update all siblings to remove this node from their siblings array
          if (nodeToDelete.siblings) {
            for (const sibling of nodeToDelete.siblings) {
              const siblingIndex = updatedNodes.findIndex(
                (n) => n.id === sibling.id,
              );
              if (siblingIndex !== -1) {
                updatedNodes[siblingIndex] = {
                  ...updatedNodes[siblingIndex],
                  siblings: (updatedNodes[siblingIndex].siblings || []).filter(
                    (s) => s.id !== nodeId,
                  ),
                };
              }
            }
          }

          return updatedNodes;
        });

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
    [hasPermission, treeId],
  );

  const onAdd = useCallback(
    async (
      node: Partial<FNode>,
      relation: "child" | "spouse" | "parent",
      targetId?: string,
      type?: RelType,
      otherParentId?: string,
    ) => {
      console.log(
        "Adding node:",
        node,
        "as",
        relation,
        "to",
        targetId,
        "with other parent:",
        otherParentId,
      );
      // Check permission before adding
      if (!hasPermission("admin", treeId)) {
        alert("You don't have permission to add to this family tree.");
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
          // Close the sidebar after successfully adding a node
          setSelectId(undefined);

          try {
            if (treeId) {
              const result = await SupabaseService.getCompleteTreeById(treeId);
              if (result?.members) {
                // Convert CompleteTreeNode[] to FNode[]
                // Map PersonWithRelations to the FNode relationship format { id: string; type: RelType }
                const convertedNodes: FNode[] = result.members.map(
                  (member) => ({
                    id: member.id,
                    name: member.name,
                    dob: member.dob || "",
                    created_at: member.created_at,
                    gender: (member.gender as unknown as Gender) || Gender.male,
                    customFields: {},
                    treeId: treeId,
                    // Position properties (used for visualization)
                    top: 0,
                    left: 0,
                    hasSubTree: false,
                    // Transform relationship arrays to include type
                    parents: (member.parents || []).map((p) => ({
                      id: p.id,
                      type: RelType.blood, // Default to blood for parents
                    })),
                    children: (member.children || []).map((c) => ({
                      id: c.id,
                      type: RelType.blood, // Default to blood for children
                    })),
                    spouses: (member.spouses || []).map((s) => ({
                      id: s.id,
                      type: RelType.married, // Spouses are always married
                    })),
                    siblings: (member.siblings || []).map((sib) => ({
                      id: sib.id,
                      type: RelType.blood, // Default to blood for siblings
                    })),
                  }),
                );
                setNodes(convertedNodes);
              }
            }
          } catch (reloadErr) {
            console.warn("Failed to reload tree data:", reloadErr);
            // Continue even if reload fails - operation was successful
          }
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
    [hasPermission, treeId],
  );

  // Update rootId when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      // First, try to find a male with no parents and no spouses
      let rootCandidate = nodes.find(
        (item) =>
          item.gender === Gender.male &&
          (item.parents?.length ?? 0) === 0 &&
          (item.spouses?.length ?? 0) === 0,
      );

      // If not found, try to find any male with no parents
      if (!rootCandidate) {
        rootCandidate = nodes.find(
          (item) =>
            item.gender === Gender.male && (item.parents?.length ?? 0) === 0,
        );
      }

      // If still not found, use the first male node
      if (!rootCandidate) {
        rootCandidate = nodes.find((item) => item.gender === Gender.male);
      }

      // If no males found, fall back to original logic
      if (!rootCandidate) {
        rootCandidate = nodes.find(
          (item) =>
            (item.parents?.length ?? 0) === 0 &&
            (item.spouses?.length ?? 0) === 0,
        );
      }

      if (rootCandidate) {
        setRootId(rootCandidate.id);
      } else {
        setRootId(nodes[0].id);
      }
    }
  }, [nodes]);

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
            display: "flex",
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
      {showAddStartingNode && (
        <Box
          sx={{
            position: "fixed",
            right: 0,
            top: 0,
            height: "100%",
            width: { xs: "100%", sm: "400px" },
            backgroundColor: "background.paper",
            boxShadow: "-2px 0 8px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            overflow: "auto",
            p: 3,
          }}
        >
          <AddNode
            onAdd={(node) => {
              onAdd(node, "child");
              setShowAddStartingNode(false);
            }}
            onCancel={() => setShowAddStartingNode(false)}
            nodes={nodes}
            noCard={true}
            isFirstNode={true}
          />
        </Box>
      )}
      <NodeDetails
        node={selected || null}
        nodes={nodes}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onSelect={setSelectId}
        onHover={setHoverId}
        onClear={() => setHoverId(undefined)}
      />
    </>
  );
};
