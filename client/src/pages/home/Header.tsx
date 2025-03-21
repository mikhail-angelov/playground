import React from "react";
import NewProjectButton from "../../components/NewProjectButton";
import HomeButton from "../../components/HomeButton";
import AuthButtons from "../../components/AuthButtons";

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between p-4">
      <HomeButton />
      <h1 className="text-2xl font-bold">CotPen</h1>
      <div className="flex items-center space-x-4">
        <NewProjectButton />
        <AuthButtons />
      </div>
    </header>
  );
};

export default Header;
