import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SupabaseService } from '../../services/supabaseService';
import { FNode } from '../../components/model/FNode';

interface Profession {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface PersonWithProfessions {
  person: FNode;
  professions: Profession[];
}

interface ProfessionState {
  professions: Profession[];
  peopleWithProfessions: PersonWithProfessions[];
  professionsWithCount: any[];
  loading: boolean;
  error: string | null;
}

const initialState: ProfessionState = {
  professions: [],
  peopleWithProfessions: [],
  professionsWithCount: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchProfessionsData = createAsyncThunk(
  'profession/fetchData',
  async (villageId: string, { rejectWithValue }) => {
    try {
      // Fetch all professions for the select dropdown
      const allProfessions = await SupabaseService.getAllProfessions();

      // Fetch professions with people and hierarchy for the village
      const profsWithPeopleData = await SupabaseService.getProfessionsByVillage(villageId);

      // Extract all people from the professions data
      const uniquePeople = new Map<string, FNode>();
      profsWithPeopleData.forEach((prof: any) => {
        prof.people?.forEach((person: any) => {
          if (!uniquePeople.has(person.person_id)) {
            uniquePeople.set(person.person_id, {
              id: person.person_id,
              name: person.person_name,
              gender: person.gender,
              dob: person.person_dob || '',
              treeId: person.tree_id,
              parents: [] as any,
              children: [] as any,
              siblings: [] as any,
              spouses: [] as any,
              top: 0,
              left: 0,
              hasSubTree: false,
            } as unknown as FNode);
          }
        });
      });

      // Transform professions data to peopleWithProfessions format
      const peopleProfsMap = new Map<string, PersonWithProfessions>();
      profsWithPeopleData.forEach((prof: any) => {
        prof.people?.forEach((person: any) => {
          const personKey = person.person_id;
          if (!peopleProfsMap.has(personKey)) {
            peopleProfsMap.set(personKey, {
              person: {
                id: person.person_id,
                name: person.person_name,
                gender: person.gender,
                dob: person.person_dob || '',
                treeId: person.tree_id,
                parents: [] as any,
                children: [] as any,
                siblings: [] as any,
                spouses: [] as any,
                top: 0,
                left: 0,
                hasSubTree: false,
              } as unknown as FNode,
              professions: [],
            });
          }
          peopleProfsMap.get(personKey)!.professions.push({
            id: prof.profession_id,
            name: prof.profession_name,
            description: prof.profession_description,
            category: prof.profession_category,
          });
        });
      });

      return {
        professions: allProfessions,
        peopleWithProfessions: Array.from(peopleProfsMap.values()),
        professionsWithCount: profsWithPeopleData,
      };
    } catch (error: any) {
      console.error('Redux: Error fetching professions data:', error);
      return rejectWithValue(error.message);
    }
  }
);

const professionSlice = createSlice({
  name: 'profession',
  initialState,
  reducers: {
    clearProfessions: (state) => {
      state.professions = [];
      state.peopleWithProfessions = [];
      state.professionsWithCount = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfessionsData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfessionsData.fulfilled, (state, action) => {
        state.professions = action.payload.professions as any;
        state.peopleWithProfessions = action.payload.peopleWithProfessions as any;
        state.professionsWithCount = action.payload.professionsWithCount as any;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchProfessionsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProfessions, clearError } = professionSlice.actions;

// Selectors
export const selectProfessions = (state: any) => state.profession.professions;
export const selectPeopleWithProfessions = (state: any) => state.profession.peopleWithProfessions;
export const selectProfessionsWithCount = (state: any) => state.profession.professionsWithCount;
export const selectProfessionLoading = (state: any) => state.profession.loading;
export const selectProfessionError = (state: any) => state.profession.error;

export default professionSlice.reducer;
