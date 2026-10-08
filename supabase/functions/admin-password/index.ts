import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: jsonHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Servicio no disponible" }), { status: 503, headers: jsonHeaders });
    }

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: jsonHeaders });
    }

    const { data: admin, error: adminError } = await client.rpc("is_admin");
    if (adminError || admin !== true) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: jsonHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "send_reset_link") {
      const targetEmail = body?.email;
      if (!targetEmail) {
        return new Response(JSON.stringify({ error: "Correo del cliente es obligatorio" }), { status: 400, headers: jsonHeaders });
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { error: resetError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: targetEmail,
      });

      if (resetError) {
        return new Response(JSON.stringify({ error: "No se pudo generar el enlace: " + resetError.message }), { status: 500, headers: jsonHeaders });
      }

      await client.rpc("record_audit_event", {
        p_action: "password_reset_link_sent",
        p_target_user_id: body?.user_id || null,
        p_details: { email: targetEmail },
      }).catch(() => {});

      return new Response(JSON.stringify({ success: true, message: "Enlace de restablecimiento enviado a " + targetEmail }), { headers: jsonHeaders });
    }

    if (action === "set_temp_password") {
      const targetUserId = body?.user_id;
      const tempPassword = body?.temp_password;
      if (!targetUserId || !tempPassword) {
        return new Response(JSON.stringify({ error: "Usuario y contraseña temporal son obligatorios" }), { status: 400, headers: jsonHeaders });
      }
      if (tempPassword.length < 8) {
        return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 8 caracteres" }), { status: 400, headers: jsonHeaders });
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: tempPassword,
      });

      if (updateError) {
        return new Response(JSON.stringify({ error: "No se pudo actualizar la contraseña: " + updateError.message }), { status: 500, headers: jsonHeaders });
      }

      await client.rpc("record_audit_event", {
        p_action: "temp_password_set",
        p_target_user_id: targetUserId,
        p_details: { method: "admin_direct" },
      }).catch(() => {});

      return new Response(JSON.stringify({ success: true, message: "Contraseña temporal asignada correctamente" }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: "Acción no válida" }), { status: 400, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error inesperado: " + (err?.message || "desconocido") }), { status: 500, headers: jsonHeaders });
  }
});
