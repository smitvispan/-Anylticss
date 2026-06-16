'use client'
import Image from 'next/image';
import { useTheme } from "next-themes";

const Logo = ({ title }: { title?: string }) => {
    const { theme: mode } = useTheme();
  return (
    <div className="flex items-center space-x-3">
      <Image
        src={
          mode === "light"
            ? "/images/logo/logo.svg"
            : "/images/logo/AI.png"
        }
        alt="Vispan Solutions"
        width={50}
        height={50}
        className="max-w-[50px] max-h-[50px]"
      />
      <h1 className="text-2xl font-bold text-blue-600">{title || "Vispan Solutions"}</h1>
    </div>
  );
}

export default Logo;