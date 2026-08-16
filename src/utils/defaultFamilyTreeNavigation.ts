import { ApiService } from "../services/apiService";

export async function resolveDefaultFamilyTreePath(): Promise<string> {
  try {
    const target = await ApiService.getDefaultUserTree();
    if (!target?.treeId) {
      return "/families";
    }

    const params = new URLSearchParams();
    params.set("tree", target.treeId);
    if (target.personId) {
      params.set("personId", target.personId);
    }

    return `/families?${params.toString()}`;
  } catch (error) {
    console.warn("Failed to resolve default user tree:", error);
    return "/families";
  }
}
