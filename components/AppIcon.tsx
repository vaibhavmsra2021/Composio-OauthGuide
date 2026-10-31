"use client";

import { useState } from "react";
import { hostOf } from "@/lib/glance";

// Provider favicon with a letter fallback when the image cannot load.
export function AppIcon({ name, website, size = "md" }: { name: string; website: string; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const px = size === "lg" ? 64 : 32;
  return (
    <span className={`app-icon ${size === "md" ? "" : size}`}>
      {failed ? (
        name.charAt(0).toUpperCase()
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${hostOf(website)}&sz=${px}`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
