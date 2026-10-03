import React, { createContext, useContext, useState, useCallback } from "react";
import { LoginModal } from "../LoginModal/LoginModal";

/** Optional context for one opening — e.g. an invite link that knows its number. */
export interface LoginModalOptions {
  /** Ten-digit local number to start the phone field with. */
  phone?: string | null;
  /** One line shown under the title in place of the generic welcome. */
  intro?: string | null;
}

interface LoginModalContextType {
  openLoginModal: (onSuccess?: () => void, options?: LoginModalOptions) => void;
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

  const [options, setOptions] = useState<LoginModalOptions | undefined>();

  const openLoginModal = useCallback((onSuccess?: () => void, nextOptions?: LoginModalOptions) => {
    setOptions(nextOptions);
    setIsOpen(true);
    setOnSuccessCallback(() => onSuccess);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsOpen(false);
    setOnSuccessCallback(undefined);
    setOptions(undefined);
  }, []);

  const handleSuccess = useCallback(() => {
    // Login succeeded — close the modal (otherwise it resets to the phone step
    // and re-prompts for the mobile number) before running the caller's action.
    setIsOpen(false);
    if (onSuccessCallback) {
      onSuccessCallback();
    }
    setOnSuccessCallback(undefined);
  }, [onSuccessCallback]);

  return (
    <LoginModalContext.Provider value={{ openLoginModal, closeLoginModal }}>
      {children}
      <LoginModal
        open={isOpen}
        onClose={closeLoginModal}
        onSuccess={handleSuccess}
        initialPhone={options?.phone || undefined}
        intro={options?.intro || undefined}
      />
    </LoginModalContext.Provider>
  );
};
