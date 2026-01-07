import React, { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LoginModal } from "../LoginModal/LoginModal";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/families";

  const handleClose = useCallback(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  const handleSuccess = useCallback(() => {
    navigate(from, { replace: true });
  }, [from, navigate]);

  return <LoginModal open onClose={handleClose} onSuccess={handleSuccess} />;
};
