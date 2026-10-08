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

    if (action === "update_email") {
      const targetUserId = body?.user_id;
      const newEmail = body?.email;
      if (!targetUserId || !newEmail) {
        return new Response(JSON.stringify({ error: "Usuario y correo son obligatorios" }), { status: 400, headers: jsonHeaders });
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
        email: newEmail,
        email_confirm: true,
      });

      if (updateErr) {
        return new Response(JSON.stringify({ error: "No se pudo actualizar el correo: " + updateErr.message }), { status: 500, headers: jsonHeaders });
      }

      await client.rpc("record_audit_event", {
        p_action: "user_email_updated_by_admin",
        p_target_user_id: targetUserId,
        p_details: { new_email: newEmail },
      }).catch(() => {});

      return new Response(JSON.stringify({ success: true, message: "Correo actualizado correctamente" }), { headers: jsonHeaders });
    }

    if (action === "delete_user") {
      const targetUserId = body?.user_id;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "Usuario es obligatorio" }), { status: 400, headers: jsonHeaders });
      }
      if (targetUserId === userData.user.id) {
        return new Response(JSON.stringify({ error: "No puedes eliminar tu propia cuenta" }), { status: 400, headers: jsonHeaders });
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("role, email")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetProfile?.role === "admin") {
        return new Response(JSON.stringify({ error: "No puedes eliminar una cuenta de administrador" }), { status: 400, headers: jsonHeaders });
      }

      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(targetUserId);

      if (deleteErr) {
        return new Response(JSON.stringify({ error: "No se pudo eliminar el usuario: " + deleteErr.message }), { status: 500, headers: jsonHeaders });
      }

      try {
        await adminClient.from("profiles").delete().eq("id", targetUserId);
      } catch (_e) {}

      await client.rpc("record_audit_event", {
        p_action: "user_deleted_by_admin",
        p_target_user_id: targetUserId,
        p_details: { deleted_email: targetProfile?.email || "" },
      }).catch(() => {});

      return new Response(JSON.stringify({ success: true, message: "Usuario eliminado correctamente" }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: "Acción no válida" }), { status: 400, headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error inesperado: " + (err?.message || "desconocido") }), { status: 500, headers: jsonHeaders });
  }
});
