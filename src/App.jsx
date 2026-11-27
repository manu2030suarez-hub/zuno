import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Heart, Eye, EyeOff, ShieldCheck, Users, MessageCircle, LogOut, UserRound, Sparkles, Compass, Pencil, RefreshCw } from 'lucide-react'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('profile')
  const [profileLoading, setProfileLoading] = useState(true)
  const [people, setPeople] = useState([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleRefresh, setPeopleRefresh] = useState(0)
  const [peopleError, setPeopleError] = useState('')
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
    if (!session?.user) { setProfile(null); setProfileLoading(false); setView('profile'); return }
    setProfileLoading(true)
    let active = true
    supabase.from('profiles').select('display_name, username, bio, avatar_url, zuno_verified').eq('id', session.user.id).maybeSingle()
      .then(({ data, error: profileError }) => {
        if (!active) return
        if (profileError) { setError('No pudimos cargar tu perfil. ' + profileError.message); setProfileLoading(false); return }
        if (data) {
          setProfile(data)
          setDisplayName(data.display_name || '')
          setUsername(data.username || '')
          setBio(data.bio || '')
          setView(data.display_name ? 'home' : 'profile')
        } else {
          setProfile({})
          setView('profile')
        }
        setProfileLoading(false)
      })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!session?.user || view !== 'home') return
    let active = true
    setPeopleLoading(true); setPeopleError('')
    supabase.from('profiles').select('id, display_name, username, bio, avatar_url, zuno_verified, created_at').neq('id', session.user.id).order('created_at', { ascending: false }).limit(40)
      .then(({ data, error: listError }) => {
        if (!active) return
        if (listError) setPeopleError('No pudimos cargar los perfiles. ' + listError.message)
        else setPeople(data || [])
        setPeopleLoading(false)
      })
    return () => { active = false }
  }, [session, view, peopleRefresh])

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
    else if (mode === 'signup' && !result.data.session) setMessage('¡Cuenta creada! Para entrar directamente, hay que desactivar la confirmación de correo en Supabase. Tu estado de verificación de ZUNO seguirá siendo independiente.')
    else setMessage(mode === 'signup' ? '¡Cuenta creada! Bienvenido a ZUNO. Tu cuenta todavía no está verificada.' : '¡Sesión iniciada!')
  }

  async function saveProfile(event) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    const { data, error: saveError } = await supabase.from('profiles').upsert({
      display_name: displayName.trim(), username: username.trim().toLowerCase() || null, bio: bio.trim(), id: session.user.id
    }, { onConflict: 'id' }).select('display_name, username, bio, avatar_url, zuno_verified').maybeSingle()
    setBusy(false)
    if (saveError) setError(saveError.code === '23505' ? 'Ese nombre de usuario ya está ocupado. Probá con otro.' : saveError.message)
    else { setProfile(data); setMessage('¡Perfil guardado correctamente!'); setView('home') }
  }

  async function logout() { await supabase.auth.signOut(); setSession(null); setProfile(null); setMessage('') }

  if (session?.user && profileLoading) return (
    <main className="app-shell"><header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a></header><section className="loading-state"><div className="card-icon"><Heart size={21}/></div><h2>Preparando tu espacio…</h2><p>Estamos cargando tu perfil.</p></section></main>
  )

  if (session?.user && view === 'home') return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><span className="verification-badge">{profile?.zuno_verified ? "✓ Cuenta verificada" : "Cuenta no verificada"}</span><button className="logout-btn" onClick={()=>setView('profile')}><Pencil size={15}/> Editar perfil</button><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></div></header>
      <section className="home-content">
        <div className="home-heading"><div><div className="eyebrow"><span/> DESCUBRÍ ZUNO</div><h1>Hola, <span>{profile?.display_name || displayName || 'bienvenido'}.</span></h1><p>Estas son algunas de las personas de la comunidad. ¡Tu próxima conexión puede empezar acá!</p></div><button className="refresh-btn" onClick={()=>setPeopleRefresh(value=>value+1)}><RefreshCw size={16}/> Actualizar</button></div>
        {peopleError && <div className="notice error">{peopleError}</div>}
        {peopleLoading ? <div className="empty-state">Buscando perfiles…</div> : people.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"><Users size={26}/></div><h2>La comunidad está empezando</h2><p>Tu perfil ya está listo. Cuando otras personas se registren en ZUNO y completen sus perfiles, aparecerán acá.</p><button className="submit-btn home-refresh" onClick={()=>setView('refresh-home')}>Volver a buscar <span>→</span></button></div>
        ) : (
          <div className="people-grid">{people.map(person => <article className="person-card" key={person.id}><div className="person-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : <span>{(person.display_name || person.username || '?').slice(0,1).toUpperCase()}</span>}</div><div className="person-info"><h3>{person.display_name || 'Usuario ZUNO'} {person.zuno_verified && <span className="verified-dot" title="Cuenta verificada">✓</span>}</h3>{person.username && <p className="person-username">@{person.username}</p>}{person.bio && <p className="person-bio">{person.bio}</p>}</div></article>)}</div>
        )}
      </section><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  if (session?.user) return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><span className="verification-badge">{profile?.zuno_verified ? "✓ Cuenta verificada" : "Cuenta no verificada"}</span><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></div></header>
      <section className="account-layout">
        <div className="account-intro"><div className="eyebrow"><span/> TU ESPACIO EN ZUNO</div><h1>Hola,<br/><span>{displayName || 'bienvenido' }.</span></h1><p>Tu cuenta ya está activa. Ahora podés completar tu perfil para que otras personas te conozcan.</p><div className="feature-row"><span><ShieldCheck size={17}/> Cuenta protegida</span><span><Users size={17}/> Comunidad ZUNO</span></div></div>
        <div className="auth-card profile-card"><div className="card-icon"><UserRound size={21}/></div><h2>Completá tu perfil</h2><p className="card-sub">Estos datos ayudan a presentar quién sos.</p>
          <form onSubmit={saveProfile}>
            <label htmlFor="displayName">Nombre para mostrar</label><input id="displayName" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Cómo querés que te llamen" required maxLength={40}/>
            <label htmlFor="username">Nombre de usuario</label><input id="username" value={username} onChange={e=>setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g,''))} placeholder="ej. manu_uy" minLength={3} maxLength={24}/><p className="field-hint">3 a 24 caracteres. Letras, números, puntos y guion bajo.</p>
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
