import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = "LEXACASO <onboarding@resend.dev>";
const ADMIN_EMAIL = "notipersonales2026@gmail.com";
const PLATFORM_URL = "https://notificacionesjudipe-xmg6.bolt.host";

interface EmailPayload {
  type: "new_client" | "new_notification";
  client_name?: string;
  client_email?: string;
  notif_title?: string;
  notif_message?: string;
  case_number?: string;
  court?: string;
  filing_date?: string;
  attachment_url?: string;
}

async function sendViaResend(to: string, subject: string, html: string, cc?: string) {
  const body: Record<string, unknown> = {
    from: RESEND_FROM,
    to: [to],
    subject,
    html,
  };
  if (cc) body.cc = [cc];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error ${res.status}: ${text}`);
  }
  return await res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.type === "new_client") {
      const name = payload.client_name || "Nuevo cliente";
      const email = payload.client_email || "";
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;">
          <h2 style="color:#071f43;">Nuevo cliente registrado en LEXACASO</h2>
          <p>Se ha registrado un nuevo cliente en la plataforma:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Nombre</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${name}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Correo</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${email}</td></tr>
          </table>
          <p style="color:#758096;font-size:13px;">Puedes ver más detalles en el Panel de Administración de LEXACASO.</p>
        </div>
      `;
      await sendViaResend(ADMIN_EMAIL, "Nuevo cliente registrado - LEXACASO", html);
      return new Response(
        JSON.stringify({ success: true, message: "Admin notification sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.type === "new_notification") {
      const title = payload.notif_title || "Nueva notificación";
      const message = payload.notif_message || "";
      const caseNumber = payload.case_number || "Sin asignar";
      const court = payload.court || "Sin asignar";
      const filingDate = payload.filing_date || "";
      const clientEmail = payload.client_email || "";
      const attachmentUrl = payload.attachment_url || "";

      if (!clientEmail) {
        return new Response(
          JSON.stringify({ error: "Client email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const dateRow = filingDate
        ? `<tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Fecha de radicación</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${filingDate}</td></tr>`
        : "";

      const attachmentRow = attachmentUrl
        ? `<tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Archivo adjunto</td><td style="padding:8px 12px;border:1px solid #e6eaf1;"><a href="${attachmentUrl}" style="color:#0c5aa6;">Ver archivo</a></td></tr>`
        : "";

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;">
          <h2 style="color:#071f43;">Nueva Notificación Judicial - LEXACASO</h2>
          <p>Has recibido una nueva notificación judicial en la plataforma LEXACASO.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Asunto</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${title}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Número de expediente</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${caseNumber}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Juzgado</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${court}</td></tr>
            ${dateRow}
            ${attachmentRow}
          </table>
          <p style="margin:16px 0;padding:14px;background:#f8f9fc;border:1px solid #e6eaf1;border-radius:8px;">${message}</p>
          <a href="${PLATFORM_URL}" style="display:inline-block;padding:12px 28px;background:#071f43;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:8px;">Ingresar a la plataforma</a>
          <p style="color:#758096;font-size:12px;margin-top:24px;">Este es un correo automático de LEXACASO. No respondas a este mensaje.</p>
        </div>
      `;

      await sendViaResend(clientEmail, "Nueva Notificación Judicial - LEXACASO", html, ADMIN_EMAIL);
      return new Response(
        JSON.stringify({ success: true, message: "Client notification sent with admin CC" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid email type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
