import React from "react";
import NewProjectButton from "../../components/NewProjectButton";

const Header: React.FC = () => {

  return (
    <header className="flex items-center justify-between p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Playground</h1>
      <NewProjectButton />
    </header>
  );
};

export default Header;