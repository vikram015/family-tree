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
  const [pendingPostLogin, setPendingPostLogin] = useState(false);

  useEffect(() => {
    if (!pendingPostLogin || loading) {
      return;
    }

    let active = true;

    if (currentUser) {
      if (from === "/families") {
        resolveDefaultFamilyTreePath().then((targetPath) => {
          if (active) {
            navigate(targetPath, { replace: true });
          }
        });
      } else {
        navigate(from, { replace: true });
      }
    }

    setPendingPostLogin(false);

    return () => {
      active = false;
    };
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
