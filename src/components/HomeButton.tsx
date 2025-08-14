import React from "react";
import Image from "next/image";
import Link from "next/link";
import catImage from "@/../public/cat.png";

const HomeButton: React.FC = () => {
  return (
    <Link href="/" passHref legacyBehavior>
      <Image src={catImage} alt="Home" className="w-10 h-6" />
    </Link>
  );
};

export default HomeButton;
