// Supabase Edge Function: send-request-email
// Sends an email to an item owner when a logged-in user requests the item.
// Requires: RESEND_API_KEY, EMAIL_FROM, PUBLIC_APP_URL (optional, for links)
// CORS: allow request origin or * for dev

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders(origin) }
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return Response.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM");
  const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") || "http://localhost:3000";

  if (!resendApiKey || !emailFrom) {
    console.error("Missing RESEND_API_KEY or EMAIL_FROM");
    return Response.json(
      { error: "Server configuration error" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }

  let body: { thing_id?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  const { thing_id, subject, message } = body;
  if (!thing_id || typeof subject !== "string" || typeof message !== "string") {
    return Response.json(
      { error: "thing_id, subject, and message are required" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  if (!trimmedSubject || !trimmedMessage) {
    return Response.json(
      { error: "subject and message cannot be empty" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  // Verify requester JWT and get requester id + email
  const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return Response.json(
      { error: "Invalid or expired token" },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  const requesterId = claimsData.claims.sub as string;
  const requesterEmail = claimsData.claims.email as string | undefined;
  if (!requesterEmail) {
    return Response.json(
      { error: "User email not found" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  // Service-role client for DB and auth admin
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Load item
  const { data: item, error: itemError } = await supabaseAdmin
    .from("items")
    .select("id, name, type, user_id")
    .eq("id", thing_id)
    .maybeSingle();

  if (itemError || !item) {
    return Response.json(
      { error: "Item not found" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }

  const ownerId = item.user_id;
  if (ownerId === requesterId) {
    return Response.json(
      { error: "You cannot request your own item" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  // Owner email via Auth Admin API (REST to avoid Deno issues with auth.admin)
  const authUserRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${ownerId}`, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });

  if (!authUserRes.ok) {
    console.error("Auth admin user fetch failed", authUserRes.status, await authUserRes.text());
    return Response.json(
      { error: "Could not resolve owner" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }

  const authUserJson = await authUserRes.json();
  const ownerEmail = authUserJson?.user?.email;
  if (!ownerEmail) {
    return Response.json(
      { error: "Owner email not found" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  // Requester display name from profiles
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", requesterId)
    .maybeSingle();

  const requesterName = profile?.full_name?.trim() || "A user";
  const itemName = item.name || "item";
  const itemType = item.type === "request" ? "request" : "thing";

  const userLink = `${publicAppUrl.replace(/\/$/, "")}/user/${requesterId}`;
  const thingLink = `${publicAppUrl.replace(/\/$/, "")}/thing/${thing_id}`;

  const introLine =
    itemType === "request"
      ? `<a href="${escapeHtml(userLink)}">${escapeHtml(requesterName)}</a> is responding to your request &quot;<a href="${escapeHtml(thingLink)}">${escapeHtml(itemName)}</a>&quot;.`
      : `<a href="${escapeHtml(userLink)}">${escapeHtml(requesterName)}</a> is requesting to borrow your <a href="${escapeHtml(thingLink)}">${escapeHtml(itemName)}</a>.`;

  const messageHtml = `<p>${escapeHtml(trimmedMessage).replace(/\n/g, "<br>")}</p>`;
  const html = `<p>${introLine}</p><p><strong>Message:</strong></p>${messageHtml}`;

  const resendRes = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [ownerEmail],
      reply_to: requesterEmail,
      subject: trimmedSubject,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("Resend API error", resendRes.status, errText);
    return Response.json(
      { error: "Failed to send email" },
      { status: 502, headers: corsHeaders(origin) }
    );
  }

  return Response.json(
    { success: true },
    { status: 200, headers: corsHeaders(origin) }
  );
});
