"use client";

import { Clock, Banknote } from "lucide-react";
import { useLang } from "@/components/providers/language-provider";

type Service = { id: string; name: string; price: number; duration: number };

export function MobileServicesClient({ services }: { services: Service[] }) {
  const { t } = useLang();
  return (
    <div className="px-4 py-3 space-y-2">
      {services.length === 0 && (
        <div className="text-center text-zinc-400 text-sm py-12">
          {t.services.noServices}
        </div>
      )}
      {services.map((s) => (
        <div
          key={s.id}
          className="bg-white rounded-xl border border-zinc-100 p-3 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-sm text-zinc-900">{s.name}</p>
            <p className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
              <Clock className="w-3 h-3" />
              {s.duration} {t.services.min}
            </p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-rose-600">
            <Banknote className="w-4 h-4" />
            {s.price} {t.common.currency}
          </span>
        </div>
      ))}
    </div>
  );
}