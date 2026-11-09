"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitch() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();

  if (pathname.startsWith("/g/")) return null;
  return (
    <div
      aria-label="Language"
      role="group"
      style={{
        position: "fixed",
        zIndex: 1500,
        right: "18px",
        bottom: "18px",
        display: "flex",
        alignItems: "center",
        gap: "3px",
        padding: "4px",
        border: "1px solid rgba(67, 104, 77, .24)",
        borderRadius: "999px",
        background: "rgba(255, 253, 246, .94)",
        boxShadow: "0 8px 28px rgba(43, 62, 43, .14)",
        backdropFilter: "blur(12px)",
        font: "600 12px/1 var(--font-body), sans-serif",
      }}
    >
      {(["vi", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={language === item}
          onClick={() => setLanguage(item)}
          style={{
            minWidth: "38px",
            minHeight: "32px",
            padding: "0 10px",
            border: 0,
            borderRadius: "999px",
            background: language === item ? "#416b4d" : "transparent",
            color: language === item ? "#fffdf6" : "#526d54",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
