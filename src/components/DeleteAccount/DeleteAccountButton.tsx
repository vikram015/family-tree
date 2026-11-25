import React, { useState } from "react";
import {
  Alert,
  Button,
  ButtonProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const CONFIRM_WORD = "DELETE";

interface DeleteAccountButtonProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

/**
 * "Delete my account" with a type-to-confirm dialog. Deletion is permanent, so
 * the user has to type DELETE before the button arms.
 */
export const DeleteAccountButton: React.FC<DeleteAccountButtonProps> = ({
  variant = "outlined",
  size = "medium",
}) => {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setTyped("");
    setError(null);
  };

  const confirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      setOpen(false);
      navigate("/delete-account?deleted=1", { replace: true });
    } catch (e: any) {
      setError(typeof e === "string" ? e : e?.message || "Could not delete your account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        color="error"
        variant={variant}
        size={size}
        startIcon={<DeleteForeverOutlinedIcon />}
        onClick={() => setOpen(true)}
      >
        Delete my account
      </Button>

      <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            This permanently removes your account, your sign-in, your phone number
            and email, your settings and login history, your career profile and
            business listings, wishes you wrote, and photos you uploaded. It cannot
            be undone.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Family trees, including your own card in them, stay for your relatives.
            Your card is unlinked from your account.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label={`Type ${CONFIRM_WORD} to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={deleting}
            autoComplete="off"
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirm()}
            disabled={deleting || typed.trim().toUpperCase() !== CONFIRM_WORD}
          >
            {deleting ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeleteAccountButton;
