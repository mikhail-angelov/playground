import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useAuthStore } from "../stores/useAuthStore";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [loginStatus, setLoginStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    const result = await login(email);
    if (result === "success") {
      setLoginStatus("success");
    } else {
      setErrorMessage("Failed to send login email.");
      setLoginStatus("error");
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        {loginStatus === "idle" && (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mb-4 border rounded"
            />
            <button
              onClick={handleLogin}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Send
            </button>
          </>
        )}
        {loginStatus === "success" && (
          <p className="text-green-600">Check your email for the login link!</p>
        )}
        {loginStatus === "error" && (
          <p className="text-red-600">{errorMessage}</p>
        )}
        <button
          onClick={() => {
            onClose();
            setLoginStatus("idle");
            setEmail("");
            setErrorMessage("");
          }}
          className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>,
    document.getElementById("modal-root") as HTMLElement
  );
};

export default LoginModal;