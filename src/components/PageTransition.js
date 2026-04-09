"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const ORDER = ["/dashboard", "/offres", "/analyse", "/lettre"];

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [style, setStyle] = useState({ opacity: 1, transform: "translateX(0)" });

  useEffect(() => {
    if (prevPathname.current === pathname) return;

    const prevIndex = ORDER.indexOf(prevPathname.current);
    const nextIndex = ORDER.indexOf(pathname);
    const direction = nextIndex > prevIndex ? 1 : -1;

    setStyle({ opacity: 0, transform: `translateX(${direction * 40}px)`, transition: "none" });

    const t = setTimeout(() => {
      setStyle({
        opacity: 1,
        transform: "translateX(0)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      });
    }, 30);

    prevPathname.current = pathname;
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div style={style}>
      {children}
    </div>
  );
}