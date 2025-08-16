import React from "react";
import Image from "next/image";
import Link from "next/link";
import catImage from "@/../public/cat.png";

const HomeButton: React.FC = () => {
  return (
    <Link href="/top" passHref>
      <Image src={catImage} alt="Home" className="max-w-10 h-auto" />
    </Link>
  );
};

export default HomeButton;
