import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ApiService, LinkRequest } from "../services/apiService";

function formatRequestType(requestType: LinkRequest["requestType"]) {
  if (requestType === "branch_access_request") return "Branch access request";
  if (requestType === "spouse_link_request") return "Spouse link request";
  return "Profile link request";
}

export const PendingRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [myRequests, setMyRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);

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

  const handleReview = useCallback(
    async (requestId: string, action: "approved" | "rejected") => {
      try {
        setReviewingRequestId(requestId);
        setError("");
        setSuccess("");
        const reviewNote =
          action === "rejected"
            ? window.prompt("Reason for rejecting this request")?.trim()
            : null;
        if (action === "rejected" && !reviewNote) {
          setReviewingRequestId(null);
          return;
        }
        await ApiService.reviewLinkRequest(requestId, { action, reviewNote });
        setSuccess(
          `${action === "approved" ? "Approved" : "Rejected"} request successfully.`,
        );
        await loadRequests();
        window.dispatchEvent(new Event("link-requests-updated"));
      } catch (err: any) {
        setError(err?.message || "Failed to review request.");
      } finally {
        setReviewingRequestId(null);
      }
    },
    [loadRequests],
  );

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
                    {formatRequestType(request.requestType)}
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
                    onClick={() => void handleReview(request.id, "approved")}
                  >
                    {reviewingRequestId === request.id ? "Saving..." : "Approve"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={reviewingRequestId === request.id}
                    onClick={() => void handleReview(request.id, "rejected")}
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
                      {formatRequestType(request.requestType)}
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
    </Container>
  );
};
