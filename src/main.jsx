import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {Scale,ShieldCheck,Upload,FolderOpen,ArrowRight,LogIn,LogOut,CirclePlus as PlusCircle,Clock3,FileText,Loader2,AlertCircle,CheckCircle2,User} from 'lucide-react';
import './styles.css';

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
const supabaseKey=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=createClient(supabaseUrl,supabaseKey);

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
   .select('id,title,status,priority,created_at')
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
 const [title,setTitle]=useState('');
 const [facts,setFacts]=useState('');
 const [file,setFile]=useState(null);
 const [msg,setMsg]=useState('');
 const [msgType,setMsgType]=useState('');
 const [saving,setSaving]=useState(false);
 const [caseNumber,setCaseNumber]=useState('');

 async function createCase(e){
  e.preventDefault();
  setMsg('');
  setMsgType('');
  setCaseNumber('');
  setSaving(true);
  try {
   const {data:user}=await supabase.auth.getUser();
   const {data:c,error}=await supabase
    .from('cases')
    .insert({user_id:user.user.id,title,facts})
    .select()
    .single();
   if(error){
    setMsg('No se pudo guardar el caso: '+error.message);
    setMsgType('error');
    return;
   }
   if(file){
    const path=user.user.id+'/'+c.id+'/'+file.name;
    const up=await supabase.storage.from('case-documents').upload(path,file);
    if(up.error){
     setMsg('El caso se guardó pero no se pudo subir el documento: '+up.error.message);
     setMsgType('error');
     setCaseNumber(c.id);
     setTitle('');setFacts('');setFile(null);setOpen(false);
     refresh();
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
     setMsg('El caso se guardó y el documento se subió, pero no se registró en la base de datos: '+ins.error.message);
     setMsgType('error');
     setCaseNumber(c.id);
     setTitle('');setFacts('');setFile(null);setOpen(false);
     refresh();
     return;
    }
   }
   setMsg('Caso guardado correctamente.');
   setMsgType('success');
   setCaseNumber(c.id);
   setTitle('');
   setFacts('');
   setFile(null);
   setOpen(false);
   refresh();
  } catch(err){
   setMsg('Error inesperado al guardar el caso. Tus datos no se han perdido del formulario.');
   setMsgType('error');
  } finally {
   setSaving(false);
  }
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
    <button className="primary" onClick={()=>{setMsg('');setMsgType('');setCaseNumber('');setOpen(true)}}><PlusCircle size={18}/> Nuevo caso</button>
   </div>
   {msg&&<div className={msgType==='error'?'notice error':msgType==='success'?'notice success':'notice'}>
    {msgType==='error'&&<AlertCircle size={18}/>}
    {msgType==='success'&&<CheckCircle2 size={18}/>}
    <span>{msg}</span>
    {caseNumber&&<div className="caseNumberLabel">Número de caso: <strong>{caseNumber}</strong></div>}
   </div>}
   {open&&<form className="caseForm" onSubmit={createCase}>
    <input placeholder="Título del caso" value={title} onChange={e=>setTitle(e.target.value)} required disabled={saving}/>
    <textarea placeholder="Cuéntanos los hechos principales..." value={facts} onChange={e=>setFacts(e.target.value)} rows="6" disabled={saving}/>
    <label className="upload"><Upload size={20}/><span>{file?file.name:'Adjuntar documento'}</span><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} disabled={saving}/></label>
    <div className="row">
     <button type="submit" className="primary" disabled={saving}>
      {saving?<><Loader2 size={18} className="spin"/> Guardando...</>:'Guardar caso'}
     </button>
     <button type="button" className="ghost" onClick={closeForm} disabled={saving}>Cancelar</button>
    </div>
   </form>}
   <div className="caseList">
    {cases.length?cases.map(c=><article className="case" key={c.id}><FolderOpen size={22}/><div><b>{c.title}</b><span>{c.status==='received'?'Recibido':c.status}</span></div><Clock3 size={17}/></article>):<div className="empty"><FolderOpen size={38}/><b>Aún no tienes casos</b><span>Comienza con "Nuevo caso".</span></div>}
   </div>
  </>}
  {tab==='profile'&&<ProfileForm session={session}/>}
 </section>
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
