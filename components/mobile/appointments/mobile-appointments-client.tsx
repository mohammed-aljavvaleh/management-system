"use client";

import { useState, useMemo } from "react";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/providers/language-provider";

const { t } = useLang();

type Appointment = {
  id: string;
  startTime: string | Date;
  status: string;
  priceAtBooking: number;
  customer: { id: string; name: string; phone: string };
  service: { id: string; name: string; duration: number };
  staff: { id: string; name: string };
  userPackage?: { id: string; name: string } | null;
};

type Service = { id: string; name: string; price: number; duration: number };
type Staff = { id: string; name: string; role: string };

interface Props {
  initialAppointments: Appointment[];
  services: Service[];
  staff: Staff[];
}

const statusConfig = {
  SCHEDULED: { label: "Scheduled", color: "bg-blue-100 text-blue-700", icon: Clock },
  COMPLETED: { label: "Done", color: "bg-green-100 text-green-700", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
};

function getDayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

export function MobileAppointmentsClient({ initialAppointments }: Props) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "SCHEDULED" | "COMPLETED" | "CANCELLED">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const matchesSearch =
        !search ||
        a.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        a.service.name.toLowerCase().includes(search.toLowerCase()) ||
        a.staff.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || a.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [appointments, search, filter]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const date = new Date(a.startTime);
      const key = format(date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter */}
      <div className="bg-white border-b border-zinc-100 px-4 py-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search appointments…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(["ALL", "SCHEDULED", "COMPLETED", "CANCELLED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-none px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === f
                  ? "bg-rose-500 text-white"
                  : "bg-zinc-100 text-zinc-500"
              )}
            >
              {f === "ALL" ? "All" : statusConfig[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {grouped.length === 0 && (
          <div className="text-center text-zinc-400 text-sm py-12">
            {t.appointments.noAppointments}
          </div>
        )}
        {grouped.map(([dateKey, items]) => (
          <div key={dateKey}>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              {getDayLabel(new Date(dateKey + "T00:00:00"))}
            </p>
            <div className="space-y-2">
              {items.map((a) => {
                const cfg = statusConfig[a.status as keyof typeof statusConfig];
                const Icon = cfg?.icon ?? Clock;
                const time = new Date(a.startTime);
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl border border-zinc-100 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-zinc-900 truncate">
                          {a.customer.name}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {a.service.name} · {a.staff.name}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {format(time, "h:mm a")} · {a.service.duration} min
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-none">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                            cfg?.color
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg?.label}
                        </span>
                        <span className="text-xs font-semibold text-zinc-700">
                          {a.priceAtBooking} SAR
                        </span>
                      </div>
                    </div>

                    {/* Action buttons for scheduled */}
                    {a.status === "SCHEDULED" && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-50">
                        <button
                          disabled={updatingId === a.id}
                          onClick={() => updateStatus(a.id, "COMPLETED")}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium active:bg-green-100 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark Done
                        </button>
                        <button
                          disabled={updatingId === a.id}
                          onClick={() => updateStatus(a.id, "CANCELLED")}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium active:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
