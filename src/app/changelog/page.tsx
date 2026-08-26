'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

type ChangelogData = {
  version: string;
  entries: { hash: string; message: string; date: string }[];
};

export default function ChangelogPage() {
  const [data, setData] = useState<ChangelogData | null>(null);

  useEffect(() => {
    fetch('/api/changelog').then(r => r.json()).then(setData);
  }, []);

  return (
    <AppShell showTabBar={false}>
      <div className="p-5">
        <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-4)]">
          <Link href="/dashboard" className="btn btn-ghost">
            ← Back
          </Link>
          <h1 style={{ fontSize: 27, fontWeight: 500, margin: 0 }}>
            Changelog{' '}
            {data && (
              <span className="text-tertiary" style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>
                v{data.version}
              </span>
            )}
          </h1>
        </div>

        {!data ? (
          <div role="status" aria-label="Loading" className="flex flex-col gap-[var(--space-1)]">
            <div className="skeleton-row" style={{ height: 32 }} />
            <div className="skeleton-row" style={{ height: 32 }} />
            <div className="skeleton-row" style={{ height: 32 }} />
          </div>
        ) : (
          <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {data.entries.map((e, i) => (
              <li
                key={e.hash}
                className={`flex items-baseline gap-[var(--space-4)] row-rule${i % 2 === 1 ? ' zebra-odd' : ''}`}
                style={{ padding: '10px 4px', fontSize: 13 }}
              >
                <span className="text-tertiary" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, width: 88, flex: 'none' }}>
                  {e.date}
                </span>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-accent)', flex: 'none' }}>
                  {e.hash}
                </code>
                <span className="text-secondary" style={{ opacity: 0.7 }}>{e.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
