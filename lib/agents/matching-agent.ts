import { getAdminSupabase } from "@/lib/supabase/admin";
import { matchToCanonicalCenter } from "./center-matcher";

export interface MatchedClassmate {
  id: string;
  firstName: string;
  pickupArea: string;
}

/**
 * Finds classmates headed to the same canonical center, date, and session
 * (Never creates groups automatically)
 */
export async function findClassmatesForCenter(
  userId: string,
  ticket: {
    exam_center: string;
    exam_date: string;
    session: string;
  }
): Promise<MatchedClassmate[]> {
  const supabase = getAdminSupabase();
  const canonicalCenter = matchToCanonicalCenter(ticket.exam_center);
  const normalizedSession =
    ticket.session.toLowerCase().includes("after") ? "Afternoon" : "Forenoon";

  const { data: matchingTickets } = await supabase
    .from("tickets")
    .select("user_id, users(id, name, pickup_area)")
    .eq("exam_center", canonicalCenter.name)
    .eq("exam_date", ticket.exam_date)
    .eq("session", normalizedSession);

  const classmates: MatchedClassmate[] = [];
  const seen = new Set<string>();

  for (const t of matchingTickets || []) {
    const u = (t as any).users;
    if (u && u.id !== userId && !seen.has(u.id)) {
      seen.add(u.id);
      classmates.push({
        id: u.id,
        firstName: (u.name || "Student").split(" ")[0],
        pickupArea: u.pickup_area || "Karunya Nagar",
      });
    }
  }

  return classmates;
}
