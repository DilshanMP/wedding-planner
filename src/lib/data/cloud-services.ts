import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealPreference } from "@/lib/domain/types";

/**
 * Cloud-only features backed by the security-definer functions in
 * supabase/migrations/20261009000000_sharing_and_rsvp.sql.
 */

export type MemberRole = "owner" | "editor" | "viewer" | "planner";

export interface WeddingMember {
  userId: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: Exclude<MemberRole, "owner">;
  createdAt: string;
}

function check<T>(action: string, res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Couldn't ${action}: ${res.error.message}`);
  return res.data;
}

export async function listMembers(client: SupabaseClient, weddingId: string): Promise<WeddingMember[]> {
  const rows = check("load people with access", await client.rpc("list_wedding_members", { target: weddingId })) as
    | { user_id: string; email: string; role: MemberRole; joined_at: string }[]
    | null;
  return (rows ?? []).map((r) => ({ userId: r.user_id, email: r.email, role: r.role, joinedAt: r.joined_at }));
}

export async function listPendingInvites(client: SupabaseClient, weddingId: string): Promise<PendingInvite[]> {
  const rows = check(
    "load invitations",
    await client.from("wedding_invites").select("id, email, role, created_at").eq("wedding_id", weddingId).is("accepted_at", null).order("created_at"),
  ) as { id: string; email: string; role: PendingInvite["role"]; created_at: string }[] | null;
  return (rows ?? []).map((r) => ({ id: r.id, email: r.email, role: r.role, createdAt: r.created_at }));
}

/** Returns "added" when the person already has an account, "pending" otherwise. */
export async function inviteToWedding(client: SupabaseClient, weddingId: string, email: string, role: PendingInvite["role"]): Promise<"added" | "pending"> {
  return check("send the invitation", await client.rpc("invite_to_wedding", { target: weddingId, invitee_email: email, invitee_role: role })) as "added" | "pending";
}

export async function cancelInvite(client: SupabaseClient, inviteId: string): Promise<void> {
  check("cancel the invitation", await client.from("wedding_invites").delete().eq("id", inviteId));
}

export async function removeMember(client: SupabaseClient, weddingId: string, userId: string): Promise<void> {
  check("remove access", await client.from("wedding_members").delete().eq("wedding_id", weddingId).eq("user_id", userId));
}

/** Join every wedding this account's email was invited to. */
export async function claimInvites(client: SupabaseClient): Promise<number> {
  return (check("accept invitations", await client.rpc("claim_invites")) as number | null) ?? 0;
}

/* ------------------------------------------------------------------ */
/* Online RSVP                                                         */
/* ------------------------------------------------------------------ */

export interface RsvpInvitation {
  guestName: string;
  adults: number;
  children: number;
  rsvp: "pending" | "yes" | "no" | "maybe";
  meal: MealPreference;
  brideName: string;
  groomName: string;
  weddingDate: string;
  venue: string;
  location: string;
}

export async function rsvpLookup(client: SupabaseClient, token: string): Promise<RsvpInvitation | null> {
  return (check("open the invitation", await client.rpc("rsvp_lookup", { token })) as RsvpInvitation | null) ?? null;
}

export async function rsvpSubmit(
  client: SupabaseClient,
  token: string,
  answer: { response: "yes" | "no" | "maybe"; meal: MealPreference; attending: number | null; message: string },
): Promise<boolean> {
  return Boolean(
    check(
      "send your reply",
      await client.rpc("rsvp_submit", { token, response: answer.response, meal_choice: answer.meal, attending: answer.attending, message: answer.message }),
    ),
  );
}
