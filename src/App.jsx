import { useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Heart, Eye, EyeOff, ShieldCheck, Users, MessageCircle } from 'lucide-react'

export default function App() {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!isSupabaseConfigured) {
      setError('La conexión con Supabase todavía no está configurada. Agregá las variables de entorno del proyecto.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setBusy(true)
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) setError(result.error.message)
    else if (mode === 'signup') setMessage('¡Cuenta creada! Revisá tu correo para confirmar el registro.')
    else setMessage('¡Sesión iniciada correctamente!')
  }

  return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><span className="top-note">CONEXIONES AUTÉNTICAS</span></header>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> UN ESPACIO PARA SER VOS</div>
          <h1>Conectá.<br /><span>Sentí. Sé vos.</span></h1>
          <p>Conocé personas, compartí momentos y encontrá conexiones reales en una comunidad donde podés expresarte libremente.</p>
          <div className="feature-row"><span><Users size={17}/> Comunidad</span><span><MessageCircle size={17}/> Conversaciones</span><span><ShieldCheck size={17}/> Más control</span></div>
          <div className="orb orb-one" /><div className="orb orb-two" />
        </div>
        <div className="auth-wrap">
          <div className="auth-card">
            <div className="card-icon"><Heart size={21} fill="currentColor"/></div>
            <h2>{mode === 'signup' ? 'Tu próxima conexión empieza acá' : 'Qué bueno verte de nuevo'}</h2>
            <p className="card-sub">{mode === 'signup' ? 'Creá tu cuenta ZUNO' : 'Iniciá sesión en tu cuenta'}</p>
            <div className="mode-switch"><button className={mode === 'signup' ? 'active' : ''} onClick={() => {setMode('signup');setError('');setMessage('')}}>Crear cuenta</button><button className={mode === 'login' ? 'active' : ''} onClick={() => {setMode('login');setError('');setMessage('')}}>Iniciar sesión</button></div>
            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              <label htmlFor="password">Contraseña</label>
              <div className="password-field"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="Mínimo 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}/><button type="button" aria-label="Mostrar contraseña" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
              {error && <div className="notice error">{error}</div>}
              {message && <div className="notice success">{message}</div>}
              <button className="submit-btn" type="submit" disabled={busy}>{busy ? 'Un momento…' : mode === 'signup' ? 'Crear mi cuenta' : 'Entrar'} <span>→</span></button>
            </form>
            <p className="legal">Al continuar confirmás que tenés 18 años o más y aceptás nuestras condiciones y política de privacidad.</p>
            {!isSupabaseConfigured && <p className="config-hint">Configuración pendiente: conectar las variables de Supabase.</p>}
          </div>
          <div className="under-card"><ShieldCheck size={15}/> Tus datos y tu privacidad importan.</div>
        </div>
      </section>
      <footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )
}
