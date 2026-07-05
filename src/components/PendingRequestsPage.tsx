import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ApiService, LinkRequest } from "../services/apiService";

function formatRequestType(requestType: LinkRequest["requestType"]) {
  if (requestType === "branch_access_request") return "Branch access request";
  if (requestType === "spouse_link_request") return "Spouse link request";
  return "Profile link request";
}

/**
 * Display title that also distinguishes a plain spouse link ("Link Spouse")
 * from one that replaces a placeholder ("Link & Replace").
 */
function formatRequestTitle(request: LinkRequest) {
  if (request.requestType === "spouse_link_request") {
    return request.payload?.replacePersonName
      ? "Link & Replace request"
      : "Link Spouse request";
  }
  if (request.requestType === "user_to_tree_node") {
    return "Link Profile request";
  }
  return formatRequestType(request.requestType);
}

export const PendingRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [myRequests, setMyRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  // Confirmation modal shown before an approve/reject actually runs.
  const [reviewTarget, setReviewTarget] = useState<{
    request: LinkRequest;
    action: "approved" | "rejected";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [rows, mine] = await Promise.all([
        ApiService.getActionableLinkRequests(),
        ApiService.getMyLinkRequests(),
      ]);
      setRequests(rows || []);
      setMyRequests(mine || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load pending requests.");
      setRequests([]);
      setMyRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const openReview = useCallback(
    (request: LinkRequest, action: "approved" | "rejected") => {
      setRejectReason("");
      setReviewTarget({ request, action });
    },
    [],
  );

  const confirmReview = useCallback(async () => {
    if (!reviewTarget) return;
    const { request, action } = reviewTarget;
    const reviewNote = action === "rejected" ? rejectReason.trim() : null;
    if (action === "rejected" && !reviewNote) return; // required, enforced by disabled button
    try {
      setReviewingRequestId(request.id);
      setError("");
      setSuccess("");
      await ApiService.reviewLinkRequest(request.id, { action, reviewNote });
      setSuccess(
        `${action === "approved" ? "Approved" : "Rejected"} request successfully.`,
      );
      setReviewTarget(null);
      await loadRequests();
      window.dispatchEvent(new Event("link-requests-updated"));
    } catch (err: any) {
      setError(err?.message || "Failed to review request.");
    } finally {
      setReviewingRequestId(null);
    }
  }, [reviewTarget, rejectReason, loadRequests]);

  const emptyState = useMemo(
    () =>
      !loading && requests.length === 0 && myRequests.length === 0 ? (
        <Paper sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            No pending requests
          </Typography>
          <Typography color="text.secondary">
            You do not have any requests waiting for your review or submitted by you.
          </Typography>
        </Paper>
      ) : null,
    [loading, myRequests.length, requests.length],
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Pending Requests
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Review requests that need your approval.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {loading && (
          <Paper sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
            <CircularProgress />
          </Paper>
        )}

        {emptyState}

        {!loading &&
          requests.map((request) => (
            <Paper key={request.id} sx={{ p: 2.5, borderRadius: 4 }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {formatRequestTitle(request)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Requested by {request.requesterName || request.requesterEmail || "Unknown user"}
                  </Typography>
                </Box>

                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Tree:</strong> {request.targetTreeName || "Unknown tree"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Person:</strong> {request.targetPersonName || "Unknown person"}
                  </Typography>
                  {request.requestType === "spouse_link_request" && (
                    <Typography variant="body2">
                      <strong>Source:</strong>{" "}
                      {request.payload?.sourcePersonName || "Selected spouse"} in{" "}
                      {request.payload?.sourceTreeName || "source tree"}
                    </Typography>
                  )}
                    <Typography variant="body2">
                    <strong>Phone:</strong> {request.requesterPhone || "Unknown phone"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Requested:</strong> {new Date(request.createdAt).toLocaleString()}
                  </Typography>
                  {request.requestMessage && (
                    <Typography variant="body2">
                      <strong>Message:</strong> {request.requestMessage}
                    </Typography>
                  )}
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      navigate(
                        `/families?tree=${encodeURIComponent(
                          request.targetTreeId || "",
                        )}&personId=${encodeURIComponent(request.targetPersonId || "")}`,
                      )
                    }
                  >
                    Open Tree
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={reviewingRequestId === request.id}
                    onClick={() => openReview(request, "approved")}
                  >
                    {reviewingRequestId === request.id ? "Saving..." : "Approve"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={reviewingRequestId === request.id}
                    onClick={() => openReview(request, "rejected")}
                  >
                    {reviewingRequestId === request.id ? "Saving..." : "Reject"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}

        {!loading && myRequests.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 2, mb: 1.5 }}>
              My Requests
            </Typography>
            <Stack spacing={1.5}>
              {myRequests.map((request) => (
                <Paper key={request.id} sx={{ p: 2.5, borderRadius: 4 }}>
                  <Stack spacing={0.75}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {formatRequestTitle(request)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {request.targetPersonName || request.payload?.targetPersonName || "Selected person"} in{" "}
                      {request.targetTreeName || request.payload?.targetTreeName || "selected tree"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {request.status}
                    </Typography>
                    {request.status === "rejected" && request.reviewNote && (
                      <Alert severity="error">
                        <strong>Rejection reason:</strong> {request.reviewNote}
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>

      <Dialog
        open={!!reviewTarget}
        onClose={() => !reviewingRequestId && setReviewTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        {reviewTarget && (
          <>
            <DialogTitle>
              {reviewTarget.action === "approved" ? "Approve" : "Reject"}{" "}
              {formatRequestTitle(reviewTarget.request)}?
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.25}>
                <Typography variant="body2">
                  <strong>Requested by:</strong>{" "}
                  {reviewTarget.request.requesterName ||
                    reviewTarget.request.requesterEmail ||
                    "Unknown user"}
                  {reviewTarget.request.requesterPhone
                    ? ` · ${reviewTarget.request.requesterPhone}`
                    : ""}
                  {` · ${new Date(reviewTarget.request.createdAt).toLocaleString()}`}
                </Typography>
                {reviewTarget.request.requestMessage && (
                  <Typography variant="body2" color="text.secondary">
                    “{reviewTarget.request.requestMessage}”
                  </Typography>
                )}

                <Divider />

                {reviewTarget.request.requestType === "spouse_link_request" ? (
                  reviewTarget.request.payload?.replacePersonName ? (
                    /* --- Link & Replace: a placeholder spouse is replaced --- */
                    <>
                      <Typography variant="body2">
                        <strong>Will be linked:</strong>{" "}
                        {reviewTarget.request.targetPersonName ||
                          reviewTarget.request.payload?.targetPersonName ||
                          "the selected person"}{" "}
                        as spouse of{" "}
                        {reviewTarget.request.payload?.sourcePersonName || "the requester's person"}
                        {reviewTarget.request.payload?.sourceTreeName
                          ? ` (${reviewTarget.request.payload.sourceTreeName})`
                          : ""}
                        .
                      </Typography>
                      <Typography variant="body2">
                        <strong>Will be removed:</strong> placeholder{" "}
                        {reviewTarget.request.payload.replacePersonName} (its children move to{" "}
                        {reviewTarget.request.targetPersonName ||
                          reviewTarget.request.payload?.targetPersonName ||
                          "the linked person"}
                        ).
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        The couple’s shared children (and their father’s-line
                        descendants) will be moved into{" "}
                        {reviewTarget.request.payload?.sourceTreeName || "the requester’s tree"}.
                        Children from any other marriage stay where they are.
                      </Typography>
                      {reviewTarget.request.payload?.mergeSpouseId && (
                        <Alert severity="warning">
                          <strong>
                            {reviewTarget.request.payload?.mergeSpouseName || "The existing spouse"}
                          </strong>
                          {reviewTarget.request.payload?.mergeSpouseTreeName
                            ? ` (in ${reviewTarget.request.payload.mergeSpouseTreeName})`
                            : ""}{" "}
                          will be <strong>merged</strong> into{" "}
                          {reviewTarget.request.payload?.sourcePersonName || "the requester's person"}{" "}
                          and removed — their children and parents move over, and any other marriages
                          they have are removed. This can’t be undone.
                        </Alert>
                      )}
                    </>
                  ) : (
                    /* --- Link Spouse: link a real person as spouse, no placeholder replaced --- */
                    <>
                      <Typography variant="body2">
                        <strong>Will be linked:</strong>{" "}
                        {reviewTarget.request.targetPersonName ||
                          reviewTarget.request.payload?.targetPersonName ||
                          "the selected person"}{" "}
                        as spouse of{" "}
                        {reviewTarget.request.payload?.sourcePersonName || "the requester's person"}
                        {reviewTarget.request.payload?.sourceTreeName
                          ? ` (${reviewTarget.request.payload.sourceTreeName})`
                          : ""}
                        .
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        No placeholder is removed — this simply adds the link between the two
                        people. The couple’s shared children (and their father’s-line descendants)
                        will be moved into{" "}
                        {reviewTarget.request.payload?.sourceTreeName || "the requester’s tree"}.
                        Children from any other marriage stay where they are.
                      </Typography>
                      {reviewTarget.request.payload?.mergeSpouseId && (
                        <Alert severity="warning">
                          <strong>
                            {reviewTarget.request.payload?.mergeSpouseName || "The existing spouse"}
                          </strong>
                          {reviewTarget.request.payload?.mergeSpouseTreeName
                            ? ` (in ${reviewTarget.request.payload.mergeSpouseTreeName})`
                            : ""}{" "}
                          will be <strong>merged</strong> into{" "}
                          {reviewTarget.request.payload?.sourcePersonName || "the requester's person"}{" "}
                          and removed — their children and parents move over, and any other marriages
                          they have are removed. This can’t be undone.
                        </Alert>
                      )}
                    </>
                  )
                ) : reviewTarget.request.requestType === "user_to_tree_node" ? (
                  /* --- Link Profile: a user claims a person node as their profile --- */
                  <>
                    <Typography variant="body2">
                      <strong>Will be linked:</strong>{" "}
                      {reviewTarget.request.requesterName ||
                        reviewTarget.request.requesterEmail ||
                        "The requester"}
                      ’s account to{" "}
                      {reviewTarget.request.targetPersonName || "the selected person"} in{" "}
                      {reviewTarget.request.targetTreeName || "the tree"}.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Approving lets them manage this profile as their own — no tree
                      structure or relationships change.
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2">
                    {reviewTarget.action === "approved" ? "Approve" : "Reject"} this{" "}
                    {formatRequestType(reviewTarget.request.requestType).toLowerCase()} for{" "}
                    {reviewTarget.request.targetPersonName || "the selected person"} in{" "}
                    {reviewTarget.request.targetTreeName || "the tree"}?
                  </Typography>
                )}

                {reviewTarget.action === "rejected" && (
                  <TextField
                    label="Reason for rejection"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    required
                    sx={{ mt: 1 }}
                  />
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setReviewTarget(null)}
                disabled={!!reviewingRequestId}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color={reviewTarget.action === "approved" ? "success" : "error"}
                disabled={
                  !!reviewingRequestId ||
                  (reviewTarget.action === "rejected" && !rejectReason.trim())
                }
                onClick={() => void confirmReview()}
              >
                {reviewingRequestId
                  ? "Saving..."
                  : reviewTarget.action === "approved"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};
