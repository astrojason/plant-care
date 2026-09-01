"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { Bell, Drop, Flask, CloudFog, Check } from "@phosphor-icons/react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { ErrorBlock } from "@/components/ErrorBlock";
import { getCareTasks, type CareTask, type LoggableCareType } from "@/lib/care/schedule";
import { logCareEvent } from "@/lib/care/log";
import { mapPlantDoc } from "@/lib/firestore/mappers";
import type { Plant } from "@/lib/types/plant";

const CARE_ICONS: Record<LoggableCareType, typeof Drop> = {
  watered: Drop,
  fertilized: Flask,
  misted: CloudFog,
};
const CARE_LABELS: Record<LoggableCareType, string> = {
  watered: "Water",
  fertilized: "Fertilize",
  misted: "Mist",
};

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
function numberWord(n: number): string {
  return n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
function taskKey(t: CareTask): string {
  return `${t.plant.id}:${t.careType}`;
}

function DashboardContent() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [leavingKeys, setLeavingKeys] = useState<Set<string>>(new Set());
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [logError, setLogError] = useState<unknown>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "plants"),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setPlants(snapshot.docs.map((docSnap) => mapPlantDoc(docSnap.id, docSnap.data())));
      },
      (err) => setError(err)
    );
    return unsubscribe;
  }, [user]);

  async function handleCheck(task: CareTask) {
    if (!user) return;
    const key = taskKey(task);
    setLogError(null);
    setLeavingKeys((s) => new Set(s).add(key));
    setTimeout(() => setRemovedKeys((s) => new Set(s).add(key)), 200);
    try {
      await logCareEvent(user.uid, task.plant.id, task.careType);
    } catch (err) {
      setLogError(err);
      setLeavingKeys((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
      setRemovedKeys((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  }

  if (error !== null) {
    return (
      <div className="p-5">
        <ErrorBlock error={error} title="Failed to load plants" />
      </div>
    );
  }

  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const month = now.toLocaleDateString("en-US", { month: "long" });
  const kickerText = `${weekday}, ${now.getDate()} ${month}`;

  const allTasks = plants ? getCareTasks(plants, now) : [];
  const dueTasks = allTasks.filter((t) => t.daysPastDue >= 0 && !removedKeys.has(taskKey(t)));
  const laterTasks = allTasks.filter((t) => t.daysPastDue < 0);

  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="flex flex-col gap-[var(--space-4)] p-5" style={{ paddingBottom: 90 }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="kicker" style={{ marginBottom: 2 }}>
            {kickerText}
          </p>
          <h1 style={{ fontSize: 27, fontWeight: 500, margin: 0 }}>
            {plants === null ? "Today" : dueTasks.length === 0 ? "All caught up" : `${numberWord(dueTasks.length)} need${dueTasks.length === 1 ? "s" : ""} you`}
          </h1>
        </div>
        <button type="button" aria-label="Notifications" className="btn btn-icon btn-secondary">
          <Bell size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[6px]">
        {weekDays.map((d) => {
          const isToday = sameDay(d, now);
          const hasTask = allTasks.some((t) => sameDay(t.dueAt, d));
          return (
            <div
              key={d.toISOString()}
              className="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] py-1"
              style={
                isToday
                  ? {
                      background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
                      boxShadow: "inset 0 0 0 1px var(--color-accent)",
                    }
                  : undefined
              }
            >
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                {d.toLocaleDateString("en-US", { weekday: "narrow" })}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{d.getDate()}</span>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: isToday
                    ? "var(--color-accent)"
                    : hasTask
                      ? "color-mix(in srgb, var(--color-text) 30%, transparent)"
                      : "transparent",
                }}
              />
            </div>
          );
        })}
      </div>

      {plants === null && (
        <div role="status" aria-label="Loading" className="flex flex-col gap-[var(--space-3)]">
          <div className="skeleton-row" style={{ height: 68 }} />
          <div className="skeleton-row" style={{ height: 68 }} />
          <div className="skeleton-row" style={{ height: 68 }} />
        </div>
      )}

      {plants !== null && dueTasks.length === 0 && (
        <div className="empty-state">
          <p>Nothing due today</p>
        </div>
      )}

      {plants !== null && dueTasks.length > 0 && (
        <div className="flex flex-col gap-[var(--space-3)]" style={{ flex: "none", minHeight: "max-content" }}>
          {dueTasks.map((task) => {
            const Icon = CARE_ICONS[task.careType];
            const key = taskKey(task);
            const leaving = leavingKeys.has(key);
            const days = Math.floor(task.daysPastDue);
            return (
              <Link
                key={key}
                href={`/plants/${task.plant.id}`}
                className={`card${leaving ? " card-leaving" : ""}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  boxShadow: `inset 3px 0 0 ${days >= 1 ? "var(--color-accent)" : "color-mix(in srgb, var(--color-accent) 45%, transparent)"}`,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                {task.plant.primaryPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URL
                  <img
                    src={task.plant.primaryPhotoUrl}
                    alt=""
                    style={{ width: 64, height: 64, borderRadius: "var(--radius-md)", objectFit: "cover", flex: "none" }}
                  />
                ) : (
                  <div className="placeholder-tile" style={{ width: 64, height: 64, borderRadius: "var(--radius-md)" }} />
                )}
                <div className="flex flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
                  <span className="flex items-center gap-1 kicker">
                    <Icon size={12} weight="regular" />
                    {CARE_LABELS[task.careType]}
                  </span>
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.plant.nickname}
                  </span>
                  <span className="text-secondary" style={{ fontSize: 12 }}>
                    {!Number.isFinite(days) ? "Never logged" : days >= 1 ? `${days} day${days === 1 ? "" : "s"} overdue` : "Due today"}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Log ${CARE_LABELS[task.careType].toLowerCase()} for ${task.plant.nickname}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCheck(task);
                  }}
                  className="btn btn-icon btn-primary"
                >
                  <Check size={16} weight="bold" />
                </button>
              </Link>
            );
          })}
        </div>
      )}

      {logError !== null && <ErrorBlock error={logError} title="Failed to log care event" />}

      <section>
        <div className="flex items-center justify-between mb-[var(--space-2)]">
          <h2 className="text-secondary" style={{ fontSize: 13, textTransform: "uppercase" }}>
            Later this week
          </h2>
          <Link href="/plants" className="btn btn-ghost" style={{ fontSize: 12 }}>
            All plants
          </Link>
        </div>
        {laterTasks.length === 0 ? (
          <p className="text-secondary" style={{ fontSize: 13 }}>
            Nothing else due this week.
          </p>
        ) : (
          <div className="flex flex-col">
            {laterTasks.map((task, i) => {
              const Icon = CARE_ICONS[task.careType];
              return (
                <Link
                  key={taskKey(task)}
                  href={`/plants/${task.plant.id}`}
                  className={`flex items-center gap-[var(--space-3)] row-rule${i % 2 === 1 ? " zebra-odd" : ""}`}
                  style={{ padding: "8px 4px", textDecoration: "none", color: "inherit" }}
                >
                  {task.plant.primaryPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Firebase Storage download URL
                    <img
                      src={task.plant.primaryPhotoUrl}
                      alt=""
                      style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", objectFit: "cover", flex: "none" }}
                    />
                  ) : (
                    <div className="placeholder-tile" style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)" }} />
                  )}
                  <span style={{ fontSize: 14, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {task.plant.nickname}
                  </span>
                  <Icon size={14} weight="regular" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }} />
                  <span
                    className="text-secondary"
                    style={{ fontSize: 12, width: 52, flex: "none", textAlign: "right" }}
                  >
                    {task.dueAt.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </AuthGuard>
  );
}
