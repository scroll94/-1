"use client";
import { useState } from "react";
import { Icon } from "./Icon";

export function CopyButton({ text, label = "Копировать" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text.startsWith("/") ? window.location.origin + text : text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      <Icon name={done ? "check" : "link"} className="h-4 w-4" />
      {done ? "Скопировано" : label}
    </button>
  );
}
