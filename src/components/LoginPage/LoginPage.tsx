import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LoginModal } from "../LoginModal/LoginModal";
import { useAuth } from "../hooks/useAuth";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, loading } = useAuth();
  const from = (location.state as any)?.from?.pathname || "/families";
  const [open, setOpen] = useState(true);
  const [pendingPostLogin, setPendingPostLogin] = useState(false);

  useEffect(() => {
    if (!pendingPostLogin || loading) {
      return;
    }

    if (currentUser) {
      navigate(from, { replace: true });
    }

    setPendingPostLogin(false);
  }, [
    pendingPostLogin,
    loading,
    currentUser,
    from,
    navigate,
  ]);

  const handleClose = useCallback(() => {
    setOpen(false);
    navigate("/", { replace: true });
  }, [navigate]);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    setPendingPostLogin(true);
  }, []);

  return (
    <LoginModal open={open} onClose={handleClose} onSuccess={handleSuccess} />
  );
};
