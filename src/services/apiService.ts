import { FNode } from '../components/model/FNode';
import { backendApi } from './backendApi';

/**
 * API service for managing family tree data
 * Updated for normalized schema with people_relations table for relationships
 */

type RelationType = 'parent' | 'child' | 'spouse' | 'sibling';

// "public" (visible to any signed-in user, not just this tree's collaborators)
// was removed for now — only two tiers exist today.
export type PhotoVisibility = 'private' | 'family';

export interface FamilyPhoto {
  id: string;
  personId: string;
  treeId: string;
  contentType: string;
  fileSizeBytes: number;
  visibility: PhotoVisibility;
  createdBy: string;
  createdAt: string;
  /** Short-lived signed URL — refetch the list rather than caching this long-term. */
  photoUrl: string;
  thumbUrl: string;
}

export interface StorageQuotaStatus {
  usedBytes: number;
  limitBytes: number;
  maxBytes: number;
  baseBytes: number;
  bonusPerActionBytes: number;
  maxFileSizeBytes: number;
}

export interface UserPreference {
  showFullTree: boolean;
  showSpouse: boolean;
  language: string;
}

export interface UserPreferenceResponse {
  id: string;
  userId: string;
  preference: UserPreference;
  createdAt: string;
  modifiedAt: string;
  createdBy: string | null;
  modifiedBy: string | null;
}

export type OnboardingStatus = "in_progress" | "completed" | "skipped";
export type OnboardingCurrentStep =
  | "profile"
  | "location"
  | "match"
  | "complete";

export interface UserOnboardingData {
  status: OnboardingStatus;
  currentStep: OnboardingCurrentStep;
  profile: {
    name: string;
    email: string;
    completedAt: string | null;
  };
  location: {
    stateId: string | null;
    districtId: string | null;
    locationId: string | null;
    casteId: string | null;
    subCasteId: string | null;
    completedAt: string | null;
  };
  match: {
    searchName: string;
    searchedAt: string | null;
    selectedTreeId: string | null;
    selectedPersonId: string | null;
    action: "link" | "create_tree" | "branch_access" | null;
  };
  completion: {
    completedAt: string | null;
    result:
      | "linked"
      | "created_tree"
      | "branch_access_requested"
      | "invite_accepted"
      | null;
  };
}

export interface UserOnboardingDataUpdate {
  status?: OnboardingStatus;
  currentStep?: OnboardingCurrentStep;
  profile?: Partial<UserOnboardingData["profile"]>;
  location?: Partial<UserOnboardingData["location"]>;
  match?: Partial<UserOnboardingData["match"]>;
  completion?: Partial<UserOnboardingData["completion"]>;
}

export interface UserOnboardingResponse {
  id: string;
  userId: string;
  onboardingData: UserOnboardingData | null;
  effectiveOnboardingData: UserOnboardingData;
  createdAt: string;
  modifiedAt: string;
  createdBy: string | null;
  modifiedBy: string | null;
}

export interface UserOnboardingMatchedPerson {
  personId: string;
  name: string;
  nameHindi: string | null;
  gender: string | null;
  dob: string | null;
  photoUrl: string | null;
  parentHierarchy: Array<{
    id: string;
    name: string;
    generation: number;
  }>;
}

export interface UserOnboardingTreeMatch {
  treeId: string;
  treeName: string;
  locationId: string;
  locationName: string;
  casteId: string | null;
  casteName: string | null;
  subCasteId: string | null;
  subCasteName: string | null;
  totalNodes: number;
  ownerUserId: string | null;
  ownerName: string;
  matchedPeople: UserOnboardingMatchedPerson[];
}

export interface LocationCombinationOption {
  stateId: string;
  stateName: string;
  districtId: string;
  districtName: string;
  locationId: string;
  locationName: string;
  label: string;
}

export type LinkRequestType =
  | "user_to_tree_node"
  | "branch_access_request"
  | "spouse_link_request"
  | "user_add_to_tree";
export type LinkRequestStatus = "pending" | "approved" | "rejected";

export interface FamilyBirthday {
  id: string;
  name: string;
  nameHindi?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  dob: string;
  age: number;
}

export interface FamilyDeceased {
  id: string;
  name: string;
  nameHindi?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  deceasedDate: string;
  yearsAgo: number;
}

export interface FamilyAnniversary {
  person1Id: string;
  person1Name: string;
  person1PhotoUrl?: string | null;
  person2Id: string;
  person2Name: string;
  person2PhotoUrl?: string | null;
  startDate: string;
  years: number;
}

export interface FamilyEvents {
  birthdays: FamilyBirthday[];
  deceased: FamilyDeceased[];
  anniversaries: FamilyAnniversary[];
}

/** A celebration in the days just ahead, normalized across birthdays and
 *  anniversaries so one card renders both. */
export interface UpcomingFamilyEvent {
  id: string;
  type: 'birthday' | 'anniversary';
  personId: string;
  name: string;
  photoUrl: string | null;
  /** Always >= 1 — today's events come from getTodaysFamilyEvents. */
  daysAway: number;
  eventDate: string;
  /** Age they'll turn / years married on the day. */
  years: number;
}

/** A fillable hole in the user's tree — one row of the homepage worklist. */
export type TreeGapType = 'dob' | 'photo' | 'profession';

export interface TreeGap {
  personId: string;
  name: string;
  nameHindi: string | null;
  photoUrl: string | null;
  gender: string | null;
  treeId: string;
  gap: TreeGapType;
  /** Ready-to-render copy, e.g. "No birth date". */
  label: string;
}

/** Everything the personalized homepage needs, in one round trip. */
export interface DashboardInsights {
  tree: { id: string; name: string } | null;
  stats: {
    peopleInTree: number;
    generations: number;
    addedThisMonth: number;
    incompleteProfiles: number;
  };
  gaps: TreeGap[];
  counts: {
    photos: number;
    pendingRequests: number;
  };
}

export type WishEventType = 'birthday' | 'anniversary' | 'remembrance';

export interface Wish {
  id: string;
  peopleId: string;
  eventType: WishEventType;
  eventYear: number;
  message: string;
  authorUserId: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface LinkRequest {
  id: string;
  requestType: LinkRequestType;
  status: LinkRequestStatus;
  requesterUserId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  sourceUserId: string | null;
  sourcePersonId: string | null;
  sourceTreeId: string | null;
  targetUserId: string | null;
  targetPersonId: string | null;
  targetPersonName: string | null;
  targetTreeId: string | null;
  targetTreeName: string | null;
  requestMessage: string | null;
  requesterPhone: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  modifiedAt: string;
  payload: Record<string, any> | null;
}

interface PersonWithRelations {
  id: string;
  name: string;
  nameHindi?: string;
  gender?: string;
  dob?: string;
  treeId: string;
  createdAt?: string;
  modifiedAt?: string;
  createdBy?: string | null;
  createdByName?: string | null;
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
  createdBy?: string | null;
  createdByName?: string | null;
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
  createdBy?: string | null;
  createdByName?: string | null;
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
    location?: {
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

export interface DefaultUserTreeTarget {
  treeId: string;
  personId: string | null;
  locationId?: string | null;
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
  /** True when the invitee already had an account and was granted access immediately. */
  granted?: boolean;
  /** Present when granted === true: the existing user who received access. */
  user?: { id: string; name: string | null; phone: string | null };
}

export const ApiService = {
  normalizeDateValue(value?: string): string | undefined {
    if (value == null) return undefined;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : undefined;
  },
  /** Record a login event for the current user (call once on successful sign-in). */
  async recordLoginEvent(): Promise<void> {
    await backendApi.post("/api/auth/login-event", {});
  },
  /**
   * Fetch all people for a specific tree with their relationships
   */
  async getPeopleByTree(treeId: string): Promise<PersonWithRelations[]> {
    const tree = await backendApi.get<any>(`/api/tree/${treeId}/complete`);
    return (tree?.members || []) as PersonWithRelations[];
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
   * Structure-only view of a tree you may not have access to, for deciding
   * whether it is your family. Same shape as getCompleteTreeById, but living
   * members come back without birth date, photo or blood group.
   */
  async getTreePreviewById(treeId: string): Promise<CompleteTreeResponse> {
    return backendApi.get<CompleteTreeResponse>(`/api/tree/${treeId}/preview`);
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

  /** Fetch a single person's spouses (both relation directions). */
  async getPersonSpouses(
    personId: string,
  ): Promise<Array<{ id: string; name?: string; nameHindi?: string; gender?: string; dob?: string }>> {
    return backendApi.get(`/api/people/${personId}/spouses`);
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
   * Add a spouse relationship (bidirectional) and link children
   */
  async addSpouse(
    personId: string,
    spouseId: string,
    relationSubtype?: string,
    relationStartDate?: string,
    relationEndDate?: string,
    placeholderId?: string,
    confirmExistingSpouse?: boolean,
    mergeSpouseId?: string,
  ): Promise<void> {
    const normalizedStartDate = this.normalizeDateValue(relationStartDate);
    const normalizedEndDate = this.normalizeDateValue(relationEndDate);

    const result = await backendApi.post<{ success?: boolean; error?: string } | void>(
      `/api/people/spouse-link`,
      {
        personId1: personId,
        personId2: spouseId,
        relationSubtype: relationSubtype || undefined,
        relationStartDate: normalizedStartDate,
        relationEndDate: normalizedEndDate,
        replacePersonId: placeholderId || undefined,
        confirmExistingSpouse: confirmExistingSpouse || undefined,
        mergeSpouseId: mergeSpouseId || undefined,
      },
    );

    // The direct link path returns { success: false, error } with a 200 status,
    // so surface backend validation failures (gender/existing-spouse) as errors.
    if (result && (result as any).success === false) {
      throw new Error((result as any).error || "Failed to link spouse");
    }
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
    otherParentMode?: "existing" | "new" | "unknown",
    newSpouse?: {
      name?: string;
      nameHindi?: string;
      gender?: string;
      dob?: string;
    },
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
      otherParentMode,
      newSpouse: newSpouse
        ? { ...newSpouse, dob: this.normalizeDateValue(newSpouse.dob) }
        : undefined,
    });
  },

  /**
   * Change a person's "other parent" while keeping the anchor parent fixed.
   * The other parent can be an existing spouse of the anchor ("existing"), a newly
   * created spouse ("new"), or removed entirely ("unknown").
   * Returns affected_nodes for efficient UI merge.
   */
  async changeOtherParent(
    personId: string,
    anchorParentId: string,
    otherParentMode: "existing" | "new" | "unknown",
    otherParentId?: string,
    newSpouse?: {
      name?: string;
      nameHindi?: string;
      gender?: string;
      dob?: string;
    },
  ): Promise<AddPersonResult> {
    return backendApi.patch<AddPersonResult>(`/api/people/${personId}/other-parent`, {
      anchorParentId,
      otherParentMode,
      otherParentId,
      newSpouse: newSpouse
        ? { ...newSpouse, dob: this.normalizeDateValue(newSpouse.dob) }
        : undefined,
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
  async getTrees(locationId?: string): Promise<any[]> {
    return backendApi.get<any[]>('/api/tree', { locationId });
  },

  /**
   * Get tree with location details
   */
  async getTreeWithDetails(treeId: string): Promise<any> {
    return backendApi.get<any>(`/api/tree/${treeId}`);
  },

  async getTreeWriteScope(treeId: string): Promise<TreeWriteScope> {
    return backendApi.get<TreeWriteScope>(`/api/tree/${treeId}/write-scope`);
  },

  async getDefaultUserTree(): Promise<DefaultUserTreeTarget> {
    return backendApi.get<DefaultUserTreeTarget>("/api/tree/my/default");
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

  /** Checks whether a phone number already belongs to a user in the system. */
  async lookupTreeInviteUser(
    treeId: string,
    phone: string,
    personId?: string | null,
  ): Promise<{ exists: boolean; name: string | null }> {
    return backendApi.post<{ exists: boolean; name: string | null }>(
      `/api/tree/${treeId}/invites/lookup`,
      { phone, personId: personId || null },
    );
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
      locationId: tree.locationId || null,
      caste: tree.caste || null,
      subCaste: tree.subCaste || null,
    });
  },

  /**
   * Get all locations with hierarchy
   */
  async getLocations(): Promise<any[]> {
    return backendApi.get<any[]>('/api/lookup/locations');
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
   * Get all locations for a district
   */
  async getLocationsForDistrict(districtId: string): Promise<any[]> {
    return backendApi.get<any[]>('/api/lookup/locations', { districtId });
  },

  async searchLocationCombinations(params: {
    query?: string;
    locationId?: string;
    limit?: number;
    withTreesOnly?: boolean;
  }): Promise<LocationCombinationOption[]> {
    return backendApi.get<LocationCombinationOption[]>(
      "/api/lookup/location-combinations",
      {
        query: params.query,
        locationId: params.locationId,
        limit: params.limit,
        withTreesOnly: params.withTreesOnly ? "true" : undefined,
      },
    );
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
   * Returns enriched context including tree/location and ancestor hierarchy.
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
      email: business.email || null,
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
      email: updates.email,
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
   * Get businesses by location with person hierarchy
   */
  async getBusinessesByLocationWithHierarchy(
    locationId: string
  ): Promise<any[]> {
    return backendApi.get<any[]>('/api/business', { locationId });
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
   * Create location
   */
  async createLocation(location: { name: string; districtId?: string }): Promise<any> {
    return backendApi.post<any>('/api/lookup/locations', {
      name: location.name,
      districtId: location.districtId,
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
   * Submit user feedback (bug / suggestion / other).
   */
  async submitFeedback(payload: {
    message: string;
    category?: string;
    rating?: number | null;
    context?: string | null;
  }): Promise<any> {
    return backendApi.post<any>('/api/feedback', payload);
  },

  /**
   * Superadmin: list all feedback submitted by all users.
   */
  async getAllFeedback(): Promise<any[]> {
    return backendApi.get<any[]>('/api/feedback');
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

  async getUserPreference(): Promise<UserPreferenceResponse> {
    return backendApi.get<UserPreferenceResponse>('/api/user/preference');
  },

  async updateUserPreference(
    preference: Partial<UserPreference>,
  ): Promise<UserPreferenceResponse> {
    return backendApi.patch<UserPreferenceResponse>('/api/user/preference', {
      preference,
    });
  },

  async getUserOnboarding(): Promise<UserOnboardingResponse> {
    return backendApi.get<UserOnboardingResponse>("/api/user/onboarding");
  },

  async updateUserOnboarding(
    onboardingData: UserOnboardingDataUpdate,
  ): Promise<UserOnboardingResponse> {
    return backendApi.patch<UserOnboardingResponse>("/api/user/onboarding", {
      onboardingData,
    });
  },

  async searchUserOnboardingMatches(payload: {
    searchName?: string | null;
    locationId: string;
    casteId?: string | null;
    subCasteId?: string | null;
  }): Promise<UserOnboardingTreeMatch[]> {
    return backendApi.post<UserOnboardingTreeMatch[]>(
      "/api/user/onboarding/matches/search",
      payload,
    );
  },

  /** Stores this device's FCM token so the backend can push notifications to it. */
  async registerDeviceToken(token: string): Promise<{ success: boolean }> {
    return backendApi.post<{ success: boolean }>("/api/notifications/device-token", {
      token,
      platform: "web",
    });
  },

  /** Removes this device's FCM token (sign-out, or notifications turned off). */
  async unregisterDeviceToken(token: string): Promise<{ success: boolean }> {
    return backendApi.delete<{ success: boolean }>("/api/notifications/device-token", {
      token,
    });
  },

  async getMyLinkRequests(requestType?: LinkRequestType): Promise<LinkRequest[]> {
    return backendApi.get<LinkRequest[]>("/api/link-requests/my", {
      requestType,
    });
  },

  async createUserNodeLinkRequest(payload: {
    targetPersonId: string;
    requestMessage?: string | null;
  }): Promise<LinkRequest> {
    return backendApi.post<LinkRequest>("/api/link-requests/user-node", payload);
  },

  async createBranchAccessRequest(payload: {
    targetTreeId: string;
    targetPersonId?: string | null;
    requestMessage?: string | null;
  }): Promise<LinkRequest> {
    return backendApi.post<LinkRequest>("/api/link-requests/branch-access", payload);
  },

  async createAddToTreeRequest(payload: {
    targetTreeId: string;
    relativePersonId?: string | null;
    requestMessage?: string | null;
  }): Promise<LinkRequest> {
    return backendApi.post<LinkRequest>("/api/link-requests/add-to-tree", payload);
  },

  async createSpouseLinkRequest(payload: {
    personId1: string;
    personId2: string;
    relationSubtype?: string | null;
    relationStartDate?: string | null;
    relationEndDate?: string | null;
    replacePersonId?: string | null;
    requestMessage?: string | null;
    confirmExistingSpouse?: boolean;
    mergeSpouseId?: string | null;
  }): Promise<LinkRequest> {
    return backendApi.post<LinkRequest>("/api/people/spouse-link", {
      ...payload,
      requestOnly: true,
    });
  },

  async getPendingTreeLinkRequests(treeId: string): Promise<LinkRequest[]> {
    return backendApi.get<LinkRequest[]>(`/api/link-requests/tree/${treeId}/pending`);
  },

  async getActionableLinkRequests(): Promise<LinkRequest[]> {
    return backendApi.get<LinkRequest[]>("/api/link-requests/actionable");
  },

  async reviewLinkRequest(
    requestId: string,
    payload: {
      action: "approved" | "rejected";
      reviewNote?: string | null;
    },
  ): Promise<LinkRequest> {
    return backendApi.post<LinkRequest>(
      `/api/link-requests/${requestId}/review`,
      payload,
    );
  },

  /**
   * Search people by name with parent hierarchy.
   * Supports location-scoped and tree-scoped search.
   */
  async searchPeopleWithHierarchy(
    searchTerm: string,
    options: {
      locationId?: string;
      treeId?: string;
    },
  ): Promise<any[]> {
    return backendApi.get<any[]>("/api/people/search/by-location", {
      searchTerm,
      locationId: options.locationId,
      treeId: options.treeId,
    });
  },

  /**
   * Nodes the signed-in user could claim as their own profile, restricted to the
   * trees they can see. Called with no `query` it matches on their account name,
   * so likely candidates are on screen before they type.
   */
  async getProfileLinkCandidates(options: {
    query?: string;
    locationId?: string;
  } = {}): Promise<any[]> {
    return backendApi.get<any[]>("/api/people/link-candidates", {
      query: options.query,
      locationId: options.locationId,
    });
  },

  /**
   * People in OTHER trees who could be the spouse being linked. Requires both a
   * location and a name — it is a targeted lookup, not a browsable listing — and
   * returns only enough to recognise someone.
   */
  async getMarriageCandidates(options: {
    name: string;
    locationId: string;
    excludeTreeId?: string;
  }): Promise<Array<{
    personId: string;
    name: string;
    nameHindi: string | null;
    gender: string | null;
    treeId: string | null;
    treeName: string | null;
    locationName: string | null;
    parentHierarchy: Array<{ id: string; name: string; generation: number }>;
  }>> {
    return backendApi.get("/api/people/marriage-candidates", {
      name: options.name,
      locationId: options.locationId,
      excludeTreeId: options.excludeTreeId,
    });
  },

  /**
   * Same as searchPeopleWithHierarchy, but restricted to people the logged-in
   * user has write access to (a superadmin gets everyone). Used to pick an owner
   * you're actually allowed to manage.
   */
  async searchWritablePeopleWithHierarchy(
    searchTerm: string,
    options: {
      locationId?: string;
      treeId?: string;
    },
  ): Promise<any[]> {
    return backendApi.get<any[]>("/api/people/search/by-location/writable", {
      searchTerm,
      locationId: options.locationId,
      treeId: options.treeId,
    });
  },

  /**
   * Of the given person ids, returns those the logged-in user may manage
   * (edit/delete a business or professions): superadmin gets all; otherwise a
   * node they've claimed, or an unclaimed node they have write access to.
   */
  async getManageablePeople(personIds: string[]): Promise<string[]> {
    if (!personIds || personIds.length === 0) return [];
    const res = await backendApi.post<{ manageableIds: string[] }>(
      "/api/people/manageable",
      { personIds },
    );
    return res?.manageableIds || [];
  },

  /**
   * Get all people with their professions for a location
   */
  async getPeopleWithProfessionsByLocation(locationId: string): Promise<any[]> {
    const professions = await this.getProfessionsByLocation(locationId);
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
   * Get professions by location with people and hierarchy
   */
  async getProfessionsByLocation(locationId: string): Promise<any[]> {
    const data = await backendApi.get<any[]>(`/api/profession/by-location/${locationId}`);

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
          locationId: row.locationId,
          locationName: row.locationName,
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
   * Get dashboard statistics (global, all locations)
   */
  async getDashboardStatistics(): Promise<any> {
    return backendApi.get<any>('/api/dashboard/statistics');
  },

  /**
   * Today's family events (birthdays, death anniversaries, wedding
   * anniversaries) scoped to the logged-in user's tree.
   */
  async getTodaysFamilyEvents(): Promise<FamilyEvents> {
    return backendApi.get<FamilyEvents>('/api/family-events/today');
  },

  /**
   * Birthdays and anniversaries in the next `days` days (today excluded), so a
   * quiet day still has something to show.
   */
  async getUpcomingFamilyEvents(days = 7): Promise<UpcomingFamilyEvent[]> {
    return backendApi.get<UpcomingFamilyEvent[]>('/api/family-events/upcoming', {
      days,
    });
  },

  /**
   * The logged-in user's own tree stats, the gaps worth filling, and nav badge
   * counts — the data behind the personalized homepage.
   */
  async getMyDashboardInsights(): Promise<DashboardInsights> {
    return backendApi.get<DashboardInsights>('/api/dashboard/my-insights');
  },

  // =====================================================
  // EVENT WISHES (birthday / anniversary / remembrance wall)
  // =====================================================

  /**
   * List non-deleted wishes for a person, optionally scoped to a single
   * (eventType, eventYear) thread. Newest-first. Public read.
   */
  async getWishes(params: {
    peopleId: string;
    eventType?: WishEventType;
    eventYear?: number;
  }): Promise<Wish[]> {
    return backendApi.get<Wish[]>('/api/wishes', {
      peopleId: params.peopleId,
      eventType: params.eventType,
      eventYear: params.eventYear,
    });
  },

  /**
   * Post a wish to a person's event thread. Author is resolved server-side.
   */
  async postWish(payload: {
    peopleId: string;
    eventType: WishEventType;
    eventYear: number;
    message: string;
  }): Promise<Wish> {
    return backendApi.post<Wish>('/api/wishes', payload);
  },

  /**
   * Soft-delete a wish (author or superadmin only, enforced server-side).
   */
  async deleteWish(id: string): Promise<void> {
    await backendApi.delete(`/api/wishes/${id}`);
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

  // =====================================================
  // FAMILY PHOTOS (Cloudflare R2) — separate from the single profile photo above
  // =====================================================

  /** Upload a family photo for a person, with an explicit visibility scope. */
  async uploadFamilyPhoto(
    personId: string,
    file: File,
    visibility: PhotoVisibility,
  ): Promise<FamilyPhoto> {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('visibility', visibility);
    return backendApi.upload<FamilyPhoto>(`/api/photos/people/${personId}`, formData);
  },

  /** The current user's own uploads, newest first. */
  async getMyFamilyPhotos(): Promise<FamilyPhoto[]> {
    return backendApi.get<FamilyPhoto[]>('/api/photos/mine');
  },

  /** Photos uploaded by others, visible to the current user (public, or family-scoped within a shared tree). */
  async getSharedFamilyPhotos(): Promise<FamilyPhoto[]> {
    return backendApi.get<FamilyPhoto[]>('/api/photos/shared');
  },

  /** All photos of one person the current user is allowed to see. */
  async getPersonFamilyPhotos(personId: string): Promise<FamilyPhoto[]> {
    return backendApi.get<FamilyPhoto[]>(`/api/photos/people/${personId}`);
  },

  async updateFamilyPhotoVisibility(photoId: string, visibility: PhotoVisibility): Promise<void> {
    await backendApi.patch(`/api/photos/${photoId}/visibility`, { visibility });
  },

  async deleteFamilyPhoto(photoId: string): Promise<void> {
    await backendApi.delete(`/api/photos/${photoId}`);
  },

  /** Storage quota: how much of the earned allowance the user has used. */
  async getStorageStatus(): Promise<StorageQuotaStatus> {
    return backendApi.get<StorageQuotaStatus>('/api/storage/status');
  },
};
