export function localizePackageName(name: string, t: any): string {
  if (!name) return name;
  
  // Try matching "Service — X Sessions"
  const dashMatch = name.match(/^(.*)\s+—\s+(\d+)\s+Sessions$/i);
  if (dashMatch) {
    const service = localizeServiceName(dashMatch[1], t);
    const sessions = dashMatch[2];
    return t.packages.packageNameTemplate
      ? t.packages.packageNameTemplate.replace("{service}", service).replace("{sessions}", sessions)
      : `${service} — ${sessions} Sessions`;
  }

  // Try matching "Service X Sessions"
  const spaceMatch = name.match(/^(.*)\s+(\d+)\s+Sessions$/i);
  if (spaceMatch) {
    const service = localizeServiceName(spaceMatch[1], t);
    const sessions = spaceMatch[2];
    return t.packages.packageNameTemplateSpace
      ? t.packages.packageNameTemplateSpace.replace("{service}", service).replace("{sessions}", sessions)
      : `${service} ${sessions} Sessions`;
  }

  return localizeServiceName(name, t);
}

export function localizeInstallmentNote(note: string | null, t: any): string {
  if (!note) return "";
  
  const key = note.trim().toLowerCase();
  if (key === "paid at booking") {
    return t.packages.paidAtBooking || note;
  }
  if (key === "advance payment for next session") {
    return t.packages.advancePayment || note;
  }
  if (key === "down payment") {
    return t.packages.downPayment || note;
  }
  if (key === "installment 1") {
    return t.packages.installment1 || note;
  }
  if (key === "installment") {
    return t.packages.installment || note;
  }
  const installmentMatch = key.match(/^installment\s+(\d+)$/);
  if (installmentMatch) {
    return t.packages.installmentTemplate
      ? t.packages.installmentTemplate.replace("{number}", installmentMatch[1])
      : note;
  }
  if (key === "first month") {
    return t.packages.firstMonth || note;
  }
  return note;
}

export function localizeServiceName(name: string, t: any): string {
  if (!name) return name;

  const knownNames: Record<string, string | undefined> = {
    "Classic Manicure": t.packages.knownNames?.classicManicure,
    "Gel Extensions": t.packages.knownNames?.gelExtensions,
    "Pedicure Deluxe": t.packages.knownNames?.pedicureDeluxe,
    "Laser - Full Body": t.packages.knownNames?.laserFullBody,
    "Nail Art Custom": t.packages.knownNames?.nailArtCustom,
    "Laser Package": t.packages.knownNames?.laserPackage,
    "Monthly Manicure Club": t.packages.knownNames?.monthlyManicureClub,
  };

  return knownNames[name.trim()] || name;
}
