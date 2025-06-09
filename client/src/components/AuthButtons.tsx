import React, { useState } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { LoginModal } from "./LoginModal";
import { Button } from "./ui/button";
import { Trans } from "@lingui/react/macro";
import { useNavigate } from "react-router-dom";
import { User2, LogOut, LogIn } from "lucide-react"; // Add icon imports

const AuthButtons: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onLogout = useAuthStore((state) => state.logout);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {isAuthenticated ? (
        <>
          <Button variant="outline" onClick={() => navigate("/profile")}>
            <User2 className="w-4 h-4 mr-2" />
            <Trans>Profile</Trans>
          </Button>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            <Trans>Logout</Trans>
          </Button>
        </>
      ) : (
        <Button onClick={() => setIsLoginModalOpen(true)}>
          <LogIn className="w-4 h-4 mr-2" />
          <Trans>Login</Trans>
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
