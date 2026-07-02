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
      className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="font-semibold">{title}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-xs underline hover:no-underline"
        >
          {copied ? "Copied" : "Copy error"}
        </button>
      </div>
      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">
        {message}
      </pre>
      {stack && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs">Stack trace</summary>
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs">
            {stack}
          </pre>
        </details>
      )}
    </div>
  );
}
