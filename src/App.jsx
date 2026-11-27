import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Heart, Eye, EyeOff, ShieldCheck, Users, MessageCircle, LogOut, UserRound, Sparkles, Compass, Pencil, RefreshCw, ImagePlus, Trash2 } from 'lucide-react'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('profile')
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState('')
  const [people, setPeople] = useState([])
  const [favoriteIds, setFavoriteIds] = useState([])
  const [favoriteBusy, setFavoriteBusy] = useState('')
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleRefresh, setPeopleRefresh] = useState(0)
  const [peopleError, setPeopleError] = useState('')
  const [mode, setMode] = useState('signup')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [interests, setInterests] = useState([])
  const [lookingFor, setLookingFor] = useState([])
  const [ageMin, setAgeMin] = useState('18')
  const [ageMax, setAgeMax] = useState('99')
  const [distanceKm, setDistanceKm] = useState('50')
  const [privacy, setPrivacy] = useState({show_online:true,show_distance:false,show_age:true,show_location:true})
  const [photos, setPhotos] = useState([])
  const [photoBusy, setPhotoBusy] = useState(false)
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
    setProfileLoadError('')
    let active = true
    supabase.from('profiles').select('display_name, username, bio, avatar_url, zuno_verified, city, region, interests, looking_for, preferred_age_min, preferred_age_max, preferred_distance_km, show_online, show_distance, show_age, show_location').eq('id', session.user.id).maybeSingle()
      .then(async ({ data, error: profileError }) => {
        if (!active) return
        if (profileError) { setProfileLoadError(profileError.message); setProfileLoading(false); return }
        if (data) {
          setProfile(data)
          setDisplayName(data.display_name || '')
          setUsername(data.username || '')
          setBio(data.bio || '')
          setCity(data.city || '')
          setRegion(data.region || '')
          setInterests(data.interests || [])
          setLookingFor(data.looking_for || [])
          setAgeMin(String(data.preferred_age_min || 18))
          setAgeMax(String(data.preferred_age_max || 99))
          setDistanceKm(String(data.preferred_distance_km || 50))
          setPrivacy({show_online:data.show_online ?? true,show_distance:data.show_distance ?? false,show_age:data.show_age ?? true,show_location:data.show_location ?? true})
          const [privateResult, photoResult] = await Promise.all([supabase.from('private_profiles').select('birth_date').eq('user_id', session.user.id).maybeSingle(),supabase.from('profile_photos').select('id,storage_path,sort_order').eq('user_id', session.user.id).order('sort_order')])
          if (!privateResult.error) setBirthDate(privateResult.data?.birth_date || '')
          if (!photoResult.error) { const signed = await Promise.all((photoResult.data || []).map(async p => { const {data:s} = await supabase.storage.from('zuno-profile-photos').createSignedUrl(p.storage_path,3600); return {...p,url:s?.signedUrl || ''} })); setPhotos(signed) }
          // A saved profile must never send the user through first-time setup again.
          setView('home')
        } else {
          setProfile({})
          setView('profile')
        }
        setProfileLoading(false)
      })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!session?.user) { setFavoriteIds([]); return }
    let active = true
    supabase.from('profile_favorites').select('favorite_user_id').eq('user_id', session.user.id)
      .then(({ data, error: favoritesError }) => {
        if (!active) return
        if (favoritesError) setPeopleError('No pudimos cargar tus favoritos. ' + favoritesError.message)
        else setFavoriteIds((data || []).map(row => row.favorite_user_id))
      })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!session?.user || !['home', 'favorites'].includes(view)) return
    let active = true
    setPeopleLoading(true); setPeopleError('')
    supabase.from('profiles').select('id, display_name, username, bio, avatar_url, zuno_verified, city, region, interests, looking_for, show_location, created_at').neq('id', session.user.id).order('created_at', { ascending: false }).limit(40)
      .then(async ({ data, error: listError }) => {
        if (!active) return
        if (listError) {
          setPeopleError('No pudimos cargar los perfiles. ' + listError.message)
          setPeopleLoading(false)
          return
        }
        const profiles = data || []
        const ids = profiles.map(person => person.id)
        let photosByUser = {}
        if (ids.length) {
          const { data: photoRows, error: photoError } = await supabase.from('profile_photos').select('id,user_id,storage_path,sort_order').in('user_id', ids).order('sort_order')
          if (!photoError && photoRows?.length) {
            const signedRows = await Promise.all(photoRows.map(async photo => {
              const { data: signed } = await supabase.storage.from('zuno-profile-photos').createSignedUrl(photo.storage_path, 3600)
              return { ...photo, url: signed?.signedUrl || '' }
            }))
            photosByUser = signedRows.reduce((groups, photo) => {
              if (!groups[photo.user_id]) groups[photo.user_id] = []
              if (photo.url) groups[photo.user_id].push(photo)
              return groups
            }, {})
          }
        }
        if (!active) return
        setPeople(profiles.map(person => ({
          ...person,
          photos: photosByUser[person.id] || [],
          visibleCity: person.show_location ? [person.city, person.region].filter(Boolean).join(', ') : ''
        })))
        setPeopleLoading(false)
      })
    return () => { active = false }
  }, [session, view, peopleRefresh])

  async function toggleFavorite(personId) {
    if (!session?.user || favoriteBusy) return
    setFavoriteBusy(personId)
    const isFavorite = favoriteIds.includes(personId)
    const result = isFavorite
      ? await supabase.from('profile_favorites').delete().eq('user_id', session.user.id).eq('favorite_user_id', personId)
      : await supabase.from('profile_favorites').insert({ user_id: session.user.id, favorite_user_id: personId })
    setFavoriteBusy('')
    if (result.error) { setPeopleError('No pudimos actualizar favoritos. ' + result.error.message); return }
    setFavoriteIds(current => isFavorite ? current.filter(id => id !== personId) : [...current, personId])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage(''); setError('')
    if (!isSupabaseConfigured) { setError('La conexión con Supabase todavía no está configurada.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (mode === 'signup' && !displayName.trim()) { setError('Escribí cómo querés que te llamemos.'); return }
    const identifier = email.trim()
    if (!identifier) { setError(mode === 'signup' ? 'Ingresá tu correo electrónico.' : 'Ingresá tu correo electrónico.'); return }
    setBusy(true)
    if (mode === 'signup') {
      const result = await supabase.auth.signUp({ email: identifier, password, options: { data: { display_name: displayName.trim() } } })
      setBusy(false)
      if (result.error) {
        setError(result.error.message)
      } else if (!result.data.session) {
        setVerificationEmail(identifier)
        setMessage('Te enviamos un correo para confirmar tu dirección. Abrí el enlace que recibiste y después iniciá sesión.')
      } else setMessage('¡Cuenta creada! Bienvenido a ZUNO.')
      return
    }
    const result = await supabase.auth.signInWithPassword({ email: identifier, password })
    setBusy(false)
    if (result.error) {
      setError(result.error.code === 'email_not_confirmed' ? 'Primero confirmá tu correo electrónico.' : 'No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.')
      if (result.error.code === 'email_not_confirmed') setVerificationEmail(identifier)
    } else setMessage('¡Sesión iniciada!')
  }

  async function resendVerification(targetEmail = verificationEmail) {
    if (!targetEmail) return
    setBusy(true); setError(''); setMessage('')
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: targetEmail })
    setBusy(false)
    if (resendError) setError(resendError.message)
    else setMessage('Te reenviamos el correo. Revisá también la carpeta de spam.')
  }

  async function saveProfile(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    const normalizedUsername = username.trim().toLowerCase()
    if (normalizedUsername && !/^[a-z0-9_.]{3,24}$/.test(normalizedUsername)) { setBusy(false); setError('El usuario debe tener entre 3 y 24 caracteres: letras, números, puntos o guion bajo.'); return }
    if (!birthDate || Math.floor((Date.now()-new Date(birthDate+'T00:00:00').getTime())/31557600000)<18) { setBusy(false); setError('Ingresá una fecha válida: ZUNO es exclusivo para mayores de 18 años.'); return }
    if (Number(ageMin)>Number(ageMax)) { setBusy(false); setError('La edad mínima no puede superar la máxima.'); return }
    const payload = {id:session.user.id,display_name:displayName.trim(),username:normalizedUsername||null,bio:bio.trim(),city:city.trim()||null,region:region.trim()||null,interests,looking_for:lookingFor,preferred_age_min:Number(ageMin),preferred_age_max:Number(ageMax),preferred_distance_km:Number(distanceKm),...privacy}
    const {data,error:saveError}=await supabase.from('profiles').upsert(payload,{onConflict:'id'}).select('display_name,username,bio,avatar_url,zuno_verified,city,region,interests,looking_for,preferred_age_min,preferred_age_max,preferred_distance_km,show_online,show_distance,show_age,show_location').maybeSingle()
    if(saveError){setBusy(false);setError(saveError.code==='23505'?'Ese nombre de usuario ya está ocupado. Probá con otro.':saveError.message);return}
    const {error:privateError}=await supabase.from('private_profiles').upsert({user_id:session.user.id,birth_date:birthDate,updated_at:new Date().toISOString()},{onConflict:'user_id'})
    setBusy(false); if(privateError){setError('El perfil se guardó, pero falló la fecha privada: '+privateError.message);return}
    setProfile(data);setMessage('¡Perfil guardado correctamente!');setView('home')
  }
  async function uploadPhotos(event) {
    const files=Array.from(event.target.files||[]);event.target.value='';if(!files.length)return
    if(photos.length+files.length>6){setError('Podés subir hasta 6 fotos.');return}
    setPhotoBusy(true);setError('')
    for(const file of files){
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760){setError('Usá JPG, PNG o WEBP de hasta 10 MB.');continue}
      const path=session.user.id+'/'+crypto.randomUUID()+'.'+file.name.split('.').pop().toLowerCase()
      const {error:upError}=await supabase.storage.from('zuno-profile-photos').upload(path,file)
      if(upError){setError(upError.message);continue}
      const {data:row,error:rowError}=await supabase.from('profile_photos').insert({user_id:session.user.id,storage_path:path,sort_order:photos.length}).select('id,storage_path,sort_order').single()
      if(rowError){await supabase.storage.from('zuno-profile-photos').remove([path]);setError(rowError.message);continue}
      const {data:signed}=await supabase.storage.from('zuno-profile-photos').createSignedUrl(path,3600);setPhotos(current=>[...current,{...row,url:signed?.signedUrl||''}])
    }
    setPhotoBusy(false)
  }
  async function deletePhoto(photo) {
    setPhotoBusy(true);const {error:delError}=await supabase.from('profile_photos').delete().eq('id',photo.id).eq('user_id',session.user.id)
    if(!delError){await supabase.storage.from('zuno-profile-photos').remove([photo.storage_path]);setPhotos(current=>current.filter(p=>p.id!==photo.id))}else setError(delError.message);setPhotoBusy(false)
  }
  const interestOptions=['Música','Cine','Deportes','Viajes','Gastronomía','Videojuegos','Arte','Naturaleza','Fitness','Lectura','Series','Tecnología']
  const lookingOptions=['Amistad','Citas','Relación seria','Conocer personas','Charlar']

  async function logout() { await supabase.auth.signOut(); setSession(null); setProfile(null); setMessage(''); setVerificationEmail('') }

  const emailConfirmed = Boolean(session?.user?.email_confirmed_at || session?.user?.confirmed_at)

  if (session?.user && !emailConfirmed) return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></header>
      <section className="loading-state verification-screen">
        <div className="card-icon"><ShieldCheck size={21}/></div><h2>Confirmá tu correo electrónico</h2>
        <p>Necesitamos confirmar que esta dirección te pertenece antes de entrar a ZUNO.</p>
        <button className="submit-btn verification-action" onClick={async()=>{setVerificationEmail(session.user.email || ''); await resendVerification(session.user.email || '')}} disabled={busy}>{busy ? 'Enviando…' : 'Reenviar correo de confirmación'}</button>
        {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
      </section>
    </main>
  )

  if (session?.user && profileLoading) return (
    <main className="app-shell"><header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a></header><section className="loading-state"><div className="card-icon"><Heart size={21}/></div><h2>Preparando tu espacio…</h2><p>Estamos cargando tu perfil.</p></section></main>
  )

  if (session?.user && profileLoadError) return (
    <main className="app-shell"><header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></header><section className="loading-state"><div className="card-icon"><ShieldCheck size={21}/></div><h2>No pudimos cargar tu perfil</h2><p>{profileLoadError}</p><p>Por seguridad, no te vamos a pedir que crees otro perfil mientras no podamos comprobar si ya existe.</p><button className="submit-btn" onClick={()=>window.location.reload()}>Volver a intentar <span>→</span></button></section></main>
  )

  if (session?.user && view === 'detail' && selectedProfile) return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><button className="logout-btn" onClick={()=>{setSelectedProfile(null);setView('home')}}><Compass size={15}/> Volver a descubrir</button>{selectedProfile.isOwn && <button className="logout-btn" onClick={()=>{setSelectedProfile(null);setView('profile')}}><Pencil size={15}/> Editar perfil</button>}</div></header>
      <section className="member-detail">
        <div className="detail-heading"><div className="eyebrow"><span/> PERFIL ZUNO</div><h1>{selectedProfile.display_name || 'Usuario ZUNO'}</h1>{selectedProfile.username && <p className="detail-username">@{selectedProfile.username}</p>}</div>
        <div className="detail-gallery">{(selectedProfile.photos || []).length ? selectedProfile.photos.map(photo=><img key={photo.id || photo.url} src={photo.url} alt={`Foto de ${selectedProfile.display_name || 'usuario'}`}/>) : <div className="detail-no-photo"><UserRound size={42}/><span>Sin fotos por ahora</span></div>}</div>
        <div className="detail-content">
          {selectedProfile.visibleCity && <p className="person-location"><Compass size={15}/>{selectedProfile.visibleCity}</p>}
          {selectedProfile.bio && <section className="detail-section"><h2>Sobre mí</h2><p>{selectedProfile.bio}</p></section>}
          {selectedProfile.interests?.length > 0 && <section className="detail-section"><h2>Intereses y gustos</h2><div className="person-tags">{selectedProfile.interests.map(tag=><span key={tag}>{tag}</span>)}</div></section>}
          {selectedProfile.looking_for?.length > 0 && <section className="detail-section"><h2>¿Qué busca?</h2><div className="person-tags">{selectedProfile.looking_for.map(item=><span key={item}>{item}</span>)}</div></section>}
          {!selectedProfile.bio && !selectedProfile.interests?.length && !selectedProfile.looking_for?.length && !selectedProfile.visibleCity && <p className="detail-private-note">Esta persona todavía no agregó información pública a su perfil.</p>}
          {selectedProfile.isOwn ? <p className="detail-private-note">Este es tu perfil. Podés modificar la información y la privacidad cuando quieras.</p> : <><button type="button" className={`favorite-detail-btn ${favoriteIds.includes(selectedProfile.id) ? 'is-favorite' : ''}`} disabled={favoriteBusy === selectedProfile.id} onClick={()=>toggleFavorite(selectedProfile.id)}><Heart size={17} fill={favoriteIds.includes(selectedProfile.id) ? 'currentColor' : 'none'}/>{favoriteIds.includes(selectedProfile.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}</button><p className="detail-private-note">Solo mostramos la información que esta persona decidió compartir.</p></>}
        </div>
      </section><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  if (session?.user && ['home', 'favorites'].includes(view)) return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><span className="verification-badge">{profile?.zuno_verified ? "✓ Cuenta verificada" : "Cuenta no verificada"}</span><button className="logout-btn" onClick={()=>setView('favorites')}><Heart size={15}/> Favoritos ({favoriteIds.length})</button><button className="logout-btn" onClick={()=>setView('profile')}><Pencil size={15}/> Editar perfil</button><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></div></header>
      <section className="home-content">
        <div className="home-heading"><div><div className="eyebrow"><span/> {view === 'favorites' ? 'TUS PERSONAS GUARDADAS' : 'DESCUBRÍ ZUNO'}</div><h1>{view === 'favorites' ? <>Tus <span>favoritos.</span></> : <>Hola, <span>{profile?.display_name || displayName || 'bienvenido'}.</span></>}</h1><p>{view === 'favorites' ? 'Perfiles que guardaste para volver a encontrarlos.' : 'Estas son algunas de las personas de la comunidad. ¡Tu próxima conexión puede empezar acá!'}</p></div><div className="home-actions">{view === 'favorites' && <button className="refresh-btn" onClick={()=>setView('home')}><Compass size={16}/> Descubrir</button>}<button className="refresh-btn" onClick={()=>setPeopleRefresh(value=>value+1)}><RefreshCw size={16}/> Actualizar</button></div></div>
        {peopleError && <div className="notice error">{peopleError}</div>}
        {peopleLoading ? <div className="empty-state">Buscando perfiles…</div> : (
          <>
          <div className="people-grid">
          {view === 'home' && <article className="person-card own-person-card person-card-clickable" key={session.user.id} role="button" tabIndex={0} onClick={()=>{setSelectedProfile({...profile,photos,visibleCity:profile?.show_location?[profile?.city,profile?.region].filter(Boolean).join(', '):'',isOwn:true});setView('detail')}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedProfile({...profile,photos,visibleCity:profile?.show_location?[profile?.city,profile?.region].filter(Boolean).join(', '):'',isOwn:true});setView('detail')}}}>
            <div className="person-card-gallery">
              {photos.length ? photos.slice(0,3).map(photo => <img key={photo.id} src={photo.url} alt="Tu foto de perfil"/>) : <div className="person-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : <span>{(profile?.display_name || displayName || '?').slice(0,1).toUpperCase()}</span>}</div>}
            </div>
            <div className="person-info">
              <h3>{profile?.display_name || displayName || 'Tu perfil'} <span className="verified-dot" title="Este sos vos">★</span></h3>
              {profile?.username && <p className="person-username">@{profile.username}</p>}
              {profile?.show_location && [profile?.city, profile?.region].filter(Boolean).length > 0 && <p className="person-location"><Compass size={13}/>{[profile.city, profile.region].filter(Boolean).join(', ')}</p>}
              {profile?.bio && <p className="person-bio">{profile.bio}</p>}
              {profile?.interests?.length > 0 && <div className="person-tags">{profile.interests.slice(0,5).map(tag=><span key={tag}>{tag}</span>)}</div>}
              {profile?.looking_for?.length > 0 && <p className="person-looking"><strong>Busca:</strong> {profile.looking_for.join(' · ')}</p>}
              <p className="person-username">Este es tu perfil</p>
            </div>
          </article>}
          {(view === 'favorites' ? people.filter(person => favoriteIds.includes(person.id)) : people).map(person => <article className="person-card person-card-clickable" key={person.id} role="button" tabIndex={0} onClick={()=>{setSelectedProfile({...person,isOwn:false});setView('detail')}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedProfile({...person,isOwn:false});setView('detail')}}}>
            <div className="person-card-gallery">
              {person.photos?.length ? person.photos.slice(0,3).map(photo => <img key={photo.id} src={photo.url} alt={`Foto de ${person.display_name || 'usuario'}`}/>) : <div className="person-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : <span>{(person.display_name || person.username || '?').slice(0,1).toUpperCase()}</span>}</div>}
            </div>
            <div className="person-info">
              <div className="person-title-row"><h3>{person.display_name || 'Usuario ZUNO'} {person.zuno_verified && <span className="verified-dot" title="Cuenta verificada">✓</span>}</h3><button type="button" className={`favorite-btn ${favoriteIds.includes(person.id) ? 'is-favorite' : ''}`} aria-label={favoriteIds.includes(person.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'} title={favoriteIds.includes(person.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'} disabled={favoriteBusy === person.id} onClick={event=>{event.stopPropagation();toggleFavorite(person.id)}}><Heart size={18} fill={favoriteIds.includes(person.id) ? 'currentColor' : 'none'}/></button></div>
              {person.username && <p className="person-username">@{person.username}</p>}
              {person.visibleCity && <p className="person-location"><Compass size={13}/>{person.visibleCity}</p>}
              {person.bio && <p className="person-bio">{person.bio}</p>}
              {person.interests?.length > 0 && <div className="person-tags">{person.interests.slice(0,5).map(tag=><span key={tag}>{tag}</span>)}</div>}
              {person.looking_for?.length > 0 && <p className="person-looking"><strong>Busca:</strong> {person.looking_for.join(' · ')}</p>}
            </div>
          </article>)}</div>
          {view === 'favorites' && !peopleLoading && !people.some(person => favoriteIds.includes(person.id)) && <div className="empty-state"><div className="empty-icon"><Heart size={24}/></div><h2>Todavía no guardaste favoritos</h2><p>Cuando encuentres un perfil que te interese, tocá el corazón para guardarlo acá.</p><button className="submit-btn home-refresh" onClick={()=>setView('home')}>Explorar perfiles <span>→</span></button></div>}
          </>
        )}
      </section><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  if (session?.user) return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions">{profile?.display_name && <button className="logout-btn" onClick={()=>setView('home')}><Compass size={15}/> Volver</button>}<span className="verification-badge">{profile?.zuno_verified ? "✓ Cuenta verificada" : "Cuenta no verificada"}</span><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></div></header>
      <section className="account-layout">
        <div className="account-intro"><div className="eyebrow"><span/> TU ESPACIO EN ZUNO</div><h1>Hola,<br/><span>{displayName || 'bienvenido' }.</span></h1><p>Tu cuenta ya está activa. Ahora podés completar tu perfil para que otras personas te conozcan.</p><div className="feature-row"><span><ShieldCheck size={17}/> Cuenta protegida</span><span><Users size={17}/> Comunidad ZUNO</span></div></div>
        <div className="auth-card profile-card"><div className="card-icon"><UserRound size={21}/></div><h2>{profile?.display_name ? 'Editá tu perfil' : 'Completá tu perfil'}</h2><p className="card-sub">{profile?.display_name ? 'Actualizá la información que ve la comunidad.' : 'Estos datos ayudan a presentar quién sos.'}</p>
          <form onSubmit={saveProfile}>
            <label htmlFor="displayName">Nombre para mostrar</label><input id="displayName" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Cómo querés que te llamen" required maxLength={40}/>
            <label htmlFor="username">Nombre de usuario</label><input id="username" value={username} onChange={e=>setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g,''))} placeholder="ej. manu_uy" minLength={3} maxLength={24}/><p className="field-hint">3 a 24 caracteres. Letras, números, puntos y guion bajo.</p>
            <label htmlFor="bio">Sobre vos</label><textarea id="bio" value={bio} onChange={e=>setBio(e.target.value)} placeholder="Contá algo sobre vos…" maxLength={300} rows={4}/><div className="char-count">{bio.length}/300</div>
            <div className="profile-section"><h3><ImagePlus size={17}/> Fotos y galería</h3><p className="field-hint">Hasta 6 fotos. JPG, PNG o WEBP de hasta 10 MB.</p><div className="photo-gallery">{photos.map(photo=><div className="photo-thumb" key={photo.id}>{photo.url&&<img src={photo.url} alt="Foto de perfil"/>}<button type="button" onClick={()=>deletePhoto(photo)} disabled={photoBusy} aria-label="Eliminar foto"><Trash2 size={15}/></button></div>)}<label className="photo-add"><ImagePlus size={22}/><span>{photoBusy?'Procesando…':'Agregar fotos'}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadPhotos} disabled={photoBusy||photos.length>=6}/></label></div></div>
            <div className="profile-section"><h3>Datos personales</h3><label htmlFor="birthDate">Fecha de nacimiento (privada)</label><input id="birthDate" type="date" value={birthDate} max={new Date().toISOString().slice(0,10)} onChange={e=>setBirthDate(e.target.value)}/><p className="field-hint">Tu fecha completa no se muestra públicamente. ZUNO es solo para mayores de 18 años.</p><label htmlFor="city">Ciudad o localidad aproximada</label><input id="city" value={city} onChange={e=>setCity(e.target.value)} placeholder="Ej. Montevideo"/><label htmlFor="region">Departamento / región</label><input id="region" value={region} onChange={e=>setRegion(e.target.value)} placeholder="Ej. Montevideo"/></div>
            <div className="profile-section"><h3>Intereses y gustos</h3><div className="choice-chips">{interestOptions.map(item=><button type="button" key={item} className={interests.includes(item)?'selected':''} onClick={()=>setInterests(cur=>cur.includes(item)?cur.filter(x=>x!==item):[...cur,item])}>{item}</button>)}</div></div>
            <div className="profile-section"><h3>¿Qué estás buscando?</h3><div className="choice-chips">{lookingOptions.map(item=><button type="button" key={item} className={lookingFor.includes(item)?'selected':''} onClick={()=>setLookingFor(cur=>cur.includes(item)?cur.filter(x=>x!==item):[...cur,item])}>{item}</button>)}</div><label htmlFor="ageMin">Edad mínima</label><input id="ageMin" type="number" min="18" max="99" value={ageMin} onChange={e=>setAgeMin(e.target.value)}/><label htmlFor="ageMax">Edad máxima</label><input id="ageMax" type="number" min="18" max="99" value={ageMax} onChange={e=>setAgeMax(e.target.value)}/><label htmlFor="distanceKm">Distancia máxima aproximada (km)</label><input id="distanceKm" type="number" min="1" max="500" value={distanceKm} onChange={e=>setDistanceKm(e.target.value)}/></div>
            <div className="profile-section"><h3><ShieldCheck size={17}/> Privacidad</h3><div className="privacy-options">{[['show_online','Mostrar cuando estoy conectado'],['show_distance','Mostrar distancia aproximada'],['show_age','Permitir mostrar mi edad'],['show_location','Mostrar ciudad o región']].map(([key,label])=><label className="privacy-toggle" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(privacy[key])} onChange={e=>setPrivacy(cur=>({...cur,[key]:e.target.checked}))}/></label>)}</div></div>
            {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
            <button className="submit-btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : profile?.display_name ? 'Guardar cambios' : 'Guardar perfil'} <span>→</span></button>
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
            <label htmlFor="email">Correo electrónico</label><input id="email" type={mode === 'signup' ? 'email' : 'text'} autoComplete="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
            <label htmlFor="password">Contraseña</label><div className="password-field"><input id="password" type={showPassword?'text':'password'} autoComplete={mode==='signup'?'new-password':'current-password'} placeholder="Mínimo 8 caracteres" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/><button type="button" aria-label="Mostrar contraseña" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
            {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
            <button className="submit-btn" type="submit" disabled={busy}>{busy?'Un momento…':mode==='signup'?'Crear mi cuenta':'Entrar'} <span>→</span></button>
          </form>
          {verificationEmail && <div className="verification-resend"><p>¿No recibiste el correo de confirmación?</p><button type="button" className="logout-btn" onClick={resendVerification} disabled={busy}>Reenviar correo</button></div>}
          <p className="legal">ZUNO es para mayores de 18 años. Al continuar confirmás que tenés al menos 18 años y aceptás nuestras condiciones y política de privacidad.</p>
          {!isSupabaseConfigured && <p className="config-hint">Configuración pendiente: conectar las variables de Supabase.</p>}
        </div><div className="under-card"><ShieldCheck size={15}/> Tus datos y tu privacidad importan.</div></div>
      </section><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )
}
