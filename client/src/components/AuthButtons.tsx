import React, { useState } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import {LoginModal} from "./LoginModal";
import { Button } from "./ui/button";

const AuthButtons: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onLogout = useAuthStore((state) => state.logout);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <>
      {!isAuthenticated ? (
        <Button onClick={() => setIsLoginModalOpen(true)}>Login</Button>
      ) : (
        <Button variant="outline" onClick={onLogout}>
          Logout
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
