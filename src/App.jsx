import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Heart, Eye, EyeOff, ShieldCheck, Users, MessageCircle, LogOut, UserRound, Sparkles } from 'lucide-react'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [mode, setMode] = useState('signup')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setProfile(null); return }
    let active = true
    supabase.from('profiles').select('display_name, username, bio, avatar_url').eq('id', session.user.id).maybeSingle()
      .then(({ data, error: profileError }) => {
        if (!active) return
        if (profileError) setError('No pudimos cargar tu perfil. ' + profileError.message)
        if (data) {
          setProfile(data)
          setDisplayName(data.display_name || '')
          setUsername(data.username || '')
          setBio(data.bio || '')
        } else {
          setProfile({})
        }
      })
    return () => { active = false }
  }, [session])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage(''); setError('')
    if (!isSupabaseConfigured) { setError('La conexión con Supabase todavía no está configurada.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (mode === 'signup' && !displayName.trim()) { setError('Escribí cómo querés que te llamemos.'); return }
    setBusy(true)
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName.trim() } } })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) setError(result.error.message)
    else if (mode === 'signup' && !result.data.session) setMessage('¡Cuenta creada! Revisá tu correo para confirmar el registro y después iniciá sesión.')
    else setMessage(mode === 'signup' ? '¡Cuenta creada! Bienvenido a ZUNO.' : '¡Sesión iniciada!')
  }

  async function saveProfile(event) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    const { data, error: saveError } = await supabase.from('profiles').update({
      display_name: displayName.trim(), username: username.trim().toLowerCase() || null, bio: bio.trim()
    }).eq('id', session.user.id).select('display_name, username, bio, avatar_url').single()
    setBusy(false)
    if (saveError) setError(saveError.code === '23505' ? 'Ese nombre de usuario ya está ocupado. Probá con otro.' : saveError.message)
    else { setProfile(data); setMessage('¡Perfil guardado correctamente!') }
  }

  async function logout() { await supabase.auth.signOut(); setSession(null); setProfile(null); setMessage('') }

  if (session?.user) return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></header>
      <section className="account-layout">
        <div className="account-intro"><div className="eyebrow"><span/> TU ESPACIO EN ZUNO</div><h1>Hola,<br/><span>{displayName || 'bienvenido' }.</span></h1><p>Tu cuenta ya está activa. Ahora podés completar tu perfil para que otras personas te conozcan.</p><div className="feature-row"><span><ShieldCheck size={17}/> Cuenta protegida</span><span><Users size={17}/> Comunidad ZUNO</span></div></div>
        <div className="auth-card profile-card"><div className="card-icon"><UserRound size={21}/></div><h2>Completá tu perfil</h2><p className="card-sub">Estos datos ayudan a presentar quién sos.</p>
          <form onSubmit={saveProfile}>
            <label htmlFor="displayName">Nombre para mostrar</label><input id="displayName" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Cómo querés que te llamen" required maxLength={40}/>
            <label htmlFor="username">Nombre de usuario</label><input id="username" value={username} onChange={e=>setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g,''))} placeholder="ej. manu_uy" minLength={3} maxLength={24}/><p className="field-hint">3 a 24 caracteres. Letras, números y guion bajo.</p>
            <label htmlFor="bio">Sobre vos</label><textarea id="bio" value={bio} onChange={e=>setBio(e.target.value)} placeholder="Contá algo sobre vos…" maxLength={300} rows={4}/><div className="char-count">{bio.length}/300</div>
            {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
            <button className="submit-btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar perfil'} <span>→</span></button>
          </form>
          <p className="legal">Tu perfil podrá ampliarse más adelante con fotos, intereses y preferencias de privacidad.</p>
        </div>
      </section><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><span className="top-note">CONEXIONES AUTÉNTICAS</span></header>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span/> UN ESPACIO PARA SER VOS</div><h1>Conectá.<br/><span>Sentí. Sé vos.</span></h1><p>Conocé personas, compartí momentos y encontrá conexiones reales en una comunidad donde podés expresarte libremente.</p><div className="feature-row"><span><Users size={17}/> Comunidad</span><span><MessageCircle size={17}/> Conversaciones</span><span><ShieldCheck size={17}/> Más control</span></div><div className="orb orb-one"/><div className="orb orb-two"/></div>
        <div className="auth-wrap"><div className="auth-card"><div className="card-icon"><Heart size={21} fill="currentColor"/></div><h2>{mode === 'signup' ? 'Tu próxima conexión empieza acá' : 'Qué bueno verte de nuevo'}</h2><p className="card-sub">{mode === 'signup' ? 'Creá tu cuenta ZUNO' : 'Iniciá sesión en tu cuenta'}</p>
          <div className="mode-switch"><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={()=>{setMode('signup');setError('');setMessage('')}}>Crear cuenta</button><button type="button" className={mode === 'login' ? 'active' : ''} onClick={()=>{setMode('login');setError('');setMessage('')}}>Iniciar sesión</button></div>
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && <><label htmlFor="displayName">¿Cómo querés que te llamemos?</label><input id="displayName" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Tu nombre para mostrar" required maxLength={40}/></>}
            <label htmlFor="email">Correo electrónico</label><input id="email" type="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
            <label htmlFor="password">Contraseña</label><div className="password-field"><input id="password" type={showPassword?'text':'password'} autoComplete={mode==='signup'?'new-password':'current-password'} placeholder="Mínimo 8 caracteres" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/><button type="button" aria-label="Mostrar contraseña" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
            {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
            <button className="submit-btn" type="submit" disabled={busy}>{busy?'Un momento…':mode==='signup'?'Crear mi cuenta':'Entrar'} <span>→</span></button>
          </form>
          <p className="legal">ZUNO es para mayores de 18 años. Al continuar confirmás que tenés al menos 18 años y aceptás nuestras condiciones y política de privacidad.</p>
          {!isSupabaseConfigured && <p className="config-hint">Configuración pendiente: conectar las variables de Supabase.</p>}
        </div><div className="under-card"><ShieldCheck size={15}/> Tus datos y tu privacidad importan.</div></div>
      </section><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )
}
