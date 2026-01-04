"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import catImage from "@/../public/cat.png";

const HomeButton: React.FC = () => {
  const pathname = usePathname();
  
  // If current location is /top, link to /, otherwise link to /top
  const href = pathname === "/top" ? "/" : "/top";

  return (
    <Link href={href} passHref>
      <h1 className="text-2xl font-bold tracking-tight">JS2Go</h1>
      {/* <Image src={catImage} alt="Home" className="max-w-10 h-auto" /> */}
    </Link>
  );
};

export default HomeButton;
