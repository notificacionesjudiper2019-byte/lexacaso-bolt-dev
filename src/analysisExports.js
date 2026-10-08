import { readableAnalysisValue, EMPTY_VALUE } from './analysis';

const NAVY='#071f43';
const GOLD='#c8932e';
const BLUE='#0c5aa6';
const CREAM='#fbf8f0';
const DISCLAIMER='LEXACASO es una herramienta de organización y análisis de información. No sustituye el asesoramiento, representación o concepto de un abogado.';

function esc(s){
  if(s===null||s===undefined) return EMPTY_VALUE;
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(){
  const d=new Date();
  return d.toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'})+' '+d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
}

function buildReportHtml(caseData,report,review){
  const ci=report.caseIdentification||{};
  const sections=[];

  sections.push(`<div style="text-align:center;margin-bottom:30px">
    <h1 style="color:${NAVY};font-size:28px;margin:0;letter-spacing:3px">LEXACASO</h1>
    <p style="color:${GOLD};font-size:13px;margin:4px 0">Tu caso, en buenas manos</p>
    <hr style="border:0;border-top:2px solid ${GOLD};margin:12px 0;width:200px;margin-left:auto;margin-right:auto">
    <h2 style="color:${NAVY};font-size:20px;margin:16px 0 4px">Informe Integrado de Caso</h2>
    <p style="color:#666;font-size:12px">Fecha de generación: ${esc(fmtDate())}</p>
  </div>`);

  sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">Identificación del caso</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
    ${[
      ['Título',ci.title],['Número de radicado',ci.caseNumber],['Categoría',ci.category],['Sub-categoría',ci.subcategory],
      ['Actúa como',ci.actingAs],['Persona representada',ci.representedPerson],
      ['Departamento',ci.department],['Municipio',ci.municipality],
      ['Tipo de autoridad',ci.authorityType],['Autoridad',ci.authorityName],
      ['Entidad',ci.entity],['Dependencia',ci.dependency],
      ['Fecha de registro',ci.registeredAt]
    ].map(([k,v])=>`<tr><td style="padding:6px 10px;border:1px solid #e0d8c8;background:${CREAM};font-weight:bold;width:35%;color:${NAVY}">${esc(k)}</td><td style="padding:6px 10px;border:1px solid #e0d8c8">${esc(v||EMPTY_VALUE)}</td></tr>`).join('')}
  </table>`);

  sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">Resumen</h3>
  <p style="font-size:13px;line-height:1.7;margin-bottom:16px">${esc(report.summary||EMPTY_VALUE)}</p>`);

  sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">Hechos relevantes</h3>
  ${(report.facts||[]).map(f=>`<p style="font-size:13px;line-height:1.7;margin:4px 0">${esc(f)}</p>`).join('')}`);

  sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">Cronología</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
    <tr style="background:${NAVY};color:#fff"><th style="padding:6px 10px;text-align:left">Fecha</th><th style="padding:6px 10px;text-align:left">Evento</th></tr>
    ${(report.chronology||[]).map(c=>{const parts=c.split(' — ');return `<tr><td style="padding:5px 10px;border:1px solid #e0d8c8;white-space:nowrap">${esc(parts[0]||'')}</td><td style="padding:5px 10px;border:1px solid #e0d8c8">${esc(parts.slice(1).join(' — '))}</td></tr>`}).join('')}
  </table>`);

  sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">Documentos</h3>
  <ul style="font-size:13px;line-height:1.8">${(report.documents||[]).map(d=>`<li>${esc(d)}</li>`).join('')}</ul>`);

  sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">Plazos y fechas relevantes</h3>
  <ul style="font-size:13px;line-height:1.8">${(report.deadlines||[]).map(d=>`<li>${esc(d)}</li>`).join('')}</ul>`);

  const ia=report.initialAnalysis||{};
  if(ia.problemas){
    sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">${esc(ia.problemas.title)}</h3>
    <ul style="font-size:13px;line-height:1.8">${(ia.problemas.items||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`);
  }
  if(ia.derechos){
    sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">${esc(ia.derechos.title)}</h3>
    <ul style="font-size:13px;line-height:1.8">${(ia.derechos.items||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`);
  }
  if(ia.pendientes){
    sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">${esc(ia.pendientes.title)}</h3>
    <ul style="font-size:13px;line-height:1.8">${(ia.pendientes.items||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`);
  }
  if(ia.actuaciones){
    sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">${esc(ia.actuaciones.title)}</h3>
    <ul style="font-size:13px;line-height:1.8">${(ia.actuaciones.items||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`);
  }
  if(ia.riesgos){
    sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">${esc(ia.riesgos.title)}</h3>
    <ul style="font-size:13px;line-height:1.8">${(ia.riesgos.items||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`);
  }
  if(ia.inconsistencias){
    sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">${esc(ia.inconsistencias.title)}</h3>
    <ul style="font-size:13px;line-height:1.8">${(ia.inconsistencias.items||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`);
  }

  if(review&&review.findings&&review.findings.length){
    sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">Segunda revisión</h3>
    <p style="font-size:13px;font-style:italic;margin-bottom:8px">${esc(review.summary||'')}</p>
    ${review.findings.map((f,i)=>`<div style="margin:8px 0;padding:10px;border-left:3px solid ${GOLD};background:${CREAM}"><b style="color:${NAVY}">${i+1}. ${esc(f.type)}</b><p style="margin:4px 0 0;font-size:13px;line-height:1.6">${esc(f.detail)}</p></div>`).join('')}`);
  }

  if(ia.fuentes){
    sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">${esc(ia.fuentes.title)}</h3>
    <ul style="font-size:13px;line-height:1.8">${(ia.fuentes.items||[]).map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`);
  }

  sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">Observaciones</h3>
  <ul style="font-size:13px;line-height:1.8">${(report.observations||[]).map(o=>`<li>${esc(o)}</li>`).join('')}</ul>`);

  sections.push(`<h3 style="color:${NAVY};border-bottom:2px solid ${GOLD};padding-bottom:6px">Información pendiente</h3>
  <ul style="font-size:13px;line-height:1.8">${(report.pendingInfo||[]).map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`);

  sections.push(`<div style="margin-top:24px;padding:14px;border:2px solid ${GOLD};background:${CREAM};border-radius:8px">
    <p style="font-size:12px;color:${NAVY};text-align:center;margin:0;font-weight:bold">${esc(DISCLAIMER)}</p>
  </div>`);

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>LEXACASO — Informe de ${esc(ci.title||'Caso')}</title>
  <style>body{font-family:Georgia,'Times New Roman',serif;max-width:800px;margin:0 auto;padding:30px;color:#333}h3{margin-top:20px}ul{margin:8px 0 16px}</style>
  </head><body>${sections.join('\n')}</body></html>`;
}

export function downloadWord(caseData,report,review){
  const html=buildReportHtml(caseData,report,review);
  const blob=new Blob(['\ufeff',html],{type:'application/msword'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`LEXACASO_Informe_${(caseData.title||'caso').replace(/[^a-zA-Z0-9]/g,'_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadPdf(caseData,report,review){
  const { jsPDF } = await import('jspdf');
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const pw=210,mh=25,bw=170,lm=20;
  let y=mh+8;
  const ci=report.caseIdentification||{};

  doc.setFillColor(7,31,67);
  doc.rect(0,0,pw,mh+15,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(22);
  doc.text('LEXACASO',lm,mh);
  doc.setFontSize(10);
  doc.setTextColor(200,147,46);
  doc.text('Tu caso, en buenas manos',lm,mh+6);
  doc.setDrawColor(200,147,46);
  doc.setLineWidth(0.8);
  doc.line(lm,mh+9,lm+60,mh+9);

  y=mh+18;
  doc.setTextColor(7,31,67);
  doc.setFontSize(14);
  doc.text('Informe Integrado de Caso',lm,y);
  y+=6;
  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  doc.setTextColor(100,100,100);
  doc.text(`Fecha de generacion: ${fmtDate()}`,lm,y);
  y+=10;

  function addSectionTitle(title){
    if(y>270){doc.addPage();y=20}
    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.setTextColor(7,31,67);
    doc.text(title,lm,y);
    y+=2;
    doc.setDrawColor(200,147,46);
    doc.setLineWidth(0.5);
    doc.line(lm,y,lm+bw,y);
    y+=6;
  }

  function addText(text,opts={}){
    doc.setFont('helvetica',opts.bold?'bold':'normal');
    doc.setFontSize(opts.size||9);
    if(opts.color){doc.setTextColor(opts.color[0],opts.color[1],opts.color[2])}
    else if(opts.bold){doc.setTextColor(7,31,67)}
    else{doc.setTextColor(51,51,51)}
    const lines=doc.splitTextToSize(String(text),bw);
    for(const line of lines){
      if(y>275){doc.addPage();y=20}
      doc.text(line,lm,y);
      y+=opts.lineHeight||5;
    }
  }

  function addBullet(text){
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(51,51,51);
    const lines=doc.splitTextToSize(String(text),bw-6);
    for(let i=0;i<lines.length;i++){
      if(y>275){doc.addPage();y=20}
      if(i===0) doc.text('-',lm,y);
      doc.text(lines[i],lm+5,y);
      y+=5;
    }
  }

  addSectionTitle('Identificacion del caso');
  const idPairs=[
    ['Titulo',ci.title],['Numero de radicado',ci.caseNumber],['Categoria',ci.category],['Sub-categoria',ci.subcategory],
    ['Actua como',ci.actingAs],['Persona representada',ci.representedPerson],
    ['Departamento',ci.department],['Municipio',ci.municipality],
    ['Tipo de autoridad',ci.authorityType],['Autoridad',ci.authorityName],
    ['Entidad',ci.entity],['Dependencia',ci.dependency],['Fecha de registro',ci.registeredAt]
  ];
  for(const [k,v] of idPairs){
    if(y>270){doc.addPage();y=20}
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.setTextColor(7,31,67);
    doc.text(`${k}:`,lm,y);
    doc.setFont('helvetica','normal');
    doc.setTextColor(51,51,51);
    const valLines=doc.splitTextToSize(String(v||EMPTY_VALUE),bw-40);
    doc.text(valLines[0]||'',lm+38,y);
    y+=5;
    for(let i=1;i<valLines.length;i++){
      if(y>275){doc.addPage();y=20}
      doc.text(valLines[i],lm+38,y);
      y+=5;
    }
  }
  y+=4;

  addSectionTitle('Resumen');
  addText(report.summary||EMPTY_VALUE);
  y+=3;

  addSectionTitle('Hechos relevantes');
  for(const f of (report.facts||[])) addBullet(f);
  y+=3;

  addSectionTitle('Cronologia');
  for(const c of (report.chronology||[])) addBullet(c);
  y+=3;

  addSectionTitle('Documentos');
  for(const d of (report.documents||[])) addBullet(d);
  y+=3;

  addSectionTitle('Plazos y fechas relevantes');
  for(const d of (report.deadlines||[])) addBullet(d);
  y+=3;

  const ia=report.initialAnalysis||{};
  const iaOrder=['problemas','derechos','pendientes','actuaciones','riesgos','inconsistencias'];
  for(const key of iaOrder){
    if(ia[key]){
      addSectionTitle(ia[key].title);
      for(const item of (ia[key].items||[])) addBullet(item);
      y+=3;
    }
  }

  if(review&&review.findings&&review.findings.length){
    addSectionTitle('Segunda revision');
    addText(review.summary||'',{size:9});
    y+=2;
    review.findings.forEach((f,i)=>{
      if(y>265){doc.addPage();y=20}
      doc.setFillColor(251,248,240);
      const detailLines=doc.splitTextToSize(f.detail,bw-8);
      const boxH=8+detailLines.length*5;
      doc.rect(lm,y-3,bw,boxH,'F');
      doc.setDrawColor(200,147,46);
      doc.setLineWidth(1);
      doc.line(lm,y-3,lm,y-3+boxH);
      addText(`${i+1}. ${f.type}`,{bold:true,size:9,color:[7,31,67]});
      addText(f.detail,{size:9});
      y+=4;
    });
    y+=3;
  }

  if(ia.fuentes){
    addSectionTitle(ia.fuentes.title);
    for(const item of (ia.fuentes.items||[])) addBullet(item);
    y+=3;
  }

  addSectionTitle('Observaciones');
  for(const o of (report.observations||[])) addBullet(o);
  y+=3;

  addSectionTitle('Informacion pendiente');
  for(const p of (report.pendingInfo||[])) addBullet(p);
  y+=6;

  if(y>260){doc.addPage();y=20}
  doc.setFillColor(251,248,240);
  doc.setDrawColor(200,147,46);
  doc.setLineWidth(0.7);
  const dLines=doc.splitTextToSize(DISCLAIMER,bw-10);
  const boxH=8+dLines.length*5;
  doc.rect(lm,y,bw,boxH,'FD');
  doc.setFont('helvetica','bold');
  doc.setFontSize(9);
  doc.setTextColor(7,31,67);
  for(let i=0;i<dLines.length;i++){
    doc.text(dLines[i],lm+5,y+6+i*5);
  }

  doc.save(`LEXACASO_Informe_${(caseData.title||'caso').replace(/[^a-zA-Z0-9]/g,'_')}.pdf`);
}
