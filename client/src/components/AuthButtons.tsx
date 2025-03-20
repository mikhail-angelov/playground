import React, { useState } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import LoginModal from "./LoginModal";

const AuthButtons: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onLogout = useAuthStore((state) => state.logout);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <>
      {!isAuthenticated ? (
        <button
          className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
          onClick={() => setIsLoginModalOpen(true)}
        >
          Login
        </button>
      ) : (
        <button
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
          onClick={onLogout}
        >
          Logout
        </button>
      )}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
};

export default AuthButtons;
