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

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

interface EmailPayload {
  type: "new_client" | "new_notification" | "case_filed";
  client_name?: string;
  client_email?: string;
  notif_title?: string;
  notif_message?: string;
  case_number?: string;
  court?: string;
  filing_date?: string;
  attachment_url?: string;
  case_id?: string;
  user_id?: string;
  case_title?: string;
  case_facts?: string;
  legal_category?: string;
  legal_subcategory?: string;
  documents?: Array<{ file_name: string; content_type: string; created_at: string }>;
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

    const sb = supabaseAdmin();

    if (payload.type === "new_client") {
      const name = payload.client_name || "Nuevo cliente";
      const email = payload.client_email || "";
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;">
          <h2 style="color:#071f43;">Nuevo cliente registrado en LEXACASO</h2>
          <p>Se ha registrado un nuevo cliente en la plataforma:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Nombre</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Correo</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(email)}</td></tr>
          </table>
          <p style="color:#758096;font-size:13px;">Puedes ver m\u00e1s detalles en el Panel de Administraci\u00f3n de LEXACASO.</p>
        </div>
      `;
      await sendViaResend(ADMIN_EMAIL, "Nuevo cliente registrado - LEXACASO", html);
      return new Response(
        JSON.stringify({ success: true, message: "Admin notification sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.type === "new_notification") {
      const title = payload.notif_title || "Nueva notificaci\u00f3n";
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
        ? `<tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Fecha de radicaci\u00f3n</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(filingDate)}</td></tr>`
        : "";

      const attachmentRow = attachmentUrl
        ? `<tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Archivo adjunto</td><td style="padding:8px 12px;border:1px solid #e6eaf1;"><a href="${escapeHtml(attachmentUrl)}" style="color:#0c5aa6;">Ver archivo</a></td></tr>`
        : "";

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;">
          <h2 style="color:#071f43;">Nueva Notificaci\u00f3n Judicial - LEXACASO</h2>
          <p>Has recibido una nueva notificaci\u00f3n judicial en la plataforma LEXACASO.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Asunto</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(title)}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">N\u00famero de expediente</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(caseNumber)}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Juzgado</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(court)}</td></tr>
            ${dateRow}
            ${attachmentRow}
          </table>
          <p style="margin:16px 0;padding:14px;background:#f8f9fc;border:1px solid #e6eaf1;border-radius:8px;">${escapeHtml(message)}</p>
          <a href="${PLATFORM_URL}" style="display:inline-block;padding:12px 28px;background:#071f43;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:8px;">Ingresar a la plataforma</a>
          <p style="color:#758096;font-size:12px;margin-top:24px;">Este es un correo autom\u00e1tico de LEXACASO. No respondas a este mensaje.</p>
        </div>
      `;

      await sendViaResend(clientEmail, "Nueva Notificaci\u00f3n Judicial - LEXACASO", html, ADMIN_EMAIL);
      return new Response(
        JSON.stringify({ success: true, message: "Client notification sent with admin CC" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.type === "case_filed") {
      const clientEmail = payload.client_email || "";
      const clientName = payload.client_name || "";
      const caseId = payload.case_id || "";
      const caseTitle = payload.case_title || "";
      const caseFacts = payload.case_facts || "";
      const legalCategory = payload.legal_category || "";
      const legalSubcategory = payload.legal_subcategory || "";
      const documents = payload.documents || [];

      if (!clientEmail) {
        return new Response(
          JSON.stringify({ error: "Client email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const docRows = documents.length
        ? documents.map((d) =>
            `<tr><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(d.file_name)}</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(d.content_type || 'N/A')}</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(d.created_at)}</td></tr>`
          ).join("")
        : `<tr><td colspan="3" style="padding:8px 12px;border:1px solid #e6eaf1;color:#758096;">Sin documentos adjuntos</td></tr>`;

      const factsSection = caseFacts
        ? `<h3 style="color:#071f43;margin-top:20px;">Resumen de los hechos</h3><p style="background:#f8f9fc;border:1px solid #e6eaf1;border-radius:8px;padding:14px;line-height:1.6;">${escapeHtml(caseFacts)}</p>`
        : "";

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;">
          <h2 style="color:#071f43;">Comprobante de radicaci\u00f3n - LEXACASO</h2>
          <p>Estimado/a <strong>${escapeHtml(clientName)}</strong>,</p>
          <p>Tu caso ha sido radicado correctamente en la plataforma LEXACASO. A continuaci\u00f3n encontrar\u00e1s los detalles:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">N\u00famero de radicado</td><td style="padding:8px 12px;border:1px solid #e6eaf1;font-family:monospace;font-weight:bold;color:#0c5aa6;">${escapeHtml(caseId)}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">T\u00edtulo del caso</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(caseTitle)}</td></tr>
            <tr><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Categor\u00eda jur\u00eddica</td><td style="padding:8px 12px;border:1px solid #e6eaf1;">${escapeHtml(legalCategory)}${legalSubcategory ? ' / ' + escapeHtml(legalSubcategory) : ''}</td></tr>
          </table>
          ${factsSection}
          <h3 style="color:#071f43;margin-top:20px;">Documentos cargados</h3>
          <table style="width:100%;border-collapse:collapse;margin:8px 0;">
            <tr style="background:#f8f9fc;"><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Archivo</td><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Formato</td><td style="padding:8px 12px;border:1px solid #e6eaf1;font-weight:bold;">Fecha de subida</td></tr>
            ${docRows}
          </table>
          <a href="${PLATFORM_URL}" style="display:inline-block;padding:12px 28px;background:#071f43;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px;">Ingresar a la plataforma y ver mi caso</a>
          <p style="color:#758096;font-size:12px;margin-top:24px;">Este es un correo autom\u00e1tico de LEXACASO. No respondas a este mensaje. Guarda tu n\u00famero de radicado para hacer seguimiento.</p>
        </div>
      `;

      const subject = `Comprobante de radicaci\u00f3n - Caso ${caseId.slice(0, 8)} - LEXACASO`;
      await sendViaResend(clientEmail, subject, html, ADMIN_EMAIL);

      await sb.from("email_log").insert({
        case_id: caseId || null,
        user_id: payload.user_id || null,
        email_type: "case_filed",
        recipient_email: clientEmail,
        subject,
        status: "sent",
        details: { case_title: caseTitle, legal_category: legalCategory, documents_count: documents.length, documents },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Case filed confirmation sent and logged" }),
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
