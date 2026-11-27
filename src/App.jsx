import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Heart, Eye, EyeOff, ShieldCheck, Users, MessageCircle, Send, LogOut, UserRound, Sparkles, Compass, Pencil, RefreshCw, ImagePlus, Images, Trash2, Mic, UserPlus, Check, X, Trash, MapPin, Navigation, StopCircle, Ban, Flag } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function ChatAudioPlayer({ src, error }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [playError, setPlayError] = useState('')
  const formatTime = value => {
    if (!Number.isFinite(value)) return '0:00'
    const minutes = Math.floor(value / 60)
    const seconds = Math.floor(value % 60).toString().padStart(2, '0')
    return minutes + ':' + seconds
  }
  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio || !src) return
    if (audio.paused) {
      try { setPlayError(''); await audio.play() } catch (playbackError) { setPlaying(false); setPlayError(playbackError?.message || 'El navegador no pudo reproducir este formato.') }
    } else { audio.pause() }
  }
  return (
    <div className="chat-audio-player">
      <audio ref={audioRef} src={src || undefined} preload="metadata" onLoadedMetadata={event=>setDuration(event.currentTarget.duration || 0)} onTimeUpdate={event=>setCurrent(event.currentTarget.currentTime || 0)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={event=>setPlayError('Error del reproductor: ' + (event.currentTarget.error?.code || 'desconocido'))} onEnded={()=>{setPlaying(false);setCurrent(0)}}/>
      <button type="button" onClick={togglePlayback} disabled={!src} aria-label={playing ? 'Pausar audio' : 'Reproducir audio'}>{playing ? 'Ⅱ' : '▶'}</button>
      <span>{formatTime(current)} / {formatTime(duration)}</span>
      {!src && <small>{error ? 'Error al preparar el audio: ' + error : 'No se pudo generar el enlace privado del audio.'}</small>}
      {playError && <small>{playError}</small>}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('profile')
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState('')
  const [people, setPeople] = useState([])
  const [favoriteIds, setFavoriteIds] = useState([])
  const [favoriteBusy, setFavoriteBusy] = useState('')
  const [connectionRows, setConnectionRows] = useState([])
  const [connectionBusy, setConnectionBusy] = useState('')
  const [conversations, setConversations] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [activeConversation, setActiveConversation] = useState(null)
  const [showEphemeralMenu, setShowEphemeralMenu] = useState(false)
  const [ephemeralBusy, setEphemeralBusy] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [messageReceipts, setMessageReceipts] = useState({})
  const [activeMessageMenu, setActiveMessageMenu] = useState(null)
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState(null)
  const longPressTimerRef = useRef(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatMediaBusy, setChatMediaBusy] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [audioDraft, setAudioDraft] = useState(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const recorderRef = useRef(null)
  const recordingRequestedRef = useRef(false)
  const recordingStreamRef = useRef(null)
  const recordingChunksRef = useRef([])
  const [chatDraftImages, setChatDraftImages] = useState([])
  const [chatGallery, setChatGallery] = useState([])
  const [showChatGallery, setShowChatGallery] = useState(false)
  const [chatDragOver, setChatDragOver] = useState(false)
  const [showLocationMenu, setShowLocationMenu] = useState(false)
  const [liveLocations, setLiveLocations] = useState([])
  const [liveSharing, setLiveSharing] = useState(null)
  const locationWatchRef = useRef(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [mapVisible, setMapVisible] = useState(false)
  const [mapBusy, setMapBusy] = useState(false)
  const [mapUsers, setMapUsers] = useState([])
  const [mapCenter, setMapCenter] = useState(null)
  const [mapStatus, setMapStatus] = useState('')
  const mapContainerRef = useRef(null)
  const leafletMapRef = useRef(null)
  const mapMarkersRef = useRef([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleRefresh, setPeopleRefresh] = useState(0)
  const [discoverySearch, setDiscoverySearch] = useState('')
  const [discoveryCity, setDiscoveryCity] = useState('')
  const [discoveryInterest, setDiscoveryInterest] = useState('')
  const [discoveryLookingFor, setDiscoveryLookingFor] = useState('')
  const [discoveryVerifiedOnly, setDiscoveryVerifiedOnly] = useState(false)
  const [discoveryWithPhotos, setDiscoveryWithPhotos] = useState(false)
  const [discoverySort, setDiscoverySort] = useState('recent')
  const [peopleError, setPeopleError] = useState('')
  const [blockedUsers, setBlockedUsers] = useState([])
  const [blockBusy, setBlockBusy] = useState('')
  const [reportTarget, setReportTarget] = useState(null)
  const [reportReason, setReportReason] = useState('harassment')
  const [reportDetails, setReportDetails] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
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
    if (!session?.user || !['home', 'favorites', 'connections'].includes(view)) return
    let active = true
    setPeopleLoading(true); setPeopleError('')
    supabase.from('profiles').select('id, display_name, username, bio, avatar_url, zuno_verified, city, region, interests, looking_for, show_location, created_at').neq('id', session.user.id).order('created_at', { ascending: false }).limit(100)
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

  useEffect(() => {
    if (!session?.user) { setBlockedUsers([]); return }
    let active = true
    supabase.from('user_blocks').select('id,blocked_id,created_at')
      .eq('blocker_id', session.user.id).order('created_at', { ascending: false })
      .then(async ({ data, error: blockError }) => {
        if (!active) return
        if (blockError) { setPeopleError('No pudimos cargar los bloqueos. ' + blockError.message); return }
        const rows = data || []
        const ids = rows.map(row => row.blocked_id)
        let names = {}
        if (ids.length) {
          const { data: profiles } = await supabase.from('profiles').select('id,display_name,username').in('id', ids)
          names = Object.fromEntries((profiles || []).map(item => [item.id, item]))
        }
        if (active) setBlockedUsers(rows.map(row => ({ ...row, person: names[row.blocked_id] || null })))
      })
    return () => { active = false }
  }, [session, peopleRefresh])

  async function blockUser(person) {
    if (!session?.user || !person?.id || blockBusy) return
    setBlockBusy(person.id); setPeopleError('')
    const { data, error: blockError } = await supabase.from('user_blocks')
      .insert({ blocker_id: session.user.id, blocked_id: person.id })
      .select('id,blocked_id,created_at').single()
    setBlockBusy('')
    if (blockError) {
      setPeopleError(blockError.code === '23505' ? 'Esta cuenta ya está bloqueada.' : 'No pudimos bloquear esta cuenta. ' + blockError.message)
      return
    }
    setBlockedUsers(current => [{ ...data, person }, ...current])
    setPeople(current => current.filter(item => item.id !== person.id))
    setSelectedProfile(null); setView('home')
    setPeopleError('La cuenta fue bloqueada. Ya no podrán encontrarse ni enviarse mensajes.')
  }

  async function unblockUser(blockedId) {
    if (!session?.user || !blockedId || blockBusy) return
    setBlockBusy(blockedId)
    const { error: unblockError } = await supabase.from('user_blocks').delete()
      .eq('blocker_id', session.user.id).eq('blocked_id', blockedId)
    setBlockBusy('')
    if (unblockError) { setPeopleError('No pudimos desbloquear esta cuenta. ' + unblockError.message); return }
    setBlockedUsers(current => current.filter(item => item.blocked_id !== blockedId))
    setPeopleRefresh(value => value + 1)
    setPeopleError('Cuenta desbloqueada.')
  }

  async function submitUserReport(event) {
    event.preventDefault()
    if (!session?.user || !reportTarget || reportBusy) return
    setReportBusy(true); setPeopleError('')
    const { error: reportError } = await supabase.from('user_reports').insert({
      reporter_id: session.user.id,
      reported_user_id: reportTarget.id,
      reason: reportReason,
      details: reportDetails.trim() || null
    })
    setReportBusy(false)
    if (reportError) { setPeopleError('No pudimos enviar la denuncia. ' + reportError.message); return }
    setReportTarget(null); setReportDetails('')
    setPeopleError('Denuncia enviada de forma privada. Gracias por ayudar a mantener ZUNO seguro.')
  }

  const blockedIds = new Set(blockedUsers.map(item => item.blocked_id))
  const discoveryPeople = people.filter(person => {
    if (blockedIds.has(person.id)) return false
    const term = discoverySearch.trim().toLocaleLowerCase()
    const searchable = [person.display_name, person.username, person.bio, person.visibleCity, ...(person.interests || []), ...(person.looking_for || [])].filter(Boolean).join(' ').toLocaleLowerCase()
    if (term && !searchable.includes(term)) return false
    if (discoveryCity.trim() && !(person.visibleCity || '').toLocaleLowerCase().includes(discoveryCity.trim().toLocaleLowerCase())) return false
    if (discoveryInterest && !(person.interests || []).includes(discoveryInterest)) return false
    if (discoveryLookingFor && !(person.looking_for || []).includes(discoveryLookingFor)) return false
    if (discoveryVerifiedOnly && !person.zuno_verified) return false
    if (discoveryWithPhotos && !(person.photos || []).length) return false
    return true
  }).sort((a,b) => discoverySort === 'name' ? (a.display_name || '').localeCompare(b.display_name || '') : discoverySort === 'oldest' ? new Date(a.created_at || 0)-new Date(b.created_at || 0) : new Date(b.created_at || 0)-new Date(a.created_at || 0))
  const discoveryFiltersActive = Boolean(discoverySearch || discoveryCity || discoveryInterest || discoveryLookingFor || discoveryVerifiedOnly || discoveryWithPhotos || discoverySort !== 'recent')

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

  useEffect(() => {
    if (!session?.user) { setConnectionRows([]); return }
    let active = true
    supabase.from('connection_requests').select('id,sender_id,receiver_id,status,created_at,updated_at')
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false })
      .then(({ data, error: connectionError }) => {
        if (!active) return
        if (connectionError) setPeopleError('No pudimos cargar tus conexiones. ' + connectionError.message)
        else setConnectionRows(data || [])
      })
    return () => { active = false }
  }, [session])

  async function sendConnectionRequest(personId) {
    if (!session?.user || connectionBusy) return
    setConnectionBusy(personId); setPeopleError('')
    const { data, error: requestError } = await supabase.from('connection_requests')
      .insert({ sender_id: session.user.id, receiver_id: personId })
      .select('id,sender_id,receiver_id,status,created_at,updated_at').single()
    setConnectionBusy('')
    if (requestError) {
      setPeopleError(requestError.code === '23505' ? 'Ya existe una solicitud entre ustedes.' : 'No pudimos enviar la solicitud. ' + requestError.message)
      return
    }
    setConnectionRows(current => [data, ...current])
  }

  async function respondToConnection(requestId, status) {
    if (!session?.user || connectionBusy) return
    setConnectionBusy(requestId); setPeopleError('')
    const { data, error: responseError } = await supabase.from('connection_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId).eq('receiver_id', session.user.id)
      .select('id,sender_id,receiver_id,status,created_at,updated_at').single()
    setConnectionBusy('')
    if (responseError) { setPeopleError('No pudimos actualizar la solicitud. ' + responseError.message); return }
    setConnectionRows(current => current.map(row => row.id === requestId ? data : row))
  }

  async function markConversationRead(conversationId) {
    if (!session?.user || !conversationId) return
    const readAt = new Date().toISOString()
    const { error: readError } = await supabase.from('conversation_reads').upsert({ conversation_id: conversationId, user_id: session.user.id, last_read_at: readAt }, { onConflict: 'conversation_id,user_id' })
    if (!readError) setUnreadCounts(current => ({ ...current, [conversationId]: 0 }))
  }

  async function recordMessageReceipt(messageId, read = false) {
    if (!session?.user || !messageId) return
    const now = new Date().toISOString()
    const values = { message_id: messageId, user_id: session.user.id, delivered_at: now, ...(read ? { read_at: now } : {}) }
    const { data, error: receiptError } = await supabase.from('message_receipts').upsert(values, { onConflict: 'message_id,user_id' }).select('message_id,user_id,delivered_at,read_at').single()
    if (!receiptError && data) setMessageReceipts(current => ({ ...current, [messageId]: data }))
  }

  function playMessageSound() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, context.currentTime)
      oscillator.frequency.setValueAtTime(660, context.currentTime + 0.12)
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28)
      oscillator.connect(gain); gain.connect(context.destination)
      oscillator.start(); oscillator.stop(context.currentTime + 0.3)
      oscillator.onended = () => context.close()
    } catch (error) { /* El navegador puede bloquear audio automático. */ }
  }

  async function resolveChatMedia(rows) {
    return Promise.all((rows || []).map(async item => {
      if (!['image', 'audio'].includes(item.message_type) || !item.media_path) return item
      const { data, error } = await supabase.storage.from('zuno-chat-media').createSignedUrl(item.media_path, 3600)
      return { ...item, media_url: data?.signedUrl || '', media_error: error?.message || (!data?.signedUrl ? 'Supabase no devolvió un enlace firmado.' : '') }
    }))
  }

  async function purgeExpiredMessages(conversationId) {
    if (!conversationId) return
    const now = new Date().toISOString()
    const { data: expiredRows } = await supabase.from('messages').select('id,media_path').eq('conversation_id', conversationId).not('expires_at', 'is', null).lte('expires_at', now)
    const paths = (expiredRows || []).map(item => item.media_path).filter(Boolean)
    if (paths.length) await supabase.storage.from('zuno-chat-media').remove(paths)
    const { error } = await supabase.rpc('purge_expired_chat_messages', { p_conversation_id: conversationId })
    if (error) console.error('No se pudieron limpiar mensajes vencidos:', error.message)
  }

  async function changeEphemeralDuration(minutes) {
    if (!activeConversation || ephemeralBusy) return
    setEphemeralBusy(true); setPeopleError('')
    const { error } = await supabase.rpc('set_conversation_ephemeral_duration', { p_conversation_id: activeConversation.id, p_duration_minutes: minutes })
    if (error) setPeopleError('No pudimos cambiar el modo efímero. ' + error.message)
    else setActiveConversation(current => current ? { ...current, ephemeral_duration_minutes: minutes } : current)
    setEphemeralBusy(false); setShowEphemeralMenu(false)
  }

  async function openChat(person) {
    if (!session?.user || !person?.id) return
    if (blockedUsers.some(item => item.blocked_id === person.id)) { setPeopleError('Esta cuenta está bloqueada. Desbloqueala antes de iniciar un chat.'); return }
    const ids = [session.user.id, person.id].sort()
    setChatBusy(true); setPeopleError('')
    const { data: conversation, error: conversationError } = await supabase.from('conversations').upsert({ member_one: ids[0], member_two: ids[1] }, { onConflict: 'member_one,member_two' }).select('id,member_one,member_two,ephemeral_duration_minutes').single()
    if (conversationError) { setChatBusy(false); setPeopleError('No pudimos abrir el chat. ' + conversationError.message); return }
    await purgeExpiredMessages(conversation.id)
    const { data: messages, error: messagesError } = await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,message_type,media_path,latitude,longitude,location_expires_at,expires_at').eq('conversation_id', conversation.id).or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()).order('created_at')
    setChatBusy(false)
    if (messagesError) { setPeopleError('No pudimos cargar los mensajes. ' + messagesError.message); return }
    const { data: hiddenRows, error: hiddenError } = await supabase.from('message_hidden_for').select('message_id').eq('user_id', session.user.id)
    if (hiddenError) { setChatBusy(false); setPeopleError('No pudimos cargar tus mensajes ocultos. ' + hiddenError.message); return }
    const hiddenIds = (hiddenRows || []).map(row => row.message_id)
    const displayMessages = await resolveChatMedia((messages || []).filter(item => !hiddenIds.includes(item.id)))
    const { data: activeLocations } = await supabase.from('live_locations').select('id,conversation_id,sender_id,latitude,longitude,expires_at,ended_at,updated_at').eq('conversation_id', conversation.id).is('ended_at', null).gt('expires_at', new Date().toISOString())
    setLiveLocations(activeLocations || [])
    setLiveSharing((activeLocations || []).find(item => item.sender_id === session.user.id) || null)
    const { data: priorImages } = await supabase.from('messages').select('id,media_path,created_at,expires_at').eq('sender_id', session.user.id).eq('message_type', 'image').not('media_path', 'is', null).or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()).order('created_at', { ascending: false }).limit(30)
    const gallery = await Promise.all((priorImages || []).map(async item => { const { data: signed } = await supabase.storage.from('zuno-chat-media').createSignedUrl(item.media_path, 3600); return { ...item, url: signed?.signedUrl || '' } }))
    setChatGallery(gallery.filter(item => item.url))
    const incomingMessages = (messages || []).filter(item => item.sender_id !== session.user.id)
    if (incomingMessages.length) {
      const now = new Date().toISOString()
      await supabase.from('message_receipts').upsert(incomingMessages.map(item => ({ message_id: item.id, user_id: session.user.id, delivered_at: now, read_at: now })), { onConflict: 'message_id,user_id' })
    }
    const sentIds = (messages || []).filter(item => item.sender_id === session.user.id).map(item => item.id)
    let receiptMap = {}
    if (sentIds.length) {
      const { data: receipts } = await supabase.from('message_receipts').select('message_id,user_id,delivered_at,read_at').in('message_id', sentIds).neq('user_id', session.user.id)
      receiptMap = Object.fromEntries((receipts || []).map(item => [item.message_id, item]))
    }
    setMessageReceipts(receiptMap)
    setActiveConversation({ ...conversation, ephemeral_duration_minutes: conversation.ephemeral_duration_minutes || 0, person }); setChatMessages(displayMessages); setChatDraft(''); setShowChatGallery(false); setActiveMessageMenu(null); setShowEphemeralMenu(false); await markConversationRead(conversation.id); setView('chat')
  }

  function getBrowserPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Este navegador no permite obtener la ubicación.')); return }
      navigator.geolocation.getCurrentPosition(
        position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        error => reject(new Error(error.code === 1 ? 'Tenés que permitir el acceso a la ubicación.' : error.code === 2 ? 'No pudimos determinar tu ubicación.' : 'Se agotó el tiempo para obtener tu ubicación.')),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
      )
    })
  }

  async function sendCurrentLocation() {
    if (!activeConversation || chatMediaBusy) return
    setChatMediaBusy(true); setPeopleError(''); setShowLocationMenu(false)
    try {
      const coords = await getBrowserPosition()
      const { data, error: locationError } = await supabase.from('messages').insert({
        conversation_id: activeConversation.id,
        sender_id: session.user.id,
        body: null,
        message_type: 'location',
        latitude: coords.latitude,
        longitude: coords.longitude
      }).select('id,conversation_id,sender_id,body,created_at,message_type,media_path,latitude,longitude,location_expires_at,expires_at').single()
      if (locationError) throw locationError
      setChatMessages(current => [...current, data])
    } catch (error) { setPeopleError('No pudimos enviar tu ubicación. ' + error.message) }
    setChatMediaBusy(false)
  }

  async function startLiveLocation(minutes) {
    if (!activeConversation || liveSharing || chatMediaBusy) return
    setChatMediaBusy(true); setPeopleError(''); setShowLocationMenu(false)
    try {
      const coords = await getBrowserPosition()
      const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString()
      const { data, error: startError } = await supabase.from('live_locations').insert({
        conversation_id: activeConversation.id,
        sender_id: session.user.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        expires_at: expiresAt
      }).select('id,conversation_id,sender_id,latitude,longitude,expires_at,ended_at,updated_at').single()
      if (startError) throw startError
      setLiveSharing(data)
      setLiveLocations(current => [...current.filter(item => item.id !== data.id), data])
      if (!navigator.geolocation?.watchPosition) throw new Error('Tu navegador no permite actualizar la ubicación en tiempo real.')
      locationWatchRef.current = navigator.geolocation.watchPosition(async position => {
        const updatedAt = new Date().toISOString()
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, updated_at: updatedAt }
        const { data: updated, error: updateError } = await supabase.from('live_locations').update(next).eq('id', data.id).select('id,conversation_id,sender_id,latitude,longitude,expires_at,ended_at,updated_at').maybeSingle()
        if (!updateError && updated) {
          setLiveSharing(updated)
          setLiveLocations(current => current.map(item => item.id === updated.id ? updated : item))
        }
      }, geoError => setPeopleError(geoError.code === 1 ? 'Se revocó el permiso de ubicación. Detené y volvé a iniciar el envío si querés compartirla.' : 'No pudimos actualizar tu ubicación.'), { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 })
    } catch (error) { setPeopleError('No pudimos iniciar la ubicación en tiempo real. ' + error.message) }
    setChatMediaBusy(false)
  }

  async function stopLiveLocation(locationId = liveSharing?.id) {
    if (!locationId) return
    if (locationWatchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(locationWatchRef.current)
    locationWatchRef.current = null
    const endedAt = new Date().toISOString()
    const { data, error: stopError } = await supabase.from('live_locations').update({ ended_at: endedAt, updated_at: endedAt }).eq('id', locationId).select('id,conversation_id,sender_id,latitude,longitude,expires_at,ended_at,updated_at').maybeSingle()
    if (stopError) { setPeopleError('No pudimos detener la ubicación. ' + stopError.message); return }
    setLiveSharing(null)
    if (data) setLiveLocations(current => current.map(item => item.id === data.id ? data : item))
  }

  useEffect(() => {
    if (!liveSharing?.id) return
    const remaining = new Date(liveSharing.expires_at).getTime() - Date.now()
    if (remaining <= 0) { stopLiveLocation(liveSharing.id); return }
    const timer = window.setTimeout(() => stopLiveLocation(liveSharing.id), remaining)
    return () => window.clearTimeout(timer)
  }, [liveSharing?.id, liveSharing?.expires_at])

  useEffect(() => () => {
    if (locationWatchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(locationWatchRef.current)
  }, [])


  useEffect(() => {
    if (view !== 'map' || !session?.user || !mapContainerRef.current) return
    let cancelled = false
    let map = leafletMapRef.current
    if (!map) {
      map = L.map(mapContainerRef.current, { zoomControl: true }).setView([-34.9011, -56.1645], 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map)
      leafletMapRef.current = map
    }
    const loadMapData = async () => {
      setMapStatus('')
      const [{ data: ownLocation, error: ownError }, { data: nearby, error: nearbyError }] = await Promise.all([
        supabase.from('user_map_locations').select('latitude,longitude,map_visible,updated_at').eq('user_id', session.user.id).maybeSingle(),
        supabase.rpc('get_nearby_map_users', { p_radius_km: 50 })
      ])
      if (cancelled) return
      if (ownError) { setMapStatus('No pudimos consultar tu configuración del mapa: ' + ownError.message); return }
      if (nearbyError) { setMapStatus('No pudimos cargar los usuarios cercanos: ' + nearbyError.message); return }
      setMapVisible(Boolean(ownLocation?.map_visible))
      setMapUsers(nearby || [])
      if (ownLocation?.latitude != null && ownLocation?.longitude != null && ownLocation?.updated_at && new Date(ownLocation.updated_at).getTime() > Date.now() - 86400000) {
        const center = [Number(Number(ownLocation.latitude).toFixed(2)), Number(Number(ownLocation.longitude).toFixed(2))]
        setMapCenter(center)
        map.setView(center, 11)
      } else if ((nearby || []).length) {
        const first = nearby[0]
        map.setView([Number(first.approximate_latitude), Number(first.approximate_longitude)], 10)
      }
      window.setTimeout(() => map.invalidateSize(), 100)
    }
    loadMapData()
    return () => {
      cancelled = true
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        mapMarkersRef.current = []
      }
    }
  }, [view, session?.user?.id, mapVisible])

  useEffect(() => {
    const map = leafletMapRef.current
    if (view !== 'map' || !map) return
    mapMarkersRef.current.forEach(marker => marker.remove())
    mapMarkersRef.current = mapUsers.map(person => {
      const safeName = String(person.display_name || 'Usuario ZUNO').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
      const marker = L.circleMarker(
        [Number(person.approximate_latitude), Number(person.approximate_longitude)],
        { radius: 9, color: '#ffffff', weight: 2, fillColor: '#7657e8', fillOpacity: 0.95 }
      ).bindPopup('<strong>' + safeName + '</strong><br>Distancia aproximada: ' + (person.approximate_distance_km ?? '—') + ' km')
      marker.addTo(map)
      return marker
    })
  }, [mapUsers, view])

  useEffect(() => () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
      mapMarkersRef.current = []
    }
  }, [])

  async function refreshMyMapLocation() {
    if (mapBusy) return
    setMapBusy(true)
    setMapStatus('')
    try {
      const coords = await getBrowserPosition()
      const { error: updateError } = await supabase.rpc('update_my_map_location', {
        p_latitude: coords.latitude,
        p_longitude: coords.longitude
      })
      if (updateError) throw updateError
      setMapVisible(true)
      setMapCenter([Number(coords.latitude.toFixed(2)), Number(coords.longitude.toFixed(2))])
      setMapStatus('Tu ubicación aproximada se actualizó. Ya aparecés en el mapa.')
      const { data, error: nearbyError } = await supabase.rpc('get_nearby_map_users', { p_radius_km: 50 })
      if (nearbyError) throw nearbyError
      setMapUsers(data || [])
      setPeopleRefresh(value => value + 1)
    } catch (locationError) {
      setMapStatus('No pudimos actualizar tu ubicación. ' + (locationError.message || 'Revisá el permiso del navegador.'))
    } finally { setMapBusy(false) }
  }

  async function setMyMapVisibility(visible) {
    if (mapBusy) return
    setMapBusy(true)
    setMapStatus('')
    const { error: visibilityError } = await supabase.rpc('set_my_map_visibility', { p_visible: visible })
    if (visibilityError) {
      setMapStatus('No pudimos cambiar tu visibilidad: ' + visibilityError.message)
    } else {
      setMapVisible(visible)
      if (!visible) {
        setMapCenter(null)
        setMapStatus('Ya no aparecés en el mapa y tus coordenadas guardadas fueron eliminadas.')
      } else {
        setMapStatus('Visibilidad activada. Para aparecer, actualizá tu ubicación con tu permiso.')
      }
      const { data } = await supabase.rpc('get_nearby_map_users', { p_radius_km: 50 })
      setMapUsers(data || [])
    }
    setMapBusy(false)
  }

  async function hideMessageForMe(message) {
    const { error: hideError } = await supabase.from('message_hidden_for').insert({ message_id: message.id, user_id: session.user.id })
    if (hideError && hideError.code !== '23505') { setPeopleError('No pudimos eliminar el mensaje de tu chat. ' + hideError.message); return }
    setChatMessages(current => current.filter(item => item.id !== message.id))
    setActiveMessageMenu(null)
  }

  async function deleteMessageForEveryone(message) {
    if (message.sender_id !== session.user.id) return
    setDeleteConfirmMessage(message)
    setActiveMessageMenu(null)
  }

  async function confirmDeleteMessageForEveryone() {
    const message = deleteConfirmMessage
    if (!message || message.sender_id !== session.user.id) return
    setChatMediaBusy(true); setPeopleError('')
    const { error: deleteError } = await supabase.from('messages').delete().eq('id', message.id).eq('sender_id', session.user.id)
    if (deleteError) { setPeopleError('No pudimos eliminar el mensaje para todos. ' + deleteError.message); setChatMediaBusy(false); return }
    if (message.media_path) await supabase.storage.from('zuno-chat-media').remove([message.media_path])
    setChatMessages(current => current.filter(item => item.id !== message.id))
    setMessageReceipts(current => { const next = { ...current }; delete next[message.id]; return next })
    setActiveMessageMenu(null); setChatMediaBusy(false); setDeleteConfirmMessage(null)
  }

  async function sendChatMessage(event) {
    event.preventDefault()
    const body = chatDraft.trim()
    if (!body || !activeConversation || chatBusy) return
    setChatBusy(true)
    const { data, error: sendError } = await supabase.from('messages').insert({ conversation_id: activeConversation.id, sender_id: session.user.id, body }).select('id,conversation_id,sender_id,body,created_at,message_type,media_path,expires_at').single()
    setChatBusy(false)
    if (sendError) { setPeopleError('No pudimos enviar el mensaje. ' + sendError.message); return }
    setChatMessages(current => [...current, data]); setChatDraft('')
  }

  async function startChatRecording(event) {
    if (!activeConversation || isRecording || audioDraft || chatMediaBusy) return
    event?.preventDefault?.()
    recordingRequestedRef.current = true
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setPeopleError('Tu navegador no permite grabar audio desde esta página.')
        return
      }
      event?.currentTarget?.setPointerCapture?.(event.pointerId)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!recordingRequestedRef.current) { stream.getTracks().forEach(track => track.stop()); return }
      recordingStreamRef.current = stream
      recordingChunksRef.current = []
      const audioProbe = document.createElement('audio')
      const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus']
      const mimeType = candidates.find(type => MediaRecorder.isTypeSupported?.(type) && audioProbe.canPlayType(type.split(';')[0]) !== '') || ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      recorder.ondataavailable = chunkEvent => {
        if (chunkEvent.data?.size) recordingChunksRef.current.push(chunkEvent.data)
      }
      recorder.onstop = () => {
        const type = (recorder.mimeType || 'audio/webm').split(';')[0]
        const blob = new Blob(recordingChunksRef.current, { type })
        stream.getTracks().forEach(track => track.stop())
        recordingStreamRef.current = null
        recorderRef.current = null
        recordingChunksRef.current = []
        setIsRecording(false)
        if (blob.size) setAudioDraft({ blob, url: URL.createObjectURL(blob), mimeType: type })
      }
      recorder.start()
      setIsRecording(true)
      setPeopleError('')
    } catch (error) {
      recordingStreamRef.current?.getTracks().forEach(track => track.stop())
      recordingStreamRef.current = null
      recordingRequestedRef.current = false
      setIsRecording(false)
      setPeopleError(error.name === 'NotAllowedError' ? 'Necesitás permitir el acceso al micrófono para grabar.' : 'No pudimos iniciar la grabación. ' + error.message)
    }
  }

  function stopChatRecording() {
    recordingRequestedRef.current = false
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  function discardAudioDraft() {
    if (audioDraft?.url) URL.revokeObjectURL(audioDraft.url)
    setAudioDraft(null)
    setAudioPlaying(false)
  }

  async function sendChatAudio() {
    if (!audioDraft || !activeConversation || chatMediaBusy) return
    setChatMediaBusy(true)
    setPeopleError('')
    const mime = audioDraft.mimeType
    const extensions = { 'audio/webm':'webm', 'audio/ogg':'ogg', 'audio/mp4':'mp4', 'audio/mpeg':'mp3', 'audio/wav':'wav' }
    const extension = extensions[mime]
    if (!extension) {
      setPeopleError('El formato de audio de este navegador no es compatible.')
      setChatMediaBusy(false)
      return
    }
    const path = `${activeConversation.id}/${session.user.id}/${crypto.randomUUID()}.${extension}`
    try {
      const file = new File([audioDraft.blob], `zuno-audio.${extension}`, { type: mime })
      const { data: uploadedAudio, error: uploadError } = await supabase.storage.from('zuno-chat-media').upload(path, file, { contentType: mime, upsert: false })
      if (uploadError) throw uploadError
      const storedPath = uploadedAudio?.path
      if (!storedPath) throw new Error('Supabase no confirmó la ruta del archivo subido.')
      const { data, error: insertError } = await supabase.from('messages').insert({
        conversation_id: activeConversation.id,
        sender_id: session.user.id,
        body: null,
        message_type: 'audio',
        media_path: storedPath
      }).select('id,conversation_id,sender_id,body,created_at,message_type,media_path,expires_at').single()
      if (insertError) {
        await supabase.storage.from('zuno-chat-media').remove([storedPath])
        throw insertError
      }
      const [displayMessage] = await resolveChatMedia([data])
      setChatMessages(current => current.some(message => message.id === data.id) ? current : [...current, displayMessage])
      discardAudioDraft()
    } catch (error) {
      setPeopleError('No pudimos enviar el audio. ' + error.message)
    }
    setChatMediaBusy(false)
  }

  function addChatImages(files) {
    const accepted = Array.from(files || [])
    if (!accepted.length) return
    setPeopleError('')
    setChatDraftImages(current => {
      const room = 5 - current.length
      if (room <= 0) { setPeopleError('Podés preparar hasta 5 imágenes por envío.'); return current }
      const valid = accepted.slice(0, room).filter(file => ['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) && file.size <= 10 * 1024 * 1024)
      if (valid.length !== Math.min(accepted.length, room)) setPeopleError('Se aceptan JPG, PNG, WEBP o GIF de hasta 10 MB cada una. Máximo 5 imágenes.')
      return [...current, ...valid.map(file => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), rotation: 0, zoom: 1, offsetX: 0, offsetY: 0 }))]
    })
  }

  function updateDraftImage(id, changes) {
    setChatDraftImages(current => current.map(item => item.id === id ? { ...item, ...changes } : item))
  }

  function startCropDrag(event, item) {
    if (item.zoom <= 1) return
    event.preventDefault()
    const preview = event.currentTarget
    preview.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startY = event.clientY
    const startOffsetX = item.offsetX || 0
    const startOffsetY = item.offsetY || 0
    const bounds = event.currentTarget.getBoundingClientRect()
    const rangeX = Math.max(1, bounds.width * (item.zoom - 1) / 2)
    const rangeY = Math.max(1, bounds.height * (item.zoom - 1) / 2)
    const move = moveEvent => {
      const offsetX = Math.max(-1, Math.min(1, startOffsetX + (moveEvent.clientX - startX) / rangeX))
      const offsetY = Math.max(-1, Math.min(1, startOffsetY + (moveEvent.clientY - startY) / rangeY))
      updateDraftImage(item.id, { offsetX, offsetY })
    }
    const stop = () => {
      preview.removeEventListener('pointermove', move)
      preview.removeEventListener('pointerup', stop)
      preview.removeEventListener('pointercancel', stop)
    }
    preview.addEventListener('pointermove', move)
    preview.addEventListener('pointerup', stop)
    preview.addEventListener('pointercancel', stop)
  }

  function removeDraftImage(id) {
    setChatDraftImages(current => {
      const item = current.find(image => image.id === id)
      if (item?.url?.startsWith('blob:')) URL.revokeObjectURL(item.url)
      return current.filter(image => image.id !== id)
    })
  }

  async function addGalleryImage(item) {
    if (chatDraftImages.length >= 5) { setPeopleError('Podés preparar hasta 5 imágenes por envío.'); return }
    try {
      const { data, error: downloadError } = await supabase.storage.from('zuno-chat-media').download(item.media_path)
      if (downloadError) throw downloadError
      const file = new File([data], 'zuno-foto.jpg', { type: data.type || 'image/jpeg' })
      setChatDraftImages(current => current.length >= 5 ? current : [...current, { id: crypto.randomUUID(), file, url: URL.createObjectURL(file), rotation: 0, zoom: 1, offsetX: 0, offsetY: 0 }])
    } catch (error) { setPeopleError('No pudimos reutilizar esa foto. ' + error.message) }
  }

  async function prepareEditedImage(item) {
    const image = new Image()
    image.src = item.url
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject })
    const angle = ((item.rotation % 360) + 360) % 360
    const swapped = angle === 90 || angle === 270
    const width = swapped ? image.naturalHeight : image.naturalWidth
    const height = swapped ? image.naturalWidth : image.naturalHeight
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.translate(width / 2, height / 2); ctx.rotate(angle * Math.PI / 180)
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
    const zoom = Math.max(1, item.zoom || 1)
    const cropWidth = width / zoom, cropHeight = height / zoom
    const output = document.createElement('canvas')
    output.width = Math.round(cropWidth); output.height = Math.round(cropHeight)
    const cropLeft = Math.max(0, Math.min(width - cropWidth, (width-cropWidth)/2 + (item.offsetX || 0) * (width-cropWidth)/2))
    const cropTop = Math.max(0, Math.min(height - cropHeight, (height-cropHeight)/2 + (item.offsetY || 0) * (height-cropHeight)/2))
    output.getContext('2d').drawImage(canvas, cropLeft, cropTop, cropWidth, cropHeight, 0, 0, output.width, output.height)
    const blob = await new Promise(resolve => output.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) throw new Error('No se pudo procesar la imagen.')
    return new File([blob], 'zuno-editada.jpg', { type: 'image/jpeg' })
  }

  async function sendPreparedImages() {
    if (!activeConversation || !chatDraftImages.length || chatMediaBusy) return
    setChatMediaBusy(true); setPeopleError('')
    for (const item of chatDraftImages) {
      try {
        const file = await prepareEditedImage(item)
        const path = `${activeConversation.id}/${session.user.id}/${crypto.randomUUID()}.jpg`
        const { error: uploadError } = await supabase.storage.from('zuno-chat-media').upload(path, file, { contentType: 'image/jpeg', upsert: false })
        if (uploadError) throw uploadError
        const { data, error: insertError } = await supabase.from('messages').insert({ conversation_id: activeConversation.id, sender_id: session.user.id, body: null, message_type: 'image', media_path: path }).select('id,conversation_id,sender_id,body,created_at,message_type,media_path,expires_at').single()
        if (insertError) { await supabase.storage.from('zuno-chat-media').remove([path]); throw insertError }
        const [displayMessage] = await resolveChatMedia([data])
        setChatMessages(current => current.some(message => message.id === data.id) ? current : [...current, displayMessage])
      } catch (error) {
        setPeopleError('No pudimos enviar una de las fotos. ' + error.message)
        break
      }
    }
    setChatDraftImages(current => { current.forEach(item => { if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url) }); return [] })
    setChatMediaBusy(false)
  }

  function handleChatDrop(event) {
    event.preventDefault(); setChatDragOver(false)
    addChatImages(Array.from(event.dataTransfer.files || []).filter(file => file.type.startsWith('image/')))
  }

  useEffect(() => {
    if (!activeConversation?.id || view !== 'chat') return
    const channel = supabase.channel('zuno-chat-' + activeConversation.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + activeConversation.id }, payload => {
        if (payload.new.expires_at && new Date(payload.new.expires_at).getTime() <= Date.now()) return
        resolveChatMedia([payload.new]).then(([displayMessage]) => setChatMessages(current => current.some(message => message.id === payload.new.id) ? current : [...current, displayMessage]))
        if (payload.new.sender_id !== session.user.id) recordMessageReceipt(payload.new.id, true)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        const deletedId = payload.old?.id
        if (deletedId) { setChatMessages(current => current.filter(item => item.id !== deletedId)); setMessageReceipts(current => { const next = { ...current }; delete next[deletedId]; return next }) }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_receipts' }, payload => {
        const receipt = payload.new
        if (receipt?.user_id && receipt.user_id !== session.user.id) setMessageReceipts(current => ({ ...current, [receipt.message_id]: receipt }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations', filter: 'conversation_id=eq.' + activeConversation.id }, payload => {
        const location = payload.new
        if (!location?.id) return
        setLiveLocations(current => current.some(item => item.id === location.id) ? current.map(item => item.id === location.id ? location : item) : [...current, location])
        if (location.sender_id === session.user.id) setLiveSharing(location.ended_at ? null : location)
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeConversation?.id, view])

  useEffect(() => {
    if (!activeConversation?.id || view !== 'chat') return
    const timer = window.setInterval(() => {
      const now = Date.now()
      setChatMessages(current => current.filter(message => !message.expires_at || new Date(message.expires_at).getTime() > now))
      purgeExpiredMessages(activeConversation.id)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [activeConversation?.id, view])

  async function deleteConnection(requestId) {
    if (!session?.user || connectionBusy) return
    if (!window.confirm('¿Querés eliminar esta persona de tus conexiones? La conversación no se borrará.')) return
    setConnectionBusy(requestId); setPeopleError('')
    const { error: deleteError } = await supabase.from('connection_requests').delete().eq('id', requestId)
    setConnectionBusy('')
    if (deleteError) { setPeopleError('No pudimos eliminar la conexión. ' + deleteError.message); return }
    setConnectionRows(current => current.filter(row => row.id !== requestId))
  }

  useEffect(() => {
    if (!session?.user) { setUnreadCounts({}); return }
    let active = true
    async function loadUnreadCounts() {
      const { data: rows, error: rowsError } = await supabase.from('conversations').select('id').or(`member_one.eq.${session.user.id},member_two.eq.${session.user.id}`)
      if (rowsError || !active) return
      const ids = (rows || []).map(row => row.id)
      if (!ids.length) { setUnreadCounts({}); return }
      const { data: reads } = await supabase.from('conversation_reads').select('conversation_id,last_read_at').eq('user_id', session.user.id).in('conversation_id', ids)
      const readMap = Object.fromEntries((reads || []).map(row => [row.conversation_id, row.last_read_at]))
      const counts = {}
      await Promise.all(ids.map(async id => {
        if (activeConversation?.id === id && view === 'chat') { counts[id] = 0; return }
        let query = supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', id).neq('sender_id', session.user.id)
        if (readMap[id]) query = query.gt('created_at', readMap[id])
        const { count } = await query
        counts[id] = count || 0
      }))
      if (active) setUnreadCounts(counts)
    }
    loadUnreadCounts()
    return () => { active = false }
  }, [session, activeConversation?.id, view])

  useEffect(() => {
    if (!session?.user) return
    const channel = supabase.channel('zuno-global-message-notifications-' + session.user.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const incoming = payload.new
      if (incoming.sender_id === session.user.id) return
      const isOpen = activeConversation?.id === incoming.conversation_id && view === 'chat'
      recordMessageReceipt(incoming.id, isOpen)
      if (isOpen) {
        markConversationRead(incoming.conversation_id)
        return
      }
      setUnreadCounts(current => ({ ...current, [incoming.conversation_id]: (current[incoming.conversation_id] || 0) + 1 }))
      playMessageSound()
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, activeConversation?.id, view])

  useEffect(() => {
    if (!session?.user) return
    let active = true
    async function markPendingMessagesDelivered() {
      const userId = session.user.id
      const { data: rows, error: conversationsError } = await supabase.from('conversations').select('id').or(`member_one.eq.${userId},member_two.eq.${userId}`)
      if (conversationsError || !active) return
      const conversationIds = (rows || []).map(row => row.id)
      if (!conversationIds.length) return
      const { data: incoming, error: messagesError } = await supabase.from('messages').select('id,conversation_id').in('conversation_id', conversationIds).neq('sender_id', userId).order('created_at', { ascending: true }).limit(500)
      if (messagesError || !active || !incoming?.length) return
      const { data: existing } = await supabase.from('message_receipts').select('message_id').eq('user_id', userId).in('message_id', incoming.map(item => item.id))
      if (!active) return
      const deliveredIds = new Set((existing || []).map(item => item.message_id))
      const missing = incoming.filter(item => !deliveredIds.has(item.id))
      if (missing.length) {
        const now = new Date().toISOString()
        await supabase.from('message_receipts').upsert(missing.map(item => ({ message_id: item.id, user_id: userId, delivered_at: now })), { onConflict: 'message_id,user_id' })
      }
    }
    markPendingMessagesDelivered()
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!session?.user) return
    const channel = supabase.channel('zuno-global-message-receipts-' + session.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_receipts' }, payload => {
        const receipt = payload.new
        if (receipt?.message_id && receipt.user_id !== session.user.id) {
          setMessageReceipts(current => ({ ...current, [receipt.message_id]: receipt }))
        }
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session])

  useEffect(() => {
    if (!session?.user || view !== 'chats') return
    let active = true
    async function fetchChats() {
      const { data: rows, error: listError } = await supabase.from('conversations').select('id,member_one,member_two,last_message_at').order('last_message_at', { ascending: false, nullsFirst: false })
      if (!active) return
      if (listError) { setPeopleError('No pudimos cargar tus chats. ' + listError.message); return }
      const ids = (rows || []).map(row => row.member_one === session.user.id ? row.member_two : row.member_one)
      const { data: members } = ids.length ? await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id', ids) : { data: [] }
      const conversationIds = (rows || []).map(row => row.id)
      const { data: latestMessages } = conversationIds.length ? await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,message_type,location_expires_at,expires_at').in('conversation_id', conversationIds).order('created_at', { ascending: false }).limit(500) : { data: [] }
      const allLatestIds = (latestMessages || []).map(msg => msg.id)
      const { data: hiddenLatest } = allLatestIds.length ? await supabase.from('message_hidden_for').select('message_id').eq('user_id', session.user.id).in('message_id', allLatestIds) : { data: [] }
      const hiddenLatestIds = new Set((hiddenLatest || []).map(item => item.message_id))
      const latestByConversation = {}
      for (const msg of latestMessages || []) if ((!msg.expires_at || new Date(msg.expires_at).getTime() > Date.now()) && !hiddenLatestIds.has(msg.id) && !latestByConversation[msg.conversation_id]) latestByConversation[msg.conversation_id] = msg
      const ownLatestIds = Object.values(latestByConversation).filter(msg => msg.sender_id === session.user.id && !hiddenLatestIds.has(msg.id)).map(msg => msg.id)
      const { data: latestReceipts } = ownLatestIds.length ? await supabase.from('message_receipts').select('message_id,delivered_at,read_at').in('message_id', ownLatestIds).neq('user_id', session.user.id) : { data: [] }
      const latestReceiptById = Object.fromEntries((latestReceipts || []).map(item => [item.message_id, item]))
      if (!active) return
      const byId = Object.fromEntries((members || []).map(member => [member.id, member]))
      setConversations((rows || []).map(row => { const last = latestByConversation[row.id]; return { ...row, person: byId[row.member_one === session.user.id ? row.member_two : row.member_one] || { display_name: 'Miembro de ZUNO' }, lastMessage: last && !hiddenLatestIds.has(last.id) ? last : null, lastReceipt: last ? latestReceiptById[last.id] : null } }))
    }
    fetchChats()
    return () => { active = false }
  }, [session, view])
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
          {selectedProfile.isOwn ? <p className="detail-private-note">Este es tu perfil. Podés modificar la información y la privacidad cuando quieras.</p> : <><button type="button" className={`favorite-detail-btn ${favoriteIds.includes(selectedProfile.id) ? 'is-favorite' : ''}`} disabled={favoriteBusy === selectedProfile.id} onClick={()=>toggleFavorite(selectedProfile.id)}><Heart size={17} fill={favoriteIds.includes(selectedProfile.id) ? 'currentColor' : 'none'}/>{favoriteIds.includes(selectedProfile.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}</button><div className="profile-safety-actions"><button type="button" className="logout-btn" disabled={blockBusy===selectedProfile.id} onClick={()=>blockUser(selectedProfile)}><Ban size={15}/> {blockBusy===selectedProfile.id ? 'Bloqueando…' : 'Bloquear usuario'}</button><button type="button" className="logout-btn" onClick={()=>{setReportTarget(selectedProfile);setReportReason('harassment');setReportDetails('')}}><Flag size={15}/> Denunciar perfil</button></div><p className="detail-private-note">Solo mostramos la información que esta persona decidió compartir.</p></>}
        </div>
      </section>
      {reportTarget && <div className="security-modal-backdrop" role="presentation"><form className="security-modal" onSubmit={submitUserReport}><div className="security-modal-heading"><h2>Denunciar perfil</h2><button type="button" className="logout-btn" onClick={()=>setReportTarget(null)} aria-label="Cerrar"><X size={17}/></button></div><p>Tu denuncia sobre {reportTarget.display_name || 'este usuario'} será privada y revisada por el equipo de ZUNO.</p><label>Motivo<select value={reportReason} onChange={event=>setReportReason(event.target.value)}><option value="fake_profile">Perfil falso o suplantación</option><option value="harassment">Acoso o amenazas</option><option value="inappropriate_content">Contenido inapropiado</option><option value="spam">Spam</option><option value="underage">Posible menor de edad</option><option value="scam">Estafa o fraude</option><option value="other">Otro motivo</option></select></label><label>Detalles (opcional)<textarea rows="4" maxLength="2000" value={reportDetails} onChange={event=>setReportDetails(event.target.value)} placeholder="Contanos qué pasó…"/></label><div className="security-modal-actions"><button type="button" className="logout-btn" onClick={()=>setReportTarget(null)}>Cancelar</button><button type="submit" className="submit-btn" disabled={reportBusy}>{reportBusy ? 'Enviando…' : 'Enviar denuncia'}</button></div></form></div>}
      <footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )


  if (session?.user && view === 'chat' && activeConversation) return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><button className="logout-btn" onClick={()=>setView('chats')}><MessageCircle size={15}/> Todos los chats</button><button className="logout-btn" onClick={()=>setView('home')}><Compass size={15}/> Descubrir</button><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></div></header>
      <section className="direct-chat"><div className="direct-chat-header"><button className="logout-btn" onClick={()=>setView('home')}>← Volver</button><div><strong>{activeConversation.person?.display_name || 'Chat ZUNO'}</strong><small>{activeConversation.person?.username ? '@'+activeConversation.person.username : 'Conversación privada'}</small></div><div className="ephemeral-settings"><button type="button" className={'logout-btn '+(activeConversation.ephemeral_duration_minutes?'ephemeral-active':'')} onClick={()=>setShowEphemeralMenu(value=>!value)}><span>◷</span> {activeConversation.ephemeral_duration_minutes ? 'Mensajes efímeros' : 'Mensajes normales'}</button>{showEphemeralMenu && <div className="ephemeral-menu"><strong>Desaparición de mensajes</strong><p>Los mensajes nuevos se eliminarán para ambos al cumplirse el plazo.</p>{[{value:0,label:'Desactivado'},{value:10,label:'Después de 10 minutos'},{value:60,label:'Después de 1 hora'},{value:1440,label:'Después de 24 horas'},{value:10080,label:'Después de 7 días'}].map(option=><button key={option.value} type="button" disabled={ephemeralBusy} className={activeConversation.ephemeral_duration_minutes===option.value?'selected':''} onClick={()=>changeEphemeralDuration(option.value)}>{option.label}{activeConversation.ephemeral_duration_minutes===option.value?' ✓':''}</button>)}</div>}</div></div>
        <div className={`direct-chat-messages ${chatDragOver ? 'is-drag-over' : ''}`} onDragOver={event=>{event.preventDefault();setChatDragOver(true)}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget))setChatDragOver(false)}} onDrop={handleChatDrop}>{chatMessages.map(message=><div key={message.id} className={message.sender_id===session.user.id?'chat-bubble own':'chat-bubble'} onTouchStart={()=>{if(longPressTimerRef.current)window.clearTimeout(longPressTimerRef.current);longPressTimerRef.current=window.setTimeout(()=>setActiveMessageMenu(message.id),550)}} onTouchEnd={()=>{if(longPressTimerRef.current)window.clearTimeout(longPressTimerRef.current)}} onTouchMove={()=>{if(longPressTimerRef.current)window.clearTimeout(longPressTimerRef.current)}} onTouchCancel={()=>{if(longPressTimerRef.current)window.clearTimeout(longPressTimerRef.current)}} onContextMenu={event=>event.preventDefault()}>{message.message_type==='image' ? <div className="chat-image-protected" onContextMenu={event=>event.preventDefault()}><img src={message.media_url || ''} alt="Imagen privada del chat" draggable="false"/><span className="chat-image-watermark">@{profile?.username || profile?.display_name || 'ZUNO'}</span></div> : message.message_type==='audio' ? <ChatAudioPlayer src={message.media_url} error={message.media_error}/> : message.message_type==='location' ? <div className="chat-location-message"><MapPin size={20}/><strong>Ubicación compartida</strong><a href={`https://www.openstreetmap.org/?mlat=${message.latitude}&mlon=${message.longitude}#map=16/${message.latitude}/${message.longitude}`} target="_blank" rel="noreferrer">Abrir mapa</a></div> : <p>{message.body}</p>}<time>{new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}{message.sender_id===session.user.id && <span className={'message-ticks '+(messageReceipts[message.id]?.read_at?'is-read':messageReceipts[message.id]?.delivered_at?'is-delivered':'')}>{messageReceipts[message.id]?.read_at?'✓✓':messageReceipts[message.id]?.delivered_at?'✓✓':'✓'}</span>}{message.expires_at && <small className="message-expiry-label"> · Se elimina {new Date(message.expires_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>}</time><div className="chat-message-actions"><button type="button" className="chat-message-menu-trigger" aria-label="Opciones del mensaje" onClick={()=>setActiveMessageMenu(current=>current===message.id?null:message.id)}>⋯</button>{activeMessageMenu===message.id && <div className="chat-message-menu"><button type="button" onClick={()=>hideMessageForMe(message)}>Eliminar para mí</button>{message.sender_id===session.user.id && <button type="button" onClick={()=>deleteMessageForEveryone(message)}>Eliminar para todos</button>}</div>}</div></div>)}{chatDragOver && <div className="chat-drop-hint">Soltá las imágenes acá para prepararlas</div>}</div>
        {peopleError && <div className="notice error">{peopleError}</div>}
        {deleteConfirmMessage && <div className="zuno-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setDeleteConfirmMessage(null)}}><section className="zuno-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title"><h2 id="delete-modal-title">¿Eliminar para todos?</h2><p>Este mensaje desaparecerá del chat de ambas personas. Esta acción no se puede deshacer.</p><div><button type="button" className="logout-btn" disabled={chatMediaBusy} onClick={()=>setDeleteConfirmMessage(null)}>Cancelar</button><button type="button" className="zuno-modal-danger" disabled={chatMediaBusy} onClick={confirmDeleteMessageForEveryone}>{chatMediaBusy?'Eliminando…':'Eliminar para todos'}</button></div></section></div>}
        {chatDraftImages.length > 0 && <div className="chat-image-editor"><div className="chat-editor-heading"><strong>Prepará tus fotos ({chatDraftImages.length}/5)</strong><span>Se enviarán solo cuando pulses Enviar fotos</span></div><div className="chat-editor-grid">{chatDraftImages.map(item=><div className="chat-editor-card" key={item.id}><div className="chat-editor-preview" onPointerDown={event=>startCropDrag(event,item)} title={item.zoom>1?"Arrastrá para elegir el recorte":"Acercá la imagen para poder moverla"}><img src={item.url} alt="Vista previa" draggable="false" style={{transform:`translate(${(item.offsetX||0)*((item.zoom-1)/(2*item.zoom))*100}%, ${(item.offsetY||0)*((item.zoom-1)/(2*item.zoom))*100}%) rotate(${item.rotation}deg) scale(${item.zoom})`}}/></div><div className="chat-editor-controls"><button type="button" onClick={()=>updateDraftImage(item.id,{rotation:(item.rotation+270)%360})}>↶ Girar</button><button type="button" onClick={()=>updateDraftImage(item.id,{rotation:(item.rotation+90)%360})}>↷</button><label>Recorte <input type="range" min="1" max="2.5" step="0.05" value={item.zoom} onChange={event=>updateDraftImage(item.id,{zoom:Number(event.target.value),offsetX:0,offsetY:0})}/></label><button type="button" className="chat-editor-remove" onClick={()=>removeDraftImage(item.id)}>Quitar</button></div></div>)}</div><button type="button" className="chat-send-images" onClick={sendPreparedImages} disabled={chatMediaBusy}>{chatMediaBusy?'Enviando…':`Enviar ${chatDraftImages.length} foto(s)`}</button></div>}
        {showChatGallery && chatGallery.length > 0 && <div className="chat-gallery-strip"><strong>Fotos que ya enviaste</strong><div>{chatGallery.map(item=><button type="button" key={item.id} onClick={()=>addGalleryImage(item)} disabled={chatDraftImages.length>=5} title="Volver a usar esta foto"><img src={item.url} alt="Foto anterior"/><span>+</span></button>)}</div></div>}
        {audioDraft && <div className="chat-audio-draft"><strong>Escuchá tu audio antes de enviarlo</strong><audio controls preload="metadata" src={audioDraft.url}/><div><button type="button" onClick={discardAudioDraft} disabled={chatMediaBusy}>Eliminar</button><button type="button" onClick={sendChatAudio} disabled={chatMediaBusy}>{chatMediaBusy?'Enviando…':'Enviar audio'}</button></div></div>}
        <div className="chat-live-location-list">{liveLocations.filter(item => !item.ended_at && new Date(item.expires_at).getTime() > Date.now()).map(item=><div className="chat-live-location" key={item.id}><MapPin size={17}/><span>{item.sender_id === session.user.id ? 'Estás compartiendo tu ubicación' : 'Esta persona comparte su ubicación'}<small>Hasta {new Date(item.expires_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></span><a href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=16/${item.latitude}/${item.longitude}`} target="_blank" rel="noreferrer">Ver mapa</a>{item.sender_id === session.user.id && <button type="button" onClick={()=>stopLiveLocation(item.id)}><StopCircle size={16}/> Detener</button>}</div>)}</div>
        {showLocationMenu && <div className="chat-location-menu"><strong>Compartir ubicación</strong><button type="button" onClick={sendCurrentLocation} disabled={chatMediaBusy}><MapPin size={17}/> Enviar ubicación actual</button><button type="button" onClick={()=>startLiveLocation(30)} disabled={chatMediaBusy || !!liveSharing}><Navigation size={17}/> En tiempo real · 30 minutos</button><button type="button" onClick={()=>startLiveLocation(60)} disabled={chatMediaBusy || !!liveSharing}><Navigation size={17}/> En tiempo real · 1 hora</button><small>Podés detener la ubicación en cualquier momento.</small></div>}
        <form className="chat-compose" onSubmit={sendChatMessage}><label className="chat-image-upload" title="Subir fotos"><ImagePlus size={19}/><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={event=>{addChatImages(event.target.files);event.target.value=''}} disabled={chatDraftImages.length>=5}/></label><button type="button" className={`chat-gallery-toggle ${showChatGallery?'active':''}`} title="Reutilizar fotos anteriores" aria-label="Reutilizar fotos anteriores" disabled={!chatGallery.length} onClick={()=>setShowChatGallery(value=>!value)}><Images size={19}/></button><input value={chatDraft} onChange={event=>setChatDraft(event.target.value)} placeholder="Escribí un mensaje…" maxLength={4000}/><button type="button" className="chat-gallery-toggle" title="Compartir ubicación" aria-label="Compartir ubicación" onClick={()=>setShowLocationMenu(value=>!value)}><MapPin size={19}/></button><button type="button" className={`chat-mic-button ${isRecording?'recording':''}`} title={isRecording?'Soltá para terminar':'Mantené presionado para grabar'} aria-label="Mantener presionado para grabar audio" disabled={!!audioDraft||chatMediaBusy} onPointerDown={startChatRecording} onPointerUp={stopChatRecording} onPointerCancel={stopChatRecording} onContextMenu={event=>event.preventDefault()}><Mic size={19}/></button><button type="submit" disabled={chatBusy||!chatDraft.trim()}><Send size={18}/></button></form>
        {isRecording && <div className="chat-recording-hint">Grabando… soltá el micrófono para terminar.</div>}
      </section><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  if (session?.user && view === 'map') return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><button className="logout-btn" onClick={()=>setView('home')}><Compass size={15}/> Descubrir</button><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></div></header>
      <section className="map-page">
        <div className="home-heading"><div><div className="eyebrow"><span/> COMUNIDAD CERCANA</div><h1>Mapa de <span>usuarios.</span></h1><p>Encontrá personas cerca sin compartir tu dirección exacta.</p></div><button className="refresh-btn" onClick={()=>setView('home')}>Volver a descubrir</button></div>
        <div className="map-privacy-panel">
          <div><strong>{mapVisible ? 'Aparecés en el mapa' : 'No aparecés en el mapa'}</strong><p>{mapVisible ? 'Tu posición se muestra de forma aproximada. La ubicación no se actualiza sola.' : 'Tu ubicación permanece oculta hasta que decidas activarla.'}</p></div>
          <button type="button" className={mapVisible ? 'map-hide-btn' : 'submit-btn'} disabled={mapBusy} onClick={()=>setMyMapVisibility(!mapVisible)}>{mapBusy ? 'Guardando…' : mapVisible ? 'Desaparecer del mapa' : 'Activar visibilidad'}</button>
          <button type="button" className="refresh-btn" disabled={mapBusy} onClick={refreshMyMapLocation}><Navigation size={16}/>{mapBusy ? 'Actualizando…' : 'Actualizar mi ubicación'}</button>
        </div>
        <p className="map-consent-note"><ShieldCheck size={16}/> Al actualizar, el navegador te pedirá permiso. ZUNO guarda tu ubicación para calcular la zona, pero solo muestra un punto aproximado. No hacemos seguimiento en segundo plano.</p>
        {mapStatus && <div className={mapStatus.startsWith('No pudimos') ? 'notice error' : 'notice success'}>{mapStatus}</div>}
        <div className="map-results-heading"><strong>{mapUsers.length} {mapUsers.length === 1 ? 'persona cercana' : 'personas cercanas'}</strong><span>Radio de búsqueda: 50 km · Distancias aproximadas</span></div>
        <div ref={mapContainerRef} className="zuno-map-canvas" aria-label="Mapa de usuarios cercanos"/>
        {!mapVisible && <p className="map-empty-hint">Activá tu visibilidad y actualizá tu ubicación para ver personas cercanas.</p>}
        {mapVisible && mapUsers.length === 0 && <p className="map-empty-hint">Todavía no hay otros usuarios visibles en tu zona. Podés volver a actualizar más tarde.</p>}
      </section>
      <footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  if (session?.user && view === 'chats') return (
    <main className="app-shell"><header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><button className="logout-btn" onClick={()=>setView('home')}><Compass size={15}/> Descubrir</button><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></div></header>
      <section className="chat-page"><div className="home-heading"><div><div className="eyebrow"><span/> MENSAJES PRIVADOS</div><h1>Tus <span>chats.</span></h1><p>Podés hablar con cualquier persona, sin conexión previa.</p></div><button className="refresh-btn" onClick={()=>setView('home')}>Descubrir personas</button></div>
        {peopleError && <div className="notice error">{peopleError}</div>}
        <div className="chat-list">{conversations.length ? conversations.map(item=><button className="chat-list-item" key={item.id} onClick={()=>openChat({...item.person,id:item.member_one===session.user.id?item.member_two:item.member_one})}><span className="chat-list-avatar">{item.person?.avatar_url?<img src={item.person.avatar_url} alt=""/>:(item.person?.display_name||'Z').slice(0,1)}</span><span className="chat-list-name"><strong>{item.person?.display_name||'Miembro de ZUNO'}</strong><small>{item.lastMessage ? (item.lastMessage.message_type==='image'?'📷 Foto':item.lastMessage.message_type==='audio'?'🎤 Audio':item.lastMessage.message_type==='location'?'📍 Ubicación':(item.lastMessage.body||'Mensaje').slice(0,90)) : 'Todavía no hay mensajes' }{item.lastMessage?.sender_id===session.user.id && <span className={'message-ticks '+(item.lastReceipt?.read_at?'is-read':item.lastReceipt?.delivered_at?'is-delivered':'')}>{item.lastReceipt?.delivered_at?'✓✓':'✓'}</span>}</small></span>{(unreadCounts[item.id]||0)>0 && <span className="chat-unread-count">{unreadCounts[item.id]}</span>}<MessageCircle size={18}/></button>) : <div className="connections-empty">Todavía no tenés conversaciones. Iniciá un chat desde cualquier perfil.</div>}</div>
      </section><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer></main>
  )
  if (session?.user && ['home', 'favorites', 'connections'].includes(view)) return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><span className="verification-badge">{profile?.zuno_verified ? "✓ Cuenta verificada" : "Cuenta no verificada"}</span><button className="logout-btn chats-nav-btn" onClick={()=>setView('chats')}><MessageCircle size={15}/> Chats {Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)>0 && <span className="nav-unread-count">+{Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)}</span>}</button><button className="logout-btn" onClick={()=>setView('connections')}><Users size={15}/> Conexiones ({connectionRows.filter(row=>row.status==='accepted').length})</button><button className="logout-btn" onClick={()=>setView('favorites')}><Heart size={15}/> Favoritos ({favoriteIds.length})</button><button className="logout-btn" onClick={()=>setView('profile')}><Pencil size={15}/> Editar perfil</button><button className="logout-btn" onClick={logout}><LogOut size={16}/> Cerrar sesión</button></div></header>
      <section className="home-content">
        <div className="home-heading"><div><div className="eyebrow"><span/> {view === 'favorites' ? 'TUS PERSONAS GUARDADAS' : view === 'connections' ? 'TUS CONEXIONES' : 'DESCUBRÍ ZUNO'}</div><h1>{view === 'favorites' ? <>Tus <span>favoritos.</span></> : view === 'connections' ? <>Tus <span>conexiones.</span></> : <>Hola, <span>{profile?.display_name || displayName || 'bienvenido'}.</span></>}</h1><p>{view === 'favorites' ? 'Perfiles que guardaste para volver a encontrarlos.' : view === 'connections' ? 'Solicitudes recibidas, enviadas y conexiones aceptadas.' : 'Estas son algunas de las personas de la comunidad. ¡Tu próxima conexión puede empezar acá!'}</p></div><div className="home-actions"><button className="refresh-btn" onClick={()=>setView('map')}><MapPin size={16}/> Mapa</button>{view !== 'home' && <button className="refresh-btn" onClick={()=>setView('home')}><Compass size={16}/> Descubrir</button>}<button className="refresh-btn" onClick={()=>setPeopleRefresh(value=>value+1)}><RefreshCw size={16}/> Actualizar</button></div></div>
        {peopleError && <div className="notice error">{peopleError}</div>}
        {peopleLoading ? <div className="empty-state">Buscando perfiles…</div> : (
          <>
          {view === 'home' && <section className="discovery-filters">
            <div className="discovery-filter-heading"><div><strong><Compass size={17}/> Encontrá personas</strong><small>{discoveryPeople.length} perfiles encontrados entre los cargados</small></div>{discoveryFiltersActive && <button type="button" className="filter-clear-btn" onClick={()=>{setDiscoverySearch('');setDiscoveryCity('');setDiscoveryInterest('');setDiscoveryLookingFor('');setDiscoveryVerifiedOnly(false);setDiscoveryWithPhotos(false);setDiscoverySort('recent')}}>Limpiar filtros</button>}</div>
            <div className="discovery-filter-grid">
              <label className="discovery-search-field"><span>Buscar</span><input type="search" value={discoverySearch} onChange={event=>setDiscoverySearch(event.target.value)} placeholder="Nombre, usuario, bio o intereses…"/></label>
              <label><span>Ciudad o región</span><input type="search" value={discoveryCity} onChange={event=>setDiscoveryCity(event.target.value)} placeholder="Ej. Montevideo"/></label>
              <label><span>Interés</span><select value={discoveryInterest} onChange={event=>setDiscoveryInterest(event.target.value)}><option value="">Todos los intereses</option>{['Música','Cine','Deportes','Viajes','Gastronomía','Videojuegos','Arte','Naturaleza','Fitness','Lectura','Series','Tecnología'].map(item=><option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Qué busca</span><select value={discoveryLookingFor} onChange={event=>setDiscoveryLookingFor(event.target.value)}><option value="">Cualquier preferencia</option>{['Amistad','Citas','Relación seria','Conocer personas','Charlar'].map(item=><option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Ordenar por</span><select value={discoverySort} onChange={event=>setDiscoverySort(event.target.value)}><option value="recent">Más recientes</option><option value="oldest">Más antiguos</option><option value="name">Nombre (A–Z)</option></select></label>
            </div>
            <div className="discovery-filter-toggles">
              <label><input type="checkbox" checked={discoveryVerifiedOnly} onChange={event=>setDiscoveryVerifiedOnly(event.target.checked)}/> Solo cuentas verificadas</label>
              <label><input type="checkbox" checked={discoveryWithPhotos} onChange={event=>setDiscoveryWithPhotos(event.target.checked)}/> Con fotos</label>
            </div>
          </section>}
          <div className="people-grid">
          {view === 'home' && <article className="person-card own-person-card person-card-clickable" key={session.user.id} role="button" tabIndex={0} onClick={()=>{setSelectedProfile({...profile,photos,visibleCity:profile?.show_location?[profile?.city,profile?.region].filter(Boolean).join(', '):'',isOwn:true});setView('detail')}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedProfile({...profile,photos,visibleCity:profile?.show_location?[profile?.city,profile?.region].filter(Boolean).join(', '):'',isOwn:true});setView('detail')}}}>
            <div className="person-card-gallery">
              {photos.length ? <img src={photos[0].url} alt="Tu foto de perfil"/> : <div className="person-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : <span>{(profile?.display_name || displayName || '?').slice(0,1).toUpperCase()}</span>}</div>}
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
          {(view === 'home' ? discoveryPeople : view === 'favorites' ? people.filter(person => favoriteIds.includes(person.id)) : people).map(person => <article className="person-card person-card-clickable" key={person.id} role="button" tabIndex={0} onClick={()=>{setSelectedProfile({...person,isOwn:false});setView('detail')}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedProfile({...person,isOwn:false});setView('detail')}}}>
            <div className="person-card-gallery">
              {person.photos?.length ? <img src={person.photos[0].url} alt={`Foto de ${person.display_name || 'usuario'}`}/> : <div className="person-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : <span>{(person.display_name || person.username || '?').slice(0,1).toUpperCase()}</span>}</div>}
            </div>
            <div className="person-info">
              <div className="person-title-row"><h3>{person.display_name || 'Usuario ZUNO'} {person.zuno_verified && <span className="verified-dot" title="Cuenta verificada">✓</span>}</h3><button type="button" className={`favorite-btn ${favoriteIds.includes(person.id) ? 'is-favorite' : ''}`} aria-label={favoriteIds.includes(person.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'} title={favoriteIds.includes(person.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'} disabled={favoriteBusy === person.id} onClick={event=>{event.stopPropagation();toggleFavorite(person.id)}}><Heart size={18} fill={favoriteIds.includes(person.id) ? 'currentColor' : 'none'}/></button></div>
              {person.username && <p className="person-username">@{person.username}</p>}
              {person.visibleCity && <p className="person-location"><Compass size={13}/>{person.visibleCity}</p>}
              {person.bio && <p className="person-bio">{person.bio}</p>}
              {person.interests?.length > 0 && <div className="person-tags">{person.interests.slice(0,5).map(tag=><span key={tag}>{tag}</span>)}</div>}
              {person.looking_for?.length > 0 && <p className="person-looking"><strong>Busca:</strong> {person.looking_for.join(' · ')}</p>}
              <div className="person-card-actions"><button type="button" className="chat-start-btn" onClick={event=>{event.stopPropagation();openChat(person)}}><MessageCircle size={15}/> Chatear</button><ConnectionAction personId={person.id} currentUserId={session.user.id} rows={connectionRows} busy={connectionBusy} onSend={sendConnectionRequest} onRespond={respondToConnection}/></div>
            </div>
          </article>)}</div>
          {view === 'home' && !discoveryPeople.length && <div className="connections-empty">No encontramos perfiles con esos filtros. Probá cambiar alguno o limpiar la búsqueda.</div>}
          {view === 'connections' && !peopleLoading && <section className="connections-panel">
            <h2>Solicitudes recibidas</h2>
            {connectionRows.filter(row=>row.receiver_id===session.user.id && row.status==='pending').length ? connectionRows.filter(row=>row.receiver_id===session.user.id && row.status==='pending').map(row=>{const person=people.find(item=>item.id===row.sender_id);return <div className="connection-row" key={row.id}><div><strong>{person?.display_name || 'Miembro de ZUNO'}</strong><span>{person?.username ? '@'+person.username : 'Quiere conectar con vos'}</span></div><div className="connection-actions"><button className="accept-btn" disabled={connectionBusy===row.id} onClick={()=>respondToConnection(row.id,'accepted')}><Check size={15}/> Aceptar</button><button className="reject-btn" disabled={connectionBusy===row.id} onClick={()=>respondToConnection(row.id,'rejected')}><X size={15}/> Rechazar</button></div></div>}) : <p className="connections-empty">No tenés solicitudes nuevas.</p>}
            <h2>Solicitudes enviadas</h2>
            {connectionRows.filter(row=>row.sender_id===session.user.id && row.status==='pending').length ? connectionRows.filter(row=>row.sender_id===session.user.id && row.status==='pending').map(row=>{const person=people.find(item=>item.id===row.receiver_id);return <div className="connection-row" key={row.id}><div><strong>{person?.display_name || 'Miembro de ZUNO'}</strong><span>Solicitud pendiente</span></div></div>}) : <p className="connections-empty">No tenés solicitudes pendientes.</p>}
            <h2>Conexiones aceptadas</h2>
            {connectionRows.filter(row=>row.status==='accepted').length ? connectionRows.filter(row=>row.status==='accepted').map(row=>{const otherId=row.sender_id===session.user.id?row.receiver_id:row.sender_id;const person=people.find(item=>item.id===otherId);return <div className="connection-row" key={row.id}><div><strong>{person?.display_name || 'Miembro de ZUNO'}</strong><span>{person?.username ? '@'+person.username : 'Conexión aceptada'}</span></div><div className="connection-actions"><span className="connected-label"><Check size={14}/> Conectados</span><button className="remove-connection-btn" disabled={connectionBusy===row.id} onClick={()=>deleteConnection(row.id)}><Trash size={14}/> Eliminar</button></div></div>}) : <p className="connections-empty">Todavía no tenés conexiones aceptadas.</p>}
          </section>}
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
            <div className="profile-section"><h3><Ban size={17}/> Cuentas bloqueadas</h3>{blockedUsers.length ? <div className="blocked-users-list">{blockedUsers.map(item=><div className="blocked-user-row" key={item.id}><span><strong>{item.person?.display_name || 'Usuario ZUNO'}</strong><small>{item.person?.username ? '@'+item.person.username : 'Cuenta bloqueada'}</small></span><button type="button" className="logout-btn" disabled={blockBusy===item.blocked_id} onClick={()=>unblockUser(item.blocked_id)}>Desbloquear</button></div>)}</div> : <p className="detail-private-note">Todavía no bloqueaste ninguna cuenta.</p>}</div>
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


function ConnectionAction({ personId, currentUserId, rows, busy, onSend, onRespond }) {
  const relation = rows.find(row => (row.sender_id === currentUserId && row.receiver_id === personId) || (row.sender_id === personId && row.receiver_id === currentUserId))
  if (!relation) return <button type="button" className="connect-btn" disabled={busy===personId} onClick={event=>{event.stopPropagation();onSend(personId)}}><UserPlus size={15}/> {busy===personId?'Enviando…':'Conectar'}</button>
  if (relation.status === 'accepted') return <span className="connected-label"><Check size={14}/> Conectados</span>
  if (relation.status === 'rejected') return <span className="connection-status">Solicitud rechazada</span>
  if (relation.sender_id === currentUserId) return <span className="connection-status">Solicitud enviada</span>
  return <div className="connection-actions"><button type="button" className="accept-btn" disabled={busy===relation.id} onClick={event=>{event.stopPropagation();onRespond(relation.id,'accepted')}}><Check size={15}/> Aceptar</button><button type="button" className="reject-btn" disabled={busy===relation.id} onClick={event=>{event.stopPropagation();onRespond(relation.id,'rejected')}}><X size={15}/> Rechazar</button></div>
}
