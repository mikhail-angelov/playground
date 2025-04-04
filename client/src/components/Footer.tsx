import React from "react";
import { GithubIcon } from "lucide-react";

interface FooterProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

const Footer: React.FC<FooterProps> = ({ left, center, right }: FooterProps) => {
  return (
    <footer className="p-1 px-4 flex items-center justify-between border-t border-gray-700">
      {left || <p>© ѣ 2025</p>}
      {center || <p>powered by <a href="https://js2go.ru" target="_blank">js2go.ru</a></p>}
      {right || (
        <a href="https://github.com/mikhail-angelov/playground" target="_blank">
          <GithubIcon className="text-gray-100" />
        </a>
      )}
    </footer>
  );
};

export default Footer;
