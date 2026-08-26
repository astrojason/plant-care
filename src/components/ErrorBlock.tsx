"use client";

import { useState } from "react";

export interface ErrorBlockProps {
  error: unknown;
  title?: string;
}

interface DisplayError {
  message: string;
  stack?: string;
}

function toDisplayError(error: unknown): DisplayError {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error, null, 2) };
  } catch {
    return { message: String(error) };
  }
}

/**
 * Renders any caught error's full message (and stack, if present) verbatim
 * and unredacted, with a copy-to-clipboard affordance. Nothing is allowed to
 * fail silently in this app — call sites must render errors through this
 * component rather than swallowing or generic-messaging them.
 */
export function ErrorBlock({ error, title = "Something went wrong" }: ErrorBlockProps) {
  const { message, stack } = toDisplayError(error);
  const [copied, setCopied] = useState(false);
  const fullText = stack ? `${message}\n\n${stack}` : message;

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      role="alert"
      className="rounded-[var(--radius-md)] p-[var(--space-4)]"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[15px] font-medium">{title}</p>
        <button type="button" onClick={handleCopy} className="btn btn-ghost shrink-0">
          {copied ? "Copied" : "Copy error"}
        </button>
      </div>
      <pre
        className="mt-2 whitespace-pre-wrap break-words text-xs"
        style={{ fontFamily: "var(--font-mono)", fontSize: "12px", opacity: 0.78 }}
      >
        {message}
      </pre>
      {stack && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-secondary">Stack trace</summary>
          <pre
            className="mt-1 whitespace-pre-wrap break-words"
            style={{ fontFamily: "var(--font-mono)", fontSize: "12px", opacity: 0.78 }}
          >
            {stack}
          </pre>
        </details>
      )}
    </div>
  );
}
