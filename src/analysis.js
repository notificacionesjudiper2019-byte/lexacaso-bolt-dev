const EMPTY_VALUE='No identificado con la información suministrada.';

function clean(value){
 return typeof value==='string'?value.trim():'';
}

function listValue(value){
 return Array.isArray(value)&&value.length?value:[];
}

function dateLabel(value){
 if(!value)return EMPTY_VALUE;
 const date=new Date(`${value}T00:00:00`);
 return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString('es-CO');
}

export function buildInitialAnalysis(caseData,documents,actions){
 const facts=clean(caseData.facts);
 const visibleDocuments=documents.filter(document=>document.visible_to_client!==false);
 const visibleActions=actions.filter(action=>action.visible_to_client!==false);
 const chronology=visibleActions.map(action=>({
  date:dateLabel(action.action_date||action.created_at),
  title:clean(action.title)||'Gestión sin título',
  detail:clean(action.description)||'Sin descripción suministrada.',
  status:clean(action.status)||'Sin estado informado'
 }));
 const deadlines=caseData.has_deadline==='yes'?[{
  label:'Fecha de inicio del término',
  value:dateLabel(caseData.term_start_date)
 },{
  label:'Fecha límite informada',
  value:dateLabel(caseData.term_end_date)
 },{
  label:'Duración informada',
  value:clean(caseData.term_duration)||EMPTY_VALUE
 }]:[];
 const title=clean(caseData.title)||'Caso sin título';
 const category=[clean(caseData.legal_category),clean(caseData.legal_subcategory)].filter(Boolean).join(' · ');
 const summary=facts?`Según la información suministrada, el caso «${title}» se relaciona con ${category||'una situación jurídica aún no clasificada'}. Los hechos disponibles indican: ${facts}`:`Según la información suministrada, el caso «${title}» está registrado${category?` bajo la categoría ${category}`:''}, pero no contiene una descripción suficiente de los hechos para elaborar un resumen completo.`;
 const missing=[];
 if(!facts)missing.push('Descripción de los hechos principales.');
 if(!caseData.case_number)missing.push('Número de proceso o radicado, si existe.');
 if(!caseData.authority_name&&!caseData.entity)missing.push('Autoridad, despacho o entidad relacionada.');
 if(!visibleDocuments.length)missing.push('Documentos visibles que respalden los hechos.');
 if(!chronology.length)missing.push('Fechas y actuaciones verificables del caso.');
 const inconsistencies=[];
 if(caseData.has_deadline==='yes'&&!caseData.term_start_date)inconsistencies.push('Se indicó que existe un plazo, pero no se informó fecha de inicio.');
 if(caseData.has_deadline==='yes'&&!caseData.term_end_date)inconsistencies.push('Se indicó que existe un plazo, pero no se informó fecha límite.');
 if(caseData.term_start_date&&caseData.term_end_date&&new Date(caseData.term_end_date)<new Date(caseData.term_start_date))inconsistencies.push('La fecha límite aparece antes que la fecha de inicio y debe verificarse.');
 return {
  generated_at:new Date().toISOString(),
  disclaimer:'Este análisis organiza la información suministrada y no constituye concepto jurídico, sentencia, representación ni asesoramiento profesional.',
  summary,
  relevant_facts:facts?[facts]:[EMPTY_VALUE],
  chronology,
  legal_issues:category?[`Tema jurídico declarado: ${category}. Se requiere revisión humana para identificar los problemas jurídicos concretos.`]:[EMPTY_VALUE],
  rights_interests:['No es posible determinar derechos o intereses comprometidos sin información adicional verificable.'],
  pending_actions:visibleActions.length?visibleActions.map(action=>clean(action.title)||'Gestión sin título'):[EMPTY_VALUE],
  deadlines,
  relevant_documents:visibleDocuments.map(document=>clean(document.file_name)||'Documento sin nombre'),
  inconsistencies:inconsistencies.length?inconsistencies:[EMPTY_VALUE],
  possible_actions:['Completar la información faltante.', 'Verificar fechas, autoridad competente, radicado y contenido de los documentos.', 'Solicitar revisión profesional antes de tomar decisiones o presentar actuaciones.'],
  legal_sources:['No se consultaron fuentes jurídicas externas; cualquier norma o precedente debe verificarse en una fuente oficial.'],
  risks:['La información puede estar incompleta, desactualizada o no contar todavía con soporte documental suficiente.'],
  missing_information:missing.length?missing:[EMPTY_VALUE]
 };
}

export function buildSecondReview(initial,caseData,documents,actions){
 const visibleDocuments=documents.filter(document=>document.visible_to_client!==false);
 const findings=[];
 if(!clean(caseData.facts))findings.push('No hay hechos descritos para contrastar.');
 if(!visibleDocuments.length)findings.push('No hay documentos visibles que permitan confirmar los hechos.');
 if(initial.chronology.length===0)findings.push('No hay una cronología documentada.');
 if(initial.inconsistencies.some(item=>item!==EMPTY_VALUE))findings.push(...initial.inconsistencies.filter(item=>item!==EMPTY_VALUE));
 if(actions.some(action=>action.visible_to_client!==false&&(!action.action_date||!action.title)))findings.push('Existe al menos una gestión visible con datos incompletos.');
 return {
  reviewed_at:new Date().toISOString(),
  disclaimer:'Esta segunda revisión es una comprobación independiente de la información disponible y no constituye concepto jurídico ni representación profesional.',
  interpretation_errors:findings.length?findings:[ 'No se identificaron errores concluyentes con la información disponible; esto no descarta errores que aparezcan al incorporar nuevos hechos o documentos.' ],
  omitted_facts:initial.relevant_facts[0]===EMPTY_VALUE?['Faltan hechos verificables.']:[ 'No se identificaron hechos adicionales fuera de los datos suministrados.' ],
  contradictions:initial.inconsistencies.length?initial.inconsistencies:[ 'No se identificaron contradicciones concluyentes.' ],
  documents_not_considered:visibleDocuments.length?['La revisión consideró los documentos visibles registrados en el caso.']:[ 'No hay documentos visibles para revisar.' ],
  date_checks:initial.deadlines.length?initial.deadlines:['No se informaron plazos con fecha verificable.'],
  weak_arguments:['No es posible valorar argumentos sin una narración completa de hechos, pretensiones y soportes.'],
  missing_information:initial.missing_information,
  verification_notes:['Toda conclusión debe contrastarse con los documentos originales y, cuando corresponda, con fuentes oficiales.']
 };
}

export function buildIntegratedReport(caseData,initial,review){
 return {
  generated_at:new Date().toISOString(),
  disclaimer:'LEXACASO es una herramienta de organización y análisis de información. No sustituye el asesoramiento, representación o concepto de un abogado.',
  case_identification:{title:clean(caseData.title)||'Caso sin título',case_number:clean(caseData.case_number)||EMPTY_VALUE,category:[clean(caseData.legal_category),clean(caseData.legal_subcategory)].filter(Boolean).join(' · ')||EMPTY_VALUE,department:clean(caseData.department)||EMPTY_VALUE,authority:clean(caseData.authority_name||caseData.entity)||EMPTY_VALUE},
  summary:initial.summary,
  facts:initial.relevant_facts,
  chronology:initial.chronology,
  documents:initial.relevant_documents,
  deadlines:initial.deadlines,
  legal_issues:initial.legal_issues,
  possible_actions:initial.possible_actions,
  sources:initial.legal_sources,
  observations:[...initial.inconsistencies,...(review?.verification_notes||[])],
  pending_information:[...new Set([...initial.missing_information,...(review?.missing_information||[])])]
 };
}

export function readableAnalysisValue(value){
 if(Array.isArray(value))return value;
 if(value&&typeof value==='object')return Object.entries(value).map(([key,item])=>`${key}: ${typeof item==='string'?item:JSON.stringify(item)}`);
 return value?[String(value)]:[EMPTY_VALUE];
}

export {EMPTY_VALUE};
