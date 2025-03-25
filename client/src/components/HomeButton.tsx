import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import catImage from "../assets/cat.png";
import { Trans } from "@lingui/react/macro";

const HomeButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <HoverCard>
      <HoverCardTrigger>
        <Button variant="outline" onClick={() => navigate("/")}>
          <img src={catImage} alt="Home" className="w-10 h-6" />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64">
        <div className="flex items-center space-x-4">
          <img src={catImage} alt="Home Icon" className="w-16 h-10" />
          <div>
            <h4 className="text-sm font-medium"><Trans>CotPen</Trans></h4>
            <p className="text-sm text-gray-500">
            <Trans>This is online project editor made by impression of https://codepen.io</Trans>
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default HomeButton;
