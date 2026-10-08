// Edge Function: export-cases-excel
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import * as XLSX from "npm:xlsx@0.18.5";

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
    if (!supabaseUrl || !anonKey) {
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

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const filters = body && typeof body === "object" ? body : {};
    let casesQuery = client.from("cases").select("*").order("created_at", { ascending: false });
    if (typeof filters.category === "string" && filters.category) casesQuery = casesQuery.eq("legal_category", filters.category);
    if (typeof filters.department === "string" && filters.department) casesQuery = casesQuery.eq("department", filters.department);
    if (typeof filters.status === "string" && filters.status) casesQuery = casesQuery.eq("status", filters.status);
    if (typeof filters.fromDate === "string" && filters.fromDate) casesQuery = casesQuery.gte("created_at", filters.fromDate);
    if (typeof filters.toDate === "string" && filters.toDate) casesQuery = casesQuery.lte("created_at", `${filters.toDate}T23:59:59.999Z`);

    const { data: cases, error: casesError } = await casesQuery;
    if (casesError) {
      return new Response(JSON.stringify({ error: "No fue posible preparar la exportación" }), { status: 500, headers: jsonHeaders });
    }

    const rows = cases || [];
    const ownerIds = [...new Set(rows.map((item) => item.user_id).filter(Boolean))] as string[];
    const caseIds = rows.map((item) => item.id) as string[];
    const [{ data: profiles }, { data: documents }, { data: actions }] = await Promise.all([
      ownerIds.length ? client.from("profiles").select("id,full_name,cedula,phone,address,email").in("id", ownerIds) : Promise.resolve({ data: [] }),
      caseIds.length ? client.from("case_documents").select("case_id,file_name,visible_to_client,is_sensitive,created_at").in("case_id", caseIds) : Promise.resolve({ data: [] }),
      caseIds.length ? client.from("case_actions").select("case_id,action_type,action_date,title,description,status,visible_to_client,created_at").in("case_id", caseIds) : Promise.resolve({ data: [] }),
    ]);

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const docsByCase = new Map<string, unknown[]>();
    for (const document of documents || []) {
      const existing = docsByCase.get(document.case_id) || [];
      existing.push(document);
      docsByCase.set(document.case_id, existing);
    }
    const actionsByCase = new Map<string, unknown[]>();
    for (const action of actions || []) {
      const existing = actionsByCase.get(action.case_id) || [];
      existing.push(action);
      actionsByCase.set(action.case_id, existing);
    }

    const exportRows = rows.map((item) => {
      const profile = profileById.get(item.user_id) || {} as Record<string, string>;
      return {
        Caso: item.title || "",
        ID: item.id,
        Nombre: profile.full_name || "",
        Cédula: profile.cedula || "",
        Celular: profile.phone || "",
        Dirección: profile.address || "",
        Correo: profile.email || "",
        Representación: item.acting_as || "",
        "Persona representada": item.represented_person_name || "",
        Categoría: item.legal_category || "",
        Subcategoría: item.legal_subcategory || "",
        Departamento: item.department || "",
        Municipio: item.municipality || "",
        Autoridad: item.authority_type || "",
        Despacho: item.authority_name || "",
        Entidad: item.entity || "",
        Dependencia: item.dependency || "",
        Radicado: item.case_number || "",
        "Tipo de documento": item.document_type_received || "",
        Término: item.term_duration || "",
        "Fecha inicio": item.term_start_date || "",
        "Fecha límite": item.term_end_date || "",
        Estado: item.status || "",
        Prioridad: item.priority || "",
        "Fecha creación": item.created_at || "",
        "Fecha actualización": item.updated_at || "",
        Documentos: JSON.stringify(docsByCase.get(item.id) || []),
        Gestiones: JSON.stringify(actionsByCase.get(item.id) || []),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Casos");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    const { error: auditError } = await client.rpc("record_audit_event", {
      p_action: "cases_exported",
      p_details: { filters, rows: exportRows.length },
    });
    if (auditError) {
      return new Response(JSON.stringify({ error: "No fue posible registrar la exportación" }), { status: 500, headers: jsonHeaders });
    }

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="lexacaso-casos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "No fue posible completar la exportación" }), { status: 500, headers: jsonHeaders });
  }
});
