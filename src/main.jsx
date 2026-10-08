import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import { Scale, ShieldCheck, Upload, FolderOpen, ArrowRight, LogIn, LogOut, CirclePlus as PlusCircle, Clock3, FileText, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, User, ChevronDown, ChevronRight, MapPin, Gavel, FileStack, Users, ArrowLeft, Download, Trash2, Calendar, MessageCircle, Plus, Activity, Settings, Search, LockKeyhole, UserCog, SquareCheck as CheckSquare, Bell, CreditCard as Edit3, EyeOff, Eye, Sparkles, FileCheck, RefreshCw, TriangleAlert as AlertTriangle, Mail, Gavel as CourtIcon, Link as LinkIcon, Archive, Send, KeyRound, Phone } from 'lucide-react';
import {buildInitialAnalysis,buildSecondReview,buildIntegratedReport} from './analysis';
import {downloadWord,downloadPdf} from './analysisExports';
import './styles.css';

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
const supabaseKey=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=createClient(supabaseUrl,supabaseKey);

const LEGAL_CATALOG=[
 {name:'Acción de tutela',sub:[]},
 {name:'Acción popular',sub:[]},
 {name:'Acción de cumplimiento',sub:[]},
 {name:'Proceso ordinario',sub:[]},
 {name:'Proceso abreviado',sub:[]},
 {name:'Procesos ejecutivos',sub:[
  'Ejecutivo de alimentos','Ejecutivo singular','Ejecutivo con garantía real','Ejecutivo hipotecario',
  'Ejecutivo prendario','Ejecutivo de título valor','Ejecutivo de factura','Ejecutivo de pagaré',
  'Ejecutivo de letra de cambio','Ejecutivo de cheque','Ejecutivo de sentencia',
  'Ejecutivo de obligación clara, expresa y exigible','Ejecutivo de mínima cuantía','Otro ejecutivo'
 ]},
 {name:'Cobro coactivo',sub:[
  'Entidad pública','Impuesto','Multa','Comparendo','Obligación administrativa','Otra'
 ]},
 {name:'Proceso monitorio',sub:[]},
 {name:'Jurisdicción voluntaria',sub:[]},
 {name:'Incidente',sub:[]},
 {name:'Medida cautelar',sub:[]},
 {name:'Acción de grupo',sub:[]},
 {name:'Otro',sub:[]},
 {name:'No sé / necesito orientación',sub:[]}
];
const DEPARTMENTS=['Amazonas','Antioquia','Arauca','Atlántico','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Bogotá D.C.','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];
const AUTHORITY_TYPES=['Juzgado Civil','Juzgado Penal','Juzgado Laboral','Juzgado de Familia','Juzgado de Ejecución de Penas','Juzgado Promiscuo','Tribunal Superior','Consejo de Estado','Corte Suprema de Justicia','Corte Constitucional','Jurisdicción Especial para la Paz','Autoridad Administrativa','Entidad Pública','No sé','Otro'];
const DOCUMENT_TYPES=['Demanda','Tutela','Poder','Memorial','Auto','Sentencia','Decreto','Resolución','Acta','Contrato','Factura','Pagaré','Letra de cambio','Cheque','Otro documento','No sé'];
const TERM_DURATIONS=['3 días','5 días','10 días','15 días','30 días','Otro'];
const ACTION_TYPES=['Demanda presentada','Derecho de petición','Audiencia','Notificación','Auto','Sentencia','Recurso','Oficio','Reunión','Recolección de pruebas','Respuesta de entidad','Otro'];
const ACTION_STATUSES=[
 {value:'pending',label:'Pendiente'},
 {value:'in_progress',label:'En trámite'},
 {value:'completed',label:'Realizada'},
 {value:'received',label:'Recibida'},
 {value:'replied',label:'Respondida'},
 {value:'expired',label:'Vencida'},
 {value:'finalized',label:'Finalizada'},
 {value:'cancelled',label:'Cancelada'}
];
const WHATSAPP_NUMBER='57310560386';
const WHATSAPP_MSG='Hola, necesito ayuda con mi caso en LEXACASO.';
const POLICY_VERSION='1.0.0';
const CONSENT_TEXT='Autorizo el tratamiento de mis datos personales conforme al Aviso de Privacidad y la Política de Tratamiento de Datos Personales.';

function App(){
 const [session,setSession]=useState(null),[mode,setMode]=useState('home'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[msg,setMsg]=useState(''),[cases,setCases]=useState([]),[signupCedula,setSignupCedula]=useState(''),[signupPhone,setSignupPhone]=useState(''),[termsAccepted,setTermsAccepted]=useState(false),[dataAuthAccepted,setDataAuthAccepted]=useState(false);
 const [userRole,setUserRole]=useState(null);
 const [roleLoading,setRoleLoading]=useState(true);
 const [route,setRoute]=useState('dashboard');
 const [pendingCaseId,setPendingCaseId]=useState(null);
 useEffect(()=>{
  supabase.auth.getSession().then(({data})=>setSession(data.session));
  const {data}=supabase.auth.onAuthStateChange((_e,s)=>{
    (async()=>{
      setSession(s);
      if(!s){setCases([]);setEmail('');setPassword('');setName('');setMsg('');setSignupCedula('');setSignupPhone('');setTermsAccepted(false);setDataAuthAccepted(false);setUserRole(null);setRoleLoading(true);setRoute('dashboard');const h=window.location.hash.replace('#/','').replace('#','');if(h==='reset-password')setMode('reset-password');}
    })();
  });
  return()=>data.subscription.unsubscribe();
 },[]);
 useEffect(()=>{
  if(!session){setUserRole(null);setRoleLoading(true);return}
  (async()=>{
   setRoleLoading(true);
   const {data:profile}=await supabase.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
   const role=(profile?.role)||(session.user.email==='notipersonales2026@gmail.com'?'admin':'client');
   setUserRole(role);
   setRoleLoading(false);
   const hash=window.location.hash.replace('#/','').replace('#','');
   if(hash==='admin'){setRoute(role==='admin'?'admin':'dashboard')}else if(hash==='dashboard'){setRoute('dashboard')}else{setRoute(role==='admin'?'admin':'dashboard')}
  })();
 },[session]);
 useEffect(()=>{if(session) loadCases();else setCases([])},[session]);
 useEffect(()=>{
  const onHashChange=()=>{
   if(!session)return;
   const hash=window.location.hash.replace('#/','').replace('#','');
   if(hash==='admin'){setRoute(userRole==='admin'?'admin':'dashboard')}
   else if(hash==='dashboard'){setRoute('dashboard')}
  };
  window.addEventListener('hashchange',onHashChange);
  return()=>window.removeEventListener('hashchange',onHashChange);
 },[session,userRole]);
 useEffect(()=>{if(session&&route)window.location.hash=`#/${route}`},[session,route]);
 async function auth(e){e.preventDefault();setMsg('');try{if(mode==='login'){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setMsg(error.message);else setMsg('Sesión iniciada.')}else{if(mode==='forgot'){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/#/reset-password`});if(error){setMsg(error.message);return}setMsg('Te enviamos un enlace de restablecimiento a tu correo.');return}if(mode==='reset-password'){if(password.length<8){setMsg('La contraseña debe tener al menos 8 caracteres.');return}const {error}=await supabase.auth.updateUser({password});if(error){setMsg(error.message);return}setMsg('Contraseña actualizada correctamente. Ya puedes ingresar.');setMode('login');return}if(!name.trim()){setMsg('El nombre completo es obligatorio.');return}if(!signupCedula.trim()){setMsg('La cédula o documento de identidad es obligatorio.');return}if(!signupPhone.trim()){setMsg('El teléfono de contacto es obligatorio.');return}if(!termsAccepted){setMsg('Debes aceptar los Términos y Condiciones del servicio.');return}if(!dataAuthAccepted){setMsg('Debes autorizar el tratamiento de tus datos personales conforme a la Ley 1581 de 2012.');return}const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name.trim(),cedula:signupCedula.trim(),phone:signupPhone.trim(),data_consent:true,consent_date:new Date().toISOString()}}});if(error){setMsg(error.message);return}if(data.user){try{await supabase.from('profiles').upsert({id:data.user.id,full_name:name.trim(),cedula:signupCedula.trim(),phone:signupPhone.trim(),email:email,data_consent:true,consent_date:new Date().toISOString()},{onConflict:'id'})}catch(profileErr){}try{fetch(`${supabaseUrl}/functions/v1/send-email`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${supabaseKey}`},body:JSON.stringify({type:'new_client',client_name:name.trim()||email,client_email:email})}).catch(()=>{})}catch(emailErr){}}setMsg('Cuenta creada correctamente.')}}catch(err){setMsg('Ocurrió un error inesperado. Intenta nuevamente.')}}
 async function loadCases(){
  const {data,error}=await supabase
   .from('cases')
   .select('id,title,status,priority,created_at,legal_category,legal_subcategory,acting_as,has_deadline,term_end_date')
   .eq('user_id',session.user.id)
   .order('created_at',{ascending:false});
  if(error){
   setCases([]);
  } else {
   setCases(data||[]);
  }
 }
 function navigate(target){
  if(target==='admin'&&userRole!=='admin'){setRoute('dashboard');return}
  setRoute(target);
 }
 function handleAdminOpenCase(id){setPendingCaseId(id);setRoute('dashboard')}
 async function logout(){await supabase.auth.signOut();setCases([]);setEmail('');setPassword('');setName('');setMsg('');setUserRole(null);setRoute('dashboard');if(window.location.hash)history.replaceState(null,'',window.location.pathname+window.location.search)}
 return <div className="app">
  <header><div className="brand"><div className="logo"><img src="/lexacaso.jpeg" alt="LEXACASO"/></div><div><b>LEXACASO</b><span>Tu caso, en buenas manos</span></div></div>
   <div className="headerRight">
    {session&&userRole==='admin'&&<button className={route==='admin'?'ghost activeNav':'ghost'} onClick={()=>navigate('admin')}><Settings size={16}/> Admin</button>}
    {session&&<button className={route==='dashboard'?'ghost activeNav':'ghost'} onClick={()=>navigate('dashboard')}><FolderOpen size={16}/> Mi panel</button>}
    {session?<button className="ghost" onClick={logout}><LogOut size={17}/> Salir</button>:<button className="ghost" onClick={()=>setMode('login')}><LogIn size={17}/> Ingresar</button>}
   </div>
  </header>
  <main>
   {!session&&mode==='home'&&<section className="hero"><div className="badge"><ShieldCheck size={16}/> Espacio privado y organizado</div><h1>Expón tu caso.<br/><em>Ordena la información.</em></h1><p>Presenta hechos y documentos para organizar tu caso, generar resúmenes, cronologías y líneas de análisis. La plataforma ofrece información y orientación; no sustituye la asesoría o representación profesional.</p><button className="primary" onClick={()=>setMode('signup')}>Expón tu caso <ArrowRight size={18}/></button><div className="cards"><div><Upload/><b>Documentos</b><span>Adjunta archivos relevantes de forma privada.</span></div><div><FileText/><b>Análisis</b><span>Resumen, hechos, problemas y fuentes para revisión.</span></div><div><ShieldCheck/><b>Privacidad</b><span>Tu información queda separada por cuenta.</span></div></div></section>}
   {!session&&(mode==='login'||mode==='signup')&&<section className="auth"><button className="back" onClick={()=>setMode('home')}>← Volver</button><h2>{mode==='login'?'Ingresar':'Crear cuenta'}</h2><p>Tu cuenta permite mantener tus casos separados y privados.</p><form onSubmit={auth}>{mode==='signup'&&<><div className="formGroup"><label>Nombre completo <span className="req">*</span></label><input placeholder="Nombre y apellidos" value={name} onChange={e=>setName(e.target.value)} required disabled={false}/></div><div className="formGroup"><label>Cédula de ciudadanía / Documento de identidad <span className="req">*</span></label><input placeholder="Ej: 12345678" value={signupCedula} onChange={e=>setSignupCedula(e.target.value)} required disabled={false}/></div><div className="formGroup"><label>Teléfono de contacto <span className="req">*</span></label><input placeholder="Ej: 3101234567" value={signupPhone} onChange={e=>setSignupPhone(e.target.value)} required disabled={false}/></div></>}<input type="email" placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} minLength="8" required/>{mode==='signup'&&<><label className="consentCheck"><input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} required/><span><strong>Acepto los Términos y Condiciones del servicio.</strong></span></label><label className="consentCheck"><input type="checkbox" checked={dataAuthAccepted} onChange={e=>setDataAuthAccepted(e.target.checked)} required/><span><strong>Autorizo el Tratamiento de mis Datos Personales</strong> conforme a la Ley 1581 de 2012 y la Política de Privacidad de LEXACASO.</span></label></>}<button className="primary">{mode==='login'?'Ingresar':'Crear cuenta'}</button></form>{msg&&<div className="notice">{msg}</div>}{mode==='login'&&<button className="link" style={{display:'block',textAlign:'center',margin:'12px auto 0'}} onClick={()=>{setMsg('');setMode('forgot')}}><KeyRound size={14} style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}/>¿Olvidaste tu contraseña?</button>}<button className="link" onClick={()=>{setMsg('');setMode(mode==='login'?'signup':'login')}} style={{display:'block',textAlign:'center',margin:'12px auto 0'}}>{mode==='login'?'Crear una cuenta':'Ya tengo una cuenta'}</button></section>}
   {!session&&mode==='forgot'&&<section className="auth"><button className="back" onClick={()=>{setMsg('');setMode('login')}}>← Volver a iniciar sesión</button><h2>Recuperar contraseña</h2><p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p><form onSubmit={auth}><input type="email" placeholder="Correo electrónico" value={email} onChange={e=>setEmail(e.target.value)} required/><button className="primary"><Mail size={16}/> Enviar enlace</button></form>{msg&&<div className="notice">{msg}</div>}<button className="link" onClick={()=>{setMsg('');setMode('login')}} style={{display:'block',textAlign:'center',margin:'12px auto 0'}}>Volver a iniciar sesión</button></section>}
   {!session&&mode==='reset-password'&&<section className="auth"><button className="back" onClick={()=>{setMsg('');setMode('login')}}>← Volver a iniciar sesión</button><h2>Nueva contraseña</h2><p>Ingresa tu nueva contraseña para completar el restablecimiento.</p><form onSubmit={auth}><input type="password" placeholder="Nueva contraseña (mínimo 8 caracteres)" value={password} onChange={e=>setPassword(e.target.value)} minLength="8" required/><button className="primary"><KeyRound size={16}/> Actualizar contraseña</button></form>{msg&&<div className="notice">{msg}</div>}</section>}
   {session&&roleLoading&&<div className="profileLoading"><Loader2 size={28} className="spin"/><span>Cargando tu panel...</span></div>}
   {session&&!roleLoading&&userRole==='admin'&&route==='admin'&&<AdminPanel session={session} onOpenCase={handleAdminOpenCase}/>}
   {session&&!roleLoading&&route==='dashboard'&&<Dashboard session={session} cases={cases} refresh={loadCases} userRole={userRole} pendingCaseId={pendingCaseId} onPendingCaseConsumed={()=>setPendingCaseId(null)}/>}
  </main>
  <footer>Plataforma de orientación e información jurídica y análisis documental automatizado · No constituye representación legal.</footer>
  <WhatsAppButton/>
 </div>
}
function WhatsAppButton(){
 const waUrl=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
 return <a href={waUrl} target="_blank" rel="noopener noreferrer" className="waButton" title="¿Necesitas ayuda? Escríbenos por WhatsApp.">
  <MessageCircle size={26}/>
  <span className="waTooltip">¿Necesitas ayuda? Escríbenos por WhatsApp.</span>
 </a>
}
function Dashboard({session,cases,refresh,userRole,pendingCaseId,onPendingCaseConsumed}){
 const [tab,setTab]=useState('cases');
 const [open,setOpen]=useState(false);
 const [msg,setMsg]=useState('');
 const [msgType,setMsgType]=useState('');
 const [caseNumber,setCaseNumber]=useState('');
 const [profileData,setProfileData]=useState(null);
 const [selectedCaseId,setSelectedCaseId]=useState(null);
 const [isAdmin,setIsAdmin]=useState(userRole==='admin');
 const [unreadCount,setUnreadCount]=useState(0);
 useEffect(()=>{setIsAdmin(userRole==='admin')},[userRole]);
 useEffect(()=>{supabase.rpc('is_admin').then(({data})=>setIsAdmin(data===true))},[session.user.id]);
 useEffect(()=>{loadUnread()},[session.user.id]);
 useEffect(()=>{
  if(pendingCaseId){setSelectedCaseId(pendingCaseId);onPendingCaseConsumed&&onPendingCaseConsumed()}
 },[pendingCaseId,onPendingCaseConsumed]);
 async function loadUnread(){const {data}=await supabase.from('notifications').select('id',{count:'exact'}).eq('user_id',session.user.id).eq('is_read',false);setUnreadCount(data?data.length:0)}

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

 if(selectedCaseId){
  return <CaseDetail session={session} caseId={selectedCaseId} isAdmin={isAdmin} onBack={()=>{setSelectedCaseId(null);refresh();loadUnread()}}/>
 }

 return <section className="dashboard">
  <div className="tabs">
   <button className={tab==='cases'?'tab active':'tab'} onClick={()=>{setTab('cases');setMsg('');setMsgType('');setCaseNumber('')}}><FolderOpen size={17}/> Mis casos</button>
   <button className={tab==='profile'?'tab active':'tab'} onClick={()=>{setTab('profile');setMsg('');setMsgType('');setCaseNumber('')}}><User size={17}/> Mi perfil</button>
   <button className={tab==='notifications'?'tab active':'tab'} onClick={()=>{setTab('notifications');setMsg('');setMsgType('');setCaseNumber('')}}><Bell size={17}/> Notificaciones{unreadCount>0&&<span className="tabBadge">{unreadCount}</span>}</button>
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
   {open&&<CaseForm session={session} profileData={profileData} onClose={closeForm} onSaved={(id,m,t)=>{setCaseNumber(id);setMsg(m);setMsgType(t);refresh();}}/>}
   <div className="caseList">
    {cases.length?cases.map(c=>{
     const deadlineInfo=c.has_deadline==='yes'&&c.term_end_date?`Vence: ${c.term_end_date}`:null;
     const subInfo=[c.legal_category,c.legal_subcategory,c.acting_as==='representative'?'En representación':null,deadlineInfo].filter(Boolean).join(' · ');
     return <article className="case clickable" key={c.id} onClick={()=>setSelectedCaseId(c.id)}>
      <FolderOpen size={22}/>
      <div><b>{c.title}</b><span>{subInfo||c.status==='received'?'Recibido':c.status}</span></div>
      <ArrowRight size={17}/>
     </article>
    }):<div className="empty"><FolderOpen size={38}/><b>Aún no tienes casos</b><span>Comienza con "Nuevo caso".</span></div>}
   </div>
  </>}
  {tab==='profile'&&<ProfileForm session={session}/>}
  {tab==='notifications'&&<NotificationsPanel session={session} onOpenCase={(id)=>{setSelectedCaseId(id)}} onRead={loadUnread}/>}
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
 const [hasDeadline,setHasDeadline]=useState('unknown');
 const [termDuration,setTermDuration]=useState('');
 const [termCustomDuration,setTermCustomDuration]=useState('');
 const [termStartDate,setTermStartDate]=useState('');
 const [termEndDate,setTermEndDate]=useState('');
 const [formError,setFormError]=useState('');
 const [consentAccepted,setConsentAccepted]=useState(false);

 useEffect(()=>{
  supabase.from('data_consents').select('id').eq('user_id',session.user.id).eq('policy_version',POLICY_VERSION).limit(1).maybeSingle().then(({data})=>setConsentAccepted(Boolean(data)));
 },[session.user.id]);

 useEffect(()=>{
  if(hasDeadline==='yes'&&termDuration&&termDuration!=='Otro'&&termStartDate){
   const days=parseInt(termDuration);
   if(!isNaN(days)){
    const start=new Date(termStartDate);
    start.setDate(start.getDate()+days);
    setTermEndDate(start.toISOString().split('T')[0]);
   }
  }
 },[hasDeadline,termDuration,termStartDate]);

 function getFinalDuration(){
  if(termDuration==='Otro') return termCustomDuration.trim()||null;
  return termDuration||null;
 }

 async function createCase(e){
  e.preventDefault();
  setFormError('');
  if(!consentAccepted){setFormError('Debes aceptar el Aviso de Privacidad y la Política de Tratamiento de Datos Personales para crear un caso.');return}
  if(!title.trim()){setFormError('El título del caso es obligatorio.');return}
  if(!legalCategory){setFormError('Debes seleccionar una categoría jurídica.');return}
  const catEntry=LEGAL_CATALOG.find(c=>c.name===legalCategory);
  if(catEntry&&catEntry.sub.length>0&&!legalSubcategory){setFormError('Debes seleccionar una sub-categoría para "'+legalCategory+'".');return}
  if(actingAs==='representative'&&!repName.trim()){setFormError('Cuando actúas en representación, el nombre de la persona representada es obligatorio.');return}
  if(hasDeadline==='yes'&&termStartDate&&termEndDate){
   if(new Date(termEndDate)<new Date(termStartDate)){setFormError('La fecha límite no puede ser anterior a la fecha de inicio.');return}
  }
  setSaving(true);
  try {
   const {data:user}=await supabase.auth.getUser();
   const {data:existingConsent}=await supabase.from('data_consents').select('id').eq('user_id',user.user.id).eq('policy_version',POLICY_VERSION).limit(1).maybeSingle();
   if(!existingConsent){
    const {error:consentError}=await supabase.from('data_consents').insert({user_id:user.user.id,policy_version:POLICY_VERSION,user_agent:navigator.userAgent});
    if(consentError){setFormError('No se pudo registrar la autorización de datos. Intenta nuevamente.');setSaving(false);return}
   }
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
    document_type_received:documentType||null,
    has_deadline:hasDeadline,
    term_duration:hasDeadline==='yes'?(getFinalDuration()):null,
    term_start_date:hasDeadline==='yes'?(termStartDate||null):null,
    term_end_date:hasDeadline==='yes'?(termEndDate||null):null
   };
   const {data:c,error}=await supabase.from('cases').insert(caseData).select().single();
   if(error){setFormError('No se pudo guardar el caso: '+error.message);setSaving(false);return}
   if(file){
    const path=user.user.id+'/'+c.id+'/'+file.name;
    const up=await supabase.storage.from('case-documents').upload(path,file);
    if(up.error){
     setFormError('El caso se guardó pero no se pudo subir el documento: '+up.error.message);
     onSaved(c.id,'El caso se guardó pero el documento falló. Número: '+c.id,'error');
     setSaving(false);return;
    }
    const ins=await supabase.from('case_documents').insert({case_id:c.id,user_id:user.user.id,file_name:file.name,storage_path:path,content_type:file.type||null});
    if(ins.error){
     setFormError('El caso se guardó y el documento se subió, pero no se registró en la base de datos: '+ins.error.message);
     onSaved(c.id,'Caso guardado con problema en el documento. Número: '+c.id,'error');
     setSaving(false);return;
    }
   }
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
  setHasDeadline('unknown');setTermDuration('');setTermCustomDuration('');setTermStartDate('');setTermEndDate('');
 }

 return <form className="caseForm extended" onSubmit={createCase}>
  {formError&&<div className="notice error"><AlertCircle size={18}/><span>{formError}</span></div>}

  <CollapsibleSection title="Datos del solicitante" icon={User} defaultOpen={true}>
   <div className="sectionHint">
    {profileData?(
     <>Nombre: <strong>{profileData.full_name||'—'}</strong> · Cédula: <strong>{profileData.cedula||'—'}</strong> · Celular: <strong>{profileData.phone||'—'}</strong></>
    ):(
     <>Completa tu perfil en la pestaña "Mi perfil" para que estos datos se carguen automáticamente.</>
    )}
   </div>
  </CollapsibleSection>

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
     <div className="formGroup"><label>Cédula de la persona representada</label><input value={repCedula} onChange={e=>setRepCedula(e.target.value)} disabled={saving} placeholder="Opcional"/></div>
     <div className="formGroup"><label>Celular de la persona representada</label><input value={repPhone} onChange={e=>setRepPhone(e.target.value)} disabled={saving} placeholder="Opcional"/></div>
    </div>
    <div className="formGroup"><label>Dirección de la persona representada</label><input value={repAddress} onChange={e=>setRepAddress(e.target.value)} disabled={saving} placeholder="Opcional"/></div>
   </>}
  </CollapsibleSection>

  <CollapsibleSection title="Categoría jurídica" icon={Gavel} defaultOpen={true} required>
   <div className="formGroup">
    <label>Categoría jurídica principal <span className="req">*</span></label>
    <select value={legalCategory} onChange={e=>{setLegalCategory(e.target.value);setLegalSubcategory('')}} disabled={saving}>
     <option value="">Selecciona una categoría...</option>
     {LEGAL_CATALOG.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
    </select>
   </div>
   {legalCategory&&LEGAL_CATALOG.find(c=>c.name===legalCategory)?.sub?.length>0?(
    <div className="formGroup">
     <label>Sub-categoría <span className="req">*</span></label>
     <select value={legalSubcategory} onChange={e=>setLegalSubcategory(e.target.value)} disabled={saving}>
      <option value="">Selecciona una sub-categoría...</option>
      {LEGAL_CATALOG.find(c=>c.name===legalCategory).sub.map(s=><option key={s} value={s}>{s}</option>)}
     </select>
    </div>
   ):null}
  </CollapsibleSection>

  <CollapsibleSection title="Ubicación y despacho" icon={MapPin} defaultOpen={false}>
   <div className="formGrid2">
    <div className="formGroup"><label>Departamento</label><select value={department} onChange={e=>{setDepartment(e.target.value);setMunicipality('')}} disabled={saving}><option value="">No sé / Dejar vacío</option>{DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
    <div className="formGroup"><label>Municipio</label><input value={municipality} onChange={e=>setMunicipality(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/></div>
   </div>
   <div className="formGrid2">
    <div className="formGroup"><label>Tipo de autoridad / despacho</label><select value={authorityType} onChange={e=>setAuthorityType(e.target.value)} disabled={saving}><option value="">No sé / Dejar vacío</option>{AUTHORITY_TYPES.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
    <div className="formGroup"><label>Nombre del despacho / autoridad</label><input value={authorityName} onChange={e=>setAuthorityName(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/></div>
   </div>
  </CollapsibleSection>

  <CollapsibleSection title="Datos del proceso" icon={FileStack} defaultOpen={false}>
   <div className="formGrid2">
    <div className="formGroup"><label>Entidad (para asuntos no judiciales)</label><input value={entity} onChange={e=>setEntity(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/></div>
    <div className="formGroup"><label>Dependencia</label><input value={dependency} onChange={e=>setDependency(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/></div>
   </div>
   <div className="formGrid2">
    <div className="formGroup"><label>Número de proceso / radicado</label><input value={caseNumberInput} onChange={e=>setCaseNumberInput(e.target.value)} disabled={saving} placeholder="No sé / Dejar vacío"/></div>
    <div className="formGroup"><label>Tipo de documento recibido</label><select value={documentType} onChange={e=>setDocumentType(e.target.value)} disabled={saving}><option value="">No sé / Dejar vacío</option>{DOCUMENT_TYPES.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
   </div>
  </CollapsibleSection>

  <CollapsibleSection title="Términos y vencimientos" icon={Calendar} defaultOpen={false}>
   <div className="formGroup">
    <label>¿Existe un plazo o término?</label>
    <div className="radioRow">
     <label className={hasDeadline==='yes'?'radioOpt active':'radioOpt'}><input type="radio" name="hasDeadline" value="yes" checked={hasDeadline==='yes'} onChange={()=>setHasDeadline('yes')} disabled={saving}/>Sí</label>
     <label className={hasDeadline==='no'?'radioOpt active':'radioOpt'}><input type="radio" name="hasDeadline" value="no" checked={hasDeadline==='no'} onChange={()=>setHasDeadline('no')} disabled={saving}/>No</label>
     <label className={hasDeadline==='unknown'?'radioOpt active':'radioOpt'}><input type="radio" name="hasDeadline" value="unknown" checked={hasDeadline==='unknown'} onChange={()=>setHasDeadline('unknown')} disabled={saving}/>No sé</label>
    </div>
   </div>
   {hasDeadline==='yes'&&<>
    <div className="formGroup">
     <label>Duración del término</label>
     <select value={termDuration} onChange={e=>setTermDuration(e.target.value)} disabled={saving}>
      <option value="">Selecciona...</option>
      {TERM_DURATIONS.map(d=><option key={d} value={d}>{d}</option>)}
     </select>
    </div>
    {termDuration==='Otro'&&<div className="formGroup"><label>Especifica la duración</label><input value={termCustomDuration} onChange={e=>setTermCustomDuration(e.target.value)} disabled={saving} placeholder="Ej: 45 días"/></div>}
    <div className="formGrid2">
     <div className="formGroup"><label>Fecha de inicio</label><input type="date" value={termStartDate} onChange={e=>setTermStartDate(e.target.value)} disabled={saving}/></div>
     <div className="formGroup"><label>Fecha límite (calculada o manual)</label><input type="date" value={termEndDate} onChange={e=>setTermEndDate(e.target.value)} disabled={saving}/></div>
    </div>
   </>}
  </CollapsibleSection>

  <CollapsibleSection title="Hechos del caso" icon={FileText} defaultOpen={true}>
   <div className="formGroup"><label>Título del caso <span className="req">*</span></label><input value={title} onChange={e=>setTitle(e.target.value)} disabled={saving} placeholder="Ej: Cobro de honorarios profesionales"/></div>
   <div className="formGroup"><label>Hechos principales</label><textarea value={facts} onChange={e=>setFacts(e.target.value)} rows="5" disabled={saving} placeholder="Cuéntanos los hechos principales..."/></div>
  </CollapsibleSection>

  <div className="formGroup">
   <label className="upload"><Upload size={20}/><span>{file?file.name:'Adjuntar documento (opcional)'}</span><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} disabled={saving}/></label>
  </div>
  <label className="consentCheck"><input type="checkbox" checked={consentAccepted} onChange={e=>setConsentAccepted(e.target.checked)} disabled={saving}/><span>{CONSENT_TEXT} <strong>Versión {POLICY_VERSION}</strong></span></label>
  <div className="row">
   <button type="submit" className="primary" disabled={saving}>{saving?<><Loader2 size={18} className="spin"/> Guardando...</>:'Guardar caso'}</button>
   <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancelar</button>
  </div>
 </form>
}
function CaseDetail({session,caseId,isAdmin=false,onBack}){
 const [loading,setLoading]=useState(true);
 const [caseData,setCaseData]=useState(null);
 const [documents,setDocuments]=useState([]);
 const [actions,setActions]=useState([]);
 const [analysis,setAnalysis]=useState(null);
 const [review,setReview]=useState(null);
 const [detailTab,setDetailTab]=useState('info');
 const [msg,setMsg]=useState('');
 const [msgType,setMsgType]=useState('');
 const [uploadingFile,setUploadingFile]=useState(false);
 const [showAddAction,setShowAddAction]=useState(false);

 useEffect(()=>{loadAll()},[caseId]);

 async function loadAll(){
  setLoading(true);
  const {data:c,error:ce}=await supabase.from('cases').select('*').eq('id',caseId).maybeSingle();
  if(ce||!c){setMsg('No se pudo cargar el caso.');setMsgType('error');setLoading(false);return}
  setCaseData(c);
  const {data:docs}=await supabase.from('case_documents').select('*').eq('case_id',caseId).order('created_at',{ascending:false});
  setDocuments(docs||[]);
  const {data:acts}=await supabase.from('case_actions').select('*').eq('case_id',caseId).order('action_date',{ascending:false});
  setActions(acts||[]);
  const [{data:analysisRow},{data:reviewRow}]=await Promise.all([
   supabase.from('case_analyses').select('*').eq('case_id',caseId).maybeSingle(),
   isAdmin?supabase.from('case_analysis_reviews').select('*').eq('case_id',caseId).maybeSingle():Promise.resolve({data:null})
  ]);
  setAnalysis(analysisRow||null);setReview(reviewRow||null);
  setLoading(false);
 }

 async function downloadDoc(doc){
  const {signedUrl,error}=await supabase.storage.from('case-documents').createSignedUrl(doc.storage_path,300);
  if(error||!signedUrl){setMsg('No se pudo generar el enlace de descarga.');setMsgType('error');return}
  await supabase.rpc('record_audit_event',{p_action:'document_downloaded',p_target_case_id:caseId,p_target_document_id:doc.id,p_details:{source:isAdmin?'admin':'client'}});
  window.open(signedUrl,'_blank');
 }

 async function deleteDoc(doc){
  if(!confirm('¿Eliminar este documento?')) return;
  const {error}=await supabase.from('case_documents').delete().eq('id',doc.id);
  if(error){setMsg('No se pudo eliminar el documento.');setMsgType('error');return}
  const {error:storageError}=await supabase.storage.from('case-documents').remove([doc.storage_path]);
  if(storageError){setMsg('El registro se eliminó, pero el archivo físico no pudo retirarse.');setMsgType('error');return}
  setMsg('Documento eliminado.');setMsgType('success');
  loadAll();
 }

 async function uploadDoc(e){
  const f=e.target.files?.[0];
  if(!f) return;
  setUploadingFile(true);
  setMsg('');setMsgType('');
  const ownerId=caseData.user_id||session.user.id;
  const path=ownerId+'/'+caseId+'/'+f.name;
  const up=await supabase.storage.from('case-documents').upload(path,f);
  if(up.error){setMsg('No se pudo subir: '+up.error.message);setMsgType('error');setUploadingFile(false);return}
  const ins=await supabase.from('case_documents').insert({case_id:caseId,user_id:session.user.id,file_name:f.name,storage_path:path,content_type:f.type||null});
  if(ins.error){setMsg('No se pudo registrar: '+ins.error.message);setMsgType('error');setUploadingFile(false);return}
  setMsg('Documento subido correctamente.');setMsgType('success');
  setUploadingFile(false);
  loadAll();
 }

 function statusLabel(s){
  const found=ACTION_STATUSES.find(a=>a.value===s);
  return found?found.label:s;
 }

 if(loading) return <div className="profileLoading"><Loader2 size={28} className="spin"/><span>Cargando caso...</span></div>;
 if(!caseData) return <div className="profileLoading"><AlertCircle size={28}/><span>{msg||'Caso no encontrado.'}</span></div>;

 return <section className="dashboard">
  <button className="back" onClick={onBack}><ArrowLeft size={17}/> Volver a mis casos</button>
  <div className="dashHead">
   <div>
    <div className="badge">Detalle del caso</div>
    <h2>{caseData.title}</h2>
    <p>{[caseData.legal_category,caseData.legal_subcategory].filter(Boolean).join(' · ')||'Sin categoría'}</p>
   </div>
  </div>
  {msg&&<div className={msgType==='error'?'notice error':msgType==='success'?'notice success':'notice'}>
   {msgType==='error'&&<AlertCircle size={18}/>}
   {msgType==='success'&&<CheckCircle2 size={18}/>}
   <span>{msg}</span>
  </div>}
  <div className="tabs">
   <button className={detailTab==='info'?'tab active':'tab'} onClick={()=>setDetailTab('info')}><FileText size={17}/> Información</button>
   <button className={detailTab==='docs'?'tab active':'tab'} onClick={()=>setDetailTab('docs')}><FolderOpen size={17}/> Documentos ({documents.length})</button>
   <button className={detailTab==='followup'?'tab active':'tab'} onClick={()=>setDetailTab('followup')}><Activity size={17}/> Seguimiento ({actions.length})</button>
   <button className={detailTab==='analysis'?'tab active':'tab'} onClick={()=>setDetailTab('analysis')}><Sparkles size={17}/> Análisis</button>
  </div>

  {detailTab==='info'&&<div className="detailInfo">
   <div className="detailCard">
    <h3><User size={18}/> Solicitante</h3>
    <div className="detailGrid">
     <div><span className="detailLabel">Actúa como</span><span className="detailVal">{caseData.acting_as==='representative'?'Representación':'Nombre propio'}</span></div>
     {caseData.acting_as==='representative'&&<>
      <div><span className="detailLabel">Persona representada</span><span className="detailVal">{caseData.represented_person_name||'—'}</span></div>
      <div><span className="detailLabel">Relación</span><span className="detailVal">{caseData.representative_relationship||'—'}</span></div>
      {caseData.represented_person_cedula&&<div><span className="detailLabel">Cédula rep.</span><span className="detailVal">{caseData.represented_person_cedula}</span></div>}
     </>}
    </div>
   </div>
   <div className="detailCard">
    <h3><Gavel size={18}/> Categoría jurídica</h3>
    <div className="detailGrid">
     <div><span className="detailLabel">Categoría</span><span className="detailVal">{caseData.legal_category||'—'}</span></div>
     <div><span className="detailLabel">Sub-categoría</span><span className="detailVal">{caseData.legal_subcategory||'—'}</span></div>
    </div>
   </div>
   <div className="detailCard">
    <h3><MapPin size={18}/> Ubicación y despacho</h3>
    <div className="detailGrid">
     <div><span className="detailLabel">Departamento</span><span className="detailVal">{caseData.department||'—'}</span></div>
     <div><span className="detailLabel">Municipio</span><span className="detailVal">{caseData.municipality||'—'}</span></div>
     <div><span className="detailLabel">Tipo de autoridad</span><span className="detailVal">{caseData.authority_type||'—'}</span></div>
     <div><span className="detailLabel">Despacho</span><span className="detailVal">{caseData.authority_name||'—'}</span></div>
    </div>
   </div>
   <div className="detailCard">
    <h3><FileStack size={18}/> Datos del proceso</h3>
    <div className="detailGrid">
     <div><span className="detailLabel">Entidad</span><span className="detailVal">{caseData.entity||'—'}</span></div>
     <div><span className="detailLabel">Dependencia</span><span className="detailVal">{caseData.dependency||'—'}</span></div>
     <div><span className="detailLabel">Radicado</span><span className="detailVal">{caseData.case_number||'—'}</span></div>
     <div><span className="detailLabel">Doc. recibido</span><span className="detailVal">{caseData.document_type_received||'—'}</span></div>
    </div>
   </div>
   <div className="detailCard">
    <h3><Calendar size={18}/> Términos y vencimientos</h3>
    <div className="detailGrid">
     <div><span className="detailLabel">¿Tiene plazo?</span><span className="detailVal">{caseData.has_deadline==='yes'?'Sí':caseData.has_deadline==='no'?'No':'No sabe'}</span></div>
     {caseData.has_deadline==='yes'&&<>
      <div><span className="detailLabel">Duración</span><span className="detailVal">{caseData.term_duration||'—'}</span></div>
      <div><span className="detailLabel">Fecha inicio</span><span className="detailVal">{caseData.term_start_date||'—'}</span></div>
      <div><span className="detailLabel">Fecha límite</span><span className="detailVal">{caseData.term_end_date||'—'}</span></div>
     </>}
    </div>
   </div>
   {caseData.facts&&<div className="detailCard">
    <h3><FileText size={18}/> Hechos</h3>
    <p className="detailFacts">{caseData.facts}</p>
   </div>}
  </div>}

  {detailTab==='docs'&&<div className="detailDocs">
   <label className="upload"><Upload size={20}/><span>{uploadingFile?'Subiendo...':'Añadir documento'}</span><input type="file" onChange={uploadDoc} disabled={uploadingFile}/></label>
   <div className="docList">
    {documents.length?documents.map(d=><div className="docItem" key={d.id}>
     <FileText size={20}/>
     <div className="docInfo"><b>{d.file_name}</b><span>{d.visible_to_client?'Visible':'Interno'}{isAdmin&&d.is_sensitive?' · Sensible':''}</span></div>
     <div className="docActions">
      <button className="ghost sm" onClick={()=>downloadDoc(d)}><Download size={16}/> Descargar</button>
      {isAdmin&&<button className="ghost sm" onClick={async()=>{const {error}=await supabase.rpc('set_case_document_visibility',{p_document_id:d.id,p_visible_to_client:!d.visible_to_client,p_is_sensitive:d.is_sensitive});if(error){setMsg('No se pudo cambiar la visibilidad.');setMsgType('error')}else{setMsg('Visibilidad actualizada.');setMsgType('success');loadAll()}}}>{d.visible_to_client?<><EyeOff size={14}/> Marcar interno</>:<><Eye size={14}/> Hacer visible</>}</button>}
      {isAdmin&&<button className="ghost sm" onClick={async()=>{const {error}=await supabase.rpc('set_case_document_visibility',{p_document_id:d.id,p_visible_to_client:d.visible_to_client,p_is_sensitive:!d.is_sensitive});if(error){setMsg('No se pudo cambiar.');setMsgType('error')}else{setMsg('Sensibilidad actualizada.');setMsgType('success');loadAll()}}}>{d.is_sensitive?'No sensible':'Sensible'}</button>}
      <button className="ghost sm danger" onClick={()=>deleteDoc(d)}><Trash2 size={16}/></button>
     </div>
    </div>):<div className="empty"><FileText size={38}/><b>Sin documentos</b><span>{isAdmin?'Sube documentos para este caso.':'Sube documentos relacionados con tu caso.'}</span></div>}
   </div>
  </div>}

  {detailTab==='info'&&!isAdmin&&<AuthorizationPanel caseId={caseId}/>}
  {detailTab==='followup'&&<FollowupTab session={session} caseId={caseId} isAdmin={isAdmin} actions={actions} onRefresh={loadAll} statusLabel={statusLabel} downloadActionDoc={async(doc)=>{
   const {signedUrl,error}=await supabase.storage.from('case-documents').createSignedUrl(doc.storage_path,300);
   if(error||!signedUrl){setMsg('No se pudo generar el enlace.');setMsgType('error');return}
   window.open(signedUrl,'_blank');
  }}/>} 
  {detailTab==='analysis'&&<AnalysisPanel session={session} caseData={caseData} documents={documents} actions={actions} isAdmin={isAdmin} analysis={analysis} review={review} onSaved={(nextAnalysis,nextReview)=>{setAnalysis(nextAnalysis);setReview(nextReview)}} onMessage={(text,type)=>{setMsg(text);setMsgType(type)}}/>}
 </section>
}
function AnalysisPanel({session,caseData,documents,actions,isAdmin,analysis,review,onSaved,onMessage}){
 const [working,setWorking]=useState(false);
 const [activeView,setActiveView]=useState('initial');
 const initial=analysis?.initial_analysis||null;
 const integrated=analysis?.integrated_report||null;
 function rows(value){return Array.isArray(value)?value:[value];}
 async function generate(){
  setWorking(true);
  const nextInitial=buildInitialAnalysis(caseData,documents,actions);
  const nextReview=isAdmin?buildSecondReview(nextInitial,caseData,documents,actions):review;
  const nextIntegrated=buildIntegratedReport(caseData,nextInitial,isAdmin?nextReview:null);
  const {data:user}=await supabase.auth.getUser();
  const {data:savedAnalysis,error:analysisError}=await supabase.from('case_analyses').upsert({case_id:caseData.id,user_id:caseData.user_id,initial_analysis:nextInitial,integrated_report:nextIntegrated},{onConflict:'case_id'}).select().maybeSingle();
  if(analysisError||!savedAnalysis){onMessage('No fue posible guardar el análisis. Inténtalo nuevamente.','error');setWorking(false);return}
  let savedReview=review;
  if(isAdmin&&nextReview){const {data:reviewRow,error:reviewError}=await supabase.from('case_analysis_reviews').upsert({case_id:caseData.id,user_id:caseData.user_id,second_review:nextReview,reviewed_by:user.user.id},{onConflict:'case_id'}).select().maybeSingle();if(reviewError||!reviewRow){onMessage('El análisis se guardó, pero la segunda revisión no pudo guardarse.','error');setWorking(false);onSaved(savedAnalysis,review);return}savedReview=reviewRow}
  onSaved(savedAnalysis,savedReview);onMessage(isAdmin?'Análisis y segunda revisión actualizados.':'Análisis actualizado.','success');setWorking(false);
 }
 async function exportCurrent(type){
  if(!integrated){onMessage('Genera el análisis antes de exportar el informe.','error');return}
  try{
   const report=integrated;
   if(type==='word')downloadWord(caseData,report,isAdmin?review?.second_review:null);else await downloadPdf(caseData,report,isAdmin?review?.second_review:null);
  }catch(error){
   console.error('report export failed',error);onMessage('No fue posible generar el informe. Inténtalo nuevamente.','error');
  }
 }
 const current=activeView==='initial'?initial:activeView==='review'?review?.second_review:integrated;
 return <div className="analysisPanel">
  <div className="analysisIntro"><div><div className="badge"><Sparkles size={14}/> Organización y análisis</div><h3>Análisis del caso</h3><p>Se utiliza únicamente la información registrada en este caso y sus documentos visibles. No se incorporan hechos, normas ni pruebas externas.</p></div><div className="analysisActions"><button className="primary" onClick={generate} disabled={working}>{working?<><Loader2 size={17} className="spin"/> Procesando...</>:<><RefreshCw size={17}/> {analysis?'Actualizar análisis':'Generar análisis'}</>}</button>{analysis&&<><button className="ghost sm" onClick={()=>exportCurrent('word')}><FileCheck size={15}/> Exportar Word</button><button className="ghost sm" onClick={()=>exportCurrent('pdf')}><Download size={15}/> Exportar PDF</button></>}</div></div>
  {analysis&&<div className="analysisTabs"><button className={activeView==='initial'?'analysisTab active':'analysisTab'} onClick={()=>setActiveView('initial')}><FileText size={15}/> Análisis inicial</button>{isAdmin&&<button className={activeView==='review'?'analysisTab active':'analysisTab'} onClick={()=>setActiveView('review')}><AlertTriangle size={15}/> Segunda revisión</button>}<button className={activeView==='integrated'?'analysisTab active':'analysisTab'} onClick={()=>setActiveView('integrated')}><FileCheck size={15}/> Informe integrado</button></div>}
  {!analysis?<div className="empty analysisEmpty"><Sparkles size={38}/><b>Aún no hay análisis guardado</b><span>Genera un análisis para ordenar la información disponible del caso.</span></div>:<AnalysisView value={current} view={activeView} isAdmin={isAdmin}/>} 
  <div className="analysisWarning"><AlertTriangle size={17}/><span>LEXACASO organiza y analiza información. No sustituye el asesoramiento, representación o concepto de un abogado.</span></div>
 </div>
}
function AnalysisView({value,view,isAdmin}){
 if(!value)return <div className="empty"><AlertTriangle size={32}/><b>Segunda revisión no disponible</b><span>Solo un administrador autorizado puede generarla.</span></div>;
 const sections=view==='initial'?[['Resumen',value.summary],['Hechos relevantes',value.relevant_facts],['Cronología',value.chronology?.map(item=>`${item.date} · ${item.title} · ${item.detail}`)],['Problemas jurídicos',value.legal_issues],['Derechos e intereses',value.rights_interests],['Actuaciones pendientes',value.pending_actions],['Plazos y fechas',value.deadlines?.map(item=>`${item.label}: ${item.value}`)],['Documentos relevantes',value.relevant_documents],['Inconsistencias',value.inconsistencies],['Posibles líneas de actuación',value.possible_actions],['Fuentes jurídicas',value.legal_sources],['Riesgos',value.risks],['Información faltante',value.missing_information]]:view==='review'?[['Errores de interpretación',value.interpretation_errors],['Hechos omitidos',value.omitted_facts],['Contradicciones',value.contradictions],['Documentos no considerados',value.documents_not_considered],['Fechas a verificar',value.date_checks],['Argumentos débiles',value.weak_arguments],['Información faltante',value.missing_information],['Notas de verificación',value.verification_notes]]:[['Identificación del caso',[`Título: ${value.case_identification?.title}`,`Radicado: ${value.case_identification?.case_number}`,`Categoría: ${value.case_identification?.category}`,`Autoridad: ${value.case_identification?.authority}`]],['Resumen',value.summary],['Hechos',value.facts],['Cronología',value.chronology?.map(item=>`${item.date} · ${item.title} · ${item.detail}`)],['Documentos',value.documents],['Plazos',value.deadlines?.map(item=>`${item.label}: ${item.value}`)],['Problemas jurídicos',value.legal_issues],['Posibles actuaciones',value.possible_actions],['Fuentes',value.sources],['Observaciones',value.observations],['Información pendiente',value.pending_information]];
 return <div className="analysisView">{sections.map(([title,content])=><article className="analysisCard" key={title}><h4>{title}</h4>{(Array.isArray(content)?content:[content||'No disponible.']).map((item,index)=><p key={`${title}-${index}`}>{typeof item==='object'?JSON.stringify(item):item}</p>)}</article>)}</div>;
}
function FollowupTab({session,caseId,isAdmin,actions,onRefresh,statusLabel,downloadActionDoc}){
 const [showForm,setShowForm]=useState(false);
 const [editingId,setEditingId]=useState(null);
 const [actionType,setActionType]=useState('');
 const [actionTitle,setActionTitle]=useState('');
 const [actionDesc,setActionDesc]=useState('');
 const [actionDate,setActionDate]=useState(new Date().toISOString().split('T')[0]);
 const [actionStatus,setActionStatus]=useState('pending');
 const [actionFile,setActionFile]=useState(null);
 const [savingAction,setSavingAction]=useState(false);
 const [actionDocs,setActionDocs]=useState({});
 const [formError,setFormError]=useState('');
 const [actionVisible,setActionVisible]=useState(true);

 async function loadActionDocs(actionId){
  if(actionDocs[actionId]) return;
  const {data}=await supabase.from('action_documents').select('*').eq('action_id',actionId);
  setActionDocs(prev=>({...prev,[actionId]:data||[]}));
 }

 function resetForm(){
  setActionType('');setActionTitle('');setActionDesc('');setActionDate(new Date().toISOString().split('T')[0]);setActionStatus('pending');setActionFile(null);setActionVisible(true);
  setEditingId(null);setShowForm(false);
 }

 function startEdit(a){
  setEditingId(a.id);setShowForm(true);
  setActionType(a.action_type);setActionTitle(a.title);setActionDesc(a.description||'');
  setActionDate(a.action_date);setActionStatus(a.status);setActionVisible(a.visible_to_client);
  setActionFile(null);
 }

 async function saveAction(e){
  e.preventDefault();
  setFormError('');
  if(!actionType){setFormError('Selecciona un tipo de gestión.');return}
  if(!actionTitle.trim()){setFormError('El título de la gestión es obligatorio.');return}
  setSavingAction(true);
  const {data:user}=await supabase.auth.getUser();
  const payload={
   case_id:caseId,
   created_by:user.user.id,
   action_type:actionType,
   title:actionTitle.trim(),
   description:actionDesc.trim()||null,
   action_date:actionDate,
   status:actionStatus,
   visible_to_client:isAdmin?actionVisible:true
  };
  let act=null,error=null;
  if(editingId){
   const r=await supabase.from('case_actions').update(payload).eq('id',editingId).select().single();
   act=r.data;error=r.error;
  }else{
   const r=await supabase.from('case_actions').insert(payload).select().single();
   act=r.data;error=r.error;
  }
  if(error){setFormError('No se pudo guardar: '+error.message);setSavingAction(false);return}
  if(actionFile&&act){
   const path=user.user.id+'/'+caseId+'/followups/'+act.id+'/'+actionFile.name;
   const up=await supabase.storage.from('case-documents').upload(path,actionFile);
   if(!up.error){
    await supabase.from('action_documents').insert({
     action_id:act.id,case_id:caseId,user_id:user.user.id,
     file_name:actionFile.name,storage_path:path,
     content_type:actionFile.type||null,visible_to_client:isAdmin?actionVisible:true
    });
   }
  }
  setSavingAction(false);
  resetForm();
  onRefresh();
 }

 async function deleteAction(a){
  if(!confirm('¿Eliminar esta gestión y sus documentos?'))return;
  const docs=actionDocs[a.id]||[];
  for(const d of docs){
   if(d.storage_path){await supabase.storage.from('case-documents').remove([d.storage_path])}
  }
  const {error}=await supabase.from('case_actions').delete().eq('id',a.id);
  if(error){setFormError('No se pudo eliminar: '+error.message);return}
  setActionDocs(prev=>{const n={...prev};delete n[a.id];return n});
  onRefresh();
 }

 async function toggleActionDocVisibility(doc){
  const {error}=await supabase.from('action_documents').update({visible_to_client:!doc.visible_to_client}).eq('id',doc.id);
  if(error)return;
  setActionDocs(prev=>({...prev,[doc.action_id]:(prev[doc.action_id]||[]).map(d=>d.id===doc.id?{...d,visible_to_client:!doc.visible_to_client}:d)}));
 }

 return <div className="followupSection">
  <div className="dashHead">
   <div><h3>{isAdmin?'Gestiones del caso':'Seguimiento de mi caso'}</h3><p>{isAdmin?'Administra las gestiones realizadas.':'Historial cronológico de gestiones realizadas.'}</p></div>
   {isAdmin&&<button className="primary" onClick={()=>{resetForm();setShowForm(!showForm)}}><Plus size={18}/> Nueva gestión</button>}
  </div>
  {formError&&<div className="notice error"><AlertCircle size={18}/><span>{formError}</span></div>}
  {showForm&&<form className="caseForm extended" onSubmit={saveAction}>
   <div className="formGroup">
    <label>Tipo de gestión <span className="req">*</span></label>
    <select value={actionType} onChange={e=>setActionType(e.target.value)} disabled={savingAction}>
     <option value="">Selecciona...</option>
     {ACTION_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
    </select>
   </div>
   <div className="formGroup">
    <label>Título <span className="req">*</span></label>
    <input value={actionTitle} onChange={e=>setActionTitle(e.target.value)} disabled={savingAction} placeholder="Ej: Derecho de petición enviado"/>
   </div>
   <div className="formGroup">
    <label>Descripción</label>
    <textarea value={actionDesc} onChange={e=>setActionDesc(e.target.value)} rows="3" disabled={savingAction} placeholder="Describe la actuación..."/>
   </div>
   <div className="formGrid2">
    <div className="formGroup"><label>Fecha</label><input type="date" value={actionDate} onChange={e=>setActionDate(e.target.value)} disabled={savingAction}/></div>
    <div className="formGroup"><label>Estado</label><select value={actionStatus} onChange={e=>setActionStatus(e.target.value)} disabled={savingAction}>{ACTION_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
   </div>
   <div className="formGroup">
    <label className="upload"><Upload size={20}/><span>{actionFile?actionFile.name:'Adjuntar documento (opcional)'}</span><input type="file" onChange={e=>setActionFile(e.target.files?.[0]||null)} disabled={savingAction}/></label>
   </div>
   {isAdmin&&<div className="formGroup"><label className="checkRow"><input type="checkbox" checked={actionVisible} onChange={e=>setActionVisible(e.target.checked)} disabled={savingAction}/><span>Visible para el cliente</span></label></div>}
   <div className="row">
    <button type="submit" className="primary" disabled={savingAction}>{savingAction?<><Loader2 size={18} className="spin"/> Guardando...</>:editingId?'Actualizar gestión':'Guardar gestión'}</button>
    <button type="button" className="ghost" onClick={resetForm} disabled={savingAction}>Cancelar</button>
   </div>
  </form>}
  <div className="timeline">
   {actions.length?actions.map(a=>(
    <div className="timelineItem" key={a.id} onMouseEnter={()=>loadActionDocs(a.id)}>
     <div className="timelineDate">{a.action_date}</div>
     <div className="timelineContent">
      <div className="timelineHeader">
       <b>{a.title}</b>
       <span className={`statusBadge status-${a.status}`}>{statusLabel(a.status)}</span>
      </div>
      {a.description&&<p className="timelineDesc">{a.description}</p>}
      <div className="timelineMeta">
       <span>{a.action_type}</span>
       {isAdmin&&<span className="timelineAdminBadge">{a.visible_to_client?'Visible':'Interno'}</span>}
      </div>
      {actionDocs[a.id]&&actionDocs[a.id].length>0&&(
       <div className="timelineDocs">
        {actionDocs[a.id].map(d=>(
         <div className="timelineDocItem" key={d.id}>
          <button className="ghost sm" onClick={()=>downloadActionDoc(d)}><Download size={14}/> {d.file_name}</button>
          {isAdmin&&<button className="ghost sm" onClick={()=>toggleActionDocVisibility(d)} title={d.visible_to_client?'Ocultar al cliente':'Hacer visible'}>{d.visible_to_client?<Eye size={14}/>:<EyeOff size={14}/>}</button>}
         </div>
        ))}
       </div>
      )}
      {isAdmin&&<div className="timelineActions">
       <button className="ghost sm" onClick={()=>startEdit(a)}><Edit3 size={14}/> Editar</button>
       <button className="ghost sm danger" onClick={()=>deleteAction(a)}><Trash2 size={14}/> Eliminar</button>
      </div>}
     </div>
    </div>
   )):<div className="empty"><Activity size={38}/><b>Sin gestiones registradas</b><span>{isAdmin?'Crea la primera gestión para este caso.':'Las gestiones aparecerán aquí cronológicamente.'}</span></div>}
  </div>
 </div>
}
function AuthorizationPanel({caseId}){
 const [admins,setAdmins]=useState([]);
 const [authorizations,setAuthorizations]=useState([]);
 const [selectedAdmin,setSelectedAdmin]=useState('');
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(true);
 async function load(){
  setLoading(true);
  const [{data:adminList},{data:current}]=await Promise.all([
   supabase.rpc('list_admin_users'),
   supabase.from('case_authorizations').select('id,user_id,authorized_at,revoked_at').eq('case_id',caseId)
  ]);
  setAdmins(adminList||[]);setAuthorizations(current||[]);setLoading(false);
 }
 useEffect(()=>{load()},[caseId]);
 async function authorize(){
  if(!selectedAdmin)return;
  const {error}=await supabase.from('case_authorizations').insert({case_id:caseId,user_id:selectedAdmin});
  if(error){setMessage('No se pudo autorizar el caso.');return}
  setMessage('Administrador autorizado.');setSelectedAdmin('');load();
 }
 async function revoke(id){
  const {error}=await supabase.from('case_authorizations').update({revoked_at:new Date().toISOString()}).eq('id',id);
  if(error){setMessage('No se pudo revocar la autorización.');return}
  setMessage('Autorización revocada.');load();
 }
 return <div className="detailCard authorizationCard">
  <h3><LockKeyhole size={18}/> Autorización para revisión administrativa</h3>
  <p className="detailFacts">Solo los administradores que autorices podrán consultar este caso, sus gestiones y documentos.</p>
  {loading?<div className="profileLoading"><Loader2 size={18} className="spin"/> Cargando autorizaciones...</div>:<>
   <div className="authorizationRow"><select value={selectedAdmin} onChange={e=>setSelectedAdmin(e.target.value)}><option value="">Selecciona un administrador...</option>{admins.filter(a=>!authorizations.some(x=>x.user_id===a.id&&!x.revoked_at)).map(a=><option key={a.id} value={a.id}>{a.full_name||a.email}</option>)}</select><button className="primary" onClick={authorize} disabled={!selectedAdmin}><CheckSquare size={16}/> Autorizar</button></div>
   <div className="authorizationList">{authorizations.filter(a=>!a.revoked_at).map(a=>{const admin=admins.find(x=>x.id===a.user_id);return <div className="authorizationItem" key={a.id}><span>{admin?.full_name||admin?.email||'Administrador autorizado'}</span><button className="ghost sm danger" onClick={()=>revoke(a.id)}>Revocar</button></div>})}</div>
  </>}
  {message&&<div className="notice success">{message}</div>}
 </div>
}
function NotificationsPanel({session,onOpenCase,onRead}){
 const [notifications,setNotifications]=useState([]);
 const [loading,setLoading]=useState(true);
 const [statusFilter,setStatusFilter]=useState('all');
 const [searchQuery,setSearchQuery]=useState('');
 async function load(){
  setLoading(true);
  const {data}=await supabase.from('notifications').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(100);
  setNotifications(data||[]);
  setLoading(false);
 }
 useEffect(()=>{load()},[]);
 async function markAsRead(n){
  const {error}=await supabase.from('notifications').update({is_read:true}).eq('id',n.id);
  if(!error){load();onRead()}
 }
 async function markAllRead(){
  const {error}=await supabase.from('notifications').update({is_read:true}).eq('user_id',session.user.id).eq('is_read',false);
  if(!error){load();onRead()}
 }
 async function toggleArchive(n){
  const {error}=await supabase.from('notifications').update({archived:!n.archived}).eq('id',n.id);
  if(!error){load()}
 }
 const filtered=notifications.filter(n=>{
  const matchesStatus=statusFilter==='all'?true:statusFilter==='unread'?!n.is_read&&!n.archived:statusFilter==='read'?n.is_read&&!n.archived:statusFilter==='archived'?n.archived:false;
  const q=searchQuery.trim().toLowerCase();
  const matchesSearch=!q||[n.title,n.message,n.case_number,n.court].filter(Boolean).some(v=>String(v).toLowerCase().includes(q));
  return matchesStatus&&matchesSearch;
 });
 const notifIcons={new_action:<Activity size={18}/>,document_visible:<FileText size={18}/>,case_update:<Bell size={18}/>,judicial:<CourtIcon size={18}/>,admin:<UserCog size={18}/>};
 return <div className="profileSection">
  <div className="dashHead"><div><div className="badge"><Bell size={14}/> Actualizaciones</div><h2>Notificaciones</h2><p>Te avisamos cuando haya novedades en tus casos.</p></div>{notifications.some(n=>!n.is_read)&&<button className="ghost" onClick={markAllRead}><CheckSquare size={16}/> Marcar todo como leído</button>}</div>
  <div className="notifFilters">
   <div className="searchField"><Search size={17}/><input placeholder="Buscar por expediente o juzgado..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div>
   <div className="radioRow">
    <label className={statusFilter==='all'?'radioOpt active':'radioOpt'}><input type="radio" name="statusFilter" value="all" checked={statusFilter==='all'} onChange={()=>setStatusFilter('all')}/>Todas</label>
    <label className={statusFilter==='unread'?'radioOpt active':'radioOpt'}><input type="radio" name="statusFilter" value="unread" checked={statusFilter==='unread'} onChange={()=>setStatusFilter('unread')}/>Pendientes</label>
    <label className={statusFilter==='read'?'radioOpt active':'radioOpt'}><input type="radio" name="statusFilter" value="read" checked={statusFilter==='read'} onChange={()=>setStatusFilter('read')}/>Leídas</label>
    <label className={statusFilter==='archived'?'radioOpt active':'radioOpt'}><input type="radio" name="statusFilter" value="archived" checked={statusFilter==='archived'} onChange={()=>setStatusFilter('archived')}/>Archivadas</label>
  </div>
  </div>
  {loading?<div className="profileLoading"><Loader2 size={28} className="spin"/><span>Cargando notificaciones...</span></div>:filtered.length?<div className="notifList">{filtered.map(n=><div className={n.is_read?'notifItem read':'notifItem'} key={n.id}>{notifIcons[n.type]||<Bell size={18}/>}<div className="notifContent"><b>{n.title}</b><span>{n.message}</span>{n.case_number&&<small>Expediente: {n.case_number}</small>}{n.court&&<small>Juzgado: {n.court}</small>}{n.filing_date&&<small>Radicado: {new Date(n.filing_date+'T00:00:00').toLocaleDateString('es-CO')}</small>}{n.attachment_url&&<a href={n.attachment_url} target="_blank" rel="noopener noreferrer" className="ghost sm" style={{display:'inline-flex',marginTop:'4px'}}><LinkIcon size={14}/> Ver archivo</a>}<small>{new Date(n.created_at).toLocaleString('es-CO')}</small></div><div className="timelineActions">{!n.is_read&&<button className="ghost sm" onClick={()=>markAsRead(n)}><CheckSquare size={14}/> Marcar leída</button>}{n.case_id&&<button className="ghost sm" onClick={()=>onOpenCase(n.case_id)}>Ver caso</button>}<button className="ghost sm" onClick={()=>toggleArchive(n)}><Archive size={14}/> {n.archived?'Desarchivar':'Archivar'}</button></div></div>)}</div>:<div className="empty"><Bell size={38}/><b>Sin notificaciones</b><span>{searchQuery||statusFilter!=='all'?'No hay resultados con los filtros actuales.':'Las notificaciones judiciales y de tus casos aparecerán aquí.'}</span></div>}
 </div>
}
function AdminPanel({session,onOpenCase}){
 const [section,setSection]=useState('cases');
 const [cases,setCases]=useState([]);
 const [profiles,setProfiles]=useState([]);
 const [audit,setAudit]=useState([]);
 const [authorizations,setAuthorizations]=useState([]);
 const [judicialNotifs,setJudicialNotifs]=useState([]);
 const [filters,setFilters]=useState({search:'',category:'',department:'',status:'',fromDate:'',toDate:''});
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [showNotifForm,setShowNotifForm]=useState(false);
 const [editingNotifId,setEditingNotifId]=useState(null);
 const [notifForm,setNotifForm]=useState({user_id:'',title:'',message:'',case_number:'',court:'',filing_date:'',attachment_url:''});
 const [notifSaving,setNotifSaving]=useState(false);
 const [notifError,setNotifError]=useState('');
 const [editingCase,setEditingCase]=useState(null);
 const [caseEditForm,setCaseEditForm]=useState({case_number:'',court:'',title:'',filing_date:'',attachment_url:'',status:'received'});
 const [caseEditSaving,setCaseEditSaving]=useState(false);
 const [caseEditError,setCaseEditError]=useState('');
 const [clientActionLoading,setClientActionLoading]=useState(null);
 const [tempPasswordForm,setTempPasswordForm]=useState(null);
 const [tempPasswordValue,setTempPasswordValue]=useState('');

 async function load(){
  setLoading(true);setError('');
  const [{data:caseRows,error:caseError},{data:profileRows,error:profileError},{data:auditRows,error:auditError},{data:authorizationRows,error:authorizationError},{data:notifRows,error:notifError}]=await Promise.all([
   supabase.from('cases').select('*').order('updated_at',{ascending:false}),
   supabase.from('profiles').select('id,full_name,cedula,phone,address,email,role,created_at,data_consent'),
   supabase.from('audit_log').select('id,action,target_case_id,target_user_id,target_document_id,created_at,details').order('created_at',{ascending:false}).limit(100),
   supabase.from('case_authorizations').select('id,case_id,authorized_at,revoked_at').eq('user_id',session.user.id).order('authorized_at',{ascending:false}),
   supabase.from('notifications').select('*').order('created_at',{ascending:false}).limit(200)
  ]);
  const firstError=caseError||profileError||auditError||authorizationError||notifError;
  if(firstError)setError('No se pudo cargar toda la información administrativa.');
  setCases(caseRows||[]);setProfiles(profileRows||[]);setAudit(auditRows||[]);setAuthorizations(authorizationRows||[]);setJudicialNotifs(notifRows||[]);setLoading(false);
 }
 useEffect(()=>{load()},[session.user.id]);
 const filtered=cases.filter(c=>{
  const p=profiles.find(x=>x.id===c.user_id);
  const search=filters.search.trim().toLowerCase();
  const matchesSearch=!search||[c.title,c.case_number,p?.full_name,p?.cedula].filter(Boolean).some(value=>String(value).toLowerCase().includes(search));
  return matchesSearch&&(!filters.category||c.legal_category===filters.category)&&(!filters.department||c.department===filters.department)&&(!filters.status||c.status===filters.status)&&(!filters.fromDate||c.created_at>=filters.fromDate)&&(!filters.toDate||c.created_at<=`${filters.toDate}T23:59:59.999Z`);
 });
 const activeAuthorizations=authorizations.filter(item=>!item.revoked_at);
 const clientProfiles=profiles.filter(p=>p.role==='client'||p.role==='user'||!p.role);
 function setFilter(name,value){setFilters(prev=>({...prev,[name]:value}))}

 async function changeUserRole(profileId,newRole){
  const {error}=await supabase.rpc('set_user_role',{p_user_id:profileId,p_role:newRole});
  if(error){setMessage('No se pudo cambiar el rol: '+error.message);return}
  await supabase.rpc('record_audit_event',{p_action:'role_changed',p_target_user_id:profileId,p_details:{new_role:newRole}});
  setMessage('Rol actualizado a '+newRole+'.');
  load();
 }
 async function exportExcel(){
  setMessage('');
  const {data,error:exportError}=await supabase.functions.invoke('export-cases-excel',{body:filters});
  if(exportError||!(data instanceof Blob)){setMessage('No se pudo generar la exportación.');return}
  const url=URL.createObjectURL(data);const link=document.createElement('a');link.href=url;link.download='lexacaso-casos.xlsx';link.click();URL.revokeObjectURL(url);setMessage('Exportación descargada.');
 }
 function caseForAuthorization(item){return cases.find(itemCase=>itemCase.id===item.case_id)}

 function resetNotifForm(){
  setNotifForm({user_id:'',title:'',message:'',case_number:'',court:'',filing_date:'',attachment_url:''});
  setEditingNotifId(null);setShowNotifForm(false);setNotifError('');
 }

 function startEditNotif(n){
  setEditingNotifId(n.id);setShowNotifForm(true);
  setNotifForm({user_id:n.user_id||'',title:n.title||'',message:n.message||'',case_number:n.case_number||'',court:n.court||'',filing_date:n.filing_date||'',attachment_url:n.attachment_url||''});
 }

 async function saveNotif(e){
  e.preventDefault();setNotifError('');
  if(!notifForm.user_id){setNotifError('Selecciona un cliente destinatario.');return}
  if(!notifForm.title.trim()){setNotifError('El asunto es obligatorio.');return}
  if(!notifForm.message.trim()){setNotifError('El mensaje es obligatorio.');return}
  setNotifSaving(true);
  try{
   const payload={user_id:notifForm.user_id,title:notifForm.title.trim(),message:notifForm.message.trim(),case_number:notifForm.case_number.trim()||null,court:notifForm.court.trim()||null,filing_date:notifForm.filing_date||null,attachment_url:notifForm.attachment_url.trim()||null,type:'judicial',is_read:false,archived:false};
   let saveError;
   if(editingNotifId){
    const r=await supabase.from('notifications').update(payload).eq('id',editingNotifId);
    saveError=r.error;
   }else{
    const r=await supabase.from('notifications').insert(payload);
    saveError=r.error;
   }
   if(saveError){setNotifError('No se pudo guardar: '+saveError.message);return}
   await supabase.rpc('record_audit_event',{p_action:'notification_sent',p_target_user_id:notifForm.user_id,p_details:{case_number:notifForm.case_number,court:notifForm.court}});
   const clientProfile=profiles.find(p=>p.id===notifForm.user_id);
   fetch(`${supabaseUrl}/functions/v1/send-email`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${supabaseKey}`},body:JSON.stringify({type:'new_notification',client_email:clientProfile?.email||'',notif_title:notifForm.title.trim(),notif_message:notifForm.message.trim(),case_number:notifForm.case_number.trim()||null,court:notifForm.court.trim()||null,filing_date:notifForm.filing_date||null,attachment_url:notifForm.attachment_url.trim()||null})}).catch(()=>{});
   resetNotifForm();load();setMessage('Notificación guardada y correo enviado al cliente.');
  }catch(err){
   setNotifError('Error inesperado al guardar. Intenta nuevamente.');
  }finally{
   setNotifSaving(false);
  }
 }

 async function deleteNotif(n){
  if(!confirm('¿Eliminar esta notificación?'))return;
  const {error:delError}=await supabase.from('notifications').delete().eq('id',n.id);
  if(delError){setMessage('No se pudo eliminar la notificación.');return}
  load();setMessage('Notificación eliminada.');
 }

 async function changeNotifStatus(n,newStatus){
  const updates={};
  if(newStatus==='read')updates.is_read=true;
  else if(newStatus==='unread')updates.is_read=false;
  else if(newStatus==='archived')updates.archived=true;
  else if(newStatus==='unarchived')updates.archived=false;
  const {error:updError}=await supabase.from('notifications').update(updates).eq('id',n.id);
  if(updError){setMessage('No se pudo cambiar el estado.');return}
  load();
 }

 function notifStatusLabel(n){
  if(n.archived)return'Archivada';
  return n.is_read?'Leída':'Pendiente';
 }

 function startEditCase(c){
  setEditingCase(c.id);
  setCaseEditForm({case_number:c.case_number||'',court:c.authority_name||'',title:c.title||'',filing_date:c.created_at?c.created_at.split('T')[0]:'',attachment_url:'',status:c.status||'received'});
  setCaseEditError('');
 }
 function cancelEditCase(){setEditingCase(null);setCaseEditError('')}
 async function saveCaseEdit(e){
  e.preventDefault();setCaseEditError('');
  if(!caseEditForm.title.trim()){setCaseEditError('El título es obligatorio.');return}
  setCaseEditSaving(true);
  try{
   const updates={title:caseEditForm.title.trim(),case_number:caseEditForm.case_number.trim()||null,authority_name:caseEditForm.court.trim()||null,status:caseEditForm.status};
   const {error}=await supabase.from('cases').update(updates).eq('id',editingCase);
   if(error){setCaseEditError('No se pudo actualizar: '+error.message);return}
   await supabase.rpc('record_audit_event',{p_action:'case_updated_by_admin',p_target_case_id:editingCase,p_details:updates});
   setEditingCase(null);load();setMessage('Caso actualizado correctamente.');
  }catch(err){
   setCaseEditError('Error inesperado al actualizar.');
  }finally{
   setCaseEditSaving(false);
  }
 }
 async function changeCaseStatus(caseId,newStatus){
  const {error}=await supabase.from('cases').update({status:newStatus}).eq('id',caseId);
  if(error){setMessage('No se pudo cambiar el estado del caso.');return}
  load();setMessage('Estado del caso actualizado.');
 }
 async function sendResetLink(profile){
  if(!profile||!profile.email){setMessage('Este cliente no tiene correo registrado.');return}
  setClientActionLoading(profile.id);
  try{
   const {error}=await supabase.auth.resetPasswordForEmail(profile.email,{redirectTo:`${window.location.origin}/#/reset-password`});
   if(error){setMessage('No se pudo enviar el enlace: '+error.message);return}
   await supabase.rpc('record_audit_event',{p_action:'password_reset_link_sent',p_target_user_id:profile.id,p_details:{email:profile.email}}).catch(()=>{});
   setMessage('Enlace de restablecimiento enviado a '+profile.email);
  }catch(err){
   setMessage('Error inesperado al enviar el enlace.');
  }finally{
   setClientActionLoading(null);
  }
 }
 async function setTempPassword(profileId,profileEmail){
  if(!tempPasswordValue||tempPasswordValue.length<8){setMessage('La contraseña debe tener al menos 8 caracteres.');return}
  setClientActionLoading(profileId);
  try{
   const {data,error}=await supabase.functions.invoke('admin-password',{body:{action:'set_temp_password',user_id:profileId,temp_password:tempPasswordValue}});
   if(error){setMessage('No se pudo asignar la contraseña: '+error.message);return}
   if(data&&data.error){setMessage(data.error);return}
   setMessage('Contraseña temporal asignada correctamente a '+profileEmail);
   setTempPasswordForm(null);setTempPasswordValue('');
  }catch(err){
   setMessage('Error inesperado al asignar la contraseña.');
  }finally{
   setClientActionLoading(null);
  }
 }

 return <div className="adminPanel">
  <div className="dashHead"><div><div className="badge"><UserCog size={14}/> Acceso autorizado</div><h2>Panel de administración</h2><p>Solo muestra información de casos con autorización vigente para esta cuenta.</p></div><button className="primary" onClick={exportExcel}><Download size={17}/> Exportar Excel</button></div>
  {error&&<div className="notice error"><AlertCircle size={18}/><span>{error}</span></div>}
  {message&&<div className="notice success"><CheckCircle2 size={18}/><span>{message}</span></div>}
  <nav className="adminNav" aria-label="Secciones administrativas">
   <button className={section==='cases'?'adminNavItem active':'adminNavItem'} onClick={()=>setSection('cases')}><FolderOpen size={17}/> Casos</button>
   <button className={section==='clients'?'adminNavItem active':'adminNavItem'} onClick={()=>setSection('clients')}><Users size={17}/> Clientes <span>{clientProfiles.length}</span></button>
   <button className={section==='judicial'?'adminNavItem active':'adminNavItem'} onClick={()=>setSection('judicial')}><CourtIcon size={17}/> Notificaciones <span>{judicialNotifs.length}</span></button>
   <button className={section==='authorizations'?'adminNavItem active':'adminNavItem'} onClick={()=>setSection('authorizations')}><LockKeyhole size={17}/> Autorizaciones <span>{activeAuthorizations.length}</span></button>
   <button className={section==='audit'?'adminNavItem active':'adminNavItem'} onClick={()=>setSection('audit')}><Activity size={17}/> Auditoría <span>{audit.length}</span></button>
  </nav>

  {section==='cases'&&<>
   <div className="adminStats"><div><b>{profiles.length}</b><span>Usuarios visibles</span></div><div><b>{filtered.length}</b><span>Casos autorizados</span></div><div><b>{activeAuthorizations.length}</b><span>Autorizaciones activas</span></div></div>
   <div className="adminFilters"><div className="searchField"><Search size={17}/><input placeholder="Buscar por nombre, cédula, radicado o caso" value={filters.search} onChange={e=>setFilter('search',e.target.value)}/></div><select value={filters.category} onChange={e=>setFilter('category',e.target.value)}><option value="">Todas las categorías</option>{LEGAL_CATALOG.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select><select value={filters.department} onChange={e=>setFilter('department',e.target.value)}><option value="">Todos los departamentos</option>{DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select><select value={filters.status} onChange={e=>setFilter('status',e.target.value)}><option value="">Todos los estados</option><option value="received">Recibido</option><option value="in_progress">En trámite</option><option value="closed">Finalizado</option></select><input type="date" value={filters.fromDate} onChange={e=>setFilter('fromDate',e.target.value)}/><input type="date" value={filters.toDate} onChange={e=>setFilter('toDate',e.target.value)}/><button className="ghost" onClick={()=>load()} disabled={loading}><RefreshCw size={16} className={loading?'spin':''}/> Recargar</button></div>
   <section className="adminCard"><div className="adminCardHeader"><h3><FolderOpen size={18}/> Casos autorizados</h3><span className="accessNote"><ShieldCheck size={14}/> Acceso limitado por autorización</span></div>{loading?<div className="profileLoading"><Loader2 size={22} className="spin"/> Cargando...</div>:filtered.length?filtered.map(c=>{const p=profiles.find(x=>x.id===c.user_id);return <div key={c.id} className="adminCaseRowWrapper">{editingCase===c.id?<form className="caseEditForm" onSubmit={saveCaseEdit}>{caseEditError&&<div className="notice error"><AlertCircle size={16}/><span>{caseEditError}</span></div>}<div className="formGroup"><label>Asunto / Título <span className="req">*</span></label><input value={caseEditForm.title} onChange={e=>setCaseEditForm({...caseEditForm,title:e.target.value})} disabled={caseEditSaving}/></div><div className="formGrid2"><div className="formGroup"><label>Número de expediente</label><input value={caseEditForm.case_number} onChange={e=>setCaseEditForm({...caseEditForm,case_number:e.target.value})} disabled={caseEditSaving} placeholder="Ej: 1100131030032024-001"/></div><div className="formGroup"><label>Juzgado / Autoridad</label><input value={caseEditForm.court} onChange={e=>setCaseEditForm({...caseEditForm,court:e.target.value})} disabled={caseEditSaving} placeholder="Ej: Juzgado 3 Civil"/></div></div><div className="formGrid2"><div className="formGroup"><label>Fecha de radicación</label><input type="date" value={caseEditForm.filing_date} onChange={e=>setCaseEditForm({...caseEditForm,filing_date:e.target.value})} disabled={caseEditSaving}/></div><div className="formGroup"><label>Estado</label><select value={caseEditForm.status} onChange={e=>setCaseEditForm({...caseEditForm,status:e.target.value})} disabled={caseEditSaving}><option value="received">Recibido</option><option value="in_progress">En trámite</option><option value="closed">Finalizado</option></select></div></div><div className="row"><button type="submit" className="primary" disabled={caseEditSaving}>{caseEditSaving?<><Loader2 size={16} className="spin"/> Guardando...</>:<><CheckCircle2 size={16}/> Guardar cambios</>}</button><button type="button" className="ghost" onClick={cancelEditCase} disabled={caseEditSaving}>Cancelar</button></div></form>:<div className="adminCaseRow"><div className="adminCaseRowMain" onClick={()=>onOpenCase(c.id)}><b>{c.title}</b><span>{p?.full_name||'Usuario'} · {c.legal_category||'Sin categoría'} · {c.case_number||'Sin radicado'}</span></div><span className="caseStatus">{c.status==='in_progress'?'En trámite':c.status==='closed'?'Finalizado':'Recibido'}</span><div className="timelineActions"><button className="ghost sm" onClick={()=>startEditCase(c)}><Edit3 size={14}/> Editar</button><select className="roleSelect" value={c.status||'received'} onChange={e=>changeCaseStatus(c.id,e.target.value)}><option value="received">Recibido</option><option value="in_progress">En trámite</option><option value="closed">Finalizado</option></select><button className="ghost sm" onClick={()=>onOpenCase(c.id)}><Eye size={14}/> Ver</button></div></div>}</div>}):<div className="empty"><LockKeyhole size={32}/><b>No hay casos autorizados</b><span>Los casos aparecerán cuando sus propietarios autoricen la revisión.</span></div>}</section>
  </>}

  {section==='clients'&&<section className="adminCard adminWideCard">
   <div className="adminCardHeader"><div><h3><Users size={18}/> Gestión de clientes</h3><p className="adminCardHint">Lista completa de clientes registrados, separados por cédula y nombre. Cambia el rol o brinda soporte de contraseña según sea necesario.</p></div></div>
   {loading?<div className="profileLoading"><Loader2 size={22} className="spin"/> Cargando clientes...</div>:clientProfiles.length?<div className="authorizationAdminList">
    {clientProfiles.map(p=><div className="authorizationAdminItem" key={p.id} style={{flexDirection:'column',alignItems:'stretch',gap:'10px'}}>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'14px',flexWrap:'wrap'}}>
      <div><b>{p.full_name||'Sin nombre'}</b><span style={{display:'block'}}>Cédula: {p.cedula||'—'} · Cel: {p.phone||'—'}</span><span style={{display:'block'}}><Mail size={12} style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}/>{p.email||'—'}</span><small>Registrado: {p.created_at?new Date(p.created_at).toLocaleDateString('es-CO'):'—'}{p.data_consent?' · Datos autorizados':' · Sin autorización de datos'}</small></div>
      <div className="roleSwitcher">
       <select className="roleSelect" value={p.role||'client'} onChange={e=>changeUserRole(p.id,e.target.value)}>
        <option value="client">Cliente</option>
        <option value="admin">Administrador</option>
       </select>
      </div>
     </div>
     <div className="timelineActions" style={{paddingTop:0,borderTop:'none'}}>
      <button className="ghost sm" onClick={()=>sendResetLink(p)} disabled={clientActionLoading===p.id}>{clientActionLoading===p.id?<Loader2 size={14} className="spin"/>:<><KeyRound size={14}/> Enviar enlace de restablecimiento</>}</button>
      <button className="ghost sm" onClick={()=>{setTempPasswordForm(tempPasswordForm===p.id?null:p.id);setTempPasswordValue('')}}><LockKeyhole size={14}/> Asignar contraseña temporal</button>
     </div>
     {tempPasswordForm===p.id&&<div style={{padding:'8px 0 0'}}><form onSubmit={e=>{e.preventDefault();setTempPassword(p.id,p.email)}} style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}><input type="password" placeholder="Nueva contraseña temporal (mín. 8 caracteres)" value={tempPasswordValue} onChange={e=>setTempPasswordValue(e.target.value)} minLength="8" required style={{flex:'1',minWidth:'200px',padding:'10px 12px',border:'1px solid #dfe4ec',borderRadius:'10px',font:'inherit'}}/><button type="submit" className="primary" style={{padding:'10px 16px',fontSize:'13px',whiteSpace:'nowrap'}} disabled={clientActionLoading===p.id}>{clientActionLoading===p.id?<Loader2 size={14} className="spin"/>:'Asignar'}</button><button type="button" className="ghost sm" onClick={()=>{setTempPasswordForm(null);setTempPasswordValue('')}}>Cancelar</button></form></div>}
    </div>)}
   </div>:<div className="empty"><Users size={32}/><b>Sin clientes registrados</b><span>Los clientes aparecerán aquí cuando se registren.</span></div>}
  </section>}

  {section==='judicial'&&<>
   <div className="dashHead" style={{marginBottom:'12px'}}>
    <div><h3>Notificaciones judiciales</h3><p>Emite y gestiona notificaciones judiciales para clientes específicos.</p></div>
    <div className="row" style={{gap:'8px'}}><button className="ghost" onClick={()=>load()} disabled={loading}><RefreshCw size={16} className={loading?'spin':''}/> Recargar</button><button className="primary" onClick={()=>{resetNotifForm();setShowNotifForm(!showNotifForm)}}><Plus size={18}/> Nueva notificación</button></div>
   </div>
   {notifError&&<div className="notice error"><AlertCircle size={18}/><span>{notifError}</span></div>}
   {showNotifForm&&<form className="caseForm extended" onSubmit={saveNotif} style={{marginBottom:'16px'}}>
    <CollapsibleSection title="Destinatario" icon={User} defaultOpen={true} required>
     <div className="formGroup">
      <label>Cliente destinatario <span className="req">*</span></label>
      <select value={notifForm.user_id} onChange={e=>setNotifForm({...notifForm,user_id:e.target.value})} disabled={notifSaving}>
       <option value="">Selecciona un cliente...</option>
       {clientProfiles.map(p=><option key={p.id} value={p.id}>{p.full_name||p.email||'Usuario'} {p.email?`(${p.email})`:''}</option>)}
      </select>
     </div>
    </CollapsibleSection>
    <CollapsibleSection title="Datos de la notificación" icon={CourtIcon} defaultOpen={true} required>
     <div className="formGroup"><label>Asunto <span className="req">*</span></label><input value={notifForm.title} onChange={e=>setNotifForm({...notifForm,title:e.target.value})} disabled={notifSaving} placeholder="Ej: Notificación de auto admisorio"/></div>
     <div className="formGroup"><label>Mensaje <span className="req">*</span></label><textarea value={notifForm.message} onChange={e=>setNotifForm({...notifForm,message:e.target.value})} rows="3" disabled={notifSaving} placeholder="Describe la notificación..."/></div>
     <div className="formGrid2">
      <div className="formGroup"><label>Número de expediente</label><input value={notifForm.case_number} onChange={e=>setNotifForm({...notifForm,case_number:e.target.value})} disabled={notifSaving} placeholder="Ej: 1100131030032024-001"/></div>
      <div className="formGroup"><label>Juzgado</label><input value={notifForm.court} onChange={e=>setNotifForm({...notifForm,court:e.target.value})} disabled={notifSaving} placeholder="Ej: Juzgado 3 Civil del Circuito"/></div>
     </div>
     <div className="formGrid2">
      <div className="formGroup"><label>Fecha de radicación</label><input type="date" value={notifForm.filing_date} onChange={e=>setNotifForm({...notifForm,filing_date:e.target.value})} disabled={notifSaving}/></div>
      <div className="formGroup"><label>Enlace de consulta o archivo adjunto</label><input value={notifForm.attachment_url} onChange={e=>setNotifForm({...notifForm,attachment_url:e.target.value})} disabled={notifSaving} placeholder="https://..."/></div>
     </div>
    </CollapsibleSection>
    <div className="row">
     <button type="submit" className="primary" disabled={notifSaving}>{notifSaving?<><Loader2 size={18} className="spin"/> Guardando...</>:<><Send size={16}/> {editingNotifId?'Actualizar notificación':'Emitir notificación'}</>}</button>
     <button type="button" className="ghost" onClick={resetNotifForm} disabled={notifSaving}>Cancelar</button>
    </div>
   </form>}
   {loading?<div className="profileLoading"><Loader2 size={22} className="spin"/> Cargando notificaciones...</div>:judicialNotifs.length?<div className="authorizationAdminList">
    {judicialNotifs.map(n=>{const client=profiles.find(p=>p.id===n.user_id);return <div className="authorizationAdminItem" key={n.id}>
     <div>
      <b>{n.title}</b>
      <span>Para: {client?.full_name||client?.email||'Cliente'}</span>
      {n.case_number&&<small>Expediente: {n.case_number} · Juzgado: {n.court||'—'}</small>}
      <small>{new Date(n.created_at).toLocaleString('es-CO')}</small>
     </div>
     <div className="timelineActions">
      <span className="caseStatus">{notifStatusLabel(n)}</span>
      <button className="ghost sm" onClick={()=>startEditNotif(n)}><Edit3 size={14}/> Editar</button>
      {!n.is_read&&<button className="ghost sm" onClick={()=>changeNotifStatus(n,'read')}>Marcar leída</button>}
      {n.is_read&&<button className="ghost sm" onClick={()=>changeNotifStatus(n,'unread')}>Marcar pendiente</button>}
      {!n.archived&&<button className="ghost sm" onClick={()=>changeNotifStatus(n,'archived')}><Archive size={14}/> Archivar</button>}
      {n.archived&&<button className="ghost sm" onClick={()=>changeNotifStatus(n,'unarchived')}>Desarchivar</button>}
      <button className="ghost sm danger" onClick={()=>deleteNotif(n)}><Trash2 size={14}/></button>
     </div>
    </div>})}
   </div>:<div className="empty"><CourtIcon size={32}/><b>Sin notificaciones judiciales</b><span>Crea la primera notificación para un cliente.</span></div>}
  </>}

  {section==='authorizations'&&<section className="adminCard adminWideCard"><div className="adminCardHeader"><div><h3><LockKeyhole size={18}/> Mis autorizaciones</h3><p className="adminCardHint">Estos son los casos que sus propietarios te han permitido consultar.</p></div><span className="securePill"><ShieldCheck size={14}/> RLS activo</span></div>{loading?<div className="profileLoading"><Loader2 size={22} className="spin"/> Cargando autorizaciones...</div>:activeAuthorizations.length? <div className="authorizationAdminList">{activeAuthorizations.map(item=>{const currentCase=caseForAuthorization(item);const owner=currentCase&&profiles.find(profile=>profile.id===currentCase.user_id);return <div className="authorizationAdminItem" key={item.id}><div><b>{currentCase?.title||'Caso autorizado'}</b><span>{owner?.full_name||'Propietario'}</span><small>Autorizado el {new Date(item.authorized_at).toLocaleDateString('es-CO')}</small></div>{currentCase&&<button className="ghost sm" onClick={()=>onOpenCase(currentCase.id)}><Eye size={15}/> Abrir caso</button>}</div>})}</div>:<div className="empty"><LockKeyhole size={32}/><b>No tienes autorizaciones activas</b><span>Un cliente debe autorizarte desde la sección de su caso.</span></div>}</section>}
  {section==='audit'&&<section className="adminCard adminWideCard"><div className="adminCardHeader"><div><h3><Activity size={18}/> Registro de auditoría</h3><p className="adminCardHint">Eventos registrados para revisar accesos y cambios administrativos.</p></div><span className="securePill"><ShieldCheck size={14}/> Solo administradores</span></div>{loading?<div className="profileLoading"><Loader2 size={22} className="spin"/> Cargando auditoría...</div>:audit.length?<div className="auditTable">{audit.map(item=><div className="auditDetailRow" key={item.id}><div><b>{item.action}</b><span>{item.target_case_id?'Caso relacionado: '+item.target_case_id:'Evento general'}</span></div><time>{new Date(item.created_at).toLocaleString('es-CO')}</time></div>)}</div>:<div className="empty"><Activity size={32}/><b>Sin eventos</b><span>Los eventos administrativos aparecerán aquí.</span></div>}</section>}
 </div>
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
  const {data,error}=await supabase.from('profiles').select('full_name,cedula,phone,address,email').eq('id',session.user.id).maybeSingle();
  if(error){setMsg('No se pudo cargar tu perfil: '+error.message);setMsgType('error')}
  else if(data){setFullName(data.full_name||'');setCedula(data.cedula||'');setPhone(data.phone||'');setAddress(data.address||'');setEmail(data.email||session.user.email||'')}
  else{setFullName(session.user.user_metadata?.full_name||'');setEmail(session.user.email||'')}
  setLoading(false);
 }

 function validate(){
  const e={};
  if(!fullName.trim())e.fullName='El nombre completo es obligatorio.';
  if(!cedula.trim())e.cedula='La cédula es obligatoria.';
  else if(!/^\d{5,12}$/.test(cedula.trim()))e.cedula='La cédula debe tener entre 5 y 12 dígitos.';
  if(!phone.trim())e.phone='El celular es obligatorio.';
  else if(!/^3\d{8,9}$/.test(phone.trim()))e.phone='El celular debe ser un número colombiano válido (ej: 3101234567).';
  if(!address.trim())e.address='La dirección es obligatoria.';
  if(!email.trim())e.email='El correo electrónico es obligatorio.';
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))e.email='El correo electrónico no es válido.';
  setErrors(e);
  return Object.keys(e).length===0;
 }

 async function saveProfile(e){
  e.preventDefault();setMsg('');setMsgType('');
  if(!validate()){setMsg('Por favor corrige los campos marcados en rojo.');setMsgType('error');return}
  setSaving(true);
  const {data:existing}=await supabase.from('profiles').select('id').eq('id',session.user.id).maybeSingle();
  if(existing){
   const {error}=await supabase.from('profiles').update({full_name:fullName.trim(),cedula:cedula.trim(),phone:phone.trim(),address:address.trim(),email:email.trim()}).eq('id',session.user.id);
   if(error){setMsg('No se pudo actualizar tu perfil: '+error.message);setMsgType('error')}else{setMsg('Perfil actualizado correctamente.');setMsgType('success')}
  }else{
   const {error}=await supabase.from('profiles').insert({id:session.user.id,full_name:fullName.trim(),cedula:cedula.trim(),phone:phone.trim(),address:address.trim(),email:email.trim()});
   if(error){setMsg('No se pudo crear tu perfil: '+error.message);setMsgType('error')}else{setMsg('Perfil creado correctamente.');setMsgType('success')}
  }
  setSaving(false);
 }

 if(loading) return <div className="profileLoading"><Loader2 size={28} className="spin"/><span>Cargando tu perfil...</span></div>;

 return <div className="profileSection">
  <div className="dashHead"><div><div className="badge"><User size={14}/> Datos personales</div><h2>Mi perfil</h2><p>Tu información personal se mantiene privada y separada por cuenta.</p></div></div>
  {msg&&<div className={msgType==='error'?'notice error':msgType==='success'?'notice success':'notice'}>
   {msgType==='error'&&<AlertCircle size={18}/>}
   {msgType==='success'&&<CheckCircle2 size={18}/>}
   <span>{msg}</span>
  </div>}
  <form className="profileForm" onSubmit={saveProfile}>
   <div className="formGroup"><label>Nombre completo <span className="req">*</span></label><input value={fullName} onChange={e=>setFullName(e.target.value)} disabled={saving} className={errors.fullName?'inputError':''}/>{errors.fullName&&<span className="fieldError">{errors.fullName}</span>}</div>
   <div className="formGroup"><label>Cédula <span className="req">*</span></label><input value={cedula} onChange={e=>setCedula(e.target.value)} disabled={saving} placeholder="Ej: 12345678" className={errors.cedula?'inputError':''}/>{errors.cedula&&<span className="fieldError">{errors.cedula}</span>}</div>
   <div className="formGroup"><label>Celular <span className="req">*</span></label><input value={phone} onChange={e=>setPhone(e.target.value)} disabled={saving} placeholder="Ej: 3101234567" className={errors.phone?'inputError':''}/>{errors.phone&&<span className="fieldError">{errors.phone}</span>}</div>
   <div className="formGroup"><label>Dirección <span className="req">*</span></label><input value={address} onChange={e=>setAddress(e.target.value)} disabled={saving} placeholder="Ej: Calle 123 #45-67" className={errors.address?'inputError':''}/>{errors.address&&<span className="fieldError">{errors.address}</span>}</div>
   <div className="formGroup"><label>Correo electrónico <span className="req">*</span></label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={saving} className={errors.email?'inputError':''}/>{errors.email&&<span className="fieldError">{errors.email}</span>}</div>
   <div className="row"><button type="submit" className="primary" disabled={saving}>{saving?<><Loader2 size={18} className="spin"/> Guardando...</>:'Guardar perfil'}</button></div>
  </form>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
