import { cookies } from "next/headers";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

export async function getTranslations() {
  try {
    const cookieStore = await cookies();
    const lang = cookieStore.get("lang")?.value;
    if (lang === "tr") {
      return tr;
    }
  } catch (e) {
    // Safe fallback if cookies are not readable during build/static generation
  }
  return en;
}
