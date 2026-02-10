import { FNode } from '../model/FNode';

export interface FamilyChartData {
  id: string;
  data: {
    "first name": string;
    "last name": string;
    gender: "M" | "F";
    birthday: string;
    avatar: string;
    [key: string]: any;
  };
  rels: {
    parents: string[];
    spouses: string[];
    children: string[];
  };
}

export const transformData = (nodes: FNode[]): FamilyChartData[] => {
  // Create a map for quick lookup
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return nodes.map((node) => {
    // Determine relations
    let fatherId: string | undefined;
    let motherId: string | undefined;

    // FNode has parents array. We need to split by gender.
    // If we can't determine gender, we might assign first to father, second to mother,
    // or rely on other logic. For now, check gender of parent.
    node.parents.forEach((parentId) => {
      // Relation objects in FNode might be objects { id, type } or just strings in older versions?
      // FNode definition says parents is Relation[] where Relation = { id, type }.
      // But looking at types.d.ts read earlier: parents: readonly Relation[]
      
      const pNode = nodeMap.get(parentId.id);
      if (pNode) {
        if (pNode.gender === 'male') fatherId = parentId.id;
        else if (pNode.gender === 'female') motherId = parentId.id;
      }
    });

    const spouses = node.spouses.map(s => s.id).filter(id => nodeMap.has(id));
    // Sort spouses to ensure main spouse is first (optional logic)
    // Or at least stable sort
    spouses.sort();

    const children = node.children.map(c => c.id).filter(id => nodeMap.has(id));
    
    // Name splitting (naive)
    const nameParts = (node.name || "").trim().split(" ");
    const firstName = nameParts.length > 0 ? nameParts[0] : "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    return {
      id: node.id,
      data: {
        "first name": firstName,
        "last name": lastName || "",
        "gender": node.gender === 'male' ? 'M' : 'F',
        "birthday": node.dob || "",
        "avatar": node.photo || "",
        "label": node.name || "" // fallback or full name
      },
      rels: {
        parents: [fatherId, motherId].filter(id => !!id) as string[],
        spouses: spouses,
        children: children
      }
    };
  });
};
