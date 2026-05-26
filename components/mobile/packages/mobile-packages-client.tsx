"use client";

import { useState, useMemo } from "react";
import { Search, User, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Price, useLang } from "@/components/providers/language-provider";
import { localizePackageName } from "@/lib/package-utils";

type UserPackage = {
  id: string;
  name: string;
  totalSessions: number;
  remainingSessions: number;
  totalPrice: number;
  paidAmount: number;
  createdAt: string | Date;
  customer: { id: string; name: string; phone: string };
  installments: { id: string; amount: number; paidAt: string | Date }[];
};

export function MobilePackagesClient({ packages }: { packages: UserPackage[] }) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.customer.name.toLowerCase().includes(search.toLowerCase());
      const isActive = p.remainingSessions > 0;
      const matchesFilter =
        filter === "ALL" ||
        (filter === "ACTIVE" && isActive) ||
        (filter === "COMPLETED" && !isActive);
      return matchesSearch && matchesFilter;
    });
  }, [packages, search, filter]);

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter */}
      <div className="bg-white border-b border-zinc-100 px-4 py-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.packages.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <div className="flex gap-2">
          {(["ALL", "ACTIVE", "COMPLETED"] as const).map((f) => (
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
              {f === "ALL" ? t.packages.all : f === "ACTIVE" ? t.packages.active : t.packages.completed}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-zinc-400 text-sm py-12">
            {t.packages.noPackages}
          </div>
        )}
        {filtered.map((p) => {
          const balance = p.totalPrice - p.paidAmount;
          const isActive = p.remainingSessions > 0;
          const progress = ((p.totalSessions - p.remainingSessions) / p.totalSessions) * 100;

          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-zinc-100 p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-zinc-900 truncate">
                     {localizePackageName(p.name, t)}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                    <User className="w-3 h-3" />
                    {p.customer.name}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex-none px-2 py-0.5 rounded-full text-[10px] font-medium",
                    isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-100 text-zinc-500"
                  )}
                >
                  {isActive ? t.packages.active : t.packages.completed}
                </span>
              </div>

              {/* Sessions progress */}
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>{t.packages.sessionsUsed}</span>
                  <span>
                    {p.totalSessions - p.remainingSessions}/{p.totalSessions}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-400 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Payment */}
              <div className="mt-2 pt-2 border-t border-zinc-50 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-zinc-500">
                  <Banknote className="w-3.5 h-3.5" />
                  {t.packages.paid} <Price amount={p.paidAmount} size={12} /> / <Price amount={p.totalPrice} size={12} />
                </span>
                {balance > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-red-500 font-semibold">
                    <span>-</span>
                    <Price amount={balance} size={12} />
                  </span>
                )}
                {balance <= 0 && (
                  <span className="text-green-600 font-semibold">{t.packages.settled}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
