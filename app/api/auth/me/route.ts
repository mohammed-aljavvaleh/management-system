import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session.adminId || !session.salonId) {
    return NextResponse.json({
      username: null,
      salonId: null,
      salonName: null,
      currency: "TRY",
      salon: null,
    });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    include: { salon: true },
  });

  const salon = admin?.salon ?? null;
  const currency = salon?.currency === "SAR" ? "SAR" : "TRY";

  return NextResponse.json({
    username: session.username ?? null,
    salonId: salon?.id ?? session.salonId,
    salonName: salon?.name ?? null,
    currency,
    salon: salon
      ? {
          id: salon.id,
          name: salon.name,
          currency,
          openingHour: salon.openingHour,
          closingHour: salon.closingHour,
        }
      : null,
  });
}
