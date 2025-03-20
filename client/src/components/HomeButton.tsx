import React from "react";
import { useNavigate } from "react-router-dom";

const HomeButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
    className="px-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-4xl"
    onClick={() => navigate("/")}
  >
    🃟
  </button>
  );
};

export default HomeButton;
