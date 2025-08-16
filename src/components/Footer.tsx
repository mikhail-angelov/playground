import React from "react";
import { GithubIcon } from "lucide-react";

interface FooterProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

const Footer: React.FC<FooterProps> = ({
  left,
  center,
  right,
}: FooterProps) => {
  return (
    <footer className="w-full px-8 py-6 border-t border-zinc-800 bg-[#23272a] flex flex-col sm:flex-row items-center justify-between text-zinc-400 text-sm">
      {left || (
        <span>
          Inspired by{" "}
          <a
            href="https://codepen.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            CodePen
          </a>
          . Reimagined for modern creators.
        </span>
      )}
      {center}
      {right || (
        <span className="flex">
          <span>&copy; {new Date().getFullYear()} ѣ.</span>
          <a
            href="https://github.com/mikhail-angelov/playground"
            target="_blank"
            className="px-2"
          >
            <GithubIcon className="w-4 h-5" name="github" />
          </a>
        </span>
      )}
    </footer>
  );
};

export default Footer;
