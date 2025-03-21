import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import catImage from "../assets/cat.png"; 

const HomeButton: React.FC = () => {
  const navigate = useNavigate();

  return <Button variant="outline" onClick={() => navigate("/")}>
    <img src={catImage} alt="Home" className="w-10 h-6" />
  </Button>;
};

export default HomeButton;
