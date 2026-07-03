import { createAsyncThunk } from "@reduxjs/toolkit";
import { backendApi } from "../../services/backendApi";

export const fetchAdminUsers = createAsyncThunk(
  "api/fetchAdminUsers",
  async (_, { rejectWithValue }) => {
    try {
      return await backendApi.get<any[]>("/api/admin/users");
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to fetch users");
    }
  },
);

export const updateAdminUser = createAsyncThunk(
  "api/updateAdminUser",
  async (
    payload: {
      userId: string;
      role: string;
      villages: string[];
      modifiedBy?: string | null;
    },
    { rejectWithValue },
  ) => {
    try {
      return await backendApi.patch<any>(`/api/admin/users/${payload.userId}`, {
        role: payload.role,
        villages: payload.villages,
        modifiedBy: payload.modifiedBy || null,
      });
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to update user");
    }
  },
);

export const deleteAdminUser = createAsyncThunk(
  "api/deleteAdminUser",
  async (userId: string, { rejectWithValue }) => {
    try {
      await backendApi.delete<null>(`/api/admin/users/${userId}`);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to delete user");
    }
  },
);

export const verifyAdminUser = createAsyncThunk(
  "api/verifyAdminUser",
  async (
    payload: { userId: string; reviewerId?: string | null },
    { rejectWithValue },
  ) => {
    try {
      return await backendApi.post<{ success: boolean; message?: string }>(
        `/api/admin/users/${payload.userId}/verify`,
        {
          reviewerId: payload.reviewerId || null,
        },
      );
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to verify user");
    }
  },
);

export const blockAdminUser = createAsyncThunk(
  "api/blockAdminUser",
  async (
    payload: { userId: string; reason?: string | null },
    { rejectWithValue },
  ) => {
    try {
      return await backendApi.post<any>(
        `/api/admin/users/${payload.userId}/block`,
        { reason: payload.reason || null },
      );
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to block user");
    }
  },
);

export const unblockAdminUser = createAsyncThunk(
  "api/unblockAdminUser",
  async (userId: string, { rejectWithValue }) => {
    try {
      return await backendApi.post<any>(`/api/admin/users/${userId}/unblock`, {});
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to unblock user");
    }
  },
);

export const fetchPendingVillageAccessRequests = createAsyncThunk(
  "api/fetchPendingVillageAccessRequests",
  async (userId: string, { rejectWithValue }) => {
    try {
      return await backendApi.get<any[]>("/api/village-access/pending", { userId });
    } catch (error: any) {
      return rejectWithValue(
        error?.message || "Failed to fetch pending village access requests",
      );
    }
  },
);

export const reviewVillageAccessRequest = createAsyncThunk(
  "api/reviewVillageAccessRequest",
  async (
    payload: {
      userId: string;
      requestId: string;
      action: "approved" | "rejected";
      reviewNote?: string | null;
    },
    { rejectWithValue },
  ) => {
    try {
      return await backendApi.post<{ success: boolean; message?: string; error?: string }>(
        "/api/village-access/review",
        {
          userId: payload.userId,
          requestId: payload.requestId,
          action: payload.action,
          reviewNote: payload.reviewNote || null,
        },
      );
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to review request");
    }
  },
);

export const fetchMyVillageAccessRequests = createAsyncThunk(
  "api/fetchMyVillageAccessRequests",
  async (userId: string, { rejectWithValue }) => {
    try {
      return await backendApi.get<any[]>("/api/village-access/my-requests", { userId });
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to fetch your requests");
    }
  },
);

export const submitVillageAccessRequest = createAsyncThunk(
  "api/submitVillageAccessRequest",
  async (
    payload: {
      userId: string;
      villageId: string;
      requestMessage?: string | null;
    },
    { rejectWithValue },
  ) => {
    try {
      return await backendApi.post<{ success: boolean; message?: string; error?: string }>(
        "/api/village-access/submit",
        {
          userId: payload.userId,
          villageId: payload.villageId,
          requestMessage: payload.requestMessage || null,
        },
      );
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to submit request");
    }
  },
);

export const fetchVillageHeritage = createAsyncThunk(
  "api/fetchVillageHeritage",
  async (villageId: string, { rejectWithValue }) => {
    try {
      return await backendApi.get<any>(`/api/heritage/${villageId}`);
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to fetch heritage");
    }
  },
);
