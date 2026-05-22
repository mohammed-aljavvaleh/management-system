"use client";

import { useState, useMemo } from "react";
import { Search, Phone, CalendarDays, Package } from "lucide-react";
import { useLang } from "@/components/providers/language-provider";
import { localizePackageName } from "@/lib/package-utils";

type Customer = {
  id: string;
  name: string;
  phone: string;
  createdAt: string | Date;
  _count: { appointments: number; packages: number };
  packages: { remainingSessions: number; totalSessions: number; name: string }[];
};

interface Props {
  customers: Customer[];
}

export function MobileCustomersClient({ customers }: Props) {
  const [search, setSearch] = useState("");
  const { t } = useLang();

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search)
      ),
    [customers, search]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="bg-white border-b border-zinc-100 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.customers.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-zinc-400 text-sm py-12">
            {t.customers.noResults}
          </div>
        )}
        {filtered.map((c) => {
          const activePackages = c.packages.filter((p) => p.remainingSessions > 0);
          return (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-zinc-100 p-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-zinc-900 truncate">
                    {c.name}
                  </p>
                  <a
                    href={`tel:${c.phone}`}
                    className="flex items-center gap-1 text-xs text-rose-500 mt-0.5"
                  >
                    <Phone className="w-3 h-3" />
                    {c.phone}
                  </a>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {c._count.appointments} {t.staff.appointments}
                  </span>
                  {activePackages.length > 0 && (
                    <span className="flex items-center gap-1 text-rose-500 font-medium">
                      <Package className="w-3.5 h-3.5" />
                      {activePackages.reduce((s, p) => s + p.remainingSessions, 0)} {t.customers.sessionsLeft}
                    </span>
                  )}
                </div>
              </div>
              {activePackages.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-50 flex flex-wrap gap-1">
                  {activePackages.map((p, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-medium"
                    >
                      {localizePackageName(p.name, t)} · {p.remainingSessions}/{p.totalSessions}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}