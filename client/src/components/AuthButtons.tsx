import React, { useState } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import {LoginModal} from "./LoginModal";
import { Button } from "./ui/button";
import { Trans } from "@lingui/react/macro";

const AuthButtons: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onLogout = useAuthStore((state) => state.logout);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <>
      {!isAuthenticated ? (
        <Button onClick={() => setIsLoginModalOpen(true)}><Trans>Login</Trans></Button>
      ) : (
        <Button variant="outline" onClick={onLogout}>
          <Trans>Logout</Trans>
        </Button>
      )}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
};

export default AuthButtons;
