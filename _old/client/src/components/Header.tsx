import React from "react";
import HomeButton from "./HomeButton";

interface HeaderProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ left, center, right }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-700">
      {left || <HomeButton />}
      {center}
      {right}
    </header>
  );
};

export default Header;
