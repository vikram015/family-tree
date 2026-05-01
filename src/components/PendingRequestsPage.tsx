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
  return requestType === "branch_access_request"
    ? "Branch access request"
    : "Profile link request";
}

export const PendingRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const rows = await ApiService.getActionableLinkRequests();
      setRequests(rows || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load pending requests.");
      setRequests([]);
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
        await ApiService.reviewLinkRequest(requestId, { action });
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
      !loading && requests.length === 0 ? (
        <Paper sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            No pending requests
          </Typography>
          <Typography color="text.secondary">
            You do not have any profile link or branch access requests waiting for your review.
          </Typography>
        </Paper>
      ) : null,
    [loading, requests.length],
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
      </Stack>
    </Container>
  );
};

