import { FNode } from '../components/model/FNode';
import { backendApi } from './backendApi';

/**
 * API service for managing family tree data
 * Updated for normalized schema with people_relations table for relationships
 */

type RelationType = 'parent' | 'child' | 'spouse' | 'sibling';

interface PersonWithRelations {
  id: string;
  name: string;
  nameHindi?: string;
  gender?: string;
  dob?: string;
  treeId: string;
  createdAt?: string;
  modifiedAt?: string;
  parents?: Array<{ id: string; type: RelationType }>;
  children?: Array<{ id: string; type: RelationType }>;
  spouses?: Array<{ id: string; type: RelationType }>;
  siblings?: Array<{ id: string; type: RelationType }>;
}

interface UpdatePersonResponse {
  success: boolean;
  error?: string;
  personId?: string;
  name?: string;
  nameHindi?: string;
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  isAlive?: boolean;
  deceasedDate?: string;
  photoUrl?: string;
  treeId?: string;
  fieldsUpdated?: number;
}

interface CompleteTreeNode {
  id: string;
  name: string;
  nameHindi?: string;
  gender: string;
  dob?: string;
  createdAt: string;
  parents: PersonWithRelations[];
  children: PersonWithRelations[];
  spouses: PersonWithRelations[];
  siblings: PersonWithRelations[];
}

/** Shape of a single member node returned by the procedure */
interface AffectedNode {
  id: string;
  name: string;
  nameHindi?: string;
  gender?: string;
  dob?: string;
  treeId: string;
  createdAt?: string;
  parents: Array<{ id: string; name?: string; gender?: string; dob?: string }>;
  children: Array<{ id: string; name?: string; gender?: string; dob?: string }>;
  spouses: Array<{ id: string; name?: string; gender?: string; dob?: string }>;
  siblings: Array<{ id: string; name?: string; gender?: string; dob?: string }>;
}

/** Result from add_person_to_tree procedure */
export interface AddPersonResult {
  success: boolean;
  personId: string;
  autoCreatedSpouseId?: string | null;
  name: string;
  nameHindi?: string;
  gender?: string;
  dob?: string;
  treeId: string;
  relationType?: string;
  relationSubtype?: string;
  relatedPersonId?: string;
  fieldsAdded: number;
  affectedNodes: AffectedNode[];
  error?: string;
}

interface CompleteTreeResponse {
  success: boolean;
  tree: {
    id: string;
    name: string;
    description?: string;
    caste?: string;
    subCaste?: string;
    createdAt: string;
    village?: {
      id: string;
      name: string;
      district?: {
        id: string;
        name: string;
        state?: {
          id: string;
          name: string;
        };
      };
    };
  };
  members: CompleteTreeNode[];
  statistics: {
    totalMembers: number;
    maleCount: number;
    femaleCount: number;
    totalRelations: number;
  };
}

export type PeopleFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "email"
  | "phone";

export interface PredefinedPeopleField {
  fieldName: string;
  type: PeopleFieldType;
  sortOrder: number;
  showUpfront: boolean;
}

export interface TreeWriteScope {
  treeId: string;
  canWriteAll: boolean;
  rootPersonIds: string[];
}

export interface TreeInvite {
  id: string;
  treeId: string;
  personId: string | null;
  personName?: string | null;
  role: string;
  invitedPhone: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
  inviteToken?: string;
  inviteLink?: string;
}

export const ApiService = {
  normalizeDateValue(value?: string): string | undefined {
    if (value == null) return undefined;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : undefined;
  },
  /**
   * Fetch all people for a specific tree with their relationships
   */
  async getPeopleByTree(treeId: string): Promise<PersonWithRelations[]> {
    const tree = await backendApi.get<any>(`/api/tree/${treeId}/complete`);
    return (tree?.members || []) as PersonWithRelations[];
  },

  /**
   * Fetch all people for a specific village across all trees
   */
  async getPeopleByVillage(villageId: string): Promise<PersonWithRelations[]> {
    const trees = await backendApi.get<any[]>("/api/tree", { villageId });
    const treeIds = (trees || []).map((tree: any) => tree.id).filter(Boolean);
    if (treeIds.length === 0) return [];

    const allMembers = await Promise.all(
      treeIds.map(async (id: string) => {
        const complete = await backendApi.get<any>(`/api/tree/${id}/complete`);
        return complete?.members || [];
      }),
    );

    return allMembers.flat() as PersonWithRelations[];
  },

  /**
   * Get relationships for a person from people_relations table
   */
  async getPersonRelations(
    personId: string
  ): Promise<{
    parents?: Array<{ id: string; type: RelationType }>;
    children?: Array<{ id: string; type: RelationType }>;
    spouses?: Array<{ id: string; type: RelationType }>;
  }> {
    const person = await this.getPersonById(personId);
    return {
      parents: person?.parents,
      children: person?.children,
      spouses: person?.spouses,
    };
  },

  /**
   * Get complete family tree by tree ID with all members and their relationships
   * Calls the SQL procedure get_complete_tree_by_id
   */
  async getCompleteTreeById(treeId: string): Promise<CompleteTreeResponse> {
    return backendApi.get<CompleteTreeResponse>(`/api/tree/${treeId}/complete`);
  },

  /**
   * Fetch person by ID with relationships
   */
  async getPersonById(personId: string): Promise<PersonWithRelations | null> {
    try {
      const person = await backendApi.get<PersonWithRelations>(`/api/people/${personId}`);
      return person;
    } catch (error: any) {
      if ((error?.message || "").toLowerCase().includes("not found")) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create a new person in the family tree
   */
  async getPersonCustomFields(personId: string): Promise<Record<string, string>> {
    return backendApi.get<Record<string, string>>(`/api/people/${personId}/custom-fields`);
  },

  /**
   * Update a person with core properties and additional fields
   * Handles both regular updates and additional details in one procedure call
   */
  async updatePerson(personId: string, updates: Partial<FNode>): Promise<PersonWithRelations> {
    const { customFields, ...coreUpdates } = updates;
    const normalizedDob = this.normalizeDateValue(coreUpdates.dob);
    const normalizedDeceasedDate = this.normalizeDateValue(coreUpdates.deceasedDate);
    const payload = {
      name: coreUpdates.name,
      nameHindi: coreUpdates.nameHindi,
      gender: coreUpdates.gender,
      dob: normalizedDob,
      additionalFields: customFields && Object.keys(customFields).length > 0 ? customFields : undefined,
      bloodGroup: coreUpdates.bloodGroup,
      isAlive: coreUpdates.isAlive,
      deceasedDate: normalizedDeceasedDate,
      photoUrl: coreUpdates.photo,
    };
    const response = await backendApi.patch<PersonWithRelations | UpdatePersonResponse>(
      `/api/people/${personId}`,
      payload,
    );

    // Backend may return a success envelope instead of the person object.
    if (
      response &&
      typeof response === "object" &&
      "success" in response
    ) {
      const result = response as UpdatePersonResponse;
      if (!result.success) {
        throw new Error(result.error || "Failed to update person");
      }
      return {
        id: result.personId || personId,
        name: result.name || coreUpdates.name || "",
        nameHindi: result.nameHindi || coreUpdates.nameHindi,
        gender: result.gender,
        dob: result.dob,
        treeId: result.treeId || "",
      } as PersonWithRelations;
    }

    return response as PersonWithRelations;
  },

  /**
   * Delete a person from a tree using SQL procedure
   * Handles deletion of person, relationships, and additional details atomically
   */
  async deletePerson(personId: string, force: boolean = false): Promise<any> {
    return backendApi.delete<any>(`/api/people/${personId}`, { force: String(force) });
  },

  /**
   * Add a parent relationship
   */
  async addParent(childId: string, parentId: string): Promise<void> {
    throw new Error("addParent is not supported in Node API yet. Use addPersonToTree workflow.");
  },

  /**
   * Add a spouse relationship (bidirectional) and link children
   */
  async addSpouse(
    personId: string,
    spouseId: string,
    relationSubtype?: string,
    relationStartDate?: string,
    relationEndDate?: string,
    placeholderId?: string,
  ): Promise<void> {
    const normalizedStartDate = this.normalizeDateValue(relationStartDate);
    const normalizedEndDate = this.normalizeDateValue(relationEndDate);

    await backendApi.post(`/api/people/spouse-link`, {
      personId1: personId,
      personId2: spouseId,
      relationSubtype: relationSubtype || undefined,
      relationStartDate: normalizedStartDate,
      relationEndDate: normalizedEndDate,
      replacePersonId: placeholderId || undefined,
    });
  },

  async updateSpouseRelationDates(
    personId1: string,
    personId2: string,
    relationSubtype?: string,
    relationStartDate?: string,
    relationEndDate?: string,
  ): Promise<void> {
    const normalizedStartDate = this.normalizeDateValue(relationStartDate);
    const normalizedEndDate = this.normalizeDateValue(relationEndDate);

    await backendApi.patch(`/api/people/spouse-relation`, {
      personId1,
      personId2,
      relationSubtype: relationSubtype || undefined,
      relationStartDate: normalizedStartDate || null,
      relationEndDate: normalizedEndDate || null,
    });
  },

  /**
   * Add a child relationship (opposite of parent)
   */
  async addChild(parentId: string, childId: string): Promise<void> {
    await this.addParent(childId, parentId);
  },

  /**
   * Remove a relationship
   */
  async removeRelation(personId: string, relatedPersonId: string, relationType: string): Promise<void> {
    throw new Error("removeRelation is not supported in Node API yet.");
  },

  /**
   * Add a new person to a tree using SQL procedure
   * Handles person creation, relationships, and additional details in one call
   * Supports adding child with two parents or creating spouse with multiple targets
   * Returns affected_nodes with full relationship data for efficient UI merge
   */
  async addPersonToTree(
    treeId: string,
    name: string,
    nameHindi?: string,
    gender?: string,
    dob?: string,
    relationType?: 'parent' | 'spouse',
    relatedPersonId?: string,
    relationSubtype?: string,
    additionalFields?: Record<string, string>,
    isReverseRelation?: boolean,
    relatedPersonId2?: string,
    bloodGroup?: string,
    isAlive?: boolean,
    deceasedDate?: string,
    photoUrl?: string,
    relationStartDate?: string,
    relationEndDate?: string,
  ): Promise<AddPersonResult> {
    const normalizedDob = this.normalizeDateValue(dob);
    const normalizedDeceasedDate = this.normalizeDateValue(deceasedDate);
    const normalizedRelationStartDate = this.normalizeDateValue(relationStartDate);
    const normalizedRelationEndDate = this.normalizeDateValue(relationEndDate);

    return backendApi.post<AddPersonResult>("/api/people", {
      treeId,
      name,
      nameHindi,
      gender,
      dob: normalizedDob,
      relationType,
      relatedPersonId,
      relationSubtype,
      additionalFields,
      isReverseRelation,
      relatedPersonId2,
      bloodGroup,
      isAlive,
      deceasedDate: normalizedDeceasedDate,
      photoUrl,
      relationStartDate: normalizedRelationStartDate,
      relationEndDate: normalizedRelationEndDate,
    });
  },

  /**
   * Get all predefined field names from people_field table
   * Used for field dropdown in additional details
   */
  async getPredefinedFields(): Promise<PredefinedPeopleField[]> {
    return backendApi.get<PredefinedPeopleField[]>('/api/people/predefined-fields');
  },

  /**
   * Get person additional details with field names
   * Joins with people_field to return field names instead of field IDs
   */
  async getPersonAdditionalDetails(personId: string): Promise<Record<string, string>> {
    return this.getPersonCustomFields(personId);
  },

  /**
   * Save person additional details (custom fields)
   * Stores field values using predefined field_ids from people_field table
   */
  async savePersonAdditionalDetails(
    personId: string,
    fields: Record<string, string>
  ): Promise<void> {
    await this.updatePerson(personId, { customFields: fields } as Partial<FNode>);
  },

  /**
   * Update person additional details
   * Replaces all additional details for a person using predefined field_ids
   */
  async updatePersonAdditionalDetails(
    personId: string,
    fields: Record<string, string>
  ): Promise<void> {
    await this.updatePerson(personId, { customFields: fields } as Partial<FNode>);
  },

  /**
   * Search people by name and optional tree
   */
  async searchPeople(
    searchTerm: string,
    treeId?: string
  ): Promise<PersonWithRelations[]> {
    if (!treeId) {
      const rows = await this.globalSearch(searchTerm);
      return (rows || []).filter((row: any) => row.entityType === "person") as PersonWithRelations[];
    }

    const completeTree = await backendApi.get<any>(`/api/tree/${treeId}/complete`);
    const members = (completeTree?.members || []) as PersonWithRelations[];
    const search = searchTerm.toLowerCase();
    return members.filter((member) => (member.name || "").toLowerCase().includes(search));
  },

  /**
   * Get all trees
   */
  async getTrees(villageId?: string): Promise<any[]> {
    return backendApi.get<any[]>('/api/tree', { villageId });
  },

  /**
   * Get tree with village details
   */
  async getTreeWithDetails(treeId: string): Promise<any> {
    return backendApi.get<any>(`/api/tree/${treeId}`);
  },

  async getTreeWriteScope(treeId: string): Promise<TreeWriteScope> {
    return backendApi.get<TreeWriteScope>(`/api/tree/${treeId}/write-scope`);
  },

  async getTreeInvites(treeId: string): Promise<TreeInvite[]> {
    return backendApi.get<TreeInvite[]>(`/api/tree/${treeId}/invites`);
  },

  async createTreeInvite(
    treeId: string,
    payload: {
      personId?: string | null;
      role?: string;
      invitedPhone?: string | null;
      expiresInDays?: number;
    },
  ): Promise<TreeInvite> {
    return backendApi.post<TreeInvite>(`/api/tree/${treeId}/invites`, payload);
  },

  async revokeTreeInvite(treeId: string, inviteId: string): Promise<{ success: boolean }> {
    return backendApi.patch<{ success: boolean }>(`/api/tree/${treeId}/invites/${inviteId}/revoke`);
  },

  async acceptTreeInvite(token: string): Promise<{ success: boolean; treeId: string; personId: string | null; role: string }> {
    return backendApi.post<{ success: boolean; treeId: string; personId: string | null; role: string }>(
      "/api/tree/invites/accept",
      { token },
    );
  },

  /**
   * Create a new tree
   */
  async createTree(tree: any): Promise<any> {
    return backendApi.post<any>('/api/tree', {
      name: tree.name,
      description: tree.description || null,
      villageId: tree.villageId || null,
      caste: tree.caste || null,
      subCaste: tree.subCaste || null,
    });
  },

  /**
   * Get all villages with hierarchy
   */
  async getVillages(): Promise<any[]> {
    return backendApi.get<any[]>('/api/lookup/villages');
  },

  /**
   * Get all states
   */
  async getStates(): Promise<any[]> {
    return backendApi.get<any[]>('/api/lookup/states');
  },

  /**
   * Get all districts for a state
   */
  async getDistricts(stateId?: string): Promise<any[]> {
    return backendApi.get<any[]>('/api/lookup/districts', { stateId });
  },

  /**
   * Get all villages for a district
   */
  async getVillagesForDistrict(districtId: string): Promise<any[]> {
    return backendApi.get<any[]>('/api/lookup/villages', { districtId });
  },

  /**
   * Get all castes
   */
  async getCastes(): Promise<any[]> {
    return backendApi.get<any[]>('/api/lookup/castes');
  },

  /**
   * Get sub-castes for a caste
   */
  async getSubCastes(casteId?: string): Promise<any[]> {
    return backendApi.get<any[]>('/api/lookup/sub-castes', { casteId });
  },

  /**
   * Search businesses by name and optional person (owner)
   */
  async searchBusinesses(searchTerm: string, peopleId?: string): Promise<any[]> {
    const businesses = peopleId
      ? await this.getBusinessesByPerson(peopleId)
      : await this.getAllBusinesses();

    const search = searchTerm.toLowerCase();
    return (businesses || []).filter((business: any) => (business.name || "").toLowerCase().includes(search));
  },

  /**
   * Global search across people, businesses, and professions.
   * Returns enriched context including tree/village and ancestor hierarchy.
   */
  async globalSearch(searchTerm: string): Promise<any[]> {
    return backendApi.get<any[]>('/api/search/global', { term: searchTerm });
  },

  /**
   * Get businesses for a person
   */
  async getBusinessesByPerson(peopleId: string): Promise<any[]> {
    return backendApi.get<any[]>(`/api/business/person/${peopleId}`);
  },

  /**
   * Create a business
   */
  async createBusiness(business: any): Promise<any> {
    return backendApi.post<any>('/api/business', {
      name: business.name,
      category: business.category || null,
      description: business.description || null,
      contact: business.contact || null,
      peopleId: business.peopleId || null,
    });
  },

  /**
   * Update a business
   */
  async updateBusiness(businessId: string, updates: any): Promise<any> {
    return backendApi.patch<any>(`/api/business/${businessId}`, {
      name: updates.name,
      category: updates.category,
      description: updates.description,
      peopleId: updates.peopleId,
      contact: updates.contact,
      isDeleted: updates.isDeleted,
    });
  },

  /**
   * Delete a business
   */
  async deleteBusiness(businessId: string): Promise<void> {
    await backendApi.delete(`/api/business/${businessId}`);
  },

  /**
   * Get all businesses
   */
  async getAllBusinesses(): Promise<any[]> {
    return backendApi.get<any[]>('/api/business/all');
  },

  /**
   * Get businesses by village with person hierarchy
   */
  async getBusinessesByVillageWithHierarchy(
    villageId: string
  ): Promise<any[]> {
    return backendApi.get<any[]>('/api/business', { villageId });
  },

  /**
   * Subscribe to real-time updates for people in a tree
   */
  subscribeToPeople(treeId: string, callback: (people: PersonWithRelations[]) => void) {
    const timer = setInterval(() => {
      this.getPeopleByTree(treeId).then(callback).catch(() => {});
    }, 5000);

    return {
      unsubscribe: () => clearInterval(timer),
    };
  },

  /**
   * Create state
   */
  async createState(state: { name: string }): Promise<any> {
    return backendApi.post<any>('/api/lookup/states', { name: state.name });
  },

  /**
   * Create district
   */
  async createDistrict(district: { name: string; stateId?: string }): Promise<any> {
    return backendApi.post<any>('/api/lookup/districts', {
      name: district.name,
      stateId: district.stateId,
    });
  },

  /**
   * Create village
   */
  async createVillage(village: { name: string; districtId?: string }): Promise<any> {
    return backendApi.post<any>('/api/lookup/villages', {
      name: village.name,
      districtId: village.districtId,
    });
  },

  /**
   * Create caste
   */
  async createCaste(caste: { name: string }): Promise<any> {
    return backendApi.post<any>('/api/lookup/castes', { name: caste.name });
  },

  /**
   * Get all professions
   */
  async getAllProfessions(): Promise<any[]> {
    return backendApi.get<any[]>('/api/profession');
  },

  /**
   * Create a profession
   */
  async createProfession(profession: { name: string; description?: string; category?: string }): Promise<any> {
    return backendApi.post<any>('/api/profession', profession);
  },

  /**
   * Get professions for a person
   */
  async getProfessionsByPerson(peopleId: string): Promise<any[]> {
    return backendApi.get<any[]>(`/api/profession/people/${peopleId}`);
  },

  /**
   * Add profession to a person
   */
  async addProfessionToPerson(peopleId: string, professionId: string): Promise<any> {
    return backendApi.post<any>(`/api/profession/people/${peopleId}/${professionId}`);
  },

  /**
   * Remove profession from a person
   */
  async removeProfessionFromPerson(peopleId: string, professionId: string): Promise<void> {
    await backendApi.delete(`/api/profession/people/${peopleId}/${professionId}`);
  },

  /**
   * Get people with a specific profession
   */
  async getPeopleWithProfession(professionId: string): Promise<any[]> {
    return backendApi.get<any[]>(`/api/profession/${professionId}/people`);
  },

  /**
   * Create sub-caste
   */
  async createSubCaste(subCaste: { name: string; casteId?: string }): Promise<any> {
    return backendApi.post<any>('/api/lookup/sub-castes', {
      name: subCaste.name,
      casteId: subCaste.casteId,
    });
  },

  /**
   * Search people by name with parent hierarchy.
   * Supports village-scoped and tree-scoped search.
   */
  async searchPeopleWithHierarchy(
    searchTerm: string,
    options: {
      villageId?: string;
      treeId?: string;
    },
  ): Promise<any[]> {
    return backendApi.get<any[]>("/api/people/search/by-village", {
      searchTerm,
      villageId: options.villageId,
      treeId: options.treeId,
    });
  },

  /**
   * Search people by name in a village with parent hierarchy.
   * Kept as a compatibility wrapper for existing callers.
   */
  async searchPeopleByVillageWithHierarchy(
    searchTerm: string,
    villageId: string
  ): Promise<any[]> {
    return this.searchPeopleWithHierarchy(searchTerm, { villageId });
  },

  /**
   * Get all people with their professions for a village
   */
  async getPeopleWithProfessionsByVillage(villageId: string): Promise<any[]> {
    const professions = await this.getProfessionsByVillage(villageId);
    const peopleMap = new Map<string, any>();

    (professions || []).forEach((profession: any) => {
      (profession.people || []).forEach((person: any) => {
        if (!peopleMap.has(person.personId)) {
          peopleMap.set(person.personId, {
            id: person.personId,
            name: person.personName,
            gender: person.gender,
            dob: person.dob,
            treeId: person.treeId,
            people_professions: [],
          });
        }

        peopleMap.get(person.personId).people_professions.push({ profession });
      });
    });

    return Array.from(peopleMap.values());
  },

  /**
   * Get professions by village with people and hierarchy
   */
  async getProfessionsByVillage(villageId: string): Promise<any[]> {
    const data = await backendApi.get<any[]>(`/api/profession/by-village/${villageId}`);

    // Transform the data to group people by profession
    const professionsMap = new Map<string, any>();

    (data || []).forEach((row: any) => {
      if (!professionsMap.has(row.professionId)) {
        professionsMap.set(row.professionId, {
          professionId: row.professionId,
          professionName: row.professionName,
          professionDescription: row.professionDescription,
          professionCategory: row.professionCategory,
          people: [],
        });
      }

      if (row.personId) {
        professionsMap.get(row.professionId).people.push({
          personId: row.personId,
          personName: row.personName,
          gender: row.personGender,
          personDob: row.personDob,
          villageId: row.villageId,
          villageName: row.villageName,
          casteName: row.casteName,
          subCasteName: row.subCasteName,
          treeId: row.treeId,
          treeName: row.treeName,
          parentHierarchy: row.parentHierarchy || [],
        });
      }
    });

    return Array.from(professionsMap.values());
  },

  /**
   * Get dashboard statistics (global, all villages)
   */
  async getDashboardStatistics(): Promise<any> {
    return backendApi.get<any>('/api/dashboard/statistics');
  },

  // =====================================================
  // PHOTO UPLOAD (Supabase Storage)
  // =====================================================

  /**
   * Upload a person's cropped photo to Supabase Storage.
   * Returns the public URL of the uploaded image.
   */
  async uploadPersonPhoto(personId: string, blob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('photo', blob, `${personId}.jpg`);
    const result = await backendApi.upload<{ url: string }>(`/api/people/${personId}/photo`, formData);
    return result.url;
  },

  /**
   * Remove a person's photo from Supabase Storage and clear the column.
   */
  async removePersonPhoto(personId: string): Promise<void> {
    await backendApi.delete(`/api/people/${personId}/photo`);
  },
};
