"use client";

import { UserCheck, CalendarDays } from "lucide-react";
import { useLang } from "@/components/providers/language-provider";

type Staff = {
  id: string;
  name: string;
  role: string;
  _count: { appointments: number };
};

export function MobileStaffClient({ staff }: { staff: Staff[] }) {
  const { t } = useLang();
  return (
    <div className="px-4 py-3 space-y-2">
      {staff.length === 0 && (
        <div className="text-center text-zinc-400 text-sm py-12">
          {t.staff.noStaff}
        </div>
      )}
      {staff.map((s) => (
        <div
          key={s.id}
          className="bg-white rounded-xl border border-zinc-100 p-3 shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-none">
              <UserCheck className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="font-semibold text-sm text-zinc-900">{s.name}</p>
              <p className="text-xs text-zinc-400">{s.role}</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <CalendarDays className="w-3.5 h-3.5" />
            {s._count.appointments} {t.staff.appointments}
          </span>
        </div>
      ))}
    </div>
  );
}