import React, { createContext, useContext, useState, useCallback } from "react";
import { LoginModal } from "../LoginModal/LoginModal";

interface LoginModalContextType {
  openLoginModal: (onSuccess?: () => void) => void;
  closeLoginModal: () => void;
}

const LoginModalContext = createContext<LoginModalContextType>({
  openLoginModal: () => {},
  closeLoginModal: () => {},
});

export const useLoginModal = () => useContext(LoginModalContext);

export const LoginModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<
    (() => void) | undefined
  >();

  const openLoginModal = useCallback((onSuccess?: () => void) => {
    setIsOpen(true);
    setOnSuccessCallback(() => onSuccess);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsOpen(false);
    setOnSuccessCallback(undefined);
  }, []);

  const handleSuccess = useCallback(() => {
    if (onSuccessCallback) {
      onSuccessCallback();
    }
  }, [onSuccessCallback]);

  return (
    <LoginModalContext.Provider value={{ openLoginModal, closeLoginModal }}>
      {children}
      <LoginModal
        open={isOpen}
        onClose={closeLoginModal}
        onSuccess={handleSuccess}
      />
    </LoginModalContext.Provider>
  );
};
