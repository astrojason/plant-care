'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type ChangelogData = {
  version: string;
  entries: { hash: string; message: string; date: string }[];
};

export default function ChangelogPage() {
  const [data, setData] = useState<ChangelogData | null>(null);

  useEffect(() => {
    fetch('/api/changelog').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-6 text-gray-500 dark:text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Changelog{' '}
          <span className="font-mono text-base text-gray-500 dark:text-gray-400">v{data.version}</span>
        </h1>
      </div>
      <ul className="divide-y divide-gray-200">
        {data.entries.map(e => (
          <li key={e.hash} className="flex items-baseline gap-4 py-3 text-sm">
            <span className="text-gray-400 font-mono text-xs w-24 shrink-0">{e.date}</span>
            <code className="text-green-700 font-mono text-xs shrink-0">{e.hash}</code>
            <span className="text-gray-700 dark:text-gray-300">{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
