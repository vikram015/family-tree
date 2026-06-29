import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LoginModal } from "../LoginModal/LoginModal";
import { useAuth } from "../hooks/useAuth";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, loading } = useAuth();
  const from = (location.state as any)?.from?.pathname || "/families";
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (loading || !currentUser) {
      return;
    }

    let active = true;

    if (from === "/families") {
      resolveDefaultFamilyTreePath().then((targetPath) => {
        if (active) {
          navigate(targetPath, { replace: true });
        }
      });
    } else {
      if (active) {
        navigate(from, { replace: true });
      }
    }

    return () => {
      active = false;
    };
  }, [
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
  }, []);

  return (
    <LoginModal open={open} onClose={handleClose} onSuccess={handleSuccess} />
  );
};
