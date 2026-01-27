import { supabase } from '../supabase';
import { FNode } from '../components/model/FNode';

/**
 * Supabase service for managing family tree data
 * Updated for normalized schema with people_relations table for relationships
 */

type RelationType = 'parent' | 'child' | 'spouse' | 'sibling';

interface PersonWithRelations {
  id: string;
  name: string;
  gender?: string;
  dob?: string;
  tree_id: string;
  created_at?: string;
  modified_at?: string;
  parents?: Array<{ id: string; type: RelationType }>;
  children?: Array<{ id: string; type: RelationType }>;
  spouses?: Array<{ id: string; type: RelationType }>;
  siblings?: Array<{ id: string; type: RelationType }>;
}

interface CompleteTreeNode {
  id: string;
  name: string;
  gender: string;
  dob?: string;
  created_at: string;
  parents: PersonWithRelations[];
  children: PersonWithRelations[];
  spouses: PersonWithRelations[];
  siblings: PersonWithRelations[];
}

interface CompleteTreeResponse {
  success: boolean;
  tree: {
    id: string;
    name: string;
    description?: string;
    caste?: string;
    sub_caste?: string;
    created_at: string;
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
    total_members: number;
    male_count: number;
    female_count: number;
    total_relations: number;
  };
}

export const SupabaseService = {
  /**
   * Fetch all people for a specific tree with their relationships
   */
  async getPeopleByTree(treeId: string): Promise<PersonWithRelations[]> {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('tree_id', treeId);

    if (error) throw error;

    // Fetch relationships for all people
    const peopleWithRelations = await Promise.all(
      (data || []).map(async (person) => {
        const relations = await this.getPersonRelations(person.id);
        return {
          ...person,
          ...relations,
        };
      })
    );

    return peopleWithRelations as PersonWithRelations[];
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
    const { data, error } = await supabase
      .from('people_relations')
      .select('related_person_id, relation_type')
      .eq('person_id', personId);

    if (error) throw error;

    const relations: {
      parents?: Array<{ id: string; type: RelationType }>;
      children?: Array<{ id: string; type: RelationType }>;
      spouses?: Array<{ id: string; type: RelationType }>;
    } = {};

    if (data && data.length > 0) {
      const parents = data.filter((r) => r.relation_type === 'parent');
      const spouses = data.filter((r) => r.relation_type === 'spouse');

      if (parents.length > 0) {
        relations.parents = parents.map((p) => ({
          id: p.related_person_id,
          type: p.relation_type as RelationType,
        }));
      }

      if (spouses.length > 0) {
        relations.spouses = spouses.map((s) => ({
          id: s.related_person_id,
          type: s.relation_type as RelationType,
        }));
      }

      // For children, query from the other direction
      const { data: childData } = await supabase
        .from('people_relations')
        .select('person_id, relation_type')
        .eq('related_person_id', personId)
        .eq('relation_type', 'parent');

      if (childData && childData.length > 0) {
        relations.children = childData.map((c) => ({
          id: c.person_id,
          type: 'child' as RelationType,
        }));
      }
    }

    return relations;
  },

  /**
   * Get complete family tree by tree ID with all members and their relationships
   * Calls the SQL procedure get_complete_tree_by_id
   */
  async getCompleteTreeById(treeId: string): Promise<CompleteTreeResponse> {
    const { data, error } = await supabase.rpc('get_complete_tree_by_id', {
      p_tree_id: treeId,
    });

    if (error) {
      throw new Error(`Failed to fetch complete tree: ${error.message}`);
    }

    return data as CompleteTreeResponse;
  },

  /**
   * Fetch person by ID with relationships
   */
  async getPersonById(personId: string): Promise<PersonWithRelations | null> {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    if (!data) return null;

    const relations = await this.getPersonRelations(personId);
    return {
      ...data,
      ...relations,
    } as PersonWithRelations;
  },

  /**
   * Create a new person in the family tree
   */
  async createPerson(person: Partial<FNode>): Promise<PersonWithRelations> {
    const personData = {
      name: person.name,
      gender: person.gender || null,
      dob: person.dob || null,
      tree_id: person.treeId,
      created_at: new Date(),
      modified_at: new Date(),
    };

    const { data, error } = await supabase
      .from('people')
      .insert([personData])
      .select()
      .single();

    if (error) throw error;

    const relations = await this.getPersonRelations(data.id);
    return {
      ...data,
      ...relations,
    } as PersonWithRelations;
  },

  /**
   * Update a person with core properties and additional fields
   * Handles both regular updates and additional details in one procedure call
   */
  async updatePerson(personId: string, updates: Partial<FNode>): Promise<PersonWithRelations> {
    // Separate custom fields from core properties
    const { customFields, ...coreUpdates } = updates;
    
    // Pass additional fields as object (Supabase will convert to JSONB)
    const fieldsJsonb = customFields && Object.keys(customFields).length > 0 
      ? customFields
      : null;

    const { data, error } = await supabase.rpc('update_person_in_tree', {
      p_person_id: personId,
      p_name: coreUpdates.name || null,
      p_gender: coreUpdates.gender || null,
      p_dob: coreUpdates.dob || null,
      p_additional_fields: fieldsJsonb,
    });

    if (error) throw new Error(`Failed to update person: ${error.message}`);
    
    if (data?.success === false) {
      throw new Error(`Failed to update person: ${data.error}`);
    }

    const relations = await this.getPersonRelations(personId);
    return {
      ...data,
      ...relations,
    } as PersonWithRelations;
  },

  /**
   * Delete a person from a tree using SQL procedure
   * Handles deletion of person, relationships, and additional details atomically
   */
  async deletePerson(personId: string): Promise<void> {
    const { data, error } = await supabase.rpc('delete_person_from_tree', {
      p_person_id: personId,
    });

    if (error) throw new Error(`Failed to delete person: ${error.message}`);
    
    if (data?.success === false) {
      throw new Error(`Failed to delete person: ${data.error}`);
    }

    console.log('Person deleted successfully:', data.deleted_person_name);
  },

  /**
   * Add a parent relationship
   */
  async addParent(childId: string, parentId: string): Promise<void> {
    const relationData = {
      person_id: childId,
      related_person_id: parentId,
      relation_type: 'parent',
      created_at: new Date(),
      modified_at: new Date(),
    };

    const { error } = await supabase.from('people_relations').insert([relationData]);

    if (error) throw error;
  },

  /**
   * Add a spouse relationship (bidirectional)
   */
  async addSpouse(personId: string, spouseId: string): Promise<void> {
    // Add relationship from person to spouse
    const relation1 = {
      person_id: personId,
      related_person_id: spouseId,
      relation_type: 'spouse',
      created_at: new Date(),
      modified_at: new Date(),
    };

    // Add relationship from spouse to person
    const relation2 = {
      person_id: spouseId,
      related_person_id: personId,
      relation_type: 'spouse',
      created_at: new Date(),
      modified_at: new Date(),
    };

    const { error } = await supabase
      .from('people_relations')
      .insert([relation1, relation2]);

    if (error) throw error;
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
    const { error } = await supabase
      .from('people_relations')
      .delete()
      .eq('person_id', personId)
      .eq('related_person_id', relatedPersonId)
      .eq('relation_type', relationType);

    if (error) throw error;
  },

  /**
   * Add a new person to a tree using SQL procedure
   * Handles person creation, relationships, and additional details in one call
   * Supports adding child with two parents or creating spouse with multiple targets
   */
  async addPersonToTree(
    treeId: string,
    name: string,
    gender?: string,
    dob?: string,
    relationType?: 'parent' | 'spouse',
    relatedPersonId?: string,
    relationSubtype?: string,
    additionalFields?: Record<string, string>,
    isReverseRelation?: boolean,
    relatedPersonId2?: string
  ): Promise<any> {
    // Pass additional fields as object (Supabase will convert to JSONB)
    const fieldsJsonb = additionalFields && Object.keys(additionalFields).length > 0 
      ? additionalFields
      : null;

    const { data, error } = await supabase.rpc('add_person_to_tree', {
      p_tree_id: treeId,
      p_name: name,
      p_gender: gender || null,
      p_dob: dob || null,
      p_relation_type: relationType || null,
      p_related_person_id: relatedPersonId || null,
      p_relation_subtype: relationSubtype || null,
      p_is_reverse_relation: isReverseRelation || false,
      p_additional_fields: fieldsJsonb,
      p_related_person_id_2: relatedPersonId2 || null,
    });

    if (error) throw new Error(`Failed to add person: ${error.message}`);
    
    if (data?.success === false) {
      throw new Error(`Failed to add person: ${data.error}`);
    }

    return data;
  },

  /**
   * Get all predefined field names from people_field table
   * Used for field dropdown in additional details
   */
  async getPredefinedFields(): Promise<string[]> {
    const { data, error } = await supabase
      .from('people_field')
      .select('field_name')
      .order('field_name', { ascending: true });

    if (error) throw new Error(`Failed to fetch predefined fields: ${error.message}`);

    return (data || []).map((row: any) => row.field_name);
  },

  /**
   * Get person additional details with field names
   * Joins with people_field to return field names instead of field IDs
   */
  async getPersonAdditionalDetails(personId: string): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('people_additional_detail')
      .select('people_field(field_name), field_value')
      .eq('people_id', personId);

    if (error) throw new Error(`Failed to fetch additional details: ${error.message}`);

    const result: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      const fieldName = row.people_field?.field_name;
      if (fieldName) {
        result[fieldName] = row.field_value;
      }
    });

    return result;
  },

  /**
   * Save person additional details (custom fields)
   * Stores field values using predefined field_ids from people_field table
   */
  async savePersonAdditionalDetails(
    personId: string,
    fields: Record<string, string>
  ): Promise<void> {
    // For each field, lookup its ID in people_field and insert into people_additional_detail
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      // Lookup field name in people_field (case-insensitive) - must already exist
      let { data: fieldData, error: fieldError } = await supabase
        .from('people_field')
        .select('id')
        .ilike('field_name', fieldName)
        .single();

      if (fieldError || !fieldData) {
        throw new Error(`Field '${fieldName}' not found in people_field table. Please add it as a predefined field first.`);
      }

      const fieldId = fieldData.id;

      // Check if this field already exists for this person
      const { data: existingDetail } = await supabase
        .from('people_additional_detail')
        .select('id')
        .eq('people_id', personId)
        .eq('people_field_id', fieldId)
        .single();

      if (existingDetail) {
        // Update existing detail
        const { error: updateError } = await supabase
          .from('people_additional_detail')
          .update({
            field_value: fieldValue,
            modified_at: new Date(),
          })
          .eq('id', existingDetail.id);

        if (updateError) {
          throw new Error(`Failed to update additional detail: ${updateError.message}`);
        }
      } else {
        // Insert new detail with field_id reference
        const { error: detailError } = await supabase
          .from('people_additional_detail')
          .insert({
            people_id: personId,
            people_field_id: fieldId,
            field_value: fieldValue,
          });

        if (detailError) {
          throw new Error(`Failed to save additional detail: ${detailError.message}`);
        }
      }
    }
  },

  /**
   * Update person additional details
   * Replaces all additional details for a person using predefined field_ids
   */
  async updatePersonAdditionalDetails(
    personId: string,
    fields: Record<string, string>
  ): Promise<void> {
    // Delete existing additional details for this person
    const { error: deleteError } = await supabase
      .from('people_additional_detail')
      .delete()
      .eq('people_id', personId);

    if (deleteError) {
      throw new Error(`Failed to delete existing details: ${deleteError.message}`);
    }

    // Insert new fields
    if (Object.keys(fields).length > 0) {
      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        // Lookup field name in people_field (case-insensitive) - must already exist
        let { data: fieldData, error: fieldError } = await supabase
          .from('people_field')
          .select('id')
          .ilike('field_name', fieldName)
          .single();

        if (fieldError || !fieldData) {
          throw new Error(`Field '${fieldName}' not found in people_field table. Please add it as a predefined field first.`);
        }

        const fieldId = fieldData.id;

        // Insert into people_additional_detail with field_id reference
        const { error: detailError } = await supabase
          .from('people_additional_detail')
          .insert({
            people_id: personId,
            people_field_id: fieldId,
            field_value: fieldValue,
          });

        if (detailError) {
          throw new Error(`Failed to save additional detail: ${detailError.message}`);
        }
      }
    }
  },

  /**
   * Search people by name and optional tree
   */
  async searchPeople(
    searchTerm: string,
    treeId?: string
  ): Promise<PersonWithRelations[]> {
    let query = supabase
      .from('people')
      .select('*')
      .ilike('name', `%${searchTerm}%`);

    if (treeId) {
      query = query.eq('tree_id', treeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch relationships for all people
    const peopleWithRelations = await Promise.all(
      (data || []).map(async (person) => {
        const relations = await this.getPersonRelations(person.id);
        return {
          ...person,
          ...relations,
        };
      })
    );

    return peopleWithRelations as PersonWithRelations[];
  },

  /**
   * Get all trees
   */
  async getTrees(villageId?: string): Promise<any[]> {
    // First get all trees
    let query = supabase
      .from('tree')
      .select(`
        *,
        village(id, name)
      `)
      .eq('is_deleted', false);

    if (villageId) {
      query = query.eq('village_id', villageId);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Now fetch caste and sub_caste names if caste/sub_caste columns contain IDs
    if (data && data.length > 0) {
      // Get all unique caste and sub_caste IDs from the trees
      const casteIds = new Set<string>();
      const subCasteIds = new Set<string>();
      
      data.forEach((tree: any) => {
        if (tree.caste && tree.caste !== 'null' && tree.caste !== null) {
          casteIds.add(tree.caste);
        }
        if (tree.sub_caste && tree.sub_caste !== 'null' && tree.sub_caste !== null) {
          subCasteIds.add(tree.sub_caste);
        }
      });

      // Fetch caste names
      let casteMap: Record<string, string> = {};
      if (casteIds.size > 0) {
        const { data: castes } = await supabase
          .from('caste')
          .select('id, name')
          .in('id', Array.from(casteIds));
        
        if (castes) {
          castes.forEach((c: any) => {
            casteMap[c.id] = c.name;
          });
        }
      }

      // Fetch sub_caste names
      let subCasteMap: Record<string, string> = {};
      if (subCasteIds.size > 0) {
        const { data: subCastes } = await supabase
          .from('sub_caste')
          .select('id, name')
          .in('id', Array.from(subCasteIds));
        
        if (subCastes) {
          subCastes.forEach((s: any) => {
            subCasteMap[s.id] = s.name;
          });
        }
      }

      // Map the data to replace caste/sub_caste IDs with names
      return data.map((tree: any) => ({
        ...tree,
        caste: casteMap[tree.caste] || tree.caste,
        sub_caste: subCasteMap[tree.sub_caste] || tree.sub_caste,
      }));
    }
    
    return data || [];
  },

  /**
   * Get tree with village details
   */
  async getTreeWithDetails(treeId: string): Promise<any> {
    const { data, error } = await supabase
      .from('tree')
      .select('*, village(*)')
      .eq('id', treeId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new tree
   */
  async createTree(tree: any): Promise<any> {
    const treeData = {
      name: tree.name,
      village_id: tree.village_id || null,
      description: tree.description || null,
      caste: tree.caste || null,
      sub_caste: tree.sub_caste || null,
      // Note: created_by expects a PostgreSQL UUID from auth.users table
      // Firebase user IDs are not compatible, so we don't set it here
      created_at: new Date(),
      modified_at: new Date(),
    };

    const { data, error } = await supabase
      .from('tree')
      .insert([treeData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all villages with hierarchy
   */
  async getVillages(): Promise<any[]> {
    const { data, error } = await supabase
      .from('village')
      .select('*, district(*, state(*))');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all states
   */
  async getStates(): Promise<any[]> {
    const { data, error } = await supabase.from('state').select('*');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all districts for a state
   */
  async getDistricts(stateId?: string): Promise<any[]> {
    let query = supabase.from('district').select('*');
    if (stateId) {
      query = query.eq('state_id', stateId);
    }
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all villages for a district
   */
  async getVillagesForDistrict(districtId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('village')
      .select('*')
      .eq('district_id', districtId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all castes
   */
  async getCastes(): Promise<any[]> {
    const { data, error } = await supabase.from('caste').select('*');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get sub-castes for a caste
   */
  async getSubCastes(casteId?: string): Promise<any[]> {
    let query = supabase.from('sub_caste').select('*');
    if (casteId) {
      query = query.eq('caste_id', casteId);
    }
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Search businesses by name and optional person (owner)
   */
  async searchBusinesses(searchTerm: string, peopleId?: string): Promise<any[]> {
    let query = supabase
      .from('business')
      .select('*, people(*)')
      .ilike('name', `%${searchTerm}%`);

    if (peopleId) {
      query = query.eq('people_id', peopleId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get businesses for a person
   */
  async getBusinessesByPerson(peopleId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('business')
      .select('*')
      .eq('people_id', peopleId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a business
   */
  async createBusiness(business: any): Promise<any> {
    const businessData = {
      name: business.name,
      category: business.category || null,
      description: business.description || null,
      people_id: business.people_id || null,
      created_at: new Date(),
      modified_at: new Date(),
    };

    const { data, error } = await supabase
      .from('business')
      .insert([businessData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a business
   */
  async updateBusiness(businessId: string, updates: any): Promise<any> {
    const updateData: any = {
      modified_at: new Date(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.category) updateData.category = updates.category;
    if (updates.description) updateData.description = updates.description;
    if (updates.people_id) updateData.people_id = updates.people_id;

    const { data, error } = await supabase
      .from('business')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a business
   */
  async deleteBusiness(businessId: string): Promise<void> {
    const { error } = await supabase
      .from('business')
      .delete()
      .eq('id', businessId);

    if (error) throw error;
  },

  /**
   * Subscribe to real-time updates for people in a tree
   */
  subscribeToPeople(treeId: string, callback: (people: PersonWithRelations[]) => void) {
    return supabase
      .channel(`people:${treeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'people',
          filter: `tree_id=eq.${treeId}`,
        },
        () => {
          // Re-fetch all people for this tree
          this.getPeopleByTree(treeId).then(callback);
        }
      )
      .subscribe();
  },

  /**
   * Create state
   */
  async createState(state: { name: string }): Promise<any> {
    const { data, error } = await supabase
      .from('state')
      .insert([{ name: state.name, is_deleted: false }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  /**
   * Create district
   */
  async createDistrict(district: { name: string; state_id: string }): Promise<any> {
    const { data, error } = await supabase
      .from('district')
      .insert([{ ...district, is_deleted: false }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  /**
   * Create village
   */
  async createVillage(village: { name: string; district_id: string }): Promise<any> {
    const { data, error } = await supabase
      .from('village')
      .insert([{ ...village, is_deleted: false }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  /**
   * Create caste
   */
  async createCaste(caste: { name: string }): Promise<any> {
    const { data, error } = await supabase
      .from('caste')
      .insert([{ ...caste, is_deleted: false }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  /**
   * Create sub-caste
   */
  async createSubCaste(subCaste: { name: string; caste_id: string }): Promise<any> {
    const { data, error } = await supabase
      .from('sub_caste')
      .insert([{ ...subCaste, is_deleted: false }])
      .select();
    if (error) throw error;
    return data?.[0];
  },
};
