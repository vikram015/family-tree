import { useCallback, useEffect, useState } from "react";
import { ApiService } from "../../../services/apiService";
import type { LinkRequest } from "../../../services/apiService";

interface UseLinkRequestsParams {
  treeId: string;
  currentUser: { uid?: string } | null | undefined;
}

/**
 * Loads and reviews profile/branch/spouse link requests for the active tree.
 *
 * Owns two sets of requests:
 * - `pendingLinkRequests` — requests awaiting the current user's review for this tree.
 * - `myPendingRequests` — the current user's own outstanding requests (across trees).
 *
 * `setMyPendingRequests` is exposed so the "request edit access" flow can refresh the
 * list immediately after creating a request.
 */
export function useLinkRequests({ treeId, currentUser }: UseLinkRequestsParams) {
  const [pendingLinkRequests, setPendingLinkRequests] = useState<LinkRequest[]>([]);
  const [myPendingRequests, setMyPendingRequests] = useState<LinkRequest[]>([]);
  const [linkRequestsLoading, setLinkRequestsLoading] = useState(false);
  const [reviewingLinkRequestId, setReviewingLinkRequestId] = useState<string | null>(
    null,
  );
  const [linkRequestReviewError, setLinkRequestReviewError] = useState("");
  const [linkRequestReviewSuccess, setLinkRequestReviewSuccess] = useState("");

  const loadPendingLinkRequests = useCallback(async () => {
    if (!currentUser || !treeId) {
      setPendingLinkRequests([]);
      return;
    }

    try {
      setLinkRequestsLoading(true);
      setLinkRequestReviewError("");
      const rows = await ApiService.getPendingTreeLinkRequests(treeId);
      setPendingLinkRequests(
        (rows || []).filter((request) => request.requesterUserId !== currentUser?.uid),
      );
    } catch (error: any) {
      console.error("Failed to load pending link requests:", error);
      setPendingLinkRequests([]);
      if (
        error?.message &&
        String(error.message).toLowerCase().includes("permission denied")
      ) {
        setLinkRequestReviewError("");
      } else {
        setLinkRequestReviewError(
          error?.message || "Failed to load pending profile link requests.",
        );
      }
    } finally {
      setLinkRequestsLoading(false);
    }
  }, [currentUser, treeId]);

  useEffect(() => {
    void loadPendingLinkRequests();
  }, [loadPendingLinkRequests]);

  useEffect(() => {
    let active = true;

    if (!currentUser) {
      setMyPendingRequests([]);
      return () => {
        active = false;
      };
    }

    ApiService.getMyLinkRequests()
      .then((rows) => {
        if (!active) return;
        setMyPendingRequests(
          (rows || []).filter((request) => request.status === "pending"),
        );
      })
      .catch((error) => {
        if (!active) return;
        console.warn("Failed to load my pending link requests:", error);
        setMyPendingRequests([]);
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  const handleReviewLinkRequest = useCallback(
    async (
      requestId: string,
      action: "approved" | "rejected",
      reviewNote?: string | null,
    ) => {
      setLinkRequestReviewError("");
      setLinkRequestReviewSuccess("");
      setReviewingLinkRequestId(requestId);

      try {
        await ApiService.reviewLinkRequest(requestId, {
          action,
          reviewNote: reviewNote ?? null,
        });
        setLinkRequestReviewSuccess(
          `Link request ${action === "approved" ? "approved" : "rejected"} successfully.`,
        );
        await loadPendingLinkRequests();
        window.dispatchEvent(new Event("link-requests-updated"));
      } catch (error: any) {
        console.error("Failed to review link request:", error);
        setLinkRequestReviewError(
          error?.message || "Failed to review profile link request.",
        );
      } finally {
        setReviewingLinkRequestId(null);
      }
    },
    [loadPendingLinkRequests],
  );

  return {
    pendingLinkRequests,
    myPendingRequests,
    setMyPendingRequests,
    linkRequestsLoading,
    reviewingLinkRequestId,
    linkRequestReviewError,
    linkRequestReviewSuccess,
    loadPendingLinkRequests,
    handleReviewLinkRequest,
  };
}
