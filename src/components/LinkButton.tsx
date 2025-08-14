import React, { ReactNode } from "react";
import Link from "next/link";

interface Props {
  href: string;
  children: ReactNode;
}

const LinkButton: React.FC<Props> = ({ href, children }) => {
  return (
    <Link
      href={href}
      passHref
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
      legacyBehavior>
      {children}
    </Link>
  );
};

export default LinkButton;
