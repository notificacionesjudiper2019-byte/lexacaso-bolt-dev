import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {Scale,ShieldCheck,Upload,FolderOpen,ArrowRight,LogIn,LogOut,CirclePlus as PlusCircle,Clock3,FileText,Loader2,AlertCircle,CheckCircle2,User,ChevronDown,ChevronRight,MapPin,Gavel,FileStack,Users} from 'lucide-react';
import './styles.css';

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
const supabaseKey=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=createClient(supabaseUrl,supabaseKey);

const LEGAL_CATEGORIES=[
 'Acción de tutela','Acción popular','Acción de cumplimiento','Proceso ordinario','Proceso abreviado',
 'Procesos ejecutivos','Cobro coactivo','Proceso monitorio','Jurisdicción voluntaria','Incidente',
 'Medida cautelar','Acción de grupo','Otro'
];
const DEPARTMENTS=['Amazonas','Antioquia','Arauca','Atlántico','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Bogotá D.C.','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];
const AUTHORITY_TYPES=['Juzgado Civil','Juzgado Penal','Juzgado Laboral','Juzgado de Familia','Juzgado de Ejecución de Penas','Juzgado Promiscuo','Tribunal Superior','Consejo de Estado','Corte Suprema de Justicia','Corte Constitucional','Jurisdicción Especial para la Paz','Autoridad Administrativa','Entidad Pública','No sé','Otro'];
const DOCUMENT_TYPES=['Demanda','Tutela','Poder','Memorial','Auto','Sentencia','Decreto','Resolución','Acta','Contrato','Factura','Pagaré','Letra de cambio','Cheque','Otro documento','No sé'];

function App(){
 const [session,setSession]=useState(null),[mode,setMode]=useState('home'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[msg,setMsg]=useState(''),[cases,setCases]=useState([]);
 useEffect(()=>{
  supabase.auth.getSession().then(({data})=>setSession(data.session));
  const {data}=supabase.auth.onAuthStateChange((_e,s)=>{
    (async()=>{
      setSession(s);
    })();
  });
  return()=>data.subscription.unsubscribe();
 },[]);
 useEffect(()=>{if(session) loadCases()},[session]);
 async function auth(e){e.preventDefault();setMsg(''); const fn=mode==='login'?supabase.auth.signInWithPassword({email,password}):supabase.auth.signUp({email,password,options:{data:{full_name:name}}}); const {error}=await fn;if(error)setMsg(error.message);else setMsg(mode==='login'?'Sesión iniciada.':'Cuenta creada correctamente.')}
 async function loadCases(){
  const {data,error}=await supabase
   .from('cases')
   .select('id,title,status,priority,created_at,legal_category,acting_as')
   .eq('user_id',session.user.id)
   .order('created_at',{ascending:false});
  if(error){
   setCases([]);
  } else {
   setCases(data||[]);
  }
 }
 async function logout(){await supabase.auth.signOut();setMode('home')}
 return <div className="app">
  <header><div className="brand"><div className="logo"><Scale size={25}/></div><div><b>Expón tu caso</b><span>Orientación e información jurídica</span></div></div>{session?<button className="ghost" onClick={logout}><LogOut size={17}/> Salir</button>:<button className="ghost" onClick={()=>setMode('login')}><LogIn size={17}/> Ingresar</button>}</header>
  <main>
   {!session&&mode==='home'&&<section className="hero"><div className="badge"><ShieldCheck size={16}/> Espacio privado y organizado</div><h1>Expón tu caso.<br/><em>Ordena la información.</em></h1><p>Presenta hechos y documentos para organizar tu caso, generar resúmenes, cronologías y líneas de análisis. La plataforma ofrece información y orientación; no sustituye la asesoría o representación profesional.</p><button className="primary" onClick={()=>setMode('signup')}>Expón tu caso <ArrowRight size={18}/></button><div className="cards"><div><Upload/><b>Documentos</b><span>Adjunta archivos relevantes de forma privada.</span></div><div><FileText/><b>Análisis</b><span>Resumen, hechos, problemas y fuentes para revisión.</span></div><div><ShieldCheck/><b>Privacidad</b><span>Tu información queda separada por cuenta.</span></div></div></section>}
   {!session&&(mode==='login'||mode==='signup')&&<section className="auth"><button className="back" onClick={()=>setMode('home')}>← Volver</button><h2>{mode==='login'?'Ingresar':'Crear cuenta'}</h2><p>Tu cuenta permite mantener tus casos separados y privados.</p><form onSubmit={auth}>{mode==='signup'&&<input placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} required/>}<input type="email" placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} minLength="8" required/><button className="primary">{mode==='login'?'Ingresar':'Crear cuenta'}</button></form>{msg&&<div className="notice">{msg}</div>}<button className="link" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Crear una cuenta':'Ya tengo una cuenta'}</button></section>}
   {session&&<Dashboard session={session} cases={cases} refresh={loadCases}/>}
  </main>
  <footer>Plataforma de orientación e información jurídica y análisis documental automatizado · No constituye representación legal.</footer>
 </div>
}
function Dashboard({session,cases,refresh}){
 const [tab,setTab]=useState('cases');
 const [open,setOpen]=useState(false);
 const [msg,setMsg]=useState('');
 const [msgType,setMsgType]=useState('');
 const [caseNumber,setCaseNumber]=useState('');
 const [profileData,setProfileData]=useState(null);

 async function loadProfile(){
  const {data}=await supabase
   .from('profiles')
   .select('full_name,cedula,phone,address,email')
   .eq('id',session.user.id)
   .maybeSingle();
  setProfileData(data);
 }

 function closeForm(){
  setOpen(false);
  setMsg('');
  setMsgType('');
  setCaseNumber('');
 }

 return <section className="dashboard">
  <div className="tabs">
   <button className={tab==='cases'?'tab active':'tab'} onClick={()=>{setTab('cases');setMsg('');setMsgType('');setCaseNumber('')}}><FolderOpen size={17}/> Mis casos</button>
   <button className={tab==='profile'?'tab active':'tab'} onClick={()=>{setTab('profile');setMsg('');setMsgType('');setCaseNumber('')}}><User size={17}/> Mi perfil</button>
  </div>
  {tab==='cases'&&<>
   <div className="dashHead">
    <div>
     <div className="badge">Área privada</div>
     <h2>Mis casos</h2>
     <p>Organiza cada asunto y sus documentos en un solo lugar.</p>
    </div>
    <button className="primary" onClick={()=>{setMsg('');setMsgType('');setCaseNumber('');loadProfile();setOpen(true)}}><PlusCircle size={18}/> Nuevo caso</button>
   </div>
   {msg&&<div className={msgType==='error'?'notice error':msgType==='success'?'notice success':'notice'}>
    {msgType==='error'&&<AlertCircle size={18}/>}
    {msgType==='success'&&<CheckCircle2 size={18}/>}
    <span>{msg}</span>
    {caseNumber&&<div className="caseNumberLabel">Número de caso: <strong>{caseNumber}</strong></div>}
   </div>}
   {open&&<CaseForm session={session} profileData={profileData} saving={false} onClose={closeForm} onSaved={(id,m,t)=>{setCaseNumber(id);setMsg(m);setMsgType(t);refresh();}}/>}
   <div className="caseList">
    {cases.length?cases.map(c=><article className="case" key={c.id}><FolderOpen size={22}/><div><b>{c.title}</b><span>{[c.legal_category,c.acting_as==='representative'?'En representación':null].filter(Boolean).join(' · ')||c.status==='received'?'Recibido':c.status}</span></div><Clock3 size={17}/></article>):<div className="empty"><FolderOpen size={38}/><b>Aún no tienes casos</b><span>Comienza con "Nuevo caso".</span></div>}
   </div>
  </>}
  {tab==='profile'&&<ProfileForm session={session}/>}
 </section>
}
function CollapsibleSection({title,icon:Icon,defaultOpen,children,required}){
 const [openSection,setOpenSection]=useState(defaultOpen);
 return <div className="formSection">
  <button type="button" className="sectionHeader" onClick={()=>setOpenSection(!openSection)}>
   {openSection?<ChevronDown size={18}/>:<ChevronRight size={18}/>}
   {Icon&&<Icon size={18}/>}
   <span>{title}</span>
   {required&&<span className="req"> *</span>}
  </button>
  {openSection&&<div className="sectionBody">{children}</div>}
 </div>
}
function CaseForm({session,profileData,onClose,onSaved}){
 const [saving,setSaving]=useState(false);
 const [title,setTitle]=useState('');
 const [facts,setFacts]=useState('');
 const [file,setFile]=useState(null);
 const [actingAs,setActingAs]=useState('own');
 const [repRelationship,setRepRelationship]=useState('');
 const [repName,setRepName]=useState('');
 const [repCedula,setRepCedula]=useState('');
 const [repPhone,setRepPhone]=useState('');
 const [repAddress,setRepAddress]=useState('');
 const [legalCategory,setLegalCategory]=useState('');
 const [legalSubcategory,setLegalSubcategory]=useState('');
 const [department,setDepartment]=useState('');
 const [municipality,setMunicipality]=useState('');
 const [authorityType,setAuthorityType]=useState('');
 const [authorityName,setAuthorityName]=useState('');
 const [entity,setEntity]=useState('');
 const [dependency,setDependency]=useState('');
 const [caseNumberInput,setCaseNumberInput]=useState('');
 const [documentType,setDocumentType]=useState('');
 const [formError,setFormError]=useState('');

 async function createCase(e){
  e.preventDefault();
  setFormError('');
  if(!title.trim()){
   setFormError('El título del caso es obligatorio.');
   return;
  }
  if(!legalCategory){
   setFormError('Debes seleccionar una categoría jurídica.');
   return;
  }
  if(actingAs==='representative'&&!repName.trim()){
   setFormError('Cuando actúas en representación, el nombre de la persona representada es obligatorio.');
   return;
  }
  setSaving(true);
  try {
   const {data:user}=await supabase.auth.getUser();
   const caseData={
    user_id:user.user.id,
    title:title.trim(),
    facts:facts.trim()||null,
    acting_as:actingAs,
    representative_relationship:actingAs==='representative'?(repRelationship.trim()||null):null,
    represented_person_name:actingAs==='representative'?(repName.trim()||null):null,
    represented_person_cedula:actingAs==='representative'?(repCedula.trim()||null):null,
    represented_person_phone:actingAs==='representative'?(repPhone.trim()||null):null,
    represented_person_address:actingAs==='representative'?(repAddress.trim()||null):null,
    legal_category:legalCategory||null,
    legal_subcategory:legalSubcategory.trim()||null,
    department:department||null,
    municipality:municipality.trim()||null,
    authority_type:authorityType||null,
    authority_name:authorityName.trim()||null,
    entity:entity.trim()||null,
    dependency:dependency.trim()||null,
    case_number:caseNumberInput.trim()||null,
    document_type_received:documentType||null
   };
   const {data:c,error}=await supabase
    .from('cases')
    .insert(caseData)
    .select()
    .single();
   if(error){
    setFormError('No se pudo guardar el caso: '+error.message);
    setSaving(false);
    return;
   }
   if(file){
    const path=user.user.id+'/'+c.id+'/'+file.name;
    const up=await supabase.storage.from('case-documents').upload(path,file);
    if(up.error){
     setFormError('El caso se guardó pero no se pudo subir el documento: '+up.error.message);
     onSaved(c.id,'El caso se guardó pero el documento falló. Número: '+c.id,'error');
     setSaving(false);
     return;
    }
    const ins=await supabase.from('case_documents').insert({
     case_id:c.id,
     user_id:user.user.id,
     file_name:file.name,
     storage_path:path,
     content_type:file.type||null
    });
    if(ins.error){
     setFormError('El caso se guardó y el documento se subió, pero no se registró en la base de datos: '+ins.error.message);
     onSaved(c.id,'Caso guardado con problema en el documento. Número: '+c.id,'error');
     setSaving(false);
     return;
    }
   }
   // Success — reset everything
   resetForm();
   onSaved(c.id,'Caso guardado correctamente.','success');
  } catch(err){
   setFormError('Error inesperado al guardar el caso. Tus datos no se han perdido del formulario.');
  } finally {
   setSaving(false);
  }
 }

 function resetForm(){
  setTitle('');setFacts('');setFile(null);
  setActingAs('own');setRepRelationship('');setRepName('');setRepCedula('');setRepPhone('');setRepAddress('');
  setLegalCategory('');setLegalSubcategory('');
  setDepartment('');setMunicipality('');setAuthorityType('');setAuthorityName('');
  setEntity('');setDependency('');setCaseNumberInput('');setDocumentType('');
 }

 return <form className="caseForm extended" onSubmit={createCase}>
  {formError&&<div className="notice error"><AlertCircle size={18}/><span>{formError}</span></div>}

  {/* Section 1: Applicant data (pre-filled from profile) */}
  <CollapsibleSection title="Datos del solicitante" icon={User} defaultOpen={true}>
   <div className="sectionHint">
    {profileData?(
     <>Nombre: <strong>{profileData.full_name||'—'}</strong> · Cédula: <strong>{profileData.cedula||'—'}</strong> · Celular: <strong>{profileData.phone||'—'}</strong></>
    ):(
     <>Completa tu perfil en la pestaña "Mi perfil" para que estos datos se carguen automáticamente.</>
    )}
   </div>
  </CollapsibleSection>

  {/* Section 2: Representation */}
  <CollapsibleSection title="Representación" icon={Users} defaultOpen={true}>
   <div className="formGroup">
    <label>¿Actúas en nombre propio o en representación de otra persona?</label>
    <div className="radioRow">
     <label className={actingAs==='own'?'radioOpt active':'radioOpt'}>
      <input type="radio" name="actingAs" value="own" checked={actingAs==='own'} onChange={()=>setActingAs('own')} disabled={saving}/>
      Nombre propio
     </label>
     <label className={actingAs==='representative'?'radioOpt active':'radioOpt'}>
      <input type="radio" name="actingAs" value="representative" checked={actingAs==='representative'} onChange={()=>setActingAs('representative')} disabled={saving}/>
      Representación de otra persona
     </label>
    </div>
   </div>
   {actingAs==='representative'&&<>
    <div className="formGroup">
     <label>Relación con la persona representada</label>
     <input value={repRelationship} onChange={e=>setRepRelationship(e.target.value)} disabled={saving} placeholder="Ej: Hijo/a, apoderado, tutor..."/>
    </div>
    <div className="formGroup">
     <label>Nombre completo de la persona representada <span className="req">*</span></label>
     <input value={repName} onChange={e=>setRepName(e.target.value)} disabled={saving} placeholder="Nombre completo"/>
    </div>
    <div className="formGrid2">
     <div className="formGroup">
      <label>Cédula de la persona representada</label>
      <input value={repCedula} onChange={e=>setRepCedula(e.target.value)} disabled={saving} placeholder="Opcional"/>
     </div>
     <div className="formGroup">
      <label>Celular de la persona representada</label>
      <input value={repPhone} onChange={e=>setRepPhone(e.target.value)} disabled={saving} placeholder="Opcional"/>
     </div>
    </div>
    <div className="formGroup">
     <label>Dirección de la persona representada</label>
     <input value={repAddress} onChange={e=>setRepAddress(e.target.value)} disabled={saving} placeholder="Opcional"/>
    </div>
   </>}
  </CollapsibleSection>

  {/* Section 3: Legal category */}
  <CollapsibleSection title="Categoría jurídica" icon={Gavel} defaultOpen={true} required>
   <div className="formGroup">
    <label>Categoría jurídica principal <span className="req">*</span></label>
    <select value={legalCategory} onChange={e=>{setLegalCategory(e.target.value);setLegalSubcategory('')}} disabled={saving}>
     <option value="">Selecciona una categoría...</option>
     {LEGAL_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
    </select>
   </div>
   <div className="formGroup">
    <label>Sub-categoría (opcional)</label>
    <input value={legalSubcategory} onChange={e=>setLegalSubcategory(e.target.value)} disabled={saving} placeholder="Ej: Tipo específico de proceso..."/>
   </div>
  </CollapsibleSection>

  {/* Section 4: Location and authority */}
  <CollapsibleSection title="Ubicación y despacho" icon={MapPin} defaultOpen={false}>
   <div className="formGrid2">
    <div className="formGroup">
     <label>Departamento</label>
     <select value={department} onChange={e=>{setDepartment(e.target.value);setMunicipality('')}} disabled={saving}>
      <option value="">No sé / Dejar vacío</option>
      {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
     </select>
    </div>
    <div className="formGroup">
     <label>Municipio</label>
     <input value={municipality} onChange={e=>setMunicipality(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/>
    </div>
   </div>
   <div className="formGrid2">
    <div className="formGroup">
     <label>Tipo de autoridad / despacho</label>
     <select value={authorityType} onChange={e=>setAuthorityType(e.target.value)} disabled={saving}>
      <option value="">No sé / Dejar vacío</option>
      {AUTHORITY_TYPES.map(a=><option key={a} value={a}>{a}</option>)}
     </select>
    </div>
    <div className="formGroup">
     <label>Nombre del despacho / autoridad</label>
     <input value={authorityName} onChange={e=>setAuthorityName(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/>
    </div>
   </div>
  </CollapsibleSection>

  {/* Section 5: Process data */}
  <CollapsibleSection title="Datos del proceso" icon={FileStack} defaultOpen={false}>
   <div className="formGrid2">
    <div className="formGroup">
     <label>Entidad (para asuntos no judiciales)</label>
     <input value={entity} onChange={e=>setEntity(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/>
    </div>
    <div className="formGroup">
     <label>Dependencia</label>
     <input value={dependency} onChange={e=>setDependency(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/>
    </div>
   </div>
   <div className="formGrid2">
    <div className="formGroup">
     <label>Número de proceso / radicado</label>
     <input value={caseNumberInput} onChange={e=>setCaseNumberInput(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/>
    </div>
    <div className="formGroup">
     <label>Tipo de documento recibido</label>
     <select value={documentType} onChange={e=>setDocumentType(e.target.value)} disabled={saving}>
      <option value="">No sé / Dejar vacío</option>
      {DOCUMENT_TYPES.map(d=><option key={d} value={d}>{d}</option>)}
     </select>
    </div>
   </div>
  </CollapsibleSection>

  {/* Core: title and facts */}
  <CollapsibleSection title="Hechos del caso" icon={FileText} defaultOpen={true}>
   <div className="formGroup">
    <label>Título del caso <span className="req">*</span></label>
    <input value={title} onChange={e=>setTitle(e.target.value)} disabled={saving} placeholder="Ej: Cobro de honorarios profesionales"/>
   </div>
   <div className="formGroup">
    <label>Hechos principales</label>
    <textarea value={facts} onChange={e=>setFacts(e.target.value)} rows="5" disabled={saving} placeholder="Cuéntanos los hechos principales..."/>
   </div>
  </CollapsibleSection>

  {/* Document upload */}
  <div className="formGroup">
   <label className="upload"><Upload size={20}/><span>{file?file.name:'Adjuntar documento (opcional)'}</span><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} disabled={saving}/></label>
  </div>

  <div className="row">
   <button type="submit" className="primary" disabled={saving}>
    {saving?<><Loader2 size={18} className="spin"/> Guardando...</>:'Guardar caso'}
   </button>
   <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button>
  </div>
 </form>
}
function ProfileForm({session}){
 const [fullName,setFullName]=useState('');
 const [cedula,setCedula]=useState('');
 const [phone,setPhone]=useState('');
 const [address,setAddress]=useState('');
 const [email,setEmail]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [msg,setMsg]=useState('');
 const [msgType,setMsgType]=useState('');
 const [errors,setErrors]=useState({});

 useEffect(()=>{loadProfile()},[]);

 async function loadProfile(){
  setLoading(true);
  const {data,error}=await supabase
   .from('profiles')
   .select('full_name,cedula,phone,address,email')
   .eq('id',session.user.id)
   .maybeSingle();
  if(error){
   setMsg('No se pudo cargar tu perfil: '+error.message);
   setMsgType('error');
  } else if(data){
   setFullName(data.full_name||'');
   setCedula(data.cedula||'');
   setPhone(data.phone||'');
   setAddress(data.address||'');
   setEmail(data.email||session.user.email||'');
  } else {
   setFullName(session.user.user_metadata?.full_name||'');
   setEmail(session.user.email||'');
  }
  setLoading(false);
 }

 function validate(){
  const e={};
  if(!fullName.trim()) e.fullName='El nombre completo es obligatorio.';
  if(!cedula.trim()) e.cedula='La cédula es obligatoria.';
  else if(!/^\d{5,12}$/.test(cedula.trim())) e.cedula='La cédula debe tener entre 5 y 12 dígitos.';
  if(!phone.trim()) e.phone='El celular es obligatorio.';
  else if(!/^3\d{8,9}$/.test(phone.trim())) e.phone='El celular debe ser un número colombiano válido (ej: 3101234567).';
  if(!address.trim()) e.address='La dirección es obligatoria.';
  if(!email.trim()) e.email='El correo electrónico es obligatorio.';
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email='El correo electrónico no es válido.';
  setErrors(e);
  return Object.keys(e).length===0;
 }

 async function saveProfile(e){
  e.preventDefault();
  setMsg('');
  setMsgType('');
  if(!validate()){
   setMsg('Por favor corrige los campos marcados en rojo.');
   setMsgType('error');
   return;
  }
  setSaving(true);
  const {data:existing}=await supabase
   .from('profiles')
   .select('id')
   .eq('id',session.user.id)
   .maybeSingle();
  if(existing){
   const {error}=await supabase
    .from('profiles')
    .update({full_name:fullName.trim(),cedula:cedula.trim(),phone:phone.trim(),address:address.trim(),email:email.trim()})
    .eq('id',session.user.id);
   if(error){
    setMsg('No se pudo actualizar tu perfil: '+error.message);
    setMsgType('error');
   } else {
    setMsg('Perfil actualizado correctamente.');
    setMsgType('success');
   }
  } else {
   const {error}=await supabase
    .from('profiles')
    .insert({id:session.user.id,full_name:fullName.trim(),cedula:cedula.trim(),phone:phone.trim(),address:address.trim(),email:email.trim()});
   if(error){
    setMsg('No se pudo crear tu perfil: '+error.message);
    setMsgType('error');
   } else {
    setMsg('Perfil creado correctamente.');
    setMsgType('success');
   }
  }
  setSaving(false);
 }

 if(loading){
  return <div className="profileLoading"><Loader2 size={28} className="spin"/><span>Cargando tu perfil...</span></div>;
 }

 return <div className="profileSection">
  <div className="dashHead"><div><div className="badge"><User size={14}/> Datos personales</div><h2>Mi perfil</h2><p>Tu información personal se mantiene privada y separada por cuenta.</p></div></div>
  {msg&&<div className={msgType==='error'?'notice error':msgType==='success'?'notice success':'notice'}>
   {msgType==='error'&&<AlertCircle size={18}/>}
   {msgType==='success'&&<CheckCircle2 size={18}/>}
   <span>{msg}</span>
  </div>}
  <form className="profileForm" onSubmit={saveProfile}>
   <div className="formGroup">
    <label>Nombre completo <span className="req">*</span></label>
    <input value={fullName} onChange={e=>setFullName(e.target.value)} disabled={saving} className={errors.fullName?'inputError':''}/>
    {errors.fullName&&<span className="fieldError">{errors.fullName}</span>}
   </div>
   <div className="formGroup">
    <label>Cédula <span className="req">*</span></label>
    <input value={cedula} onChange={e=>setCedula(e.target.value)} disabled={saving} placeholder="Ej: 12345678" className={errors.cedula?'inputError':''}/>
    {errors.cedula&&<span className="fieldError">{errors.cedula}</span>}
   </div>
   <div className="formGroup">
    <label>Celular <span className="req">*</span></label>
    <input value={phone} onChange={e=>setPhone(e.target.value)} disabled={saving} placeholder="Ej: 3101234567" className={errors.phone?'inputError':''}/>
    {errors.phone&&<span className="fieldError">{errors.phone}</span>}
   </div>
   <div className="formGroup">
    <label>Dirección <span className="req">*</span></label>
    <input value={address} onChange={e=>setAddress(e.target.value)} disabled={saving} placeholder="Ej: Calle 123 #45-67" className={errors.address?'inputError':''}/>
    {errors.address&&<span className="fieldError">{errors.address}</span>}
   </div>
   <div className="formGroup">
    <label>Correo electrónico <span className="req">*</span></label>
    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={saving} className={errors.email?'inputError':''}/>
    {errors.email&&<span className="fieldError">{errors.email}</span>}
   </div>
   <div className="row">
    <button type="submit" className="primary" disabled={saving}>
     {saving?<><Loader2 size={18} className="spin"/> Guardando...</>:'Guardar perfil'}
    </button>
   </div>
  </form>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
