import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { Heart, Flame, Ruler, ArrowDownRight, Clock3, Eye, EyeOff, MoreVertical, Archive, ArchiveRestore, ShieldCheck, Users, MessageCircle, Send, LogOut, UserRound, Sparkles, Compass, Pencil, RefreshCw, ImagePlus, Images, Trash2, Mic, UserPlus, Check, X, Trash, MapPin, Navigation, ChevronLeft, LocateFixed, Route, StopCircle, Ban, Flag, SlidersHorizontal, Bell, Phone, PhoneOff, Video, MicOff, VideoOff, LayoutDashboard, Search, UserCog, Megaphone, Settings, Activity, ChevronRight, ShieldAlert, ChartNoAxesCombined, Database, Clock, CheckCircle2, CircleAlert, FileWarning, Image, LockKeyhole, Menu } from 'lucide-react'
import L from 'leaflet'

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = value => Number(value) * Math.PI / 180
  const dLat = toRad(Number(lat2) - Number(lat1))
  const dLon = toRad(Number(lon2) - Number(lon1))
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatApproxDistance(km) {
  if (km === null || km === undefined || !Number.isFinite(Number(km))) return ''
  const meters = Math.max(0, Math.round(Number(km) * 1000))
  if (meters < 1000) return `${meters} m`
  return `${(meters / 1000).toLocaleString('es-UY',{maximumFractionDigits:2})} km`
}

function ProfileAvatar({ person, className = '' }) {
  const label = (person?.display_name || person?.username || '').trim()
  if (person?.avatar_url) return <span className={`zuno-avatar ${className}`}><img src={person.avatar_url} alt=""/></span>
  if (!label) return <span className={`zuno-avatar zuno-avatar-empty ${className}`}><UserRound size={22}/></span>
  let hash = 0
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0
  return <span className={`zuno-avatar zuno-avatar-initial ${className}`} style={{'--avatar-hue': hash % 360}}>{label.slice(0,1).toLocaleUpperCase('es-UY')}</span>
}
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
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const CURRENT_POLICY_VERSION = '2026-11-28-v3'
  const [policyStatus, setPolicyStatus] = useState('loading')
  const [policyBusy, setPolicyBusy] = useState(false)
  const [policyError, setPolicyError] = useState('')
  const [view, setView] = useState('profile')
  const [adminSection, setAdminSection] = useState('overview')
  const [adminAuthorized, setAdminAuthorized] = useState(false)
  const [adminVerificationComplete, setAdminVerificationComplete] = useState(false)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminUsersError, setAdminUsersError] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [adminUsersRefresh, setAdminUsersRefresh] = useState(0)
  const [adminSelectedUser, setAdminSelectedUser] = useState(null)
  const [adminUserMedia, setAdminUserMedia] = useState([])
  const [adminUserMediaLoading, setAdminUserMediaLoading] = useState(false)
  const [adminUserMediaError, setAdminUserMediaError] = useState('')
  const [adminSanctionDuration, setAdminSanctionDuration] = useState('7')
  const [adminSanctionReason, setAdminSanctionReason] = useState('')
  const [adminSanctionBusy, setAdminSanctionBusy] = useState(false)
  const [adminSanctionMessage, setAdminSanctionMessage] = useState('')
  const [adminSanctionHistory, setAdminSanctionHistory] = useState([])
  const [accountStatus, setAccountStatus] = useState({ loading: true, blocked: false, permanent: false, reason: '', expires_at: null })
  const [adminReports, setAdminReports] = useState([])
  const [adminReportsLoading, setAdminReportsLoading] = useState(false)
  const [adminReportsError, setAdminReportsError] = useState('')
  const [adminReportsFilter, setAdminReportsFilter] = useState('all')
  const [adminReportsRefresh, setAdminReportsRefresh] = useState(0)
  const [adminReportBusy, setAdminReportBusy] = useState('')
  const [adminReportReplies, setAdminReportReplies] = useState({})
  const [adminReportReplyBusy, setAdminReportReplyBusy] = useState('')
  const [adminReportContexts, setAdminReportContexts] = useState({})
  const [adminReportContextBusy, setAdminReportContextBusy] = useState('')
  const [adminRetainedMessages, setAdminRetainedMessages] = useState([])
  const [adminRetainedLoading, setAdminRetainedLoading] = useState(false)
  const [adminRetainedError, setAdminRetainedError] = useState('')
  const [adminRetainedRefresh, setAdminRetainedRefresh] = useState(0)
  const [adminRetainedMedia, setAdminRetainedMedia] = useState({})
  const [adminRetainedMediaBusy, setAdminRetainedMediaBusy] = useState('')
  const [adminStats, setAdminStats] = useState(null)
  const [adminStatsLoading, setAdminStatsLoading] = useState(false)
  const [adminStatsError, setAdminStatsError] = useState('')
  const [adminStatsRefresh, setAdminStatsRefresh] = useState(0)
  const [communicationMode, setCommunicationMode] = useState('all')
  const [communicationTitle, setCommunicationTitle] = useState('')
  const [communicationBody, setCommunicationBody] = useState('')
  const [communicationSearch, setCommunicationSearch] = useState('')
  const [communicationUsers, setCommunicationUsers] = useState([])
  const [communicationTarget, setCommunicationTarget] = useState(null)
  const [communicationBusy, setCommunicationBusy] = useState(false)
  const [communicationFeedback, setCommunicationFeedback] = useState('')
  const [communicationError, setCommunicationError] = useState('')
  const [communicationHistory, setCommunicationHistory] = useState([])
  const [communicationHistoryLoading, setCommunicationHistoryLoading] = useState(false)
  const [adminSecurityOverview, setAdminSecurityOverview] = useState(null)
  const [adminSecurityEvents, setAdminSecurityEvents] = useState([])
  const [adminSecurityLoading, setAdminSecurityLoading] = useState(false)
  const [adminSecurityError, setAdminSecurityError] = useState('')
  const [adminSecurityFilter, setAdminSecurityFilter] = useState('all')
  const [adminSecurityRefresh, setAdminSecurityRefresh] = useState(0)
  const [adminPlatformSettings, setAdminPlatformSettings] = useState({ platform_name: 'ZUNO', platform_description: 'Conectá, chateá y descubrí personas.', registration_enabled: true, maintenance_mode: false, maintenance_message: 'Estamos realizando mejoras. Volvé a intentarlo en unos minutos.' })
  const [adminPlatformLoading, setAdminPlatformLoading] = useState(false)
  const [adminPlatformSaving, setAdminPlatformSaving] = useState(false)
  const [adminPlatformError, setAdminPlatformError] = useState('')
  const [adminPlatformFeedback, setAdminPlatformFeedback] = useState('')
  const [adminBots, setAdminBots] = useState([])
  const [adminBotsLoading, setAdminBotsLoading] = useState(false)
  const [adminBotsSaving, setAdminBotsSaving] = useState(false)
  const [adminBotsError, setAdminBotsError] = useState('')
  const [adminBotsFeedback, setAdminBotsFeedback] = useState('')
  const [adminBotEditor, setAdminBotEditor] = useState(null)
  const [botLocationPickerOpen, setBotLocationPickerOpen] = useState(false)
  const [botLocationDraft, setBotLocationDraft] = useState(null)
  const botLocationMapContainerRef = useRef(null)
  const botLocationMapRef = useRef(null)
  const botLocationMarkerRef = useRef(null)
  const [publicPlatformSettings, setPublicPlatformSettings] = useState(null)
  const [publicPlatformSettingsLoading, setPublicPlatformSettingsLoading] = useState(true)
  const [publicPlatformSettingsError, setPublicPlatformSettingsError] = useState('')

  useEffect(() => {
    let active = true
    async function loadAdminUserMedia() {
      if (view !== 'admin' || !adminAuthorized || !adminSelectedUser?.id) {
        setAdminUserMedia([])
        setAdminUserMediaError('')
        return
      }
      setAdminUserMediaLoading(true)
      setAdminUserMediaError('')
      setAdminUserMedia([])
      const { data, error: mediaError } = await supabase.rpc('admin_get_user_media', {
        p_user_id: adminSelectedUser.id
      })
      if (!active) return
      if (mediaError) {
        setAdminUserMediaError(mediaError.message || 'No se pudo consultar el contenido.')
        setAdminUserMediaLoading(false)
        return
      }
      const rows = Array.isArray(data) ? data : []
      const resolved = await Promise.all(rows.map(async item => {
        const bucket = item.media_kind === 'story' ? 'zuno-stories' : 'zuno-profile-photos'
        const { data: signed, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(item.storage_path, 120)
        return { ...item, signedUrl: signedError ? '' : (signed?.signedUrl || '') }
      }))
      if (active) {
        setAdminUserMedia(resolved)
        setAdminUserMediaLoading(false)
      }
    }
    loadAdminUserMedia()
    return () => { active = false }
  }, [view, adminAuthorized, adminSelectedUser?.id])

  useEffect(() => {
    let active = true
    async function verifyAdmin() {
      if (view !== 'admin' || String(profile?.username || '').trim().toLowerCase() !== 'manu.german') {
        if (active) {
          setAdminAuthorized(false)
          setAdminVerificationComplete(true)
        }
        return
      }
      setAdminAuthorized(false)
      setAdminVerificationComplete(false)
      const { data, error: adminError } = await supabase.rpc('zuno_is_admin')
      if (active) {
        setAdminAuthorized(!adminError && data === true)
        setAdminVerificationComplete(true)
        if (adminError) setAdminUsersError('No se pudo verificar el permiso administrativo.')
      }
    }
    verifyAdmin()
    return () => { active = false }
  }, [view, profile?.username])

  useEffect(() => {
    let active = true
    async function loadAdminUsers() {
      if (view !== 'admin' || !adminAuthorized || adminSection !== 'users') return
      setAdminUsersLoading(true)
      setAdminUsersError('')
      const { data, error: listError } = await supabase.rpc('admin_list_users', {
        p_query: adminSearch.trim() || null,
        p_limit: 100,
        p_offset: 0
      })
      if (!active) return
      if (listError) {
        setAdminUsersError(listError.message || 'No se pudo cargar la lista de usuarios.')
        setAdminUsers([])
      } else {
        setAdminUsers(Array.isArray(data) ? data : [])
      }
      setAdminUsersLoading(false)
    }
    loadAdminUsers()
    return () => { active = false }
  }, [view, adminAuthorized, adminSection, adminUsersRefresh])
  useEffect(() => {
    let active = true
    async function loadAdminReports() {
      if (view !== 'admin' || !adminAuthorized || adminSection !== 'reports') return
      setAdminReportsLoading(true)
      setAdminReportsError('')
      const { data, error: listError } = await supabase.rpc('admin_list_user_reports', {
        p_status: adminReportsFilter === 'all' ? null : adminReportsFilter,
        p_limit: 100,
        p_offset: 0
      })
      if (!active) return
      if (listError) {
        setAdminReportsError(listError.message || 'No se pudieron cargar las denuncias.')
        setAdminReports([])
      } else {
        const { data: links, error: linksError } = await supabase.rpc('admin_list_report_message_links')
        if (!active) return
        if (linksError) setAdminReportsError(linksError.message || 'No se pudieron cargar las referencias de contenido denunciado.')
        const linkMap = new Map((links || []).map(link => [link.report_id, link]))
        setAdminReports((Array.isArray(data) ? data : []).map(report => ({ ...report, ...(linkMap.get(report.report_id) || {}) })))
      }
      setAdminReportsLoading(false)
    }
    loadAdminReports()
    return () => { active = false }
  }, [view, adminAuthorized, adminSection, adminReportsFilter, adminReportsRefresh])

  useEffect(() => {
    let active = true
    async function loadAdminStats() {
      if (view !== 'admin' || !adminAuthorized || adminSection !== 'overview') return
      setAdminStatsLoading(true)
      setAdminStatsError('')
      const { data, error: statsError } = await supabase.rpc('admin_get_dashboard_stats')
      if (!active) return
      if (statsError) {
        setAdminStatsError(statsError.message || 'No se pudieron cargar las estadísticas.')
      } else {
        setAdminStats(Array.isArray(data) ? (data[0] || null) : data)
      }
      setAdminStatsLoading(false)
    }
    loadAdminStats()
    return () => { active = false }
  }, [view, adminAuthorized, adminSection, adminStatsRefresh])

  useEffect(() => {
    let active = true
    async function loadAdminRetainedMessages() {
      if (view !== 'admin' || !adminAuthorized || adminSection !== 'content') return
      setAdminRetainedLoading(true)
      setAdminRetainedError('')
      const { data, error: listError } = await supabase.rpc('admin_list_retained_chat_messages', {
        p_limit: 100,
        p_offset: 0
      })
      if (!active) return
      if (listError) {
        setAdminRetainedError(listError.message || 'No se pudieron cargar los mensajes conservados.')
        setAdminRetainedMessages([])
      } else setAdminRetainedMessages(Array.isArray(data) ? data : [])
      setAdminRetainedLoading(false)
    }
    loadAdminRetainedMessages()
    return () => { active = false }
  }, [view, adminAuthorized, adminSection, adminRetainedRefresh])

  useEffect(() => {
    let active = true
    async function loadCommunicationHistory() {
      if (view !== 'admin' || !adminAuthorized || adminSection !== 'announcements') return
      setCommunicationHistoryLoading(true)
      setCommunicationError('')
      const { data, error: historyError } = await supabase.rpc('admin_list_communications', { p_limit: 30, p_offset: 0 })
      if (!active) return
      if (historyError) {
        setCommunicationError(historyError.message || 'No se pudo cargar el historial.')
        setCommunicationHistory([])
      } else setCommunicationHistory(Array.isArray(data) ? data : [])
      setCommunicationHistoryLoading(false)
    }
    loadCommunicationHistory()
    return () => { active = false }
  }, [view, adminAuthorized, adminSection])

  useEffect(() => {
    let active = true
    async function loadPublicPlatformSettings() {
      setPublicPlatformSettingsLoading(true)
      setPublicPlatformSettingsError('')
      const { data, error } = await supabase.rpc('zuno_get_platform_settings')
      if (!active) return
      if (error || !data) {
        setPublicPlatformSettingsError(error?.message || 'No se pudo verificar el estado de ZUNO.')
      } else {
        setPublicPlatformSettings(Array.isArray(data) ? data[0] : data)
      }
      setPublicPlatformSettingsLoading(false)
    }
    loadPublicPlatformSettings()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    async function loadAdminPlatformSettings() {
      if (view !== 'admin' || !adminAuthorized || adminSection !== 'settings') return
      setAdminPlatformLoading(true)
      setAdminPlatformError('')
      setAdminPlatformFeedback('')
      const { data, error } = await supabase.rpc('admin_get_platform_settings')
      if (!active) return
      if (error) setAdminPlatformError(error.message || 'No se pudo cargar la configuración.')
      else {
        const settings = Array.isArray(data) ? data[0] : data
        if (settings) setAdminPlatformSettings(settings)
      }
      setAdminPlatformLoading(false)
    }
    loadAdminPlatformSettings()
    return () => { active = false }
  }, [view, adminAuthorized, adminSection])

  useEffect(() => {
    let active = true
    async function loadAdminBots() {
      if (view !== 'admin' || !adminAuthorized || adminSection !== 'bots') return
      setAdminBotsLoading(true)
      setAdminBotsError('')
      const { data, error } = await supabase.rpc('admin_list_bots')
      if (!active) return
      if (error) {
        setAdminBotsError(error.message || 'No se pudieron cargar los bots.')
        setAdminBots([])
      } else setAdminBots(Array.isArray(data) ? data : [])
      setAdminBotsLoading(false)
    }
    loadAdminBots()
    return () => { active = false }
  }, [view, adminAuthorized, adminSection])

  function newAdminBot() {
    setAdminBotsFeedback('')
    setAdminBotsError('')
    setAdminBotEditor({
      id:'',slug:'',display_name:'',age:25,gender:'',bot_role:'',bio:'',interests:[],looking_for:[],
      avatar_url:'',country:'Uruguay',city:'Montevideo',neighborhood:'',street:'',occupation:'',workplace:'',
      employed_since:'',work_schedule:'',education:'',family_story:'',daily_routine:'',
      can_initiate:false,can_send_taps:true,proactive_min_minutes:180,proactive_max_minutes:720,
      response_delay_min_seconds:20,response_delay_max_seconds:180,active_hours:'09:00-23:00',
      interaction_style:'balanced',is_active:true,is_test:false,sort_order:100,
      latitude:null,longitude:null,
      persona:{personality:'',speaking_style:'Español rioplatense natural, cálido y coherente.',backstory:'',system_prompt:'',safety_rules:[]}
    })
  }

  async function saveAdminBot(event) {
    event.preventDefault()
    if (!adminBotEditor) return
    setAdminBotsSaving(true)
    setAdminBotsError('')
    setAdminBotsFeedback('')
    const payload = {
      ...adminBotEditor,
      age:Number(adminBotEditor.age),
      proactive_min_minutes:Number(adminBotEditor.proactive_min_minutes),
      proactive_max_minutes:Number(adminBotEditor.proactive_max_minutes),
      response_delay_min_seconds:Number(adminBotEditor.response_delay_min_seconds),
      response_delay_max_seconds:Number(adminBotEditor.response_delay_max_seconds),
      sort_order:Number(adminBotEditor.sort_order),
      interests:Array.isArray(adminBotEditor.interests)?adminBotEditor.interests:String(adminBotEditor.interests||'').split(',').map(x=>x.trim()).filter(Boolean),
      looking_for:Array.isArray(adminBotEditor.looking_for)?adminBotEditor.looking_for:String(adminBotEditor.looking_for||'').split(',').map(x=>x.trim()).filter(Boolean),
      persona:{...(adminBotEditor.persona||{}),safety_rules:Array.isArray(adminBotEditor.persona?.safety_rules)?adminBotEditor.persona.safety_rules:String(adminBotEditor.persona?.safety_rules||'').split('\n').map(x=>x.trim()).filter(Boolean)}
    }
    const {data,error}=await supabase.rpc('admin_save_bot',{p_bot:payload})
    if(error){setAdminBotsSaving(false);setAdminBotsError(error.message||'No se pudo guardar el bot.');return}
    const saved=Array.isArray(data)?data[0]:data
    const {error:locationError}=await supabase.rpc('admin_set_bot_location',{p_bot_id:saved.id,p_latitude:adminBotEditor.latitude ?? null,p_longitude:adminBotEditor.longitude ?? null,p_location_label:adminBotEditor.location_label ?? null})
    setAdminBotsSaving(false)
    if(locationError){setAdminBotsError('El bot se guardó, pero no pudimos guardar su ubicación: '+locationError.message);return}
    saved.latitude=adminBotEditor.latitude ?? null
    saved.longitude=adminBotEditor.longitude ?? null
    setAdminBots(current=>{const rest=current.filter(item=>item.id!==saved.id);return [...rest,saved].sort((a,b)=>(a.sort_order||100)-(b.sort_order||100))})
    setAdminBotEditor(null)
    setAdminBotsFeedback('El bot se guardó correctamente.')
  }

  async function deleteAdminBot(bot) {
    if (!bot?.id || !window.confirm('¿Eliminar definitivamente a '+bot.display_name+'? Sus conversaciones también se eliminarán.')) return
    setAdminBotsError('')
    const {error}=await supabase.rpc('admin_delete_bot',{p_bot_id:bot.id})
    if(error){setAdminBotsError(error.message||'No se pudo eliminar el bot.');return}
    setAdminBots(current=>current.filter(item=>item.id!==bot.id))
    setAdminBotsFeedback('El bot fue eliminado.')
    setAdminBotEditor(null)
  }

  async function saveAdminPlatformSettings(event) {
    event.preventDefault()
    setAdminPlatformSaving(true)
    setAdminPlatformError('')
    setAdminPlatformFeedback('')
    const { data, error } = await supabase.rpc('admin_update_platform_settings', {
      p_platform_name: adminPlatformSettings.platform_name,
      p_platform_description: adminPlatformSettings.platform_description,
      p_registration_enabled: adminPlatformSettings.registration_enabled,
      p_maintenance_mode: adminPlatformSettings.maintenance_mode,
      p_maintenance_message: adminPlatformSettings.maintenance_message
    })
    setAdminPlatformSaving(false)
    if (error) {
      setAdminPlatformError(error.message || 'No se pudieron guardar los cambios.')
      return
    }
    const saved = Array.isArray(data) ? data[0] : data
    if (saved) setAdminPlatformSettings(saved)
    setPublicPlatformSettings(saved || adminPlatformSettings)
    setAdminPlatformFeedback('La configuración de ZUNO se guardó correctamente.')
  }

  useEffect(() => {
    let active = true
    async function loadAdminSecurity() {
      if (view !== 'admin' || !adminAuthorized || adminSection !== 'security') return
      setAdminSecurityLoading(true)
      setAdminSecurityError('')
      const [overviewResult, eventsResult] = await Promise.all([
        supabase.rpc('admin_get_security_overview'),
        supabase.rpc('admin_list_security_audit', {
          p_source: adminSecurityFilter,
          p_limit: 50,
          p_offset: 0
        })
      ])
      if (!active) return
      if (overviewResult.error) {
        setAdminSecurityError(overviewResult.error.message || 'No se pudo cargar el estado de seguridad.')
        setAdminSecurityOverview(null)
      } else {
        const overview = Array.isArray(overviewResult.data) ? overviewResult.data[0] : overviewResult.data
        setAdminSecurityOverview(overview || null)
      }
      if (eventsResult.error) {
        setAdminSecurityError(current => current || eventsResult.error.message || 'No se pudo cargar el historial de auditoría.')
        setAdminSecurityEvents([])
      } else setAdminSecurityEvents(Array.isArray(eventsResult.data) ? eventsResult.data : [])
      setAdminSecurityLoading(false)
    }
    loadAdminSecurity()
    return () => { active = false }
  }, [view, adminAuthorized, adminSection, adminSecurityFilter, adminSecurityRefresh])

  async function searchCommunicationUsers() {
    setCommunicationError('')
    const { data, error: searchError } = await supabase.rpc('admin_list_users', {
      p_query: communicationSearch.trim() || null, p_limit: 20, p_offset: 0
    })
    if (searchError) {
      setCommunicationError(searchError.message || 'No se pudieron buscar usuarios.')
      setCommunicationUsers([])
    } else setCommunicationUsers(Array.isArray(data) ? data : [])
  }

  async function sendAdminCommunication(event) {
    event?.preventDefault?.()
    if (communicationBusy || !communicationTitle.trim() || !communicationBody.trim()) return
    if (communicationMode === 'individual' && !communicationTarget?.id) {
      setCommunicationError('Buscá y seleccioná un usuario antes de enviar.')
      return
    }
    setCommunicationBusy(true)
    setCommunicationError('')
    setCommunicationFeedback('')
    const { data, error: sendError } = await supabase.rpc('admin_send_communication', {
      p_title: communicationTitle.trim(),
      p_message: communicationBody.trim(),
      p_target_user_id: communicationMode === 'individual' ? communicationTarget.id : null
    })
    if (sendError) setCommunicationError(sendError.message || 'No se pudo enviar la comunicación.')
    else {
      const result = Array.isArray(data) ? data[0] : data
      setCommunicationFeedback('Aviso enviado correctamente a ' + (result?.recipients ?? (communicationMode === 'individual' ? 1 : 'todos los')) + ' destinatario(s).')
      setCommunicationTitle('')
      setCommunicationBody('')
      setCommunicationTarget(null)
      setCommunicationUsers([])
      setCommunicationSearch('')
      const { data: history } = await supabase.rpc('admin_list_communications', { p_limit: 30, p_offset: 0 })
      setCommunicationHistory(Array.isArray(history) ? history : [])
    }
    setCommunicationBusy(false)
  }

  async function openAdminRetainedMedia(messageId) {
    if (!messageId || adminRetainedMediaBusy) return
    setAdminRetainedMediaBusy(messageId)
    setAdminRetainedError('')
    const { data, error: pathError } = await supabase.rpc('admin_get_retained_chat_media_path', { p_message_id: messageId })
    if (pathError) {
      setAdminRetainedError(pathError.message || 'No se pudo consultar el archivo conservado.')
      setAdminRetainedMediaBusy('')
      return
    }
    const item = Array.isArray(data) ? data[0] : data
    if (!item?.media_path) {
      setAdminRetainedError('El archivo no está disponible o ya venció su plazo de conservación.')
      setAdminRetainedMediaBusy('')
      return
    }
    const { data: signed, error: signedError } = await supabase.storage.from('zuno-chat-media').createSignedUrl(item.media_path, 120)
    if (signedError) setAdminRetainedError('No se pudo abrir el archivo: ' + signedError.message)
    else setAdminRetainedMedia(current => ({ ...current, [messageId]: { url: signed.signedUrl, type: item.message_type || '' } }))
    setAdminRetainedMediaBusy('')
  }

  async function loadAdminReportContext(reportId) {
    if (!reportId || adminReportContextBusy) return
    setAdminReportContextBusy(reportId)
    setAdminReportsError('')
    const { data, error: contextError } = await supabase.rpc('admin_get_report_context', { p_report_id: reportId })
    if (contextError) setAdminReportsError(contextError.message || 'No se pudo consultar el contexto de la denuncia.')
    else setAdminReportContexts(current => ({ ...current, [reportId]: Array.isArray(data) ? data[0] : data }))
    setAdminReportContextBusy('')
  }

  async function sendAdminReportReply(reportId) {
    const message = String(adminReportReplies[reportId] || '').trim()
    if (!reportId || !message || adminReportReplyBusy) return
    setAdminReportReplyBusy(reportId)
    setAdminReportsError('')
    const { error: replyError } = await supabase.rpc('admin_reply_to_user_report', {
      p_report_id: reportId,
      p_message: message
    })
    if (replyError) setAdminReportsError(replyError.message || 'No se pudo enviar la respuesta al denunciante.')
    else {
      setAdminReportReplies(current => ({ ...current, [reportId]: '' }))
      setAdminReportsError('Respuesta enviada como notificación al usuario que realizó la denuncia.')
    }
    setAdminReportReplyBusy('')
  }

  async function applyAdminSanction() {
    if (!adminSelectedUser?.id || !adminSanctionReason.trim() || adminSanctionBusy) return
    setAdminSanctionBusy(true); setAdminSanctionMessage('')
    const { error: sanctionError } = await supabase.rpc('admin_apply_user_sanction', { p_user_id: adminSelectedUser.id, p_duration_days: adminSanctionDuration === 'permanent' ? null : Number(adminSanctionDuration), p_permanent: adminSanctionDuration === 'permanent', p_reason: adminSanctionReason.trim() })
    if (sanctionError) setAdminSanctionMessage('No se pudo aplicar la medida: '+sanctionError.message)
    else { setAdminSanctionMessage('Medida aplicada y notificación enviada al usuario.'); setAdminSanctionReason(''); const { data } = await supabase.rpc('admin_list_user_sanctions', { p_user_id: adminSelectedUser.id }); setAdminSanctionHistory(Array.isArray(data)?data:[]) }
    setAdminSanctionBusy(false)
  }

  async function revokeAdminSanction(sanctionId) {
    if (!sanctionId || adminSanctionBusy) return
    setAdminSanctionBusy(true); setAdminSanctionMessage('')
    const { error: revokeError } = await supabase.rpc('admin_revoke_user_sanction', { p_sanction_id: sanctionId })
    if (revokeError) setAdminSanctionMessage('No se pudo levantar la medida: '+revokeError.message)
    else { setAdminSanctionMessage('Medida levantada. El usuario podrá volver a entrar si no tiene otra restricción activa.'); const { data } = await supabase.rpc('admin_list_user_sanctions', { p_user_id: adminSelectedUser.id }); setAdminSanctionHistory(Array.isArray(data)?data:[]) }
    setAdminSanctionBusy(false)
  }

  async function updateAdminReport(reportId, nextStatus) {
    if (!reportId || adminReportBusy) return
    setAdminReportBusy(reportId)
    const { error: updateError } = await supabase.rpc('admin_update_user_report', {
      p_report_id: reportId,
      p_status: nextStatus,
      p_admin_note: null
    })
    if (updateError) setAdminReportsError(updateError.message || 'No se pudo actualizar la denuncia.')
    else setAdminReportsRefresh(value => value + 1)
    setAdminReportBusy('')
  }

  useEffect(() => {
    let active = true
    async function checkMyAccountStatus() {
      if (!session?.user) { setAccountStatus({ loading: false, blocked: false, permanent: false, reason: '', expires_at: null }); return }
      setAccountStatus(current => ({ ...current, loading: true }))
      const { data, error: statusError } = await supabase.rpc('zuno_get_my_account_status')
      if (!active) return
      if (statusError) { setAccountStatus({ loading: false, blocked: true, permanent: false, reason: 'No pudimos verificar el estado de tu cuenta. Cerrá sesión y volvé a intentar. Si el problema continúa, contactá soporte.', expires_at: null, error: true }); return }
      const status = Array.isArray(data) ? data[0] : data
      setAccountStatus({ loading: false, blocked: Boolean(status?.is_blocked), permanent: Boolean(status?.is_permanent), reason: status?.reason || '', expires_at: status?.expires_at || null })
    }
    checkMyAccountStatus()
    return () => { active = false }
  }, [session?.user?.id])

  useEffect(() => {
    let active = true
    async function checkPolicyAcceptance() {
      if (!session?.user) { setPolicyStatus('loading'); setPolicyError(''); return }
      setPolicyStatus('loading')
      setPolicyError('')
      const { data, error: readError } = await supabase.from('user_policy_acceptances').select('policy_version, accepted_at').eq('user_id', session.user.id).eq('policy_version', CURRENT_POLICY_VERSION).limit(1).maybeSingle()
      if (!active) return
      if (readError) { setPolicyStatus('error'); setPolicyError(readError.message || 'No se pudo verificar la aceptación.'); return }
      setPolicyStatus(data ? 'accepted' : 'required')
    }
    checkPolicyAcceptance()
    return () => { active = false }
  }, [session?.user?.id])

  async function acceptCurrentPolicy() {
    if (!session?.user || policyBusy) return
    setPolicyBusy(true); setPolicyError('')
    const { error: insertError } = await supabase.from('user_policy_acceptances').insert({ user_id: session.user.id, policy_version: CURRENT_POLICY_VERSION, policy_title: 'Términos y política de privacidad de ZUNO' })
    if (insertError && insertError.code !== '23505') { setPolicyError(insertError.message || 'No se pudo guardar tu aceptación.'); setPolicyBusy(false); return }
    setPolicyStatus('accepted'); setPolicyBusy(false)
  }
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState('')
  const [people, setPeople] = useState([])
  const [favoriteIds, setFavoriteIds] = useState([])
  const [activeTapIds, setActiveTapIds] = useState([])
  const [favoriteBusy, setFavoriteBusy] = useState('')
  const [hiddenProfileIds, setHiddenProfileIds] = useState([])
  const [connectionRows, setConnectionRows] = useState([])
  const [connectionBusy, setConnectionBusy] = useState('')
  const [conversations, setConversations] = useState([])
  const [chatListTab, setChatListTab] = useState('messages')
  const [unreadCounts, setUnreadCounts] = useState({})
  const [notifications, setNotifications] = useState([])
  const [stories, setStories] = useState([])
  const [storyViewer, setStoryViewer] = useState(null)
  const [storyQueue, setStoryQueue] = useState([])
  const [archivedStories, setArchivedStories] = useState([])
  const [showStoryArchive, setShowStoryArchive] = useState(false)
  const [showStoryMenu, setShowStoryMenu] = useState(false)
  const [storyPaused, setStoryPaused] = useState(false)
  const [storyRemainingMs, setStoryRemainingMs] = useState(7000)
  const storyPauseStartedRef = useRef(null)
  const [storyViewers, setStoryViewers] = useState([])
  const [storyLikes, setStoryLikes] = useState([])
  const [storyLiked, setStoryLiked] = useState(false)
  const [storyLikeCount, setStoryLikeCount] = useState(0)
  const [storyReplyDraft, setStoryReplyDraft] = useState('')
  const [storyReplyBusy, setStoryReplyBusy] = useState(false)
  const [showStoryViewers, setShowStoryViewers] = useState(false)
  const [storyBusy, setStoryBusy] = useState(false)
  const [storyMessage, setStoryMessage] = useState('')
  const [notificationActors, setNotificationActors] = useState({})
  const [notificationBusy, setNotificationBusy] = useState('')
  const [activeConversation, setActiveConversation] = useState(null)
  const [showEphemeralMenu, setShowEphemeralMenu] = useState(false)
  const [ephemeralBusy, setEphemeralBusy] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [activeBotConversation, setActiveBotConversation] = useState(null)
  const [botFavoriteIds, setBotFavoriteIds] = useState([])
  const [botBlockedIds, setBotBlockedIds] = useState([])
  const [botChatMessages, setBotChatMessages] = useState([])
  const [botChatDraft, setBotChatDraft] = useState('')
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const chatMessagesContainerRef = useRef(null)
  const chatChannelRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const swipeStartYRef = useRef(null)
  const [messageReceipts, setMessageReceipts] = useState({})
  const [activeMessageMenu, setActiveMessageMenu] = useState(null)
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState(null)
  const longPressTimerRef = useRef(null)
  const [chatDraft, setChatDraft] = useState('')
  const [profileMessageDraft, setProfileMessageDraft] = useState('')
  const [profileMessageBusy, setProfileMessageBusy] = useState(false)
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
  const [chatImageFullscreen, setChatImageFullscreen] = useState(null)
  const [chatImageZoom, setChatImageZoom] = useState(1)
  const chatPinchDistanceRef = useRef(0)
  const [showChatGallery, setShowChatGallery] = useState(false)
  const [chatDragOver, setChatDragOver] = useState(false)
  const [showLocationMenu, setShowLocationMenu] = useState(false)
  const [liveLocations, setLiveLocations] = useState([])
  const [liveSharing, setLiveSharing] = useState(null)
  const [locationMapOpen, setLocationMapOpen] = useState(false)
  const [locationMapTarget, setLocationMapTarget] = useState(null)
  const locationMapContainerRef = useRef(null)
  const locationMapRef = useRef(null)
  const locationMapLayerRef = useRef(null)
  const locationWatchRef = useRef(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [profilePhotoIndex, setProfilePhotoIndex] = useState(0)
  const [profilePhotoFullscreen, setProfilePhotoFullscreen] = useState(false)
  const [showProfileAlbum, setShowProfileAlbum] = useState(false)
  const profileTouchStartX = useRef(null)
  const profileTouchStartY = useRef(null)
  const [mapVisible, setMapVisible] = useState(true)
  const [mapBusy, setMapBusy] = useState(false)
  const [mapUsers, setMapUsers] = useState([])
  const [mapCenter, setMapCenter] = useState(null)
  const [mapStatus, setMapStatus] = useState('')
  const [mapProfiles, setMapProfiles] = useState({})
  const [selectedMapPerson, setSelectedMapPerson] = useState(null)
  const [mapInvites, setMapInvites] = useState([])
  const [mapInviteBusy, setMapInviteBusy] = useState(false)
  const mapRequestSoundRef = useRef(null)
  const [activeMapRoute, setActiveMapRoute] = useState(null)
  const [mapOrigin, setMapOrigin] = useState(null)
  const mapRouteLayerRef = useRef(null)
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
  const [discoveryAgeMin, setDiscoveryAgeMin] = useState('')
  const [discoveryAgeMax, setDiscoveryAgeMax] = useState('')
  const [discoveryDistanceKm, setDiscoveryDistanceKm] = useState('')
  const [discoveryOnlineRecently, setDiscoveryOnlineRecently] = useState(false)
  const [showDiscoveryFilters, setShowDiscoveryFilters] = useState(false)
  const [peopleError, setPeopleError] = useState('')
  const [blockedUsers, setBlockedUsers] = useState([])
  const [blockBusy, setBlockBusy] = useState('')
  const [reportTarget, setReportTarget] = useState(null)
  const [reportReason, setReportReason] = useState('harassment')
  const [reportDetails, setReportDetails] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [reportedMessageIds, setReportedMessageIds] = useState([])
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
  const [privacy, setPrivacy] = useState({show_online:true,show_distance:true,show_age:true,show_location:true})
  const [locationTermsAccepted, setLocationTermsAccepted] = useState(false)
  const [photos, setPhotos] = useState([])
  const [privateAlbumPhotos, setPrivateAlbumPhotos] = useState([])
  const [privateAlbumRequests, setPrivateAlbumRequests] = useState([])
  const [privateAlbumRequestStatus, setPrivateAlbumRequestStatus] = useState('')
  const [privateAlbumBusy, setPrivateAlbumBusy] = useState(false)
  const [privateAlbumMessage, setPrivateAlbumMessage] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [callSession, setCallSession] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [callBusy, setCallBusy] = useState(false)
  const [callError, setCallError] = useState('')
  const [localCallStream, setLocalCallStream] = useState(null)
  const [remoteCallStream, setRemoteCallStream] = useState(null)
  const [callMuted, setCallMuted] = useState(false)
  const [callCameraOff, setCallCameraOff] = useState(false)
  const peerConnectionRef = useRef(null)
  const localCallStreamRef = useRef(null)
  const callIdRef = useRef(null)
  const pendingIceRef = useRef([])
  const localIceQueueRef = useRef([])
  const remoteVideoRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const ringtoneContextRef = useRef(null)


  function closeCallMedia() {
    if (peerConnectionRef.current) { peerConnectionRef.current.onicecandidate = null; peerConnectionRef.current.close(); peerConnectionRef.current = null }
    if (localCallStreamRef.current) { localCallStreamRef.current.getTracks().forEach(track => track.stop()); localCallStreamRef.current = null }
    setLocalCallStream(null)
    setRemoteCallStream(null)
    callIdRef.current = null
    pendingIceRef.current = []
    localIceQueueRef.current = []
    setCallMuted(false)
    setCallCameraOff(false)
  }

  async function sendCallIce(callId, candidate) {
    if (!candidate) return
    const { error: signalError } = await supabase.from('call_signals').insert({
      call_id: callId, sender_id: session.user.id, signal_type: 'ice', payload: candidate.toJSON()
    })
    if (signalError) console.warn('No se pudo enviar una señal de conexión:', signalError.message)
  }

  async function createCallPeer(callId, stream) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] })
    peerConnectionRef.current = peer
    callIdRef.current = callId
    stream.getTracks().forEach(track => peer.addTrack(track, stream))
    peer.onicecandidate = event => { if (event.candidate) { const activeId = callIdRef.current; if (activeId) sendCallIce(activeId, event.candidate); else localIceQueueRef.current.push(event.candidate) } }
    peer.ontrack = event => setRemoteCallStream(event.streams[0] || new MediaStream([event.track]))
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed') setCallError('No se pudo establecer la conexión. Probá nuevamente con otra red.')
      if (peer.connectionState === 'connected') setCallError('')
    }
    return peer
  }

  async function startCall(callType) {
    if (!activeConversation || callBusy || callSession) return
    setCallBusy(true); setCallError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Tu navegador no permite acceder al micrófono o la cámara. Abrí ZUNO mediante HTTPS.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' ? { facingMode: 'user' } : false })
      localCallStreamRef.current = stream; setLocalCallStream(stream)
      const peer = await createCallPeer(null, stream)
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      const { data: created, error: createError } = await supabase.from('call_sessions').insert({
        conversation_id: activeConversation.id, caller_id: session.user.id,
        callee_id: activeConversation.person.id, call_type: callType,
        status: 'ringing', offer: peer.localDescription.toJSON()
      }).select('*').single()
      if (createError) throw createError
      callIdRef.current = created.id
      for (const candidate of localIceQueueRef.current.splice(0)) await sendCallIce(created.id, candidate)
      setCallSession({ ...created, _person: activeConversation.person })
      setCallError('')
    } catch (callStartError) {
      closeCallMedia()
      setCallError(callStartError?.message || 'No se pudo iniciar la llamada.')
    } finally { setCallBusy(false) }
  }

  async function acceptCall() {
    if (!incomingCall || callBusy) return
    setCallBusy(true); setCallError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingCall.call_type === 'video' ? { facingMode: 'user' } : false })
      localCallStreamRef.current = stream; setLocalCallStream(stream)
      const peer = await createCallPeer(incomingCall.id, stream)
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))
      const { data: signals } = await supabase.from('call_signals').select('payload').eq('call_id', incomingCall.id).eq('signal_type','ice')
      for (const signal of signals || []) { try { await peer.addIceCandidate(new RTCIceCandidate(signal.payload)) } catch {} }
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      const { error: updateError } = await supabase.from('call_sessions').update({
        status: 'accepted', answer: peer.localDescription.toJSON(),
        answered_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', incomingCall.id)
      if (updateError) throw updateError
      if (incomingCall._conversation && incomingCall._caller) setActiveConversation({ ...incomingCall._conversation, person: incomingCall._caller, ephemeral_duration_minutes: 0 })
      setCallSession({ ...incomingCall, _person: incomingCall._caller, status: 'accepted', answered_at: new Date().toISOString(), answer: peer.localDescription.toJSON() })
      setIncomingCall(null)
    } catch (acceptError) {
      closeCallMedia()
      setCallError(acceptError?.message || 'No se pudo aceptar la llamada.')
    } finally { setCallBusy(false) }
  }

  async function declineCall() {
    if (!incomingCall) return
    await supabase.from('call_sessions').update({ status: 'rejected', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', incomingCall.id)
    setIncomingCall(null)
  }

  async function finishCall() {
    const current = callSession
    if (current) {
      const endedAt = new Date()
      const startedAt = current.answered_at ? new Date(current.answered_at) : null
      const durationSeconds = startedAt ? Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)) : 0
      const minutes = Math.floor(durationSeconds / 60)
      const seconds = durationSeconds % 60
      const durationLabel = minutes > 0 ? minutes + ' min ' + seconds + ' s' : durationSeconds + ' s'
      const { error: endError } = await supabase.from('call_sessions').update({ status: 'ended', ended_at: endedAt.toISOString(), updated_at: endedAt.toISOString() }).eq('id', current.id)
      if (endError) console.warn('No se pudo actualizar el estado de la llamada:', endError.message)
      if (current.answered_at) {
        const { data: callMessage, error: callMessageError } = await supabase.from('messages').insert({ conversation_id: current.conversation_id, sender_id: session.user.id, body: '📞 Llamada finalizada · ' + durationLabel }).select('id,conversation_id,sender_id,body,created_at,message_type,media_path,expires_at').single()
        if (callMessageError) console.warn('No se pudo guardar el resumen de la llamada:', callMessageError.message)
        else if (activeConversation?.id === current.conversation_id) setChatMessages(items => [...items, callMessage])
      }
    }
    setCallSession(null)
    closeCallMedia()
  }

  function toggleCallMute() {
    const next = !callMuted
    localCallStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = !next })
    setCallMuted(next)
  }

  function toggleCallCamera() {
    const next = !callCameraOff
    localCallStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = !next })
    setCallCameraOff(next)
  }

  async function switchCallCamera() {
    const stream = localCallStreamRef.current
    const oldTrack = stream?.getVideoTracks?.()[0]
    if (!stream || !oldTrack || !navigator.mediaDevices?.getUserMedia) return
    try {
      const currentFacing = oldTrack.getSettings?.().facingMode || 'user'
      const nextFacing = currentFacing === 'environment' ? 'user' : 'environment'
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: nextFacing } }, audio: false })
      const nextTrack = cameraStream.getVideoTracks()[0]
      if (callCameraOff) nextTrack.enabled = false
      const sender = peerConnectionRef.current?.getSenders().find(item => item.track?.kind === 'video')
      if (sender) await sender.replaceTrack(nextTrack)
      stream.removeTrack(oldTrack)
      stream.addTrack(nextTrack)
      oldTrack.stop()
      setLocalCallStream(new MediaStream(stream.getTracks()))
      if (localVideoRef.current) localVideoRef.current.srcObject = new MediaStream(stream.getTracks())
    } catch (cameraError) {
      setCallError('No se pudo cambiar de cámara. Tu dispositivo puede no tener otra cámara disponible.')
    }
  }

  useEffect(() => {
    if (!session?.user) { setIncomingCall(null); return }
    let active = true
    const loadIncoming = async () => {
      const { data } = await supabase.from('call_sessions').select('*').eq('callee_id', session.user.id).eq('status','ringing').order('created_at',{ascending:false}).limit(1).maybeSingle()
      if (!active || !data) return
      const [{ data: conversation }, { data: person }] = await Promise.all([
        supabase.from('conversations').select('*').eq('id', data.conversation_id).maybeSingle(),
        supabase.from('profiles').select('id,display_name,username,avatar_url').eq('id', data.caller_id).maybeSingle()
      ])
      if (active) setIncomingCall({ ...data, _conversation: conversation, _caller: person })
    }
    loadIncoming()
    const inboxPoll = window.setInterval(loadIncoming, 2500)
    const channel = supabase.channel('zuno-call-inbox-' + session.user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions', filter: 'callee_id=eq.' + session.user.id }, payload => {
        if (payload.new.status === 'ringing') {
          setIncomingCall(payload.new)
          ;(async () => {
            const { data: conversation } = await supabase.from('conversations').select('*').eq('id', payload.new.conversation_id).maybeSingle()
            const { data: person } = await supabase.from('profiles').select('id,display_name,username,avatar_url').eq('id', payload.new.caller_id).maybeSingle()
            if (conversation && person) {
              setActiveConversation({ ...conversation, person, ephemeral_duration_minutes: 0 })
              setIncomingCall(current => current?.id === payload.new.id ? { ...payload.new, _caller: person, _conversation: conversation } : current)
            }
          })()
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: 'callee_id=eq.' + session.user.id }, payload => {
        if (payload.new.status !== 'ringing') setIncomingCall(current => current?.id === payload.new.id ? null : current)
      }).subscribe()
    return () => { active = false; window.clearInterval(inboxPoll); supabase.removeChannel(channel) }
  }, [session?.user?.id])

  useEffect(() => {
    const ringing = Boolean(incomingCall || callSession?.status === 'ringing')
    if (!ringing) {
      if (ringtoneContextRef.current) { try { ringtoneContextRef.current.close() } catch {} ringtoneContextRef.current = null }
      return
    }
    let stopped = false
    const playTone = async () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        if (!AudioContextClass) return
        const context = ringtoneContextRef.current || new AudioContextClass()
        ringtoneContextRef.current = context
        if (context.state === 'suspended') await context.resume()
        if (stopped || context.state !== 'running') return
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = incomingCall ? 880 : 660
        gain.gain.setValueAtTime(0.0001, context.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.04)
        gain.gain.setValueAtTime(0.12, context.currentTime + 0.28)
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42)
        oscillator.connect(gain); gain.connect(context.destination)
        oscillator.start(); oscillator.stop(context.currentTime + 0.44)
      } catch (ringError) { console.warn('El navegador bloqueó el tono de llamada:', ringError?.message || ringError) }
    }
    playTone()
    const timer = window.setInterval(playTone, 1500)
    return () => {
      stopped = true
      window.clearInterval(timer)
      if (ringtoneContextRef.current) { try { ringtoneContextRef.current.close() } catch {} ringtoneContextRef.current = null }
    }
  }, [incomingCall?.id, callSession?.id, callSession?.status])

  useEffect(() => {
    if (!callSession?.id) return
    const channel = supabase.channel('zuno-call-' + callSession.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: 'id=eq.' + callSession.id }, async payload => {
        const updated = payload.new
        if (updated.status === 'rejected' || updated.status === 'missed' || updated.status === 'ended') {
          setCallError(updated.status === 'rejected' ? 'La otra persona rechazó la llamada.' : updated.status === 'missed' ? 'La llamada no fue respondida.' : 'La llamada finalizó.')
          setCallSession(null); closeCallMedia(); return
        }
        if (updated.caller_id === session.user.id && updated.answer && peerConnectionRef.current && !peerConnectionRef.current.currentRemoteDescription) {
          try { await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(updated.answer)); for (const candidate of pendingIceRef.current.splice(0)) { try { await peerConnectionRef.current.addIceCandidate(candidate) } catch {} } setCallSession(updated) }
          catch (answerError) { setCallError(answerError.message) }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_signals', filter: 'call_id=eq.' + callSession.id }, async payload => {
        if (payload.new.sender_id === session.user.id || payload.new.signal_type !== 'ice') return
        const candidate = new RTCIceCandidate(payload.new.payload)
        if (peerConnectionRef.current?.remoteDescription) {
          try { await peerConnectionRef.current.addIceCandidate(candidate) } catch (iceError) { console.warn('ICE:', iceError.message) }
        } else pendingIceRef.current.push(candidate)
      }).subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          const { data: existingSignals } = await supabase.from('call_signals').select('sender_id,payload').eq('call_id', callSession.id).eq('signal_type','ice')
          for (const item of existingSignals || []) {
            if (item.sender_id === session.user.id) continue
            const candidate = new RTCIceCandidate(item.payload)
            if (peerConnectionRef.current?.remoteDescription) { try { await peerConnectionRef.current.addIceCandidate(candidate) } catch {} }
            else pendingIceRef.current.push(candidate)
          }
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [callSession?.id, session?.user?.id])

  useEffect(() => {
    const peer = peerConnectionRef.current
    if (!peer || !callSession?.answer || callSession.callee_id === session?.user?.id || peer.currentRemoteDescription) return
    peer.setRemoteDescription(new RTCSessionDescription(callSession.answer)).then(async () => {
      for (const candidate of pendingIceRef.current.splice(0)) { try { await peer.addIceCandidate(candidate) } catch {} }
    }).catch(answerError => setCallError(answerError.message))
  }, [callSession?.answer, callSession?.id, session?.user?.id])

  useEffect(() => {
    if (localVideoRef.current && localCallStream) localVideoRef.current.srcObject = localCallStream
    if (remoteVideoRef.current && remoteCallStream) remoteVideoRef.current.srcObject = remoteCallStream
    if (remoteAudioRef.current && remoteCallStream) remoteAudioRef.current.srcObject = remoteCallStream
  }, [localCallStream, remoteCallStream, callSession?.call_type])

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthLoading(false); return }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session?.user || !profile || !privacy.show_online) return
    const pingActivity = () => {
      if (document.visibilityState !== 'visible') return
      supabase.from('profiles').update({last_seen_at:new Date().toISOString()}).eq('id',session.user.id)
        .then(({error:activityError})=>{if(activityError) console.warn('No se pudo actualizar la actividad de ZUNO:',activityError.message)})
    }
    pingActivity()
    const timer=window.setInterval(pingActivity,120000)
    document.addEventListener('visibilitychange',pingActivity)
    return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',pingActivity)}
  }, [session, privacy.show_online, profile])

  useEffect(() => {
    if (authLoading) return
    if (!session?.user) { setProfile(null); setProfileLoading(false); setView('profile'); return }
    setProfileLoading(true)
    setProfileLoadError('')
    let active = true
    supabase.from('profiles').select('display_name, username, bio, avatar_url, zuno_verified, city, region, interests, looking_for, preferred_age_min, preferred_age_max, preferred_distance_km, show_online, show_distance, show_age, show_location, location_terms_accepted').eq('id', session.user.id).maybeSingle()
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
          setPrivacy({show_online:data.show_online ?? true,show_distance:data.show_distance ?? true,show_age:data.show_age ?? true,show_location:data.show_location ?? true})
          setLocationTermsAccepted(Boolean(data.location_terms_accepted))
          const [privateResult, photoResult] = await Promise.all([supabase.from('private_profiles').select('birth_date').eq('user_id', session.user.id).maybeSingle(),supabase.from('profile_photos').select('id,storage_path,sort_order').eq('user_id', session.user.id).order('sort_order')])
          if (!privateResult.error) setBirthDate(privateResult.data?.birth_date || '')
          if (!photoResult.error) { const signed = await Promise.all((photoResult.data || []).map(async p => { const {data:s} = await supabase.storage.from('zuno-profile-photos').createSignedUrl(p.storage_path,3600); return {...p,url:s?.signedUrl || ''} })); setPhotos(signed) }
          // A saved profile must never send the user through first-time setup again.
          setView('home')
        } else {
          setProfile({})
          setLocationTermsAccepted(Boolean(session.user.user_metadata?.location_terms_accepted))
          setView('profile')
        }
        setProfileLoading(false)
      })
    return () => { active = false }
  }, [session?.user?.id, authLoading])

  useEffect(() => {
    if (!session?.user) { setPrivateAlbumPhotos([]); setPrivateAlbumRequests([]); return }
    if (view === 'profile') loadPrivateAlbumOwnerData()
  }, [session, view])

  // Cargar preferencia del mapa una vez; la ubicación se actualiza por el watcher independiente.
  useEffect(() => {
    if (!session?.user || !profile) return
    let active = true
    const initializeMapVisibility = async () => {
      const { data, error: visibilityReadError } = await supabase.from('user_map_locations')
        .select('map_visible').eq('user_id', session.user.id).maybeSingle()
      if (!active) return
      if (visibilityReadError) { console.warn('No se pudo leer la visibilidad del mapa:', visibilityReadError.message); return }
      // La visibilidad del mapa es voluntaria: una cuenta sin preferencia guardada
      // comienza oculta. Solo el usuario puede activarla desde Privacidad.
      if (!data) {
        if (active) setMapVisible(false)
      } else setMapVisible(Boolean(data.map_visible))
    }
    initializeMapVisibility()
    return () => { active = false }
  }, [session?.user?.id, Boolean(profile)])

  // watchPosition obtiene una primera ubicación y continúa actualizando mientras ZUNO está en primer plano.
  useEffect(() => {
    if (!session?.user || !profile || !locationTermsAccepted || (!privacy.show_distance && !mapVisible)) return
    if (!navigator.geolocation) { setMapStatus('Este navegador no permite actualizar la ubicación automáticamente.'); return }
    let active = true
    let lastSentAt = 0
    let lastLat = null
    let lastLng = null
    const publishPosition = async position => {
      if (!active || document.visibilityState === 'hidden') return
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      const now = Date.now()
      const movedEnough = lastLat === null || Math.abs(latitude-lastLat) + Math.abs(longitude-lastLng) > 0.00015
      if (!movedEnough && now-lastSentAt < 60000) return
      if (now-lastSentAt < 15000) return
      lastSentAt = now; lastLat = latitude; lastLng = longitude
      const { error: updateError } = await supabase.rpc('update_my_map_location', { p_latitude: latitude, p_longitude: longitude })
      if (!active) return
      if (updateError) { setMapStatus('No pudimos actualizar la ubicación automáticamente. ' + updateError.message); return }
      setMapStatus('')
      setPeopleRefresh(value => value + 1)
      if (view === 'map') {
        const { data, error } = await supabase.rpc('get_nearby_map_users', { p_radius_km: 50 })
        if (active && !error) setMapUsers(data || [])
      }
    }
    const watchId = navigator.geolocation.watchPosition(
      publishPosition,
      error => { if (active && error.code !== 1) setMapStatus('No pudimos actualizar la ubicación automáticamente. Activá el permiso de ubicación del navegador.') },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    )
    const onVisibility = () => {
      if (document.visibilityState === 'visible') navigator.geolocation.getCurrentPosition(publishPosition, () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { active = false; navigator.geolocation.clearWatch(watchId); document.removeEventListener('visibilitychange', onVisibility) }
  }, [session?.user?.id, Boolean(profile), locationTermsAccepted, privacy.show_distance, mapVisible, view])

  useEffect(() => {
    if (!session?.user || view !== 'home') return
    let active = true
    const loadStories = async () => {
      const { data, error: storyError } = await supabase.from('stories').select('id,user_id,media_path,media_type,caption,created_at,expires_at,archived_at').is('archived_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true })
      if (!active) return
      if (storyError) { setStoryMessage('No pudimos cargar las historias: ' + storyError.message); return }
      const rows = data || [], userIds = [...new Set(rows.map(row => row.user_id))]
      const names = await loadStoryPeople(userIds)
      if (session.user.id && !names[session.user.id]) names[session.user.id] = profile || null
      const signed = await Promise.all(rows.map(async row => {
        const { data: link } = await supabase.storage.from('zuno-stories').createSignedUrl(row.media_path, 86400)
        return { ...row, url: link?.signedUrl || '', owner: names[row.user_id] || null }
      }))
      if (active) setStories(signed.filter(row => row.url))
      const { data: archived } = await supabase.from('stories').select('id,user_id,media_path,media_type,caption,created_at,expires_at,archived_at').eq('user_id', session.user.id).not('archived_at', 'is', null).order('archived_at', { ascending: false })
      const archivedSigned = await Promise.all((archived || []).map(async row => { const { data: link } = await supabase.storage.from('zuno-stories').createSignedUrl(row.media_path, 86400); return { ...row, url: link?.signedUrl || '', owner: profile } }))
      if (active) setArchivedStories(archivedSigned.filter(row => row.url))
    }
    loadStories()
    const channel = supabase.channel('zuno-stories-' + session.user.id).on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => loadStories()).subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [session?.user?.id, view])

  async function uploadStory(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !session?.user || storyBusy) return
    const allowed = ['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']
    if (!allowed.includes(file.type) || file.size > 50 * 1024 * 1024) { setStoryMessage('Elegí una foto o video compatible de hasta 50 MB.'); return }
    setStoryBusy(true); setStoryMessage('')
    const ext = (file.name.split('.').pop() || (file.type.startsWith('video/') ? 'mp4' : 'jpg')).toLowerCase()
    const path = session.user.id + '/' + crypto.randomUUID() + '.' + ext
    const { error: uploadError } = await supabase.storage.from('zuno-stories').upload(path, file, { contentType: file.type })
    if (uploadError) setStoryMessage('No se pudo subir la historia: ' + uploadError.message)
    else {
      const { error: insertError } = await supabase.from('stories').insert({ user_id: session.user.id, media_path: path, media_type: file.type.startsWith('video/') ? 'video' : 'image', expires_at: new Date(Date.now() + 86400000).toISOString() })
      if (insertError) { await supabase.storage.from('zuno-stories').remove([path]); setStoryMessage('No se pudo publicar: ' + insertError.message) }
      else setStoryMessage('¡Tu historia se publicó! Estará disponible durante 24 horas.')
    }
    setStoryBusy(false)
  }

  useEffect(() => {
    if (!storyViewer || storyViewer.media_type === 'video' || showStoryViewers) return
    if (storyPaused) return
    const timer = window.setTimeout(() => { const index=storyQueue.findIndex(item=>item.id===storyViewer.id); if(index>=0&&index<storyQueue.length-1) openStory(storyQueue[index+1],storyQueue); else {setStoryViewer(null);setStoryQueue([])} }, storyRemainingMs)
    return () => window.clearTimeout(timer)
  }, [storyViewer?.id, storyViewer?.media_type, storyPaused, storyRemainingMs, showStoryViewers, storyQueue])

  async function loadStoryPeople(ids) {
    if (!ids.length) return {}
    const [{ data: profiles }, { data: photos }] = await Promise.all([
      supabase.from('profiles').select('id,display_name,username,avatar_url').in('id', ids),
      supabase.from('profile_photos').select('user_id,storage_path,sort_order').in('user_id', ids).order('sort_order', { ascending: true })
    ])
    const firstPhotoByUser = {}
    for (const photo of photos || []) {
      if (!firstPhotoByUser[photo.user_id]) firstPhotoByUser[photo.user_id] = photo
    }
    const signedPhotos = await Promise.all(Object.entries(firstPhotoByUser).map(async ([userId, photo]) => {
      const { data } = await supabase.storage.from('zuno-profile-photos').createSignedUrl(photo.storage_path, 3600)
      return [userId, data?.signedUrl || '']
    }))
    const photoUrls = Object.fromEntries(signedPhotos)
    return Object.fromEntries((profiles || []).map(person => [person.id, {
      ...person,
      avatar_url: photoUrls[person.id] || person.avatar_url || ''
    }]))
  }

  function navigateStory(direction) {
    if (!storyViewer || !storyQueue.length) return
    const index = storyQueue.findIndex(item => item.id === storyViewer.id)
    const nextIndex = index + direction
    if (nextIndex < 0) return
    if (nextIndex >= storyQueue.length) { setStoryViewer(null); setStoryQueue([]); setShowStoryMenu(false); return }
    openStory(storyQueue[nextIndex], storyQueue)
  }

  async function openStory(story, groupItems = null) {
    const grouped = new Map()
    const activeStories = [...(stories || [])].filter(item=>!item.archived_at)
    for (const item of activeStories) {
      if (!grouped.has(item.user_id)) grouped.set(item.user_id, [])
      grouped.get(item.user_id).push(item)
    }
    const orderedGroups = [...grouped.entries()].sort(([userA],[userB]) => userA===session?.user?.id ? -1 : userB===session?.user?.id ? 1 : 0)
    const queue = orderedGroups.flatMap(([,items])=>items.sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0)))
    const storyIndex = queue.findIndex(item=>item.id===story.id)
    const completeQueue = storyIndex>=0 ? queue : [...(groupItems?.length?[...groupItems]:[story])]
    setStoryQueue(completeQueue)
    setStoryViewer(story)
    setStoryMessage('')
    setStoryRemainingMs(7000); setStoryPaused(false); setShowStoryMenu(false)
    setShowStoryViewers(false)
    setStoryViewers([]); setStoryLikes([]); setStoryLiked(false); setStoryLikeCount(0); setStoryReplyDraft('')
    const [{ data: likes, error: likesError }, { count: likeCount, error: countError }] = await Promise.all([
      supabase.from('story_likes').select('user_id,created_at').eq('story_id', story.id),
      supabase.from('story_likes').select('id', { count: 'exact', head: true }).eq('story_id', story.id)
    ])
    if (likesError) console.warn('No se pudieron cargar los Me gusta:', likesError.message)
    else {
      setStoryLiked((likes || []).some(item => item.user_id === session.user.id))
      if (story.user_id === session.user.id) {
        const ids = (likes || []).map(item => item.user_id)
        const byId = await loadStoryPeople(ids)
        setStoryLikes((likes || []).map(item => ({ ...item, person: byId[item.user_id] || null })))
      }
    }
    if (!countError) setStoryLikeCount(likeCount || 0)
    if (story.user_id !== session?.user?.id) {
      const { error: viewError } = await supabase.from('story_views').insert({ story_id: story.id, viewer_id: session.user.id, viewed_at: new Date().toISOString() })
      if (viewError && viewError.code !== '23505') console.warn('No se pudo registrar la visualización:', viewError.message)
    } else {
      const { data: views, error: viewsError } = await supabase.from('story_views').select('viewer_id,viewed_at').eq('story_id', story.id).order('viewed_at', { ascending: false })
      if (viewsError) setStoryMessage('No se pudieron cargar las visualizaciones: ' + viewsError.message)
      else {
        const ids = [...new Set((views || []).map(row => row.viewer_id))]
        const byId = await loadStoryPeople(ids)
        setStoryViewers((views || []).map(row => ({ ...row, person: byId[row.viewer_id] || null })))
      }
    }
  }

  async function toggleStoryLike() {
    if (!storyViewer || storyViewer.user_id === session?.user?.id || storyBusy) return
    setStoryBusy(true)
    if (storyLiked) {
      const { error } = await supabase.from('story_likes').delete().eq('story_id', storyViewer.id).eq('user_id', session.user.id)
      if (error) setStoryMessage('No se pudo quitar el Me gusta: ' + error.message)
      else { setStoryLiked(false); setStoryLikeCount(value => Math.max(0, value - 1)) }
    } else {
      const { error } = await supabase.from('story_likes').insert({ story_id: storyViewer.id, user_id: session.user.id })
      if (error && error.code !== '23505') setStoryMessage('No se pudo dar Me gusta: ' + error.message)
      else { setStoryLiked(true); setStoryLikeCount(value => value + 1) }
    }
    setStoryBusy(false)
  }

  async function sendStoryReply(event) {
    event.preventDefault()
    const reply = storyReplyDraft.trim()
    if (!reply || !storyViewer || storyViewer.user_id === session?.user?.id || storyReplyBusy) return
    if (!session?.user?.id) {
      setStoryMessage('Iniciá sesión para responder a esta historia.')
      return
    }
    const person = storyViewer.owner
    if (!person?.id) {
      setStoryMessage('No pudimos identificar al dueño de esta historia.')
      return
    }

    setStoryReplyBusy(true)
    setStoryMessage('')
    let mediaPath = null
    try {
      const ids = [session.user.id, person.id].sort()
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .upsert({ member_one: ids[0], member_two: ids[1] }, { onConflict: 'member_one,member_two' })
        .select('id')
        .single()
      if (conversationError) throw new Error('No se pudo abrir el chat: ' + conversationError.message)

      const storyContext = storyViewer.caption ? '“' + storyViewer.caption + '”' : 'Historia'
      const body = '↪️ Respondió a tu historia\\n' + storyContext + '\\n\\n' + reply

      // Adjuntar la historia al mensaje para que la persona pueda identificar qué respondió.
      const response = await fetch(storyViewer.url)
      if (!response.ok) throw new Error('No se pudo cargar el contenido de la historia para adjuntarlo.')
      const blob = await response.blob()
      const mime = storyViewer.media_type === 'video'
        ? (blob.type || 'video/mp4')
        : (blob.type || 'image/jpeg')
      const ext = mime.includes('webm') ? 'webm' : mime.includes('quicktime') ? 'mov' : mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.startsWith('video/') ? 'mp4' : 'jpg'
      mediaPath = conversation.id + '/' + session.user.id + '/' + crypto.randomUUID() + '.' + ext
      const { error: uploadError } = await supabase.storage
        .from('zuno-chat-media')
        .upload(mediaPath, blob, { contentType: mime, upsert: false })
      if (uploadError) throw new Error('No se pudo adjuntar la historia: ' + uploadError.message)

      const { data: sentMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: session.user.id,
          body,
          message_type: storyViewer.media_type === 'video' ? 'video' : 'image',
          media_path: mediaPath
        })
        .select('id,conversation_id,sender_id,body,created_at,message_type,media_path,expires_at')
        .single()
      if (messageError) throw new Error('No se pudo enviar la respuesta: ' + messageError.message)

      mediaPath = null
      setStoryReplyDraft('')
      setStoryPaused(false)
      setStoryMessage('¡Respuesta enviada! Podés seguir viendo historias.')
      if (activeConversation?.id === conversation.id && sentMessage) {
        const [displayMessage] = await resolveChatMedia([sentMessage])
        setChatMessages(current => current.some(item => item.id === sentMessage.id) ? current : [...current, displayMessage])
      }
    } catch (error) {
      if (mediaPath) {
        await supabase.storage.from('zuno-chat-media').remove([mediaPath]).catch(() => {})
      }
      setStoryMessage(error?.message || 'No se pudo enviar la respuesta. Intentá nuevamente.')
    } finally {
      setStoryReplyBusy(false)
    }
  }

  async function archiveStory(story) {
    if (story.user_id !== session?.user?.id || storyBusy) return
    setStoryBusy(true)
    const archivedAt = new Date().toISOString()
    const { error: archiveError } = await supabase.from('stories').update({ archived_at: archivedAt }).eq('id', story.id).eq('user_id', session.user.id)
    if (!archiveError) {
      const archived = { ...story, archived_at: archivedAt }
      setStories(current => current.filter(item => item.id !== story.id))
      setArchivedStories(current => [archived, ...current.filter(item => item.id !== story.id)])
      setStoryViewer(null)
      setShowStoryMenu(false)
      setShowStoryArchive(true)
      setStoryMessage('Historia guardada en tu archivo.')
    } else setStoryMessage('No se pudo archivar la historia: ' + archiveError.message)
    setStoryBusy(false)
  }

  async function unarchiveStory(story) {
    if (story.user_id !== session?.user?.id || storyBusy) return
    if (!story.expires_at || new Date(story.expires_at).getTime() <= Date.now()) {
      setStoryMessage('Esta historia ya cumplió sus 24 horas y no se puede volver a publicar.')
      return
    }
    setStoryBusy(true)
    const { error: restoreError } = await supabase.from('stories').update({ archived_at: null }).eq('id', story.id).eq('user_id', session.user.id).gt('expires_at', new Date().toISOString())
    if (!restoreError) {
      setArchivedStories(current => current.filter(item => item.id !== story.id))
      setStories(current => [story, ...current.filter(item => item.id !== story.id)].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      setStoryViewer(null)
      setShowStoryArchive(false)
      setStoryMessage('¡Historia restaurada! Ya aparece nuevamente en tu historia.')
    } else setStoryMessage('No se pudo desarchivar la historia: ' + restoreError.message)
    setStoryBusy(false)
  }

  async function deleteStory(story) {
    if (story.user_id !== session?.user?.id || storyBusy) return
    setStoryBusy(true)
    const { error: deleteError } = await supabase.from('stories').delete().eq('id', story.id).eq('user_id', session.user.id)
    if (!deleteError) { await supabase.storage.from('zuno-stories').remove([story.media_path]); setStories(current => current.filter(item => item.id !== story.id)); setStoryViewer(null) }
    else setStoryMessage('No se pudo eliminar la historia: ' + deleteError.message)
    setStoryBusy(false)
  }

  useEffect(() => {
    if (!session?.user) return
    const unlockNotificationAudio = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (!AudioCtx) return
        const ctx = mapRequestSoundRef.current || new AudioCtx()
        mapRequestSoundRef.current = ctx
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      } catch (error) {
        console.debug('Audio de notificaciones no disponible', error)
      }
    }
    document.addEventListener('pointerdown', unlockNotificationAudio, { once: true })
    document.addEventListener('keydown', unlockNotificationAudio, { once: true })
    return () => {
      document.removeEventListener('pointerdown', unlockNotificationAudio)
      document.removeEventListener('keydown', unlockNotificationAudio)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user) { setNotifications([]); setNotificationActors({}); return }
    let active = true
    const loadNotifications = async () => {
      const { data, error: notificationError } = await supabase.from('notifications')
        .select('id,recipient_id,actor_id,notification_type,entity_id,title,body,created_at,read_at,metadata')
        .eq('recipient_id', session.user.id).in('notification_type',['favorite','tap','album_access_request','album_access_decision','map_meetup_request','report_response','admin_announcement']).order('created_at', { ascending: false }).limit(100)
      if (!active) return
      if (notificationError) { setPeopleError('No pudimos cargar las notificaciones. ' + notificationError.message); return }
      let hydratedNotifications = data || []
      const albumRequestIds = [...new Set(hydratedNotifications.filter(item => item.notification_type === 'album_access_request' && item.entity_id).map(item => item.entity_id))]
      if (albumRequestIds.length) {
        const { data: albumRows, error: albumStatusError } = await supabase.from('private_album_access_requests')
          .select('id,status').eq('owner_id', session.user.id).in('id', albumRequestIds)
        if (!albumStatusError) {
          const albumStatuses = Object.fromEntries((albumRows || []).map(row => [row.id, row.status]))
          hydratedNotifications = hydratedNotifications.map(item => item.notification_type === 'album_access_request'
            ? { ...item, albumDecisionStatus: albumStatuses[item.entity_id] || 'missing' }
            : item)
        }
      }
      setNotifications(hydratedNotifications)
      const actorIds = [...new Set(hydratedNotifications.map(item => item.actor_id).filter(Boolean))]
      if (actorIds.length) {
        const { data: actors } = await supabase.from('profiles')
          .select('id,display_name,username,avatar_url').in('id', actorIds)
        if (active) setNotificationActors(Object.fromEntries((actors || []).map(actor => [actor.id, actor])))
      }
    }
    loadNotifications()
    const channel = supabase.channel('zuno-notifications-' + session.user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + session.user.id }, async payload => {
        const item = payload.new
        if (!['favorite','tap','album_access_request','album_access_decision','map_meetup_request','report_response','admin_announcement'].includes(item.notification_type)) return
        const peerId = activeConversation?.person?.id
        if (item.notification_type === 'message' && view === 'chat' && peerId === item.actor_id) return
        setNotifications(current => current.some(existing => existing.id === item.id) ? current : [item, ...current].slice(0, 100))
        if (['map_meetup_request','album_access_request','album_access_decision'].includes(item.notification_type)) {
          try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext
            if (AudioCtx) {
              const ctx = mapRequestSoundRef.current || new AudioCtx()
              mapRequestSoundRef.current = ctx
              if (ctx.state === 'suspended') await ctx.resume()
              const oscillator = ctx.createOscillator(), gain = ctx.createGain()
              oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, ctx.currentTime)
              oscillator.frequency.setValueAtTime(1175, ctx.currentTime + 0.11)
              gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.34)
              oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.36)
            }
          } catch (soundError) { console.debug('Sonido de notificación no disponible', soundError) }
        }
        if (item.actor_id) {
          const { data: actor } = await supabase.from('profiles').select('id,display_name,username,avatar_url').eq('id', item.actor_id).maybeSingle()
          if (actor) setNotificationActors(current => ({ ...current, [actor.id]: actor }))
        }
        
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + session.user.id }, payload => {
        setNotifications(current => current.map(item => item.id === payload.new.id ? payload.new : item))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, payload => {
        setNotifications(current => current.filter(item => item.id !== payload.old.id))
      }).subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [session?.user?.id, activeConversation?.person?.id, view])

  useEffect(() => {
    if (!session?.user?.id || view !== 'notifications') return
    const requestIds = notifications.filter(item => item.notification_type === 'map_meetup_request').map(item => item.entity_id).filter(Boolean)
    if (!requestIds.length) return
    let active = true
    supabase.from('map_meetup_requests').select('*').in('id', requestIds).then(({data,error}) => {
      if (active && !error) setMapInvites(current => [...current.filter(row => !requestIds.includes(row.id)), ...(data || [])])
    })
    return () => { active = false }
  }, [view, session?.user?.id, notifications])

  async function markNotificationRead(notificationId) {
    if (!session?.user || !notificationId) return false
    const now = new Date().toISOString()
    const { error } = await supabase.from('notifications').update({ read_at: now }).eq('id', notificationId).eq('recipient_id', session.user.id)
    if (error) {
      setPeopleError('No pudimos marcar la notificación como leída. ' + error.message)
      return false
    }
    setNotifications(current => current.map(item => item.id === notificationId ? { ...item, read_at: item.read_at || now } : item))
    return true
  }

  async function deleteNotification(notificationId) {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId).eq('recipient_id', session.user.id)
    if (!error) setNotifications(current => current.filter(item => item.id !== notificationId))
    else setPeopleError('No pudimos eliminar la notificación. ' + error.message)
  }

  async function openNotification(item) {
    const actor = notificationActors[item.actor_id]
    if (item.notification_type === 'connection_request') {
      setView('connections')
      if (!item.read_at) await markNotificationRead(item.id)
      return
    }
    if (item.notification_type === 'message' && actor) {
      await markNotificationRead(item.id)
      await openChat(actor)
      return
    }
    await markNotificationRead(item.id)
  }

  async function decidePrivateAlbumRequest(item, status) {
    if (!session?.user || !item?.entity_id || notificationBusy) return
    setNotificationBusy(item.id)
    setPeopleError('')
    try {
      const { data: result, error } = await supabase.rpc('zuno_respond_private_album_request', {
        p_request_id: item.entity_id,
        p_status: status
      })
      if (error) {
        setPeopleError('No pudimos responder la solicitud del álbum. ' + error.message)
        return
      }
      const finalStatus = result?.status || status
      setNotifications(current => current.map(row => row.id === item.id ? { ...row, albumDecisionStatus: finalStatus, read_at: row.read_at || new Date().toISOString() } : row))
      await markNotificationRead(item.id)
    } catch (error) {
      setPeopleError('Ocurrió un error al responder la solicitud. ' + (error?.message || 'Intentá nuevamente.'))
    } finally {
      setNotificationBusy('')
    }
  }

  useEffect(() => {
    if (!session?.user) { setFavoriteIds([]); setActiveTapIds([]); return }
    let active = true
    Promise.all([
      supabase.from('profile_favorites').select('favorite_user_id').eq('user_id', session.user.id),
      supabase.from('profile_taps').select('tapped_user_id,created_at').eq('user_id', session.user.id).gte('created_at', new Date(Date.now()-86400000).toISOString())
    ]).then(([favoritesResult,tapsResult]) => {
      if (!active) return
      if (favoritesResult.error) setPeopleError('No pudimos cargar tus favoritos. ' + favoritesResult.error.message)
      else setFavoriteIds((favoritesResult.data || []).map(row => row.favorite_user_id))
      if (!tapsResult.error) setActiveTapIds((tapsResult.data || []).map(row => row.tapped_user_id))
    })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!session?.user) return
    let active = true
    supabase.from('zuno_bot_taps').select('bot_id,created_at').eq('user_id', session.user.id).gte('created_at', new Date(Date.now() - 86400000).toISOString())
      .then(({ data, error }) => {
        if (!active || error) return
        setActiveTapIds(current => [...new Set([...current, ...(data || []).map(row => 'bot:' + row.bot_id)])])
      })
    return () => { active = false }
  }, [session])

  useEffect(() => {
    if (!session?.user || view !== 'home') return
    let startY = 0
    let pulling = false
    const onStart = event => {
      if (window.scrollY > 0 || event.touches.length !== 1 || showDiscoveryFilters) { pulling = false; return }
      startY = event.touches[0].clientY
      pulling = startY < 90
    }
    const onMove = event => {
      if (!pulling || event.touches.length !== 1) return
      const distance = event.touches[0].clientY - startY
      if (distance > 12 && window.scrollY <= 0) event.preventDefault()
    }
    const onEnd = event => {
      if (!pulling) return
      const endY = event.changedTouches?.[0]?.clientY ?? startY
      const distance = endY - startY
      if (distance >= 85 && window.scrollY <= 0 && !peopleLoading) setPeopleRefresh(value => value + 1)
      pulling = false
      startY = 0
    }
    window.addEventListener('touchstart', onStart, {passive:true})
    window.addEventListener('touchmove', onMove, {passive:false})
    window.addEventListener('touchend', onEnd, {passive:true})
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [session?.user?.id, view, peopleLoading, showDiscoveryFilters])

  useEffect(() => {
    if (!session?.user || !['home', 'favorites', 'connections'].includes(view)) return
    let active = true
    setPeopleLoading(true); setPeopleError('')
    const loadDiscoveryProfiles = async () => {
      let discoveryIds = null
      let distanceByUser = {}
      let onlineRecentlyByUser = {}
      let activityStatusByUser = {}
      const hasServerFilters = true
      let ownMapLocation = null
      let canShowBotDistance = false
      if (hasServerFilters) {
        if (discoveryDistanceKm) {
          const [{data:myLocation,error:locationError},{data:myPrivacy,error:privacyError}]=await Promise.all([supabase.from('user_map_locations').select('latitude,longitude,updated_at').eq('user_id',session.user.id).maybeSingle(),supabase.from('profiles').select('show_distance,location_terms_accepted').eq('id',session.user.id).maybeSingle()])
          if (locationError || privacyError || !myPrivacy?.show_distance || !myPrivacy?.location_terms_accepted || !myLocation?.updated_at || new Date(myLocation.updated_at).getTime()<Date.now()-86400000) {
            if (!active) return
            setPeopleError('Para filtrar por distancia, activá “Mostrar distancia en perfiles” y actualizá tu ubicación.')
            setPeople([]);setPeopleLoading(false);return
          }
          ownMapLocation = myLocation
          canShowBotDistance = true
        } else {
          const [{data:myLocation},{data:myPrivacy}]=await Promise.all([supabase.from('user_map_locations').select('latitude,longitude,updated_at').eq('user_id',session.user.id).maybeSingle(),supabase.from('profiles').select('show_distance,location_terms_accepted').eq('id',session.user.id).maybeSingle()])
          if (myPrivacy?.show_distance && myPrivacy?.location_terms_accepted && myLocation?.updated_at && new Date(myLocation.updated_at).getTime()>=Date.now()-86400000) { ownMapLocation=myLocation; canShowBotDistance=true }
        }
        const minAge=discoveryAgeMin?Number(discoveryAgeMin):null
        const maxAge=discoveryAgeMax?Number(discoveryAgeMax):null
        if ((minAge!==null && (minAge<18 || minAge>99)) || (maxAge!==null && (maxAge<18 || maxAge>99)) || (minAge!==null && maxAge!==null && minAge>maxAge)) {
          if (!active) return
          setPeopleError('Revisá el rango de edad. Debe estar entre 18 y 99 años, con la edad mínima por debajo de la máxima.')
          setPeople([]);setPeopleLoading(false);return
        }
        const {data:matches,error:filterError}=await supabase.rpc('get_discovery_profile_ids',{
          p_age_min:minAge,p_age_max:maxAge,p_distance_km:discoveryDistanceKm?Number(discoveryDistanceKm):null,p_online_recently:discoveryOnlineRecently
        })
        if (!active) return
        if (filterError) {setPeopleError('No pudimos aplicar los filtros avanzados. '+filterError.message);setPeople([]);setPeopleLoading(false);return}
        discoveryIds=(matches||[]).map(row=>row.user_id)
        distanceByUser=(matches||[]).reduce((acc,row)=>{acc[row.user_id]=row.approximate_distance_km;return acc},{})
        onlineRecentlyByUser=(matches||[]).reduce((acc,row)=>{acc[row.user_id]=row.online_recently===true;return acc},{})
        activityStatusByUser=(matches||[]).reduce((acc,row)=>{acc[row.user_id]=row.activity_status || null;return acc},{})
        if (!discoveryIds.length) discoveryIds = []
      }
      let profileQuery=supabase.from('profiles').select('id, display_name, username, bio, avatar_url, zuno_verified, city, region, interests, looking_for, show_location, show_online, show_distance, created_at').neq('id', session.user.id).order('created_at', { ascending: false }).limit(100)
      if (discoveryIds) profileQuery=profileQuery.in('id',discoveryIds)
      const { data, error: listError } = await profileQuery
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
        const mappedProfiles = profiles.map(person => ({
          ...person,
          approximateDistanceKm:distanceByUser[person.id] ?? null,
          onlineRecently:onlineRecentlyByUser[person.id]===true,
          activityStatus:person.show_online ? activityStatusByUser[person.id] : null,
          photos: photosByUser[person.id] || [],
          visibleCity: person.show_location ? [person.city, person.region].filter(Boolean).join(', ') : ''
        }))
        let botProfiles = []
        if (view === 'home' || view === 'favorites') {
          const { data: bots, error: botsError } = await supabase.from('zuno_bots')
            .select('id,slug,display_name,age,gender,bot_role,bio,interests,looking_for,avatar_url,latitude,longitude,country,city,neighborhood,is_active,sort_order,created_at')
            .eq('is_active', true).order('sort_order', { ascending: true })
          if (!active) return
          if (botsError) console.warn('No se pudieron cargar los bots de ZUNO:', botsError.message)
          botProfiles = (bots || []).map(bot => {
            const approximateDistanceKm = canShowBotDistance && ownMapLocation && bot.latitude != null && bot.longitude != null ? calculateDistanceKm(ownMapLocation.latitude,ownMapLocation.longitude,bot.latitude,bot.longitude) : null
            return ({
            ...bot,
            id: 'bot:' + bot.id,
            approximateDistanceKm,
            show_distance: approximateDistanceKm !== null,
            username: bot.slug,
            isBot: true,
            role: bot.bot_role,
            photos: bot.avatar_url ? [{ url: bot.avatar_url }] : [],
            visibleCity: [bot.neighborhood,bot.city].filter(Boolean).join(', '),
            show_location: false,
            show_online: false,
            zuno_verified: false,
            created_at: bot.created_at
          })}).filter(bot => {
            if (discoveryAgeMin && Number(bot.age) < Number(discoveryAgeMin)) return false
            if (discoveryAgeMax && Number(bot.age) > Number(discoveryAgeMax)) return false
            if (discoveryDistanceKm && (bot.approximateDistanceKm === null || bot.approximateDistanceKm > Number(discoveryDistanceKm))) return false
            if (discoveryOnlineRecently) return false
            return true
          })
        }
        setPeople([...mappedProfiles, ...botProfiles.filter(bot => !botBlockedIds.includes(bot.id))])
        setPeopleLoading(false)
    }
    loadDiscoveryProfiles()
    return () => { active = false }
  }, [session, view, peopleRefresh, discoveryAgeMin, discoveryAgeMax, discoveryDistanceKm, discoveryOnlineRecently, botBlockedIds])

  useEffect(() => {
    if (!session?.user) { setBlockedUsers([]); return }
    let active = true
    async function loadBlockedPeople() {
      const [usersResult, botsResult] = await Promise.all([
        supabase.from('user_blocks').select('id,blocked_id,created_at').eq('blocker_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('zuno_bot_blocks').select('id,bot_id,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false })
      ])
      if (!active) return
      if (usersResult.error) { setPeopleError('No pudimos cargar los bloqueos. ' + usersResult.error.message); return }
      if (botsResult.error) { setPeopleError('No pudimos cargar los bloqueos. ' + botsResult.error.message); return }
      const userRows = usersResult.data || []
      const botRows = botsResult.data || []
      const ids = userRows.map(row => row.blocked_id)
      const botIds = botRows.map(row => row.bot_id)
      const [profilesResult, botsDataResult] = await Promise.all([
        ids.length ? supabase.from('profiles').select('id,display_name,username').in('id', ids) : Promise.resolve({ data: [] }),
        botIds.length ? supabase.from('zuno_bots').select('id,display_name,slug').in('id', botIds) : Promise.resolve({ data: [] })
      ])
      if (!active) return
      const names = Object.fromEntries((profilesResult.data || []).map(item => [item.id, item]))
      const botNames = Object.fromEntries((botsDataResult.data || []).map(item => [item.id, item]))
      const combined = [
        ...userRows.map(row => ({ ...row, blocked_id: row.blocked_id, person: names[row.blocked_id] || null })),
        ...botRows.map(row => ({ ...row, id: 'bot-block:' + row.id, blocked_id: 'bot:' + row.bot_id, isBot: true, person: botNames[row.bot_id] ? { display_name: botNames[row.bot_id].display_name, username: botNames[row.bot_id].slug } : null }))
      ].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      setBlockedUsers(combined)
    }
    loadBlockedPeople()
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
    const isBot = String(blockedId).startsWith('bot:')
    const result = isBot
      ? await supabase.from('zuno_bot_blocks').delete().eq('user_id', session.user.id).eq('bot_id', String(blockedId).slice(4))
      : await supabase.from('user_blocks').delete().eq('blocker_id', session.user.id).eq('blocked_id', blockedId)
    setBlockBusy('')
    if (result.error) { setPeopleError('No pudimos desbloquear esta cuenta. ' + result.error.message); return }
    setBlockedUsers(current => current.filter(item => item.blocked_id !== blockedId))
    if (isBot) setBotBlockedIds(current => current.filter(id => id !== blockedId))
    setPeopleRefresh(value => value + 1)
    setPeopleError('Cuenta desbloqueada.')
  }

  async function submitUserReport(event) {
    event.preventDefault()
    if (!session?.user || !reportTarget || reportBusy) return
    setReportBusy(true); setPeopleError('')
    const reportPayload = {
      reporter_id: session.user.id,
      reported_user_id: reportTarget.id,
      reason: reportReason,
      details: reportDetails.trim() || null,
      message_id: reportTarget.messageId || null,
      conversation_id: reportTarget.conversationId || null,
      reported_content_type: reportTarget.contentType || 'profile'
    }
    const { error: reportError } = await supabase
      .from('user_reports')
      .insert(reportPayload)
    setReportBusy(false)
    if (reportError) {
      const diagnostic = [reportError.message, reportError.code && 'Código: ' + reportError.code, reportError.details, reportError.hint].filter(Boolean).join(' · ')
      setPeopleError('No pudimos enviar la denuncia. ' + diagnostic)
      return
    }
    if (reportTarget.messageId) setReportedMessageIds(current => current.includes(reportTarget.messageId) ? current : [...current, reportTarget.messageId])
    setReportTarget(null); setReportDetails('')
    setPeopleError('Denuncia enviada de forma privada. Gracias por ayudar a mantener ZUNO seguro.')
  }

  const blockedIds = new Set(blockedUsers.map(item => item.blocked_id))
  const discoveryPeople = people.filter(person => {
    if (blockedIds.has(person.id) || hiddenProfileIds.includes(person.id)) return false
    const term = discoverySearch.trim().toLocaleLowerCase()
    const searchable = [person.display_name, person.username, person.bio, person.visibleCity, ...(person.interests || []), ...(person.looking_for || [])].filter(Boolean).join(' ').toLocaleLowerCase()
    if (term && !searchable.includes(term)) return false
    if (discoveryCity.trim() && !(person.visibleCity || '').toLocaleLowerCase().includes(discoveryCity.trim().toLocaleLowerCase())) return false
    if (discoveryInterest && !(person.interests || []).includes(discoveryInterest)) return false
    if (discoveryLookingFor && !(person.looking_for || []).includes(discoveryLookingFor)) return false
    if (discoveryVerifiedOnly && !person.zuno_verified) return false
    if (discoveryWithPhotos && !(person.photos || []).length) return false
    if (person.isBot && ((discoveryAgeMin && Number(person.age) < Number(discoveryAgeMin)) || (discoveryAgeMax && Number(person.age) > Number(discoveryAgeMax)) || discoveryOnlineRecently || (discoveryDistanceKm && (person.approximateDistanceKm == null || person.approximateDistanceKm > Number(discoveryDistanceKm))))) return false
    return true
  }).sort((a,b) => discoverySort === 'name' ? (a.display_name || '').localeCompare(b.display_name || '') : discoverySort === 'oldest' ? new Date(a.created_at || 0)-new Date(b.created_at || 0) : new Date(b.created_at || 0)-new Date(a.created_at || 0))
  const discoveryFiltersActive = Boolean(discoverySearch || discoveryCity || discoveryInterest || discoveryLookingFor || discoveryVerifiedOnly || discoveryWithPhotos || discoverySort !== 'recent' || discoveryAgeMin || discoveryAgeMax || discoveryDistanceKm || discoveryOnlineRecently)

  async function sendProfileQuickMessage(event) {
    event.preventDefault()
    const body=profileMessageDraft.trim(), person=selectedProfile
    if(!body||!person?.id||!session?.user||profileMessageBusy)return
    if(blockedUsers.some(item=>item.blocked_id===person.id)){setPeopleError('Esta cuenta está bloqueada. Desbloqueala antes de iniciar un chat.');return}
    setProfileMessageBusy(true);setPeopleError('')
    const ids=[session.user.id,person.id].sort()
    const {data:conversation,error:conversationError}=await supabase.from('conversations').upsert({member_one:ids[0],member_two:ids[1]},{onConflict:'member_one,member_two'}).select('id').single()
    if(conversationError){setPeopleError('No pudimos abrir el chat. '+conversationError.message);setProfileMessageBusy(false);return}
    const {error:sendError}=await supabase.from('messages').insert({conversation_id:conversation.id,sender_id:session.user.id,body:'Ha respondido al perfil:\n'+body})
    setProfileMessageBusy(false)
    if(sendError){setPeopleError('No pudimos enviar el mensaje. '+sendError.message);return}
    setProfileMessageDraft('');setPeopleError('¡Mensaje enviado!')
  }

  async function sendProfileTap(personId) {
    if(!session?.user||favoriteBusy||activeTapIds.includes(personId))return
    setFavoriteBusy(personId);setPeopleError('')
    const {error:tapError}=await supabase.from('profile_taps').insert({user_id:session.user.id,tapped_user_id:personId})
    setFavoriteBusy('')
    if(tapError){setPeopleError(tapError.code==='23505'||tapError.code==='P0001'?'Ya le enviaste un tap a esta persona. Podés volver a hacerlo dentro de 24 horas.':'No pudimos enviar el tap. '+tapError.message);return}
    setActiveTapIds(current=>[...current,personId])
    setPeopleError('¡Tap enviado! 🔥')
  }

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
      if (!['image', 'audio', 'video'].includes(item.message_type) || !item.media_path) return item
      const { data, error } = await supabase.storage.from('zuno-chat-media').createSignedUrl(item.media_path, 3600)
      return { ...item, media_url: data?.signedUrl || '', media_error: error?.message || (!data?.signedUrl ? 'Supabase no devolvió un enlace firmado.' : '') }
    }))
  }

  async function purgeExpiredMessages(conversationId) {
    if (!conversationId) return
    // Los mensajes vencidos se archivan en el servidor durante 90 días.
    // No borrar sus archivos desde el cliente: la limpieza definitiva es tarea del proceso de retención.
    const { error } = await supabase.rpc('purge_expired_chat_messages', { p_conversation_id: conversationId })
    if (error) console.error('No se pudieron archivar mensajes vencidos:', error.message)
  }

  async function changeEphemeralDuration(minutes) {
    if (!activeConversation || ephemeralBusy) return
    setEphemeralBusy(true); setPeopleError('')
    const { error } = await supabase.rpc('set_conversation_ephemeral_duration', { p_conversation_id: activeConversation.id, p_duration_minutes: minutes })
    if (error) setPeopleError('No pudimos cambiar el modo efímero. ' + error.message)
    else setActiveConversation(current => current ? { ...current, ephemeral_duration_minutes: minutes } : current)
    setEphemeralBusy(false); setShowEphemeralMenu(false)
  }

  useEffect(() => {
    if (!session?.user) { setBotFavoriteIds([]); setBotBlockedIds([]); return }
    let active = true
    Promise.all([
      supabase.from('zuno_bot_favorites').select('bot_id').eq('user_id', session.user.id),
      supabase.from('zuno_bot_blocks').select('bot_id').eq('user_id', session.user.id)
    ]).then(([favorites, blocks]) => {
      if (!active) return
      if (favorites.error) console.warn('No se pudieron cargar favoritos de bots:', favorites.error.message)
      if (blocks.error) console.warn('No se pudieron cargar bloqueos de bots:', blocks.error.message)
      setBotFavoriteIds((favorites.data || []).map(row => 'bot:' + row.bot_id))
      setBotBlockedIds((blocks.data || []).map(row => 'bot:' + row.bot_id))
    })
    return () => { active = false }
  }, [session])

  async function sendBotTap(bot) {
    if (!session?.user || !bot?.id?.startsWith('bot:') || favoriteBusy || activeTapIds.includes(bot.id)) return
    const botId = bot.id.slice(4)
    setFavoriteBusy(bot.id); setPeopleError('')
    const { error } = await supabase.from('zuno_bot_taps').insert({ user_id: session.user.id, bot_id: botId })
    setFavoriteBusy('')
    if (error) { setPeopleError(error.code === '23505' ? 'Ya le enviaste un tap a este perfil.' : 'No pudimos enviar el tap. ' + error.message); return }
    setActiveTapIds(current => [...current, bot.id])
    setPeopleError('¡Tap enviado! 🔥')
  }

  async function toggleBotFavorite(bot) {
    if (!session?.user || !bot?.id?.startsWith('bot:') || favoriteBusy) return
    const botId = bot.id.slice(4)
    const exists = botFavoriteIds.includes(bot.id)
    setFavoriteBusy(bot.id)
    const result = exists
      ? await supabase.from('zuno_bot_favorites').delete().eq('user_id', session.user.id).eq('bot_id', botId)
      : await supabase.from('zuno_bot_favorites').insert({ user_id: session.user.id, bot_id: botId })
    setFavoriteBusy('')
    if (result.error) { setPeopleError('No pudimos actualizar el favorito. ' + result.error.message); return }
    setBotFavoriteIds(current => exists ? current.filter(id => id !== bot.id) : [...current, bot.id])
  }

  async function blockBot(bot) {
    if (!session?.user || !bot?.id?.startsWith('bot:') || blockBusy) return
    const botId = bot.id.slice(4)
    setBlockBusy(bot.id)
    const { error } = await supabase.from('zuno_bot_blocks').insert({ user_id: session.user.id, bot_id: botId })
    setBlockBusy('')
    if (error && error.code !== '23505') { setPeopleError('No pudimos bloquear este bot. ' + error.message); return }
    setBotBlockedIds(current => current.includes(bot.id) ? current : [...current, bot.id])
    setPeople(current => current.filter(item => item.id !== bot.id))
    setSelectedProfile(null)
    setPeopleRefresh(value => value + 1)
    setView('home')
    setPeopleError('Cuenta bloqueada. Ya no aparecerá entre tus perfiles.')
  }

  function botUnavailableAction(label) {
    setPeopleError(label + ' para personajes virtuales todavía no está disponible.')
  }

  async function openBotChat(bot) {
    if(!session?.user || !bot?.id?.startsWith('bot:')) return
    setChatBusy(true);setPeopleError('');setBotChatMessages([]);setBotChatDraft('')
    const botId=bot.id.slice(4)
    const {data:conversation,error}=await supabase.from('zuno_bot_conversations')
      .upsert({user_id:session.user.id,bot_id:botId},{onConflict:'user_id,bot_id'}).select('id,bot_id').single()
    if(error){setChatBusy(false);setPeopleError('No pudimos abrir el chat del bot. '+error.message);return}
    const {data:messages,error:messagesError}=await supabase.from('zuno_bot_messages')
      .select('id,sender_type,body,created_at').eq('conversation_id',conversation.id).order('created_at')
    if(messagesError){setChatBusy(false);setPeopleError('No pudimos cargar el chat. '+messagesError.message);return}
    setActiveBotConversation({...conversation,bot});setBotChatMessages(messages||[]);setChatBusy(false);setView('bot-chat')
  }
  async function sendBotChatMessage(event) {
    event?.preventDefault()
    if(!activeBotConversation || !botChatDraft.trim() || chatBusy) return
    const body=botChatDraft.trim()
    setChatBusy(true)
    const {data,error}=await supabase.from('zuno_bot_messages').insert({
      conversation_id:activeBotConversation.id,sender_type:'user',body
    }).select('id,sender_type,body,created_at').single()
    if(error){setPeopleError('No pudimos enviar el mensaje. '+error.message)}
    else {setBotChatMessages(current=>[...current,data]);setBotChatDraft('')}
    setChatBusy(false)
  }

  async function openChat(person) {
    if (!session?.user || !person?.id) return
    if (blockedUsers.some(item => item.blocked_id === person.id)) { setPeopleError('Esta cuenta está bloqueada. Desbloqueala antes de iniciar un chat.'); return }
    const ids = [session.user.id, person.id].sort()
    setOtherUserTyping(false)
    setChatBusy(true); setPeopleError(''); setChatMessages([]); setMessageReceipts({}); setChatGallery([])
    setActiveConversation({ id: null, member_one: ids[0], member_two: ids[1], ephemeral_duration_minutes: 0, person })
    setChatDraft(''); setShowChatGallery(false); setActiveMessageMenu(null); setShowEphemeralMenu(false); setView('chat')
    const { data: conversation, error: conversationError } = await supabase.from('conversations').upsert({ member_one: ids[0], member_two: ids[1] }, { onConflict: 'member_one,member_two' }).select('id,member_one,member_two,ephemeral_duration_minutes').single()
    if (conversationError) { setChatBusy(false); setPeopleError('No pudimos abrir el chat. ' + conversationError.message); return }
    setActiveConversation({ ...conversation, ephemeral_duration_minutes: conversation.ephemeral_duration_minutes || 0, person })
    purgeExpiredMessages(conversation.id).catch(error => console.warn('No se pudieron limpiar mensajes vencidos:', error))
    const [{ data: messages, error: messagesError }, { data: hiddenRows, error: hiddenError }, { data: activeLocations }] = await Promise.all([
      supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,message_type,media_path,latitude,longitude,location_expires_at,expires_at').eq('conversation_id', conversation.id).or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()).order('created_at'),
      supabase.from('message_hidden_for').select('message_id').eq('user_id', session.user.id),
      supabase.from('live_locations').select('id,conversation_id,sender_id,latitude,longitude,expires_at,ended_at,updated_at').eq('conversation_id', conversation.id).is('ended_at', null).gt('expires_at', new Date().toISOString())
    ])
    if (messagesError || hiddenError) { setChatBusy(false); setPeopleError(messagesError ? 'No pudimos cargar los mensajes. ' + messagesError.message : 'No pudimos cargar tus mensajes ocultos. ' + hiddenError.message); return }
    const hiddenIds = (hiddenRows || []).map(row => row.message_id)
    const displayMessages = await resolveChatMedia((messages || []).filter(item => !hiddenIds.includes(item.id)))
    setChatMessages(displayMessages); setLiveLocations(activeLocations || []); setLiveSharing((activeLocations || []).find(item => item.sender_id === session.user.id) || null); setChatBusy(false)
    const incomingMessages = (messages || []).filter(item => item.sender_id !== session.user.id)
    const sentIds = (messages || []).filter(item => item.sender_id === session.user.id).map(item => item.id)
    const backgroundTasks = [markConversationRead(conversation.id)]
    if (incomingMessages.length) {
      const now = new Date().toISOString()
      backgroundTasks.push(supabase.from('message_receipts').upsert(incomingMessages.map(item => ({ message_id: item.id, user_id: session.user.id, delivered_at: now, read_at: now })), { onConflict: 'message_id,user_id' }))
    }
    if (sentIds.length) backgroundTasks.push(supabase.from('message_receipts').select('message_id,user_id,delivered_at,read_at').in('message_id', sentIds).neq('user_id', session.user.id).then(({data}) => setMessageReceipts(Object.fromEntries((data || []).map(item => [item.message_id, item])))))
    backgroundTasks.push((async () => {
      const { data: priorImages } = await supabase.from('messages').select('id,media_path,created_at,expires_at').eq('sender_id', session.user.id).eq('message_type', 'image').not('media_path', 'is', null).or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()).order('created_at', { ascending: false }).limit(30)
      const gallery = await Promise.all((priorImages || []).map(async item => { const { data: signed } = await supabase.storage.from('zuno-chat-media').createSignedUrl(item.media_path, 3600); return { ...item, url: signed?.signedUrl || '' } }))
      setChatGallery(gallery.filter(item => item.url))
    })())
    Promise.allSettled(backgroundTasks)
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


  async function resolveBotLocationAddress(point) {
    try {
      const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.latitude}&lon=${point.longitude}&zoom=18&addressdetails=1`)
      if(!response.ok) return
      const data=await response.json()
      const address=data.address||{}
      const street=[address.road||address.pedestrian||address.residential||address.footway,address.house_number].filter(Boolean).join(' ')
      const area=[address.neighbourhood||address.suburb||address.quarter,address.city||address.town||address.village].filter(Boolean).join(', ')
      const label=[street,area].filter(Boolean).join(' · ')||data.display_name||'Dirección aproximada no disponible'
      setBotLocationDraft(current=>current&&current.latitude===point.latitude&&current.longitude===point.longitude?{...current,location_label:label}:current)
    } catch(error) { console.warn('No se pudo obtener la dirección del bot',error) }
  }

  useEffect(() => {
    if (!botLocationPickerOpen || !botLocationMapContainerRef.current) return
    const initial = botLocationDraft || (adminBotEditor?.latitude != null && adminBotEditor?.longitude != null ? {latitude:Number(adminBotEditor.latitude),longitude:Number(adminBotEditor.longitude)} : null)
    const center = initial ? [initial.latitude,initial.longitude] : [-34.9011,-56.1645]
    const map = L.map(botLocationMapContainerRef.current,{zoomControl:true}).setView(center,initial?15:12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map)
    botLocationMapRef.current = map
    const pinIcon = L.divIcon({className:'bot-location-pin-icon',html:'<span></span>',iconSize:[28,36],iconAnchor:[14,34]})
    if (initial) {
      botLocationMarkerRef.current = L.marker(center,{icon:pinIcon,draggable:true}).addTo(map)
      botLocationMarkerRef.current.on('dragend',async event=>{
        const point=event.target.getLatLng()
        const coords={latitude:Number(point.lat.toFixed(6)),longitude:Number(point.lng.toFixed(6))}
        setBotLocationDraft(coords)
        await resolveBotLocationAddress(coords)
      })
    }
    map.on('click',event=>{
      const point={latitude:Number(event.latlng.lat.toFixed(6)),longitude:Number(event.latlng.lng.toFixed(6))}
      if(!botLocationMarkerRef.current) {
        botLocationMarkerRef.current=L.marker([point.latitude,point.longitude],{icon:pinIcon,draggable:true}).addTo(map)
        botLocationMarkerRef.current.on('dragend',async dragEvent=>{
          const moved=dragEvent.target.getLatLng()
          const coords={latitude:Number(moved.lat.toFixed(6)),longitude:Number(moved.lng.toFixed(6))}
          setBotLocationDraft(coords)
          await resolveBotLocationAddress(coords)
        })
      } else botLocationMarkerRef.current.setLatLng([point.latitude,point.longitude])
      setBotLocationDraft(point)
      resolveBotLocationAddress(point)
    })
    window.setTimeout(()=>map.invalidateSize(),120)
    return ()=>{map.remove();botLocationMapRef.current=null;botLocationMarkerRef.current=null}
  },[botLocationPickerOpen])

  useEffect(() => {
    const map=botLocationMapRef.current
    if(!botLocationPickerOpen || !map) return
    if(botLocationDraft) {
      const point=[Number(botLocationDraft.latitude),Number(botLocationDraft.longitude)]
      if(botLocationMarkerRef.current) botLocationMarkerRef.current.setLatLng(point)
      map.setView(point,Math.max(map.getZoom(),15))
    }
  },[botLocationPickerOpen,botLocationDraft])

  useEffect(() => {
    if (!locationMapOpen || !locationMapContainerRef.current) return
    const initial = locationMapTarget || liveLocations.find(item => !item.ended_at && new Date(item.expires_at).getTime() > Date.now())
    const center = initial ? [Number(initial.latitude), Number(initial.longitude)] : [-34.9011, -56.1645]
    const map = L.map(locationMapContainerRef.current, { zoomControl: true }).setView(center, 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map)
    const layer = L.layerGroup().addTo(map)
    locationMapRef.current = map
    locationMapLayerRef.current = layer
    window.setTimeout(() => map.invalidateSize(), 120)
    return () => { map.remove(); locationMapRef.current = null; locationMapLayerRef.current = null }
  }, [locationMapOpen])

  useEffect(() => {
    const map = locationMapRef.current
    const layer = locationMapLayerRef.current
    if (!locationMapOpen || !map || !layer) return
    layer.clearLayers()
    const active = liveLocations.filter(item => !item.ended_at && new Date(item.expires_at).getTime() > Date.now())
    const currentTarget = locationMapTarget?.id ? (active.find(item => item.id === locationMapTarget.id) || locationMapTarget) : locationMapTarget
    if (currentTarget?.latitude != null && currentTarget?.longitude != null && !currentTarget.id) {
      const point = [Number(currentTarget.latitude), Number(currentTarget.longitude)]
      L.marker(point).bindPopup(currentTarget.label || 'Ubicación compartida').addTo(layer)
      map.setView(point, 16)
    }
    active.forEach(item => {
      const point = [Number(item.latitude), Number(item.longitude)]
      const isMine = item.sender_id === session?.user?.id
      L.circleMarker(point, { radius: 10, color: isMine ? '#ff4da6' : '#7b61ff', fillColor: isMine ? '#ff4da6' : '#7b61ff', fillOpacity: 0.9, weight: 3 }).bindPopup(isMine ? 'Tu ubicación en tiempo real' : 'Ubicación en tiempo real').addTo(layer)
    })
    if (currentTarget?.id && active.some(item => item.id === currentTarget.id)) map.setView([Number(currentTarget.latitude), Number(currentTarget.longitude)], 16)
    else if (!locationMapTarget && active.length) map.setView([Number(active[0].latitude), Number(active[0].longitude)], 15)
  }, [locationMapOpen, locationMapTarget, liveLocations, session?.user?.id])

  useEffect(() => {
    if (view !== 'map' || !session?.user || !mapContainerRef.current) return
    let cancelled = false
    let map = leafletMapRef.current
    if (!map) {
      map = L.map(mapContainerRef.current, { zoomControl: false }).setView([-34.9011, -56.1645], 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap &copy; CARTO'
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
      setMapOrigin(ownLocation?.latitude != null ? [Number(ownLocation.latitude),Number(ownLocation.longitude)] : null)
      const profilesById = await loadStoryPeople((nearby || []).map(person => person.user_id))
      if (!cancelled) setMapProfiles(profilesById)
      if (ownLocation?.latitude != null && ownLocation?.longitude != null && ownLocation?.updated_at && new Date(ownLocation.updated_at).getTime() > Date.now() - 86400000) {
        const center = [Number(ownLocation.latitude), Number(ownLocation.longitude)]
        setMapCenter(center)
        map.setView(center, 11)
      } else if ((nearby || []).length) {
        const first = nearby[0]
        map.setView([Number(first.approximate_latitude), Number(first.approximate_longitude)], 10)
      }
      window.setTimeout(() => map.invalidateSize(), 100)
    }
    loadMapData()
    const nearbyTimer = window.setInterval(async () => {
      const { data: nearby, error } = await supabase.rpc('get_nearby_map_users', { p_radius_km: 50 })
      if (cancelled || error) return
      setMapUsers(nearby || [])
      const profilesById = await loadStoryPeople((nearby || []).map(person => person.user_id))
      if (!cancelled) setMapProfiles(profilesById)
    }, 30000)
    return () => {
      cancelled = true
      window.clearInterval(nearbyTimer)
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
    const markers = []
    const ownAvatar = profile?.avatar_url
    const ownImg = ownAvatar ? '<img src="'+String(ownAvatar).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" alt=""/>' : '<span class="zuno-map-avatar-fallback">T</span>'
    const ownPerson = {isMe:true,user_id:session?.user?.id,display_name:profile?.display_name||'Tu perfil',profile,approximate_distance_km:0}
    const closePerson = mapUsers.find(person=>Number(person.approximate_distance_km)<=1)
    if (mapVisible && mapOrigin) {
      if (closePerson) {
        const otherAvatar = mapProfiles[closePerson.user_id]?.avatar_url
        const otherImg = otherAvatar ? '<img src="'+String(otherAvatar).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" alt=""/>' : '<span class="zuno-map-avatar-fallback">Z</span>'
        const html = '<div class="zuno-map-pair-marker"><span class="zuno-map-pair-avatar" data-map-person="me">'+ownImg+'</span><span class="zuno-map-pair-avatar" data-map-person="other">'+otherImg+'</span></div>'
        const icon=L.divIcon({className:'zuno-map-marker-shell',html,iconSize:[104,54],iconAnchor:[52,27]})
        const marker=L.marker(mapOrigin,{icon})
        marker.on('click',event=>{
          const target=event.originalEvent?.target?.closest?.('[data-map-person]')
          if(target?.dataset?.mapPerson==='me') setSelectedMapPerson(ownPerson)
          else setSelectedMapPerson({...closePerson,profile:mapProfiles[closePerson.user_id]||null})
        })
        marker.addTo(map);markers.push(marker)
      } else {
        const icon=L.divIcon({className:'zuno-map-marker-shell',html:'<div class="zuno-map-avatar zuno-map-own-avatar">'+ownImg+'</div>',iconSize:[50,50],iconAnchor:[25,25]})
        const marker=L.marker(mapOrigin,{icon})
        marker.on('click',()=>setSelectedMapPerson(ownPerson))
        marker.addTo(map);markers.push(marker)
      }
    }
    mapUsers.filter(person=>person!==closePerson).forEach(person=>{
      const avatar = mapProfiles[person.user_id]?.avatar_url
      const html = avatar ? '<div class="zuno-map-avatar"><img src="'+String(avatar).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" alt=""/></div>' : '<div class="zuno-map-avatar zuno-map-avatar-fallback">Z</div>'
      const icon = L.divIcon({className:'zuno-map-marker-shell',html,iconSize:[50,50],iconAnchor:[25,25]})
      const marker = L.marker([Number(person.approximate_latitude),Number(person.approximate_longitude)],{icon})
      marker.on('click',()=>setSelectedMapPerson({...person,profile:mapProfiles[person.user_id]||null}))
      marker.addTo(map);markers.push(marker)
    })
    mapMarkersRef.current = markers
  }, [mapUsers,mapProfiles,mapOrigin,mapVisible,profile,session?.user?.id,view])

  useEffect(() => {
    if (view !== 'map' || !session?.user) return
    let active = true
    const loadInvites = async () => {
      const {data,error} = await supabase.from('map_meetup_requests').select('*').or('sender_id.eq.'+session.user.id+',receiver_id.eq.'+session.user.id).order('created_at',{ascending:false}).limit(30)
      if (!active) return
      if (error) { setMapStatus('No pudimos consultar las invitaciones: '+error.message); return }
      setMapInvites(data || [])
      const accepted = (data || []).find(item=>item.status==='accepted')
      if (!accepted || !mapOrigin) { setActiveMapRoute(null); if(mapRouteLayerRef.current){mapRouteLayerRef.current.remove();mapRouteLayerRef.current=null} return }
      const otherId = accepted.sender_id===session.user.id ? accepted.receiver_id : accepted.sender_id
      const person = mapUsers.find(item=>item.user_id===otherId)
      if (!person) return
      try {
        const dest=[Number(person.approximate_latitude),Number(person.approximate_longitude)]
        const coordinates = [mapOrigin[1]+','+mapOrigin[0], dest[1]+','+dest[0]].join(';')
        const response=await fetch('https://router.project-osrm.org/route/v1/driving/'+coordinates+'?overview=full&geometries=geojson&steps=true&alternatives=false&continue_straight=true')
        const routeData=await response.json()
        if (!active || routeData.code !== 'Ok' || !routeData.routes?.[0] || routeData.waypoints?.length !== 2) return
        const route=routeData.routes[0]
        setActiveMapRoute({request:accepted,distance:route.distance,duration:route.duration,geometry:route.geometry,waypoints:routeData.waypoints})
        const map=leafletMapRef.current
        if(map){if(mapRouteLayerRef.current)mapRouteLayerRef.current.remove();mapRouteLayerRef.current=L.geoJSON(route.geometry,{style:{color:'#f044b8',weight:6,opacity:.95}}).addTo(map);map.fitBounds(mapRouteLayerRef.current.getBounds(),{padding:[60,60]})}
      } catch(e) { if(active)setMapStatus('No pudimos calcular la ruta en este momento.') }
    }
    loadInvites()
    const timer=window.setInterval(loadInvites,8000)
    return ()=>{active=false;window.clearInterval(timer)}
  },[view,session?.user?.id,mapUsers,mapOrigin])

  useEffect(() => () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
      mapMarkersRef.current = []
    }
  }, [])

  async function inviteMapMeetup(person) {
    if (!person?.user_id || person.user_id===session?.user?.id || mapInviteBusy) return
    setMapInviteBusy(true)
    const {data:existing}=await supabase.from('map_meetup_requests').select('id,status').eq('sender_id',session.user.id).eq('receiver_id',person.user_id).eq('status','pending').maybeSingle()
    if(existing){setMapStatus('Ya enviaste una invitación a esta persona.');setMapInviteBusy(false);return}
    const {error}=await supabase.from('map_meetup_requests').insert({sender_id:session.user.id,receiver_id:person.user_id,status:'pending'})
    if(error)setMapStatus('No pudimos enviar la invitación: '+error.message)
    else {setMapStatus('Invitación enviada. Le llegó una notificación para aceptar o rechazar.');setSelectedMapPerson(null)}
    setMapInviteBusy(false)
  }

  async function respondMapMeetup(request,status) {
    if (!request || mapInviteBusy || !['accepted','rejected','ignored'].includes(status)) return
    setMapInviteBusy(true)
    const {data,error}=await supabase.from('map_meetup_requests').update({status,updated_at:new Date().toISOString()}).eq('id',request.id).eq('receiver_id',session.user.id).eq('status','pending').select('id,status,updated_at').maybeSingle()
    if(error || !data){setMapStatus('No pudimos responder: '+(error?.message||'La solicitud ya fue respondida o dejó de estar pendiente.'));setMapInviteBusy(false);return false}
    setMapInvites(current=>current.map(item=>item.id===request.id?{...item,...data}:item))
    setMapStatus(status==='accepted'?'Aceptaste. Calculando la ruta aproximada…':status==='rejected'?'Invitación rechazada.':'Invitación ignorada.')
    if(status==='accepted'){setSelectedMapPerson(null);setPeopleRefresh(value=>value+1)}
    const matchingNotification = notifications.find(item => item.notification_type === 'map_meetup_request' && item.entity_id === request.id)
    if (matchingNotification) await markNotificationRead(matchingNotification.id)
    setMapInviteBusy(false)
    return true
  }

  async function finishMapMeetup(request) {
    if (!request?.id || mapInviteBusy) return
    setMapInviteBusy(true)
    const endedAt=new Date().toISOString()
    const {data,error}=await supabase.from('map_meetup_requests').update({status:'cancelled',updated_at:endedAt}).eq('id',request.id).eq('status','accepted').select('id,status,updated_at').maybeSingle()
    if(error || !data){setMapStatus('No pudimos finalizar el encuentro: '+(error?.message||'No se encontró un encuentro activo.'));setMapInviteBusy(false);return}
    setMapInvites(current=>current.map(row=>row.id===request.id?{...row,...data}:row))
    setActiveMapRoute(null)
    setMapStatus('Encuentro finalizado. Quedó registrado en las notificaciones.')
    if(mapRouteLayerRef.current){mapRouteLayerRef.current.remove();mapRouteLayerRef.current=null}
    setMapInviteBusy(false)
  }

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
      setMapCenter([Number(coords.latitude.toFixed(2)), Number(coords.longitude.toFixed(2))])
      setMapStatus('Tu ubicación se actualizó para calcular distancias. La visibilidad en el mapa se controla por separado.')
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
    if (visible && !locationTermsAccepted) { setMapStatus('Primero aceptá los términos de ubicación en Perfil → Privacidad.'); return }
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
        setMapStatus('Visibilidad activada. ZUNO actualizará tu ubicación automáticamente con tu permiso.')
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
    const { error: deleteError } = await supabase.rpc('archive_chat_message_for_all', { p_message_id: message.id })
    if (deleteError) { setPeopleError('No pudimos eliminar el mensaje para todos. ' + deleteError.message); setChatMediaBusy(false); return }
    // La copia de conservación queda inaccesible desde el chat y no se elimina el archivo aquí.
    setChatMessages(current => current.filter(item => item.id !== message.id))
    setMessageReceipts(current => { const next = { ...current }; delete next[message.id]; return next })
    setActiveMessageMenu(null); setChatMediaBusy(false); setDeleteConfirmMessage(null)
  }

  function handleChatDraftChange(value) {
    setChatDraft(value)
    const channel = chatChannelRef.current
    if (!channel || !session?.user) return
    channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: session.user.id, typing: Boolean(value.trim()) } })
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
    if (value.trim()) typingTimeoutRef.current = window.setTimeout(() => {
      chatChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: session.user.id, typing: false } })
    }, 1800)
  }

  useEffect(() => {
    if (view !== 'chat') return
    const container = chatMessagesContainerRef.current
    if (!container) return
    window.requestAnimationFrame(() => { container.scrollTop = container.scrollHeight })
  }, [chatMessages, view, otherUserTyping])

  function handleChatSwipeStart(event) {
    const touch = event.touches?.[0]
    if (!touch) return
    const rect = event.currentTarget.getBoundingClientRect()
    swipeStartYRef.current = touch.clientY >= rect.bottom - 145 ? touch.clientY : null
  }
  function handleChatSwipeEnd(event) {
    const touch = event.changedTouches?.[0]
    const startY = swipeStartYRef.current
    swipeStartYRef.current = null
    if (!touch || startY == null || startY - touch.clientY < 85) return
    changeEphemeralDuration(activeConversation?.ephemeral_duration_minutes ? 0 : 10)
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
    const image = new window.Image()
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
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.user_id !== session.user.id) setOtherUserTyping(Boolean(payload?.typing))
      })
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
      }).subscribe(status => { if (status === 'SUBSCRIBED') chatChannelRef.current = channel })
    return () => { if (chatChannelRef.current === channel) chatChannelRef.current = null; supabase.removeChannel(channel); setOtherUserTyping(false) }
  }, [activeConversation?.id, view, session?.user?.id])

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
      const { data: rows, error: listError } = await supabase.from('conversations').select('id,member_one,member_two,last_message_at,archived_by_one,archived_by_two,deleted_by_one,deleted_by_two').order('last_message_at', { ascending: false, nullsFirst: false })
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
      setConversations((rows || []).filter(row => row.member_one === session.user.id ? !row.deleted_by_one : !row.deleted_by_two).map(row => { const last = latestByConversation[row.id]; return { ...row, person: byId[row.member_one === session.user.id ? row.member_two : row.member_one] || { display_name: 'Miembro de ZUNO' }, lastMessage: last && !hiddenLatestIds.has(last.id) ? last : null, lastReceipt: last ? latestReceiptById[last.id] : null } }))
    }
    fetchChats()
    return () => { active = false }
  }, [session, view])
  async function acceptRequiredTerms() {
    if (!session?.user || busy) return
    setBusy(true); setError('')
    const acceptedAt = new Date().toISOString()
    const [{ error: profileConsentError }, { error: metadataError }] = await Promise.all([
      supabase.from('profiles').upsert({ id: session.user.id, location_terms_accepted: true }, { onConflict: 'id' }),
      supabase.auth.updateUser({ data: { location_terms_accepted: true, location_terms_accepted_at: acceptedAt } })
    ])
    setBusy(false)
    if (profileConsentError || metadataError) {
      setError('No pudimos guardar tu aceptación. Revisá tu conexión e intentá nuevamente. ' + (profileConsentError?.message || metadataError?.message || ''))
      return
    }
    setLocationTermsAccepted(true)
    setProfile(current => ({ ...(current || {}), location_terms_accepted: true }))
    setMessage('¡Términos aceptados! Ya podés usar ZUNO.')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage(''); setError('')
    if (!isSupabaseConfigured) { setError('La conexión con Supabase todavía no está configurada.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (mode === 'signup' && publicPlatformSettings?.registration_enabled === false) { setError('En este momento ZUNO no está aceptando nuevos registros.'); return }
    if (mode === 'signup' && !displayName.trim()) { setError('Escribí cómo querés que te llamemos.'); return }
    if (mode === 'signup' && !locationTermsAccepted) { setError('Para crear tu cuenta tenés que aceptar los términos y condiciones.'); return }
    const identifier = email.trim()
    if (!identifier) { setError(mode === 'signup' ? 'Ingresá tu correo electrónico.' : 'Ingresá tu correo electrónico.'); return }
    setBusy(true)
    if (mode === 'signup') {
      const result = await supabase.auth.signUp({ email: identifier, password, options: { data: { display_name: displayName.trim(), location_terms_accepted: true, location_terms_accepted_at: new Date().toISOString() } } })
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
    const payload = {id:session.user.id,display_name:displayName.trim(),username:normalizedUsername||null,bio:bio.trim(),city:city.trim()||null,region:region.trim()||null,interests,looking_for:lookingFor,preferred_age_min:Number(ageMin),preferred_age_max:Number(ageMax),preferred_distance_km:Number(distanceKm),...privacy,show_distance:privacy.show_distance ?? true,location_terms_accepted:locationTermsAccepted}
    const {data,error:saveError}=await supabase.from('profiles').upsert(payload,{onConflict:'id'}).select('display_name,username,bio,avatar_url,zuno_verified,city,region,interests,looking_for,preferred_age_min,preferred_age_max,preferred_distance_km,show_online,show_distance,show_age,show_location,location_terms_accepted').maybeSingle()
    if(saveError){setBusy(false);setError(saveError.code==='23505'?'Ese nombre de usuario ya está ocupado. Probá con otro.':saveError.message);return}
    const {error:privateError}=await supabase.from('private_profiles').upsert({user_id:session.user.id,birth_date:birthDate,updated_at:new Date().toISOString()},{onConflict:'user_id'})
    setBusy(false); if(privateError){setError('El perfil se guardó, pero falló la fecha privada: '+privateError.message);return}
    setProfile(data);setLocationTermsAccepted(Boolean(data.location_terms_accepted));setMessage('¡Perfil guardado correctamente!');setView('home')
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
  async function loadPrivateAlbumOwnerData() {
    if (!session?.user) return
    const [{data:photoRows,error:photoError},{data:requestRows,error:requestError}] = await Promise.all([
      supabase.from('private_album_photos').select('id,owner_id,storage_path,sort_order').eq('owner_id',session.user.id).order('sort_order'),
      supabase.from('private_album_access_requests').select('id,requester_id,owner_id,status,created_at').eq('owner_id',session.user.id).order('created_at',{ascending:false})
    ])
    if (photoError) setPrivateAlbumMessage('No pudimos cargar el álbum: '+photoError.message)
    else {
      const signed = await Promise.all((photoRows||[]).map(async p=>{const {data}=await supabase.storage.from('zuno-private-albums').createSignedUrl(p.storage_path,60);return {...p,url:data?.signedUrl||''}}))
      setPrivateAlbumPhotos(signed)
    }
    if (requestError) setPrivateAlbumMessage('No pudimos cargar las solicitudes: '+requestError.message)
    else {
      const rows=requestRows||[]
      const requesterIds=[...new Set(rows.map(r=>r.requester_id))]
      let names={}
      if(requesterIds.length){
        const {data:peopleRows}=await supabase.from('profiles').select('id,display_name,username').in('id',requesterIds)
        names=(peopleRows||[]).reduce((acc,p)=>{acc[p.id]=p;return acc},{})
      }
      setPrivateAlbumRequests(rows.map(r=>({...r,requester:names[r.requester_id]||null})))
    }
  }
  async function uploadPrivateAlbumPhotos(event) {
    const files=Array.from(event.target.files||[]);event.target.value='';if(!files.length)return
    if(privateAlbumPhotos.length+files.length>20){setPrivateAlbumMessage('El álbum privado admite hasta 20 fotos.');return}
    setPrivateAlbumBusy(true);setPrivateAlbumMessage('')
    for(const file of files){
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760){setPrivateAlbumMessage('Usá JPG, PNG o WEBP de hasta 10 MB.');continue}
      const path=session.user.id+'/'+crypto.randomUUID()+'.'+file.name.split('.').pop().toLowerCase()
      const {error:upError}=await supabase.storage.from('zuno-private-albums').upload(path,file)
      if(upError){setPrivateAlbumMessage(upError.message);continue}
      const {data:row,error:rowError}=await supabase.from('private_album_photos').insert({owner_id:session.user.id,storage_path:path,sort_order:privateAlbumPhotos.length}).select('id,owner_id,storage_path,sort_order').single()
      if(rowError){await supabase.storage.from('zuno-private-albums').remove([path]);setPrivateAlbumMessage(rowError.message);continue}
      const {data:signed}=await supabase.storage.from('zuno-private-albums').createSignedUrl(path,60)
      setPrivateAlbumPhotos(current=>[...current,{...row,url:signed?.signedUrl||''}])
    }
    setPrivateAlbumBusy(false)
  }
  async function deletePrivateAlbumPhoto(photo) {
    setPrivateAlbumBusy(true)
    const {error:delError}=await supabase.from('private_album_photos').delete().eq('id',photo.id).eq('owner_id',session.user.id)
    if(!delError){await supabase.storage.from('zuno-private-albums').remove([photo.storage_path]);setPrivateAlbumPhotos(current=>current.filter(p=>p.id!==photo.id))}else setPrivateAlbumMessage(delError.message)
    setPrivateAlbumBusy(false)
  }
  async function decidePrivateAlbumRequestFromProfile(requestId,status) {
    setPrivateAlbumBusy(true);setPrivateAlbumMessage('')
    const {error:decisionError}=await supabase.from('private_album_access_requests').update({status,updated_at:new Date().toISOString()}).eq('id',requestId).eq('owner_id',session.user.id).eq('status','pending')
    if(decisionError)setPrivateAlbumMessage(decisionError.message)
    else await loadPrivateAlbumOwnerData()
    setPrivateAlbumBusy(false)
  }
  async function revokePrivateAlbumAccess(requestId) {
    if(!window.confirm('¿Revocar el acceso a tu álbum privado para esta persona?'))return
    setPrivateAlbumBusy(true);setPrivateAlbumMessage('')
    const {error:revokeError}=await supabase.from('private_album_access_requests').delete().eq('id',requestId).eq('owner_id',session.user.id).eq('status','approved')
    if(revokeError)setPrivateAlbumMessage('No pudimos revocar el acceso: '+revokeError.message)
    else {setPrivateAlbumMessage('Acceso revocado.');await loadPrivateAlbumOwnerData()}
    setPrivateAlbumBusy(false)
  }
  async function cancelPrivateAlbumRequest(ownerId) {
    setPrivateAlbumBusy(true);setPrivateAlbumMessage('')
    const {error:cancelError}=await supabase.from('private_album_access_requests').delete().eq('requester_id',session.user.id).eq('owner_id',ownerId).eq('status','pending')
    if(cancelError)setPrivateAlbumMessage('No pudimos cancelar la solicitud: '+cancelError.message)
    else {setPrivateAlbumRequestStatus('');setPrivateAlbumMessage('Solicitud cancelada.')}
    setPrivateAlbumBusy(false)
  }
  async function openMemberProfile(person,isOwn=false) {
    const selected={...person,isOwn}
    setProfilePhotoIndex(0);setProfilePhotoFullscreen(false);setShowProfileAlbum(false);setProfileMessageDraft('')
    setPrivateAlbumRequestStatus('')
    setPrivateAlbumMessage('')
    if(person.isBot){setSelectedProfile(selected);setView('detail');return}
    if(!isOwn && session?.user){
      const {data:request,error:requestError}=await supabase.from('private_album_access_requests').select('id,status').eq('requester_id',session.user.id).eq('owner_id',person.id).maybeSingle()
      if(!requestError)setPrivateAlbumRequestStatus(request?.status||'')
      if(request?.status==='approved'){
        const {data:rows}=await supabase.from('private_album_photos').select('id,owner_id,storage_path,sort_order').eq('owner_id',person.id).order('sort_order')
        const signed=await Promise.all((rows||[]).map(async p=>{const {data}=await supabase.storage.from('zuno-private-albums').createSignedUrl(p.storage_path,300);return {...p,url:data?.signedUrl||''}}))
        selected.privateAlbumPhotos=signed.filter(p=>p.url)
      }
    }
    setSelectedProfile(selected);setView('detail')
  }
  async function requestPrivateAlbumAccess(ownerId) {
    if(!session?.user || !ownerId || privateAlbumBusy) return
    setPrivateAlbumBusy(true);setPrivateAlbumMessage('')
    const result=privateAlbumRequestStatus==='rejected'
      ? await supabase.from('private_album_access_requests').update({status:'pending',updated_at:new Date().toISOString()}).eq('requester_id',session.user.id).eq('owner_id',ownerId).eq('status','rejected').select('id').single()
      : await supabase.from('private_album_access_requests').insert({requester_id:session.user.id,owner_id:ownerId,status:'pending'}).select('id').single()
    if(result.error) {
      setPrivateAlbumMessage(result.error.code==='23505'?'Ya enviaste una solicitud a esta persona.':result.error.message)
    } else {
      setPrivateAlbumRequestStatus('pending')
      const ids=[session.user.id,ownerId].sort()
      const {data:conversation,error:conversationError}=await supabase.from('conversations').upsert({member_one:ids[0],member_two:ids[1]},{onConflict:'member_one,member_two'}).select('id').single()
      let chatMessageSent=false
      if(!conversationError && conversation?.id) {
        const requesterName=profile?.display_name || profile?.username || 'Un usuario'
        const {error:messageError}=await supabase.from('messages').insert({
          conversation_id:conversation.id,
          sender_id:session.user.id,
          body:'🔒 '+requesterName+' te pidió acceso a tu álbum privado. Podés responder desde Notificaciones.'
        })
        chatMessageSent=!messageError
        if(messageError) console.warn('La solicitud se guardó, pero no se pudo enviar el mensaje al chat:',messageError.message)
      }
      setPrivateAlbumMessage(chatMessageSent?'Solicitud enviada. La otra persona recibirá una notificación y un mensaje en el chat.':'Solicitud enviada y notificación generada. No pudimos enviar el mensaje al chat; la persona podrá responder desde Notificaciones.')
    }
    setPrivateAlbumBusy(false)
  }
  const interestOptions=['Música','Cine','Deportes','Viajes','Gastronomía','Videojuegos','Arte','Naturaleza','Fitness','Lectura','Series','Tecnología']
  const lookingOptions=['Amistad','Citas','Relación seria','Conocer personas','Charlar']

  async function logout() { await supabase.auth.signOut(); setSession(null); setProfile(null); setMessage(''); setVerificationEmail('') }

  const emailConfirmed = Boolean(session?.user?.email_confirmed_at || session?.user?.confirmed_at)

  const callOverlay = session?.user ? (
    <>
      {accountStatus.blocked && <div className="zuno-policy-gate" role="dialog" aria-modal="true"><section className="zuno-policy-card"><div className="zuno-policy-mark"><ShieldAlert size={24}/></div><span className="eyebrow">ZUNO · ESTADO DE CUENTA</span><h2>{accountStatus.permanent ? 'Cuenta desactivada' : 'Cuenta suspendida'}</h2><p>{accountStatus.reason || 'Tu cuenta tiene una restricción administrativa activa.'}</p><p>{accountStatus.permanent ? 'No podés continuar usando ZUNO. Si creés que se trata de un error, contactá al equipo de soporte.' : 'La suspensión estará vigente hasta '+new Date(accountStatus.expires_at).toLocaleString('es-UY')+'.'}</p><button type="button" className="submit-btn" onClick={logout}>Cerrar sesión</button></section></div>}
      {session?.user && emailConfirmed && (policyStatus === 'required' || policyStatus === 'error') && <div className="zuno-policy-gate" role="dialog" aria-modal="true" aria-labelledby="zuno-policy-title">
        <section className="zuno-policy-card">
          <div className="zuno-policy-mark"><ShieldCheck size={24}/></div>
          <span className="eyebrow">ZUNO · ACTUALIZACIÓN IMPORTANTE</span>
          <h2 id="zuno-policy-title">Leé y aceptá las condiciones actualizadas</h2>
          {policyStatus === 'loading' ? <p>Estamos verificando si ya aceptaste esta versión.</p> : policyStatus === 'error' ? <>
            <p>No pudimos comprobar tu aceptación. Para proteger tu cuenta, el acceso queda pausado hasta verificarla.</p>
            <p className="zuno-policy-error">{policyError}</p>
            <button type="button" className="submit-btn" onClick={async()=>{setPolicyStatus('loading');setPolicyError('');const {data,error}=await supabase.from('user_policy_acceptances').select('policy_version').eq('user_id',session.user.id).eq('policy_version',CURRENT_POLICY_VERSION).limit(1).maybeSingle();if(error){setPolicyError(error.message);setPolicyStatus('error')}else setPolicyStatus(data?'accepted':'required')}}>Reintentar verificación</button>
            <button type="button" className="logout-btn" onClick={logout}>Cerrar sesión</button>
          </> : <>
            <div className="zuno-policy-scroll">
              <p><strong>1. Requisitos de uso.</strong> ZUNO está destinada exclusivamente a personas mayores de 18 años.</p>
              <p><strong>2. Ubicación y visibilidad.</strong> La ubicación precisa se utiliza para funciones de proximidad y mapa según tus permisos y opciones de privacidad. No se muestra públicamente como dirección exacta.</p>
              <p><strong>3. Conducta y seguridad.</strong> No se permite el acoso, las amenazas, la suplantación, las actividades ilícitas, las solicitudes de dinero ni el contenido sexual que involucre a menores. Podés bloquear y denunciar cuentas.</p>
              <p><strong>4. Mensajes, archivos y conservación.</strong> Los textos, fotos, videos, audios y adjuntos compartidos pueden almacenarse y procesarse para prestar el servicio, mantener la seguridad, prevenir abusos, atender denuncias, resolver conflictos y cumplir obligaciones legales o requerimientos válidos. Esto puede incluir contenido enviado mediante funciones efímeras: que deje de verse o expire en la aplicación no implica necesariamente el borrado inmediato de copias técnicas, registros o respaldos. Cuando corresponda, ZUNO podrá preservar contenido relevante para investigaciones, reclamos o procedimientos legales. El acceso estará restringido a personal autorizado y sujeto a controles. Los mensajes y archivos de chat que desaparezcan por vencimiento o por la opción «eliminar para todos» se conservarán de forma privada durante un máximo estándar de 90 días desde su vencimiento o eliminación, para seguridad, atención de denuncias y posibles reclamos. Durante ese plazo no estarán disponibles en los chats. Si existe una denuncia, investigación o deber legal válido, determinados datos podrán preservarse por el tiempo estrictamente necesario. Al finalizar el plazo y si no existe una causa de preservación, se eliminarán también los archivos asociados.</p>
              <p><strong>5. Privacidad y derechos.</strong> Podés solicitar acceso, rectificación o supresión de tus datos cuando corresponda. Algunas solicitudes pueden estar sujetas a excepciones legales o a la necesidad justificada de preservar evidencia.</p>
              <p><strong>6. Aceptación y versión.</strong> Al aceptar, confirmás que leíste estas condiciones y la política de privacidad de ZUNO, versión {CURRENT_POLICY_VERSION}. Guardaremos la versión aceptada, la fecha y la cuenta asociada como constancia.</p>
            </div>
            <p className="zuno-policy-warning">Si no estás de acuerdo, podés cerrar sesión. No podrás continuar usando ZUNO sin aceptar esta versión.</p>
            <button type="button" className="submit-btn" onClick={acceptCurrentPolicy} disabled={policyBusy}>{policyBusy?'Guardando aceptación…':'Acepto las condiciones actualizadas'}</button>
            <button type="button" className="logout-btn" onClick={logout}>No acepto · Cerrar sesión</button>
          </>}
        </section>
      </div>}
      {callError && <div className="call-feedback" role="status">{callError}<button type="button" onClick={()=>setCallError('')} aria-label="Cerrar aviso"><X size={15}/></button></div>}
      {incomingCall && !callSession && <div className="call-incoming-banner" role="alert"><div className="call-incoming-banner-icon"><Phone size={19}/></div><div className="call-incoming-banner-copy"><strong>{incomingCall._caller?.display_name || activeConversation?.person?.display_name || 'Llamada entrante'}</strong><span>{incomingCall.call_type === 'video' ? 'Videollamada entrante' : 'Llamada de voz entrante'}</span></div><button type="button" className="call-banner-decline" onClick={declineCall} disabled={callBusy} aria-label="Rechazar llamada"><PhoneOff size={18}/></button><button type="button" className="call-banner-accept" onClick={acceptCall} disabled={callBusy}><Phone size={17}/>{callBusy?'Conectando':'Aceptar'}</button></div>}
      {callSession && <div className="call-active-backdrop"><section className={'call-active-card '+(callSession.call_type==='video'?'is-video':'is-audio')}>
        {callSession.call_type === 'video' ? <><video ref={remoteVideoRef} autoPlay playsInline className="call-remote-video"/><video ref={localVideoRef} autoPlay muted playsInline className="call-local-video"/></> : <><div className="call-audio-avatar"><UserRound size={54}/></div><audio ref={remoteAudioRef} autoPlay playsInline/></>}
        <div className="call-active-info"><strong>{callSession._person?.display_name || activeConversation?.person?.display_name || 'Llamada ZUNO'}</strong><span>{callSession.status==='ringing'?'Llamando…':remoteCallStream?'Conectados':'Conectando…'}</span>{callError && <small>{callError}</small>}</div>
        <div className="call-controls"><button type="button" className={callMuted?'is-off':''} onClick={toggleCallMute} aria-label={callMuted?'Activar micrófono':'Silenciar micrófono'}>{callMuted?<MicOff size={20}/>:<Mic size={20}/>}</button>{callSession.call_type==='video' && <><button type="button" className={callCameraOff?'is-off':''} onClick={toggleCallCamera} aria-label={callCameraOff?'Activar cámara':'Apagar cámara'}>{callCameraOff?<VideoOff size={20}/>:<Video size={20}/>}</button><button type="button" onClick={switchCallCamera} aria-label="Cambiar cámara" title="Cambiar cámara"><RefreshCw size={20}/></button></>}<button type="button" className="call-hangup" onClick={finishCall} aria-label="Finalizar llamada"><PhoneOff size={21}/></button></div>
      </section></div>}
    </>
  ) : null

  if (authLoading) return (
    <main className="app-shell"><header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a></header><section className="loading-state"><div className="card-icon"><Heart size={21}/></div><h2>Conectando con ZUNO…</h2></section></main>
  )

  if (publicPlatformSettingsLoading) return (
    <main className="app-shell zuno-maintenance-screen"><div className="zuno-maintenance-card"><span className="zuno-maintenance-icon"><Settings size={30}/></span><h1>Verificando ZUNO…</h1><p>Estamos comprobando el estado de la plataforma.</p></div></main>
  )

  if (publicPlatformSettingsError) return (
    <main className="app-shell zuno-maintenance-screen"><div className="zuno-maintenance-card"><span className="zuno-maintenance-icon"><ShieldCheck size={30}/></span><h1>No pudimos verificar ZUNO.</h1><p>Por seguridad, no podemos habilitar el acceso hasta comprobar el estado de la plataforma.</p><button className="submit-btn" onClick={()=>window.location.reload()}>Volver a intentar</button></div></main>
  )

  if (publicPlatformSettings?.maintenance_mode && session?.user && profileLoading) return (
    <main className="app-shell zuno-maintenance-screen"><div className="zuno-maintenance-card"><span className="zuno-maintenance-icon"><Settings size={30}/></span><h1>Verificando acceso…</h1><p>Estamos comprobando los permisos de administrador.</p></div></main>
  )

  if (publicPlatformSettings?.maintenance_mode && String(profile?.username || '').trim().toLowerCase() !== 'manu.german') return (
    <main className="app-shell zuno-maintenance-screen"><div className="zuno-maintenance-card"><span className="zuno-maintenance-icon"><Settings size={30}/></span><span className="admin-welcome-kicker">ZUNO · EN MANTENIMIENTO</span><h1>Volvemos enseguida.</h1><p>{publicPlatformSettings.maintenance_message || 'Estamos realizando mejoras. Volvé a intentarlo en unos minutos.'}</p></div></main>
  )

  if (session?.user && !emailConfirmed) return (
    <main className="app-shell">{callOverlay}
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a></header>
      <section className="loading-state verification-screen">
        <div className="card-icon"><ShieldCheck size={21}/></div><h2>Confirmá tu correo electrónico</h2>
        <p>Necesitamos confirmar que esta dirección te pertenece antes de entrar a ZUNO.</p>
        <button className="submit-btn verification-action" onClick={async()=>{setVerificationEmail(session.user.email || ''); await resendVerification(session.user.email || '')}} disabled={busy}>{busy ? 'Enviando…' : 'Reenviar correo de confirmación'}</button>
        {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
      </section>
    </main>
  )



  if (session?.user && profileLoading) return (
    <main className="app-shell">{callOverlay}<header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a></header><section className="loading-state"><div className="card-icon"><Heart size={21}/></div><h2>Preparando tu espacio…</h2><p>Estamos cargando tu perfil.</p></section></main>
  )

  if (session?.user && profileLoadError) return (
    <main className="app-shell">{callOverlay}<header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a></header><section className="loading-state"><div className="card-icon"><ShieldCheck size={21}/></div><h2>No pudimos cargar tu perfil</h2><p>{profileLoadError}</p><p>Por seguridad, no te vamos a pedir que crees otro perfil mientras no podamos comprobar si ya existe.</p><button className="submit-btn" onClick={()=>window.location.reload()}>Volver a intentar <span>→</span></button></section></main>
  )

  if (session?.user && !profileLoading && !profileLoadError && !locationTermsAccepted) return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a></header>
      <div className="terms-modal-backdrop" role="presentation">
        <section className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="zuno-required-terms-title">
          <div className="terms-modal-header"><div><span className="eyebrow">ZUNO · CONDICIONES DE USO</span><h2 id="zuno-required-terms-title">Necesitás aceptar los términos y condiciones</h2></div></div>
          <div className="terms-modal-content">
            <p>Para continuar usando ZUNO, necesitamos que leas y aceptes estas condiciones. La aceptación se guarda en tu cuenta y no tendrás que repetir este paso.</p>
            <p><strong>1. Requisitos de uso.</strong> ZUNO está destinado exclusivamente a personas mayores de 18 años. Declarás que cumplís este requisito y que los datos que proporcionás son correctos.</p>
            <p><strong>2. Uso de ubicación precisa.</strong> Para calcular distancias, ZUNO puede solicitar permiso de ubicación al dispositivo y recibir coordenadas precisas. Se utilizan para calcular proximidad y, si habilitás la función, mostrar tu posición aproximada en el mapa. Nunca mostramos públicamente tu dirección ni tus coordenadas exactas.</p>
            <p><strong>3. Distancias y visibilidad.</strong> Las distancias son estimaciones basadas en ubicaciones recientes y pueden variar según movimiento, señal GPS y precisión del dispositivo. Solo se muestran cuando las personas involucradas aceptaron estas condiciones y habilitaron la visibilidad correspondiente.</p>
            <p><strong>4. Almacenamiento y control.</strong> Las coordenadas se utilizan para las funciones de proximidad y mapa. Podés activar o desactivar la visibilidad de tu ubicación y distancia desde las opciones de Explorar. También podés retirar el permiso de ubicación desde tu dispositivo.</p>
            <p><strong>5. Privacidad.</strong> ZUNO no muestra tu domicilio exacto ni tus coordenadas a otros usuarios. La distancia y la posición aproximada pueden permitir inferir cercanía; compartí únicamente la información que quieras hacer visible.</p>
            <p><strong>6. Conducta y seguridad.</strong> Te comprometés a respetar a las demás personas, no acosar, amenazar, suplantar identidades, publicar contenido ilegal ni utilizar la plataforma para actividades ilícitas. Podés bloquear o denunciar cuentas.</p>
            <p><strong>7. Mensajes, archivos y conservación de contenido.</strong> Los mensajes y archivos que compartas mediante ZUNO —textos, fotografías, videos, audios y otros adjuntos— pueden almacenarse y procesarse para prestar el servicio, proteger la comunidad, prevenir abusos, atender denuncias, resolver conflictos y cumplir obligaciones legales o requerimientos válidos de autoridades. Esto puede incluir contenido enviado mediante funciones efímeras o de duración limitada: que deje de estar visible o expire en la aplicación no implica necesariamente que todas sus copias técnicas, registros o respaldos se eliminen en ese mismo momento. Cuando corresponda, ZUNO podrá preservar contenido y registros relevantes para investigaciones de seguridad, reclamaciones o procedimientos legales. El acceso estará limitado a personal autorizado y sujeto a controles de seguridad y registro. Los mensajes y archivos de chat que desaparezcan por vencimiento o por la opción «eliminar para todos» se conservarán de forma privada durante un máximo estándar de 90 días desde su vencimiento o eliminación, para seguridad, atención de denuncias y posibles reclamos. Durante ese plazo no estarán disponibles en los chats. Si existe una denuncia, investigación o deber legal válido, determinados datos podrán preservarse por el tiempo estrictamente necesario. Al finalizar el plazo y si no existe una causa de preservación, se eliminarán también los archivos asociados.</p>
            <p><strong>8. Privacidad y derechos.</strong> Podés solicitar información sobre el tratamiento de tus datos y ejercer los derechos que te reconoce la normativa aplicable, incluidos acceso, rectificación y supresión cuando corresponda. Algunas solicitudes pueden estar sujetas a excepciones cuando exista una obligación legal o una necesidad legítima de preservar evidencia.</p>
            <p><strong>9. Aceptación.</strong> Al pulsar «Acepto los términos y condiciones», confirmás que leíste y aceptás estas condiciones, incluido el tratamiento y la conservación de contenido descritos. La aceptación queda asociada a tu cuenta.</p>
            <p className="terms-modal-note">Es necesario aceptar estas condiciones para utilizar ZUNO. Si no estás de acuerdo, podés cerrar sesión.</p>
          </div>
          {error && <div className="notice error" role="alert">{error}</div>}
          <div className="terms-modal-actions"><button type="button" className="logout-btn" onClick={logout} disabled={busy}>Cerrar sesión</button><button type="button" className="submit-btn" onClick={acceptRequiredTerms} disabled={busy}>{busy ? 'Guardando…' : 'Acepto los términos y condiciones'}</button></div>
        </section>
      </div>
    </main>
  )

  if (session?.user && view === 'bot-chat' && activeBotConversation) {
    const bot=activeBotConversation.bot
    return <main className="app-shell bot-chat-shell">{callOverlay}
      <header className="bot-chat-header"><button type="button" onClick={()=>setView('detail')} aria-label="Volver al perfil"><ChevronLeft size={20}/></button><div className="bot-chat-avatar">{bot.photos?.[0]?.url?<img src={bot.photos[0].url} alt=""/>:<UserRound size={22}/>}</div><div><strong>{bot.display_name}</strong><span><Sparkles size={12}/> Bot de ZUNO</span></div></header>
      <div className="bot-chat-messages">{botChatMessages.length?botChatMessages.map(message=><div key={message.id} className={'bot-chat-bubble '+(message.sender_type==='user'?'own':'')}>{message.body}<time>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div>):<div className="bot-chat-welcome">¡Hola! Este es el chat de prueba de {bot.display_name}. Ya podés escribirle.</div>}</div>
      <form className="bot-chat-composer" onSubmit={sendBotChatMessage}><input value={botChatDraft} onChange={event=>setBotChatDraft(event.target.value)} placeholder="Escribile un mensaje…" maxLength={4000}/><button type="submit" disabled={!botChatDraft.trim()||chatBusy}><Send size={18}/></button></form>
      <p className="bot-chat-notice">Personaje virtual. Las respuestas automáticas todavía no están activadas.</p>
    </main>
  }

  if (session?.user && view === 'detail' && selectedProfile) {
    const publicPhotos=selectedProfile.photos || []
    const currentPhoto=publicPhotos[profilePhotoIndex]
    const albumPhotos=selectedProfile.isOwn ? privateAlbumPhotos : (selectedProfile.privateAlbumPhotos || [])
    const ownNavigationProfile = {
      ...profile,
      id: session.user.id,
      display_name: profile?.display_name || displayName || 'Tu perfil',
      photos: photos || [],
      visibleCity: profile?.show_location ? [profile?.city,profile?.region].filter(Boolean).join(', ') : '',
      isOwn: true
    }
    const availableOtherProfiles = discoveryPeople.some(person=>person.id===selectedProfile.id)
      ? discoveryPeople
      : people.filter(person=>!blockedIds.has(person.id)&&!hiddenProfileIds.includes(person.id))
    const filteredNavigationPeople = [ownNavigationProfile,...availableOtherProfiles.filter(person=>person.id!==session.user.id)]
    return (
      <main className="app-shell profile-detail-shell">{callOverlay}
        <section className="member-detail profile-detail-screen">
          <div className="profile-photo-stage"
            onPointerDown={event=>{if(event.target.closest('button, input, textarea, select, form, a, [role="button"]')){profileTouchStartX.current=null;profileTouchStartY.current=null;return}profileTouchStartX.current=event.clientX;profileTouchStartY.current=event.clientY}}
            onPointerUp={event=>{const startX=profileTouchStartX.current;const startY=profileTouchStartY.current;const endX=event.clientX;const endY=event.clientY;profileTouchStartX.current=null;profileTouchStartY.current=null;if(startX!==null&&startY!==null){const deltaX=endX-startX;const deltaY=endY-startY;if(Math.abs(deltaY)>45&&Math.abs(deltaY)>Math.abs(deltaX)){setProfilePhotoIndex(index=>Math.max(0,Math.min(publicPhotos.length-1,index+(deltaY<0?1:-1))))}else if(Math.abs(deltaX)>45&&Math.abs(deltaX)>Math.abs(deltaY)){const currentIndex=filteredNavigationPeople.findIndex(person=>person.id===selectedProfile.id);const nextProfile=filteredNavigationPeople[currentIndex+(deltaX<0?1:-1)];if(currentIndex>=0&&nextProfile)openMemberProfile(nextProfile,Boolean(nextProfile.isOwn))}}}}
            onPointerCancel={()=>{profileTouchStartX.current=null;profileTouchStartY.current=null}}>

            {currentPhoto?.url ? <img key={currentPhoto.url || profilePhotoIndex} className="profile-stage-image" src={currentPhoto.url} alt={`Foto de ${selectedProfile.display_name || 'usuario'}`} onClick={()=>setProfilePhotoFullscreen(true)}/> : <div className="profile-stage-empty"><UserRound size={66}/><span>Sin fotos por ahora</span></div>}
            <div className="profile-stage-top">
              <button type="button" className="profile-stage-back" onClick={()=>{setSelectedProfile(null);setView('home')}} aria-label="Volver a descubrir"><X size={23}/></button>
              <div className="profile-stage-top-actions profile-top-five-actions">
                {!selectedProfile.isOwn && (selectedProfile.isBot ? <>
                  <button type="button" onClick={()=>toggleBotFavorite(selectedProfile)} aria-label="Favorito" title="Favorito"><Heart size={19} fill={botFavoriteIds.includes(selectedProfile.id)?'currentColor':'none'}/></button>
                  <button type="button" onClick={()=>openBotChat(selectedProfile)} aria-label="Chatear" title="Chatear"><MessageCircle size={19}/></button>
                  <button type="button" disabled={blockBusy===selectedProfile.id} onClick={()=>blockBot(selectedProfile)} aria-label="Bloquear" title="Bloquear"><Ban size={19}/></button>
                  <button type="button" onClick={()=>botUnavailableAction('Denunciar')} aria-label="Denunciar" title="Denunciar"><Flag size={19}/></button>
                  <button type="button" onClick={()=>botUnavailableAction('Ocultar')} aria-label="Ocultar" title="Ocultar"><EyeOff size={19}/></button>
                </> : <>
                  <button type="button" onClick={()=>toggleFavorite(selectedProfile.id)} aria-label="Favorito" title="Favorito"><Heart size={19} fill={favoriteIds.includes(selectedProfile.id)?'currentColor':'none'}/></button>
                  <button type="button" onClick={()=>openChat(selectedProfile)} aria-label="Abrir chat" title="Chat"><MessageCircle size={19}/></button>
                  <button type="button" disabled={blockBusy===selectedProfile.id} onClick={()=>blockUser(selectedProfile)} aria-label="Bloquear" title="Bloquear"><Ban size={19}/></button>
                  <button type="button" onClick={()=>{setReportTarget(selectedProfile);setReportReason('harassment');setReportDetails('')}} aria-label="Denunciar" title="Denunciar"><Flag size={19}/></button>
                  <button type="button" onClick={()=>{setHiddenProfileIds(items=>items.includes(selectedProfile.id)?items:[...items,selectedProfile.id]);setSelectedProfile(null);setView('home')}} aria-label="Ocultar" title="Ocultar"><EyeOff size={19}/></button>
                </>)}
                <button type="button" onClick={()=>selectedProfile.isBot?botUnavailableAction('Solicitar álbum privado'):setShowProfileAlbum(true)} aria-label="Álbum privado" title="Álbum"><Images size={19}/></button>
              </div>
            </div>
            {publicPhotos.length>1 && <div className="profile-photo-segments" aria-label="Fotos del perfil">{publicPhotos.map((photo,index)=><button key={photo.id||photo.url||index} type="button" className={index===profilePhotoIndex?'active':''} onClick={()=>setProfilePhotoIndex(index)} aria-label={`Ver foto ${index+1}`}/>)}</div>}

            <div className="profile-stage-caption">
              <div className="profile-stage-name-row"><div className="profile-stage-name">{selectedProfile.display_name || 'Usuario ZUNO'}{selectedProfile.age ? <span> {selectedProfile.age}</span> : null}</div>{!selectedProfile.isOwn&&<button type="button" className={"profile-name-fire "+(activeTapIds.includes(selectedProfile.id)?"is-active":"")} disabled={favoriteBusy===selectedProfile.id||activeTapIds.includes(selectedProfile.id)} onClick={()=>selectedProfile.isBot?sendBotTap(selectedProfile):sendProfileTap(selectedProfile.id)} aria-label="Enviar tap de fuego" title="Enviar tap 🔥"><Flame size={24} fill="currentColor"/></button>}</div>
              {selectedProfile.username && <div className="profile-stage-username">@{selectedProfile.username}</div>}
              {!selectedProfile.isOwn && !selectedProfile.isBot && <form className="profile-quick-message" onSubmit={sendProfileQuickMessage}><input aria-label="Escribir mensaje" value={profileMessageDraft} onChange={event=>setProfileMessageDraft(event.target.value)} placeholder="Escribí un mensaje…" maxLength={4000}/><button type="submit" disabled={!profileMessageDraft.trim()||profileMessageBusy} aria-label="Enviar mensaje" title="Enviar mensaje">{profileMessageBusy?'…':<Send size={18}/>}</button></form>}
              {selectedProfile.visibleCity && <div className="profile-stage-city"><Compass size={14}/>{selectedProfile.visibleCity}</div>}
            </div>
          </div>
          <div className="detail-content profile-detail-content">
            <section className="detail-section profile-stats-section"><h2>ESTADÍSTICAS</h2>
              <div className="profile-stat-row"><Ruler size={18}/><span>{selectedProfile.height_cm ? selectedProfile.height_cm+' cm' : 'Altura no especificada'}</span>{selectedProfile.weight_kg ? <><i/> <span>{selectedProfile.weight_kg+' kg'}</span></> : null}{selectedProfile.body_type ? <><i/> <span>{selectedProfile.body_type}</span></> : null}</div>
              {selectedProfile.gender && <div className="profile-stat-row"><Users size={18}/><span>{selectedProfile.gender}</span></div>}
              {selectedProfile.role && <div className="profile-stat-row"><ArrowDownRight size={18}/><span>{selectedProfile.role}</span></div>}
              {selectedProfile.relationship_status && <div className="profile-stat-row"><Heart size={18}/><span>{selectedProfile.relationship_status}</span></div>}
              {selectedProfile.visibleCity && <div className="profile-stat-row"><MapPin size={18}/><span>{selectedProfile.visibleCity}</span></div>}
              {selectedProfile.activityStatus && <div className="profile-stat-row"><Clock3 size={18}/><span>{selectedProfile.activityStatus}</span></div>}
              {selectedProfile.approximateDistanceKm!=null && selectedProfile.show_distance && <div className="profile-stat-row"><Navigation size={18}/><span>A {formatApproxDistance(selectedProfile.approximateDistanceKm)}</span></div>}
            </section>
            {selectedProfile.bio && <section className="detail-section"><h2>SOBRE MÍ</h2><p>{selectedProfile.bio}</p></section>}
            {selectedProfile.interests?.length>0 && <section className="detail-section"><h2>INTERESES</h2><div className="person-tags">{selectedProfile.interests.map(tag=><span key={tag}>{tag}</span>)}</div></section>}
            {selectedProfile.looking_for?.length>0 && <section className="detail-section"><h2>PREFERENCIAS</h2><div className="profile-stat-row"><Users size={18}/><span>Lo que busco: <strong>{selectedProfile.looking_for.join(', ')}</strong></span></div></section>}
            {!selectedProfile.bio&&!selectedProfile.interests?.length&&!selectedProfile.looking_for?.length&&!selectedProfile.visibleCity&&<p className="detail-private-note">Esta persona todavía no agregó información pública a su perfil.</p>}
            {!selectedProfile.isOwn && <>

            </>}
            {selectedProfile.isOwn && <p className="detail-private-note">Este es tu perfil. Podés administrar tu álbum privado desde el botón Álbum.</p>}
          </div>
          {!selectedProfile.isOwn && <div className="profile-contact-bar">
            <button type="button" className="profile-message-action" onClick={()=>selectedProfile.isBot?openBotChat(selectedProfile):openChat(selectedProfile)}><MessageCircle size={19}/> Chatear</button>
            <button type="button" className="profile-fire-action" disabled={favoriteBusy===selectedProfile.id} onClick={()=>selectedProfile.isBot?toggleBotFavorite(selectedProfile):toggleFavorite(selectedProfile.id)} aria-label="Agregar a favoritos"><Heart size={25} fill={(selectedProfile.isBot?botFavoriteIds:favoriteIds).includes(selectedProfile.id)?'currentColor':'none'}/></button>
          </div>}
        </section>
        {profilePhotoFullscreen && currentPhoto?.url && <div className="profile-photo-fullscreen" role="dialog" aria-modal="true" onClick={()=>setProfilePhotoFullscreen(false)}><button type="button" aria-label="Cerrar foto" onClick={()=>setProfilePhotoFullscreen(false)}><X size={27}/></button><img src={currentPhoto.url} alt="Foto ampliada" onClick={event=>event.stopPropagation()}/></div>}
        {showProfileAlbum && <div className="profile-album-backdrop" role="presentation" onClick={()=>setShowProfileAlbum(false)}><section className="profile-album-panel" role="dialog" aria-modal="true" aria-label="Álbum privado" onClick={event=>event.stopPropagation()}>
          <div className="profile-album-heading"><div><Images size={20}/><strong>{selectedProfile.isOwn?'Tu álbum privado':'Álbum privado'}</strong></div><button type="button" onClick={()=>setShowProfileAlbum(false)} aria-label="Cerrar álbum"><X size={22}/></button></div>
          {albumPhotos.length>0 ? <div className="profile-album-grid">{albumPhotos.map(photo=><img key={photo.id||photo.url} src={photo.url} alt="Foto del álbum privado"/>)}</div> : selectedProfile.isOwn ? <p className="detail-private-note">Todavía no agregaste fotos a tu álbum privado.</p> : privateAlbumRequestStatus==='approved' ? <p className="detail-private-note">No hay fotos disponibles en este álbum.</p> : <div className="profile-album-locked"><Images size={38}/><strong>Este álbum es privado</strong><p>Pedile permiso a {selectedProfile.display_name || 'esta persona'} para ver sus fotos.</p>
            {privateAlbumRequestStatus==='pending' ? <><span className="detail-private-note">Tu solicitud está pendiente de aprobación.</span><button type="button" className="favorite-detail-btn" disabled={privateAlbumBusy} onClick={()=>cancelPrivateAlbumRequest(selectedProfile.id)}>Cancelar solicitud</button></> : <><button type="button" className="favorite-detail-btn private-album-request-btn" disabled={privateAlbumBusy} onClick={()=>requestPrivateAlbumAccess(selectedProfile.id)}>{privateAlbumBusy?'Enviando…':'＋ Pedir álbum'}</button>{privateAlbumRequestStatus==='rejected'&&<span className="detail-private-note">Podés volver a solicitar acceso.</span>}</>}
            {privateAlbumMessage&&<p className="detail-private-note">{privateAlbumMessage}</p>}
          </div>}
        </section></div>}
        {reportTarget && <div className="security-modal-backdrop" role="presentation"><form className="security-modal" onSubmit={submitUserReport}><div className="security-modal-heading"><h2>{reportTarget.messageId?'Denunciar mensaje':reportTarget.contentType==='story'?'Denunciar historia':'Denunciar perfil'}</h2><button type="button" className="logout-btn" onClick={()=>setReportTarget(null)} aria-label="Cerrar"><X size={17}/></button></div><p>Tu denuncia sobre {reportTarget.display_name || 'este usuario'} será privada y revisada por el equipo de ZUNO.{reportTarget.messageId?' Se adjuntará la referencia del mensaje para que moderación pueda revisar su contexto.':''}</p><label>Motivo<select value={reportReason} onChange={event=>setReportReason(event.target.value)}><option value="fake_profile">Perfil falso o suplantación</option><option value="harassment">Acoso o amenazas</option><option value="inappropriate_content">Contenido inapropiado</option><option value="spam">Spam</option><option value="underage">Posible menor de edad</option><option value="scam">Estafa o fraude</option><option value="other">Otro motivo</option></select></label><label>Detalles (opcional)<textarea rows="4" maxLength="2000" value={reportDetails} onChange={event=>setReportDetails(event.target.value)} placeholder="Contanos qué pasó…"/></label><div className="security-modal-actions"><button type="button" className="logout-btn" onClick={()=>setReportTarget(null)}>Cancelar</button><button type="submit" className="submit-btn" disabled={reportBusy}>{reportBusy?'Enviando…':'Enviar denuncia'}</button></div></form></div>}
        <ZunoBottomNav view={view} setView={setView} onLogout={logout} adminVisible={String(profile?.username||'').trim().toLowerCase()==='manu.german'} unreadCount={Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)} notificationCount={notifications.filter(item=>['favorite','tap','album_access_request','album_access_decision','map_meetup_request','report_response','admin_announcement'].includes(item.notification_type)&&!item.read_at).length} mapRequestCount={notifications.filter(item=>item.notification_type==='map_meetup_request'&&!item.read_at).length} albumRequestCount={notifications.filter(item=>['album_access_request','album_access_decision'].includes(item.notification_type)&&!item.read_at).length}/><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
      </main>
    )
  }

  if (session?.user && view === 'chat' && activeConversation) return (
    <main className="app-shell chat-fullscreen">{callOverlay}
      <section className="direct-chat"><div className="direct-chat-header"><button className="logout-btn" onClick={()=>setView('home')}>← Volver</button><ProfileAvatar person={activeConversation.person} className="chat-header-avatar"/><div className="chat-header-person"><strong>{activeConversation.person?.display_name || 'Chat ZUNO'}</strong><small>{activeConversation.person?.username ? '@'+activeConversation.person.username : 'Conversación privada'}</small></div><div className="chat-call-actions"><button type="button" className="chat-call-button" title="Llamada de voz" aria-label="Llamada de voz" disabled={callBusy || !!callSession} onClick={()=>startCall('audio')}><Phone size={18}/></button><button type="button" className="chat-call-button" title="Videollamada" aria-label="Videollamada" disabled={callBusy || !!callSession} onClick={()=>startCall('video')}><Video size={19}/></button></div><div className="ephemeral-settings"><button type="button" className={'logout-btn '+(activeConversation.ephemeral_duration_minutes?'ephemeral-active':'')} onClick={()=>setShowEphemeralMenu(value=>!value)}><span>◷</span> {activeConversation.ephemeral_duration_minutes ? 'Mensajes efímeros' : 'Mensajes normales'}</button>{showEphemeralMenu && <div className="ephemeral-menu"><strong>Desaparición de mensajes</strong><p>Los mensajes nuevos se eliminarán para ambos al cumplirse el plazo.</p>{[{value:0,label:'Desactivado'},{value:10,label:'Después de 10 minutos'},{value:60,label:'Después de 1 hora'},{value:1440,label:'Después de 24 horas'},{value:10080,label:'Después de 7 días'}].map(option=><button key={option.value} type="button" disabled={ephemeralBusy} className={activeConversation.ephemeral_duration_minutes===option.value?'selected':''} onClick={()=>changeEphemeralDuration(option.value)}>{option.label}{activeConversation.ephemeral_duration_minutes===option.value?' ✓':''}</button>)}</div>}</div></div>

                <div ref={chatMessagesContainerRef} className={`direct-chat-messages ${chatDragOver ? 'is-drag-over' : ''}`} onTouchStart={handleChatSwipeStart} onTouchEnd={handleChatSwipeEnd} onDragOver={event=>{event.preventDefault();setChatDragOver(true)}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget))setChatDragOver(false)}} onDrop={handleChatDrop}>{chatMessages.map(message=><div key={message.id} className={message.sender_id===session.user.id?'chat-bubble own':'chat-bubble'} onTouchStart={()=>{if(longPressTimerRef.current)window.clearTimeout(longPressTimerRef.current);longPressTimerRef.current=window.setTimeout(()=>setActiveMessageMenu(message.id),550)}} onTouchEnd={()=>{if(longPressTimerRef.current)window.clearTimeout(longPressTimerRef.current)}} onTouchMove={()=>{if(longPressTimerRef.current)window.clearTimeout(longPressTimerRef.current)}} onTouchCancel={()=>{if(longPressTimerRef.current)window.clearTimeout(longPressTimerRef.current)}} onContextMenu={event=>event.preventDefault()}>{message.message_type==='image' ? <>{message.body && <p className="chat-story-reply-text">{message.body}</p>}<div className="chat-image-protected" onContextMenu={event=>event.preventDefault()} onClick={()=>{setChatImageZoom(1);setChatImageFullscreen(message.media_url || '')}}><img src={message.media_url || ''} alt="Imagen privada del chat" draggable="false"/><span className="chat-image-watermark">@{profile?.username || profile?.display_name || 'ZUNO'}</span></div></> : message.message_type==='video' ? <><video className="chat-video-message" src={message.media_url || ''} controls playsInline preload="metadata"/>{message.body && <p className="chat-story-reply-text">{message.body}</p>}</> : message.message_type==='audio' ? <ChatAudioPlayer src={message.media_url} error={message.media_error}/> : message.message_type==='location' ? <div className="chat-location-message"><MapPin size={20}/><strong>Ubicación compartida</strong><button type="button" onClick={()=>{setLocationMapTarget({latitude:message.latitude,longitude:message.longitude,label:'Ubicación compartida'});setLocationMapOpen(true)}}>Ver mapa</button></div> : message.body?.startsWith('Ha respondido al perfil:\n') ? <div className="profile-reply-chat"><strong>Ha respondido al perfil</strong><p>{message.body.slice('Ha respondido al perfil:\n'.length)}</p></div> : <p>{message.body}</p>}<time>{new Date(message.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}{message.sender_id===session.user.id && <span className={'message-ticks '+(messageReceipts[message.id]?.read_at?'is-read':messageReceipts[message.id]?.delivered_at?'is-delivered':'')}>{messageReceipts[message.id]?.read_at?'✓✓':messageReceipts[message.id]?.delivered_at?'✓✓':'✓'}</span>}{message.expires_at && <small className="message-expiry-label"> · Se elimina {new Date(message.expires_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>}</time><div className="chat-message-actions"><button type="button" className="chat-message-menu-trigger" aria-label="Opciones del mensaje" onClick={()=>setActiveMessageMenu(current=>current===message.id?null:message.id)}>⋯</button>{activeMessageMenu===message.id && <div className="chat-message-menu">{message.sender_id!==session.user.id && (reportedMessageIds.includes(message.id) ? <div className="chat-message-reported"><CheckCircle2 size={14}/> Denunciado</div> : <button type="button" onClick={()=>{setReportTarget({id:activeConversation.person.id,display_name:activeConversation.person.display_name||activeConversation.person.username||'este usuario',messageId:message.id,conversationId:activeConversation.id,contentType:'chat_message'});setReportReason('inappropriate_content');setReportDetails('');setActiveMessageMenu(null)}}><Flag size={14}/> Denunciar mensaje</button>)}<button type="button" onClick={()=>hideMessageForMe(message)}>Eliminar para mí</button>{message.sender_id===session.user.id && <button type="button" onClick={()=>deleteMessageForEveryone(message)}>Eliminar para todos</button>}</div>}</div></div>)}{otherUserTyping && <div className="chat-typing-indicator"><span/><span/><span/> Está escribiendo…</div>}{chatDragOver && <div className="chat-drop-hint">Soltá las imágenes acá para prepararlas</div>}</div>
        {peopleError && <div className="notice error">{peopleError}</div>}
        {chatImageFullscreen && <div className="chat-image-fullscreen" role="dialog" aria-modal="true" aria-label="Foto ampliada" onClick={()=>{setChatImageFullscreen(null);setChatImageZoom(1)}} onWheel={event=>{event.preventDefault();event.stopPropagation();setChatImageZoom(value=>Math.max(1,Math.min(4,value+(event.deltaY<0?0.2:-0.2))))}}><button type="button" className="chat-image-fullscreen-close" onClick={()=>{setChatImageFullscreen(null);setChatImageZoom(1)}} aria-label="Cerrar foto"><X size={25}/></button><img src={chatImageFullscreen} alt="Foto del chat ampliada" style={{transform:`scale(${chatImageZoom})`}} onClick={event=>event.stopPropagation()} onTouchStart={event=>{if(event.touches.length===2){event.preventDefault();const dx=event.touches[0].clientX-event.touches[1].clientX;const dy=event.touches[0].clientY-event.touches[1].clientY;chatPinchDistanceRef.current=Math.hypot(dx,dy)}}} onTouchMove={event=>{if(event.touches.length===2&&chatPinchDistanceRef.current){event.preventDefault();const dx=event.touches[0].clientX-event.touches[1].clientX;const dy=event.touches[0].clientY-event.touches[1].clientY;const nextDistance=Math.hypot(dx,dy);setChatImageZoom(value=>Math.max(1,Math.min(4,value*(nextDistance/chatPinchDistanceRef.current))));chatPinchDistanceRef.current=nextDistance}}} onTouchEnd={event=>{if(event.touches.length<2)chatPinchDistanceRef.current=0}}/></div>}
        {deleteConfirmMessage && <div className="zuno-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setDeleteConfirmMessage(null)}}><section className="zuno-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title"><h2 id="delete-modal-title">¿Eliminar para todos?</h2><p>Este mensaje desaparecerá del chat de ambas personas. Esta acción no se puede deshacer.</p><div><button type="button" className="logout-btn" disabled={chatMediaBusy} onClick={()=>setDeleteConfirmMessage(null)}>Cancelar</button><button type="button" className="zuno-modal-danger" disabled={chatMediaBusy} onClick={confirmDeleteMessageForEveryone}>{chatMediaBusy?'Eliminando…':'Eliminar para todos'}</button></div></section></div>}
        {chatDraftImages.length > 0 && <div className="chat-image-editor"><div className="chat-editor-heading"><strong>Prepará tus fotos ({chatDraftImages.length}/5)</strong><span>Se enviarán solo cuando pulses Enviar fotos</span></div><div className="chat-editor-grid">{chatDraftImages.map(item=><div className="chat-editor-card" key={item.id}><div className="chat-editor-preview" onPointerDown={event=>startCropDrag(event,item)} title={item.zoom>1?"Arrastrá para elegir el recorte":"Acercá la imagen para poder moverla"}><img src={item.url} alt="Vista previa" draggable="false" style={{transform:`translate(${(item.offsetX||0)*((item.zoom-1)/(2*item.zoom))*100}%, ${(item.offsetY||0)*((item.zoom-1)/(2*item.zoom))*100}%) rotate(${item.rotation}deg) scale(${item.zoom})`}}/></div><div className="chat-editor-controls"><button type="button" onClick={()=>updateDraftImage(item.id,{rotation:(item.rotation+270)%360})}>↶ Girar</button><button type="button" onClick={()=>updateDraftImage(item.id,{rotation:(item.rotation+90)%360})}>↷</button><label>Recorte <input type="range" min="1" max="2.5" step="0.05" value={item.zoom} onChange={event=>updateDraftImage(item.id,{zoom:Number(event.target.value),offsetX:0,offsetY:0})}/></label><button type="button" className="chat-editor-remove" onClick={()=>removeDraftImage(item.id)}>Quitar</button></div></div>)}</div><button type="button" className="chat-send-images" onClick={sendPreparedImages} disabled={chatMediaBusy}>{chatMediaBusy?'Enviando…':`Enviar ${chatDraftImages.length} foto(s)`}</button></div>}
        {showChatGallery && chatGallery.length > 0 && <div className="chat-gallery-strip"><strong>Fotos que ya enviaste</strong><div>{chatGallery.map(item=><button type="button" key={item.id} onClick={()=>addGalleryImage(item)} disabled={chatDraftImages.length>=5} title="Volver a usar esta foto"><img src={item.url} alt="Foto anterior"/><span>+</span></button>)}</div></div>}
        {audioDraft && <div className="chat-audio-draft"><strong>Escuchá tu audio antes de enviarlo</strong><audio controls preload="metadata" src={audioDraft.url}/><div><button type="button" onClick={discardAudioDraft} disabled={chatMediaBusy}>Eliminar</button><button type="button" onClick={sendChatAudio} disabled={chatMediaBusy}>{chatMediaBusy?'Enviando…':'Enviar audio'}</button></div></div>}
        <div className="chat-live-location-list">{liveLocations.filter(item => !item.ended_at && new Date(item.expires_at).getTime() > Date.now()).map(item=><div className="chat-live-location" key={item.id}><MapPin size={17}/><span>{item.sender_id === session.user.id ? 'Estás compartiendo tu ubicación' : 'Esta persona comparte su ubicación'}<small>Hasta {new Date(item.expires_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></span><button type="button" onClick={()=>{setLocationMapTarget({id:item.id,latitude:item.latitude,longitude:item.longitude,label:item.sender_id===session.user.id?'Tu ubicación en tiempo real':'Ubicación en tiempo real'});setLocationMapOpen(true)}}>Ver mapa</button>{item.sender_id === session.user.id && <button type="button" onClick={()=>stopLiveLocation(item.id)}><StopCircle size={16}/> Detener</button>}</div>)}</div>
        {showLocationMenu && <div className="chat-location-menu"><strong>Compartir ubicación</strong><button type="button" onClick={sendCurrentLocation} disabled={chatMediaBusy}><MapPin size={17}/> Enviar ubicación actual</button><button type="button" onClick={()=>startLiveLocation(30)} disabled={chatMediaBusy || !!liveSharing}><Navigation size={17}/> En tiempo real · 30 minutos</button><button type="button" onClick={()=>startLiveLocation(60)} disabled={chatMediaBusy || !!liveSharing}><Navigation size={17}/> En tiempo real · 1 hora</button><small>Podés detener la ubicación en cualquier momento.</small></div>}
        <form className="chat-compose" onSubmit={sendChatMessage}><label className="chat-image-upload chat-compose-control" title="Subir fotos"><ImagePlus size={19}/><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={event=>{addChatImages(event.target.files);event.target.value=''}} disabled={chatDraftImages.length>=5}/></label><button type="button" className={`chat-gallery-toggle ${showChatGallery?'active':''}`} title="Reutilizar fotos anteriores" aria-label="Reutilizar fotos anteriores" disabled={!chatGallery.length} onClick={()=>setShowChatGallery(value=>!value)}><Images size={19}/></button><input value={chatDraft} onChange={event=>handleChatDraftChange(event.target.value)} placeholder="Escribí un mensaje…" maxLength={4000}/><button type="button" className="chat-gallery-toggle" title="Compartir ubicación" aria-label="Compartir ubicación" onClick={()=>setShowLocationMenu(value=>!value)}><MapPin size={19}/></button><button type="button" className={`chat-mic-button ${isRecording?'recording':''}`} title={isRecording?'Soltá para terminar':'Mantené presionado para grabar'} aria-label="Mantener presionado para grabar audio" disabled={!!audioDraft||chatMediaBusy} onPointerDown={startChatRecording} onPointerUp={stopChatRecording} onPointerCancel={stopChatRecording} onContextMenu={event=>event.preventDefault()}><Mic size={19}/></button><button type="submit" disabled={chatBusy||!chatDraft.trim()}><Send size={18}/></button></form>
        {isRecording && <div className="chat-recording-hint">Grabando… soltá el micrófono para terminar.</div>}
      </section>{reportTarget && <div className="security-modal-backdrop" role="presentation"><form className="security-modal" onSubmit={submitUserReport}><div className="security-modal-heading"><h2>{reportTarget.messageId?'Denunciar mensaje':reportTarget.contentType==='story'?'Denunciar historia':'Denunciar perfil'}</h2><button type="button" className="logout-btn" onClick={()=>setReportTarget(null)} aria-label="Cerrar"><X size={17}/></button></div><p>Tu denuncia sobre {reportTarget.display_name || 'este usuario'} será privada y revisada por el equipo de ZUNO.{reportTarget.messageId?' Se adjuntará la referencia del mensaje para que moderación pueda revisar su contexto.':''}</p><label>Motivo<select value={reportReason} onChange={event=>setReportReason(event.target.value)}><option value="fake_profile">Perfil falso o suplantación</option><option value="harassment">Acoso o amenazas</option><option value="inappropriate_content">Contenido inapropiado</option><option value="spam">Spam</option><option value="underage">Posible menor de edad</option><option value="scam">Estafa o fraude</option><option value="other">Otro motivo</option></select></label><label>Detalles (opcional)<textarea rows="4" maxLength="2000" value={reportDetails} onChange={event=>setReportDetails(event.target.value)} placeholder="Contanos qué pasó…"/></label><div className="security-modal-actions"><button type="button" className="logout-btn" onClick={()=>setReportTarget(null)}>Cancelar</button><button type="submit" className="submit-btn" disabled={reportBusy}>{reportBusy?'Enviando…':'Enviar denuncia'}</button></div></form></div>}{botLocationPickerOpen && <div className="zuno-location-map-backdrop bot-location-picker-backdrop" role="dialog" aria-modal="true" aria-label="Elegir ubicación del bot"><div className="zuno-location-map-panel bot-location-picker-panel"><header><div><strong>Ubicación del bot</strong><small>Hacé clic en el mapa para elegir dónde aparecerá en Explorar</small></div><button type="button" onClick={()=>setBotLocationPickerOpen(false)} aria-label="Cerrar mapa"><X size={23}/></button></header><div ref={botLocationMapContainerRef} className="zuno-location-map-canvas bot-location-picker-canvas"/><footer><span>{botLocationDraft ? (botLocationDraft.location_label || `${Number(botLocationDraft.latitude).toFixed(5)}, ${Number(botLocationDraft.longitude).toFixed(5)}`) : 'Seleccioná un punto en el mapa'}</span><button type="button" className="logout-btn" onClick={()=>{setAdminBotEditor(current=>({...current,latitude:null,longitude:null,location_label:''}));setBotLocationDraft(null);setBotLocationPickerOpen(false)}}>Quitar ubicación</button><button type="button" className="submit-btn" disabled={!botLocationDraft} onClick={()=>{setAdminBotEditor(current=>({...current,latitude:botLocationDraft.latitude,longitude:botLocationDraft.longitude,location_label:botLocationDraft.location_label||current.location_label||''}));setBotLocationPickerOpen(false)}}>Guardar ubicación</button></footer></div></div>}{locationMapOpen && <div className="zuno-location-map-backdrop" role="dialog" aria-modal="true" aria-label="Mapa de ubicación"><div className="zuno-location-map-panel"><header><div><strong>Ubicación en ZUNO</strong><small>{locationMapTarget?.label || 'Movimientos en tiempo real'}</small></div><button type="button" onClick={()=>{setLocationMapOpen(false);setLocationMapTarget(null)}} aria-label="Cerrar mapa"><X size={23}/></button></header><div ref={locationMapContainerRef} className="zuno-location-map-canvas"/></div></div>}<ZunoBottomNav view={view} setView={setView} onLogout={logout} adminVisible={String(profile?.username||'').trim().toLowerCase()==='manu.german'} unreadCount={Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)} notificationCount={notifications.filter(item=>!item.read_at).length} mapRequestCount={notifications.filter(item=>item.notification_type==='map_meetup_request'&&!item.read_at).length} albumRequestCount={notifications.filter(item=>item.notification_type==='album_access_request'&&!item.read_at).length}/><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  if (session?.user && view === 'map') return (
    <main className="app-shell zuno-map-fullscreen" role="dialog" aria-modal="true" aria-label="Mapa de personas cercanas">{callOverlay}
      <div className="zuno-map-topbar"><button type="button" onClick={()=>setView('home')} aria-label="Cerrar mapa"><X size={22}/></button><div><strong>ZUNO <span>MAPA</span></strong><small>{mapUsers.length + (mapVisible && mapOrigin ? 1 : 0)} perfiles · hasta 50 km</small></div><button type="button" onClick={refreshMyMapLocation} disabled={mapBusy} aria-label="Actualizar ubicación"><Navigation size={19}/></button></div>
      <div ref={mapContainerRef} className="zuno-map-canvas zuno-map-canvas-full" aria-label="Mapa de personas cercanas"/>
      <div className="zuno-map-floating-actions"><button type="button" onClick={()=>setMyMapVisibility(!mapVisible)} disabled={mapBusy}><MapPin size={16}/>{mapVisible?'Aparecés en el mapa':'Estás oculto'}</button><button type="button" onClick={refreshMyMapLocation} disabled={mapBusy}><LocateFixed size={17}/></button></div>
      {mapStatus && <div className="zuno-map-toast">{mapStatus}</div>}
      {selectedMapPerson && <div className="zuno-map-person-card"><button type="button" className="zuno-map-card-close" onClick={()=>setSelectedMapPerson(null)}><X size={18}/></button><div className="zuno-map-card-person"><span className="zuno-map-card-avatar">{selectedMapPerson.profile?.avatar_url?<img src={selectedMapPerson.profile.avatar_url} alt=""/>:<UserRound/>}</span><div><strong>{selectedMapPerson.isMe?'Eres tú':selectedMapPerson.display_name||selectedMapPerson.profile?.display_name||'Persona cercana'}</strong><small>{selectedMapPerson.isMe?'Tu perfil':(selectedMapPerson.approximate_distance_km??'—')+' km aproximadamente'}</small></div></div>{!selectedMapPerson.isMe && <><button type="button" className="zuno-map-meet-button" onClick={()=>inviteMapMeetup(selectedMapPerson)} disabled={mapInviteBusy}><Navigation size={17}/>{mapInviteBusy?'Enviando…':'Cómo llegar · Invitar a encontrarse'}</button><p>La ruta solo se activa si la otra persona acepta. Se muestra una ubicación aproximada.</p></>}</div>}
      {mapInvites.filter(item=>item.receiver_id===session.user.id&&item.status==='pending').slice(0,1).map(item=><div className="zuno-map-invite-card" key={item.id}><strong>Te invitaron a encontrarse</strong><p>¿Aceptás que ZUNO muestre una ruta aproximada para llegar?</p><div><button type="button" onClick={()=>respondMapMeetup(item,'accepted')} disabled={mapInviteBusy}>Aceptar</button><button type="button" onClick={()=>respondMapMeetup(item,'rejected')} disabled={mapInviteBusy}>Ahora no</button></div></div>)}
      {activeMapRoute && <div className="zuno-map-route-pill"><Route size={17}/><span>Ruta aproximada · {(activeMapRoute.distance/1000).toFixed(1)} km · {Math.max(1,Math.round(activeMapRoute.duration/60))} min</span><button type="button" disabled={mapInviteBusy} onClick={()=>finishMapMeetup(activeMapRoute.request)}>Finalizar</button></div>}
      {!selectedMapPerson && !mapInvites.some(item=>item.receiver_id===session.user.id&&item.status==='pending') && !activeMapRoute && <div className="zuno-map-bottom-hint"><strong>Personas cerca de vos</strong><span>Tocá una foto para invitarla a encontrarse.</span><small>Solo aparecen quienes activaron su visibilidad. Las ubicaciones son aproximadas.</small></div>}
      <ZunoBottomNav view={view} setView={setView} onLogout={logout} adminVisible={String(profile?.username||'').trim().toLowerCase()==='manu.german'} unreadCount={Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)} notificationCount={notifications.filter(item=>!item.read_at).length} mapRequestCount={notifications.filter(item=>item.notification_type==='map_meetup_request'&&!item.read_at).length} albumRequestCount={notifications.filter(item=>item.notification_type==='album_access_request'&&!item.read_at).length}/>
    </main>
  )

  if (session?.user && view === 'notifications') return (
    <main className="app-shell">{callOverlay}
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><button className="logout-btn" onClick={()=>setView('home')}><Compass size={15}/> Descubrir</button></div></header>
      <section className="notifications-page">
        <div className="home-heading notifications-heading"><div><h1>Notificaciones</h1></div>
          {notifications.some(item=>['favorite','tap','album_access_request','album_access_decision','map_meetup_request','report_response','admin_announcement'].includes(item.notification_type)&&!item.read_at) && <button type="button" className="refresh-btn" onClick={async()=>{const now=new Date().toISOString();const {error}=await supabase.from('notifications').update({read_at:now}).eq('recipient_id',session.user.id).in('notification_type',['favorite','tap','album_access_request','album_access_decision','map_meetup_request','report_response','admin_announcement']).is('read_at',null);if(!error)setNotifications(current=>current.map(item=>({...item,read_at:item.read_at||now})))}}>Marcar todas leídas</button>}
        </div>
        {peopleError && <div className="notice error">{peopleError}</div>}
        <div className="notifications-list">
          {notifications.filter(item=>['favorite','tap','album_access_request','album_access_decision','map_meetup_request','report_response','admin_announcement'].includes(item.notification_type)).length ? notifications.filter(item=>['favorite','tap','album_access_request','album_access_decision','map_meetup_request','report_response','admin_announcement'].includes(item.notification_type)).map(item=>{const actor=notificationActors[item.actor_id];const name=actor?.display_name||actor?.username||'Un miembro de ZUNO';return <article className={'notification-card '+(!item.read_at?'unread':'')} key={item.id}>
            <button type="button" className="notification-main" onClick={()=>openNotification(item)}>
              <span className={'notification-symbol '+item.notification_type}>{['report_response','admin_announcement'].includes(item.notification_type)?<ShieldCheck size={19}/>:item.notification_type==='map_meetup_request'?<MapPin size={19}/>:item.notification_type==='album_access_request'?<Images size={19}/>:item.notification_type==='tap'?<Flame size={19}/>:<Heart size={19}/>}</span>
              <span className="notification-copy"><strong>{item.title}</strong><span>{['report_response','admin_announcement'].includes(item.notification_type)?'Equipo de ZUNO':name} · {item.body}</span><time>{new Date(item.created_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</time></span>
              {!item.read_at && <i className="notification-unread-dot"/>}
            </button>

            {item.notification_type==='map_meetup_request' && (()=>{const request=mapInvites.find(row=>row.id===item.entity_id);const status=request?.status||'pending';return status==='pending'?<div className="notification-actions"><button type="button" className="accept-btn" disabled={mapInviteBusy} onClick={()=>respondMapMeetup({id:item.entity_id,sender_id:item.actor_id,receiver_id:session.user.id,status},'accepted')}><Check size={15}/> Aceptar</button><button type="button" className="reject-btn" disabled={mapInviteBusy} onClick={()=>respondMapMeetup({id:item.entity_id,sender_id:item.actor_id,receiver_id:session.user.id,status},'rejected')}><X size={15}/> Rechazar</button><button type="button" className="reject-btn" disabled={mapInviteBusy} onClick={()=>respondMapMeetup({id:item.entity_id,sender_id:item.actor_id,receiver_id:session.user.id,status},'ignored')}>Ignorar</button></div>:<div className="notification-resolution"><Check size={15}/><span>{status==='accepted'?'Solicitud aceptada':status==='rejected'?'Solicitud rechazada':status==='ignored'?'Solicitud ignorada':status==='cancelled'?'Encuentro finalizado':'Solicitud '+status}</span><time>{request?.updated_at?new Date(request.updated_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'Guardado en el historial'}</time></div>})()}
            {item.notification_type==='report_response' && <div className="notification-resolution"><ShieldCheck size={15}/><span>Respuesta del equipo de moderación sobre tu denuncia.</span></div>}
            {item.notification_type==='album_access_decision' && <div className="notification-resolution"><Check size={15}/><span>{item.body || 'La persona respondió tu solicitud de acceso al álbum privado.'}</span></div>}
            {item.notification_type==='album_access_request' && (item.albumDecisionStatus==='approved' || item.albumDecisionStatus==='rejected' ? <div className="notification-resolution"><Check size={15}/><span>Decisión tomada: {item.albumDecisionStatus==='approved'?'permitiste el acceso al álbum privado.':'rechazaste la solicitud de acceso al álbum privado.'}</span></div> : item.albumDecisionStatus==='missing' ? <div className="notification-resolution"><CircleAlert size={15}/><span>Esta solicitud ya no está disponible.</span></div> : <div className="notification-actions"><button type="button" className="accept-btn" disabled={notificationBusy===item.id} onClick={()=>decidePrivateAlbumRequest(item,'approved')}><Check size={15}/> {notificationBusy===item.id?'Guardando…':'Permitir'}</button><button type="button" className="reject-btn" disabled={notificationBusy===item.id} onClick={()=>decidePrivateAlbumRequest(item,'rejected')}><X size={15}/> Rechazar</button><button type="button" className="later-btn" disabled={notificationBusy===item.id} onClick={()=>markNotificationRead(item.id)}>Más tarde</button></div>)}
            <button type="button" className="notification-delete" aria-label="Eliminar notificación" onClick={()=>deleteNotification(item.id)}><Trash2 size={15}/></button>
          </article>}) : <div className="empty-state"><Bell size={28}/><h3>Todo al día</h3><p>Cuando recibas una novedad, un tap, una solicitud o un aviso del equipo de ZUNO, aparecerá acá.</p></div>}
        </div>
      </section>
      <ZunoBottomNav view={view} setView={setView} onLogout={logout} adminVisible={String(profile?.username||'').trim().toLowerCase()==='manu.german'} unreadCount={Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)} notificationCount={notifications.filter(item=>!item.read_at).length} mapRequestCount={notifications.filter(item=>item.notification_type==='map_meetup_request'&&!item.read_at).length} albumRequestCount={notifications.filter(item=>item.notification_type==='album_access_request'&&!item.read_at).length}/><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  if (session?.user && view === 'chats') return (
    <main className="app-shell">{callOverlay}<header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions"><button className="logout-btn" onClick={()=>setView('home')}><Compass size={15}/> Descubrir</button></div></header>
      <section className="chat-page"><div className="home-heading"><div><h1>Tus <span>chats.</span></h1></div></div>
        <div className="chat-list-tabs" role="tablist" aria-label="Carpetas de mensajes">
          <button type="button" role="tab" aria-selected={chatListTab==='messages'} className={chatListTab==='messages'?'active':''} onClick={()=>setChatListTab('messages')}><MessageCircle size={16}/> Mensajes</button>
          <button type="button" role="tab" aria-selected={chatListTab==='archived'} className={chatListTab==='archived'?'active':''} onClick={()=>setChatListTab('archived')}><Archive size={16}/> Archivados <span>{conversations.filter(item=>item.member_one===session.user.id?item.archived_by_one:item.archived_by_two).length}</span></button>
        </div>
        {peopleError && <div className="notice error">{peopleError}</div>}
        <div className="chat-list">{conversations.filter(item=>chatListTab==='archived'?(item.member_one===session.user.id?item.archived_by_one:item.archived_by_two):!(item.member_one===session.user.id?item.archived_by_one:item.archived_by_two)).length ? conversations.filter(item=>chatListTab==='archived'?(item.member_one===session.user.id?item.archived_by_one:item.archived_by_two):!(item.member_one===session.user.id?item.archived_by_one:item.archived_by_two)).map(item=><div className="chat-list-item" key={item.id} role="button" tabIndex={0} onClick={()=>openChat({...item.person,id:item.member_one===session.user.id?item.member_two:item.member_one})} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openChat({...item.person,id:item.member_one===session.user.id?item.member_two:item.member_one})}}}><span className="chat-list-avatar"><ProfileAvatar person={item.person}/></span><span className="chat-list-name"><strong>{item.person?.display_name||'Miembro de ZUNO'}</strong><small>{item.lastMessage ? (item.lastMessage.message_type==='image'?'📷 Foto':item.lastMessage.message_type==='audio'?'🎤 Audio':item.lastMessage.message_type==='location'?'📍 Ubicación':(item.lastMessage.body||'Mensaje').slice(0,90)) : 'Todavía no hay mensajes' }{item.lastMessage?.sender_id===session.user.id && <span className={'message-ticks '+(item.lastReceipt?.read_at?'is-read':item.lastReceipt?.delivered_at?'is-delivered':'')}>{item.lastReceipt?.delivered_at?'✓✓':'✓'}</span>}</small></span>{(unreadCounts[item.id]||0)>0 && <span className="chat-unread-count">{unreadCounts[item.id]}</span>}<span className="chat-row-actions"><button type="button" title="Chatear" aria-label="Chatear" onClick={event=>{event.stopPropagation();openChat({...item.person,id:item.member_one===session.user.id?item.member_two:item.member_one})}}><MessageCircle size={18}/></button><button type="button" title={chatListTab==='archived'?'Restaurar chat':'Archivar chat'} aria-label={chatListTab==='archived'?'Restaurar chat':'Archivar chat'} onClick={async event=>{event.stopPropagation();const side=item.member_one===session.user.id?'one':'two';const {error}=await supabase.from('conversations').update({['archived_by_'+side]:chatListTab!=='archived'}).eq('id',item.id);if(error){setPeopleError('No se pudo actualizar el chat: '+error.message);return}setConversations(current=>current.map(chat=>chat.id===item.id?{...chat,['archived_by_'+side]:chatListTab!=='archived'}:chat))}}>{chatListTab==='archived'?<ArchiveRestore size={18}/>:<Archive size={18}/>}</button><button type="button" title="Borrar chat" aria-label="Borrar chat" onClick={async event=>{event.stopPropagation();const side=item.member_one===session.user.id?'one':'two';const {error}=await supabase.from('conversations').update({['deleted_by_'+side]:true}).eq('id',item.id);if(error){setPeopleError('No se pudo borrar: '+error.message);return}setConversations(current=>current.filter(chat=>chat.id!==item.id))}}><Trash2 size={18}/></button></span></div>) : <div className="connections-empty chat-empty-state"><strong>{chatListTab==='archived'?'No hay mensajes archivados':'No hay chats'}</strong><span>{chatListTab==='archived'?'Los chats que archives aparecerán acá.':'Cuando quieras, podés iniciar una conversación con cualquier persona.'}</span>{chatListTab==='messages' && <button type="button" className="refresh-btn" onClick={()=>setView('home')}><Compass size={15}/> Descubrir personas</button>}</div>}</div>
      </section><ZunoBottomNav view={view} setView={setView} onLogout={logout} adminVisible={String(profile?.username||'').trim().toLowerCase()==='manu.german'} unreadCount={Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)} notificationCount={notifications.filter(item=>!item.read_at).length} mapRequestCount={notifications.filter(item=>item.notification_type==='map_meetup_request'&&!item.read_at).length} albumRequestCount={notifications.filter(item=>item.notification_type==='album_access_request'&&!item.read_at).length}/><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer></main>
  )
  if (session?.user && view === 'admin' && String(profile?.username||'').trim().toLowerCase() === 'manu.german' && !adminVerificationComplete) {
    return <main className="app-shell"><section className="loading-screen"><div className="loading-spinner"/><p>Verificando acceso administrativo…</p></section></main>
  }
  if (session?.user && view === 'admin' && String(profile?.username||'').trim().toLowerCase() === 'manu.german' && adminVerificationComplete && !adminAuthorized) {
    return <main className="app-shell"><section className="auth-card" style={{maxWidth:520,margin:'12vh auto',textAlign:'center'}}><ShieldAlert size={30}/><h2>Acceso administrativo no autorizado</h2><p>No pudimos verificar tus permisos en Supabase.</p><button type="button" className="primary-btn" onClick={()=>setView('home')}>Volver a ZUNO</button></section></main>
  }
  if (session?.user && view === 'admin' && String(profile?.username||'').trim().toLowerCase() === 'manu.german' && adminAuthorized) {
    const adminSections = [
      {id:'overview',label:'Resumen',icon:LayoutDashboard},
      {id:'users',label:'Usuarios',icon:UserCog},
      {id:'reports',label:'Denuncias',icon:Flag},
      {id:'content',label:'Mensajes conservados',icon:MessageCircle},
      {id:'announcements',label:'Comunicaciones',icon:Megaphone},
      {id:'security',label:'Seguridad',icon:ShieldCheck},
      {id:'bots',label:'Bots',icon:Sparkles},
      {id:'settings',label:'Configuración',icon:Settings}
    ]
    const adminTitles = {
      overview:['Centro de control','Una vista general del estado de ZUNO.'],
      users:['Gestión de usuarios','Buscá cuentas y administrá su estado.'],
      reports:['Centro de denuncias','Revisá reportes y actuá sobre incumplimientos.'],
      content:['Mensajes conservados','Mensajes archivados con acceso administrativo auditado.'],
      announcements:['Comunicaciones','Prepará avisos para toda la comunidad.'],
      security:['Seguridad y auditoría','Permisos, actividad administrativa y controles.'],
      bots:['Administración de bots','Creá personajes, definí sus historias y configurá cómo interactúan.'],
      settings:['Configuración de ZUNO','Parámetros generales de la plataforma.']
    }
    const currentAdminTitle = adminTitles[adminSection] || adminTitles.overview
    const adminModules = [
      {id:'users',title:'Usuarios',description:'Buscar perfiles, revisar cuentas y aplicar medidas.',icon:Users},
      {id:'reports',title:'Denuncias',description:'Priorizar reportes y registrar resoluciones.',icon:Flag},
      {id:'content',title:'Mensajes conservados',description:'Consultar mensajes archivados y sus datos de conservación.',icon:MessageCircle},
      {id:'announcements',title:'Comunicaciones',description:'Enviar avisos y novedades a la comunidad.',icon:Megaphone},
      {id:'security',title:'Seguridad',description:'Roles, accesos y registro de acciones.',icon:LockKeyhole},
      {id:'bots',title:'Bots',description:'Crear personajes virtuales y configurar sus personalidades.',icon:Sparkles},
      {id:'settings',title:'Configuración',description:'Gestionar parámetros y políticas de ZUNO.',icon:Settings}
    ]
    const AdminIcon = adminSections.find(item=>item.id===adminSection)?.icon || LayoutDashboard
    return (
      <main className="app-shell zuno-admin-shell">{callOverlay}
        {botLocationPickerOpen && <div className="zuno-location-map-backdrop bot-location-picker-backdrop" role="dialog" aria-modal="true" aria-label="Elegir ubicación del bot"><div className="zuno-location-map-panel bot-location-picker-panel"><header><div><strong>Ubicación del bot</strong><small>Hacé clic en el mapa para elegir dónde aparecerá en Explorar</small></div><button type="button" onClick={()=>setBotLocationPickerOpen(false)} aria-label="Cerrar mapa"><X size={23}/></button></header><div ref={botLocationMapContainerRef} className="zuno-location-map-canvas bot-location-picker-canvas"/><footer><span>{botLocationDraft ? `${Number(botLocationDraft.latitude).toFixed(5)}, ${Number(botLocationDraft.longitude).toFixed(5)}` : 'Seleccioná un punto en el mapa'}</span><button type="button" className="logout-btn" onClick={()=>{setAdminBotEditor(current=>({...current,latitude:null,longitude:null}));setBotLocationDraft(null);setBotLocationPickerOpen(false)}}>Quitar ubicación</button><button type="button" className="submit-btn" disabled={!botLocationDraft} onClick={()=>{setAdminBotEditor(current=>({...current,latitude:botLocationDraft.latitude,longitude:botLocationDraft.longitude}));setBotLocationPickerOpen(false)}}>Guardar ubicación</button></footer></div></div>}
        <header className="topbar zuno-admin-topbar"><a className="brand" href="#" onClick={event=>{event.preventDefault();setView('home')}}><span className="brand-mark">z</span> zuno <span className="admin-brand-label">ADMIN</span></a><div className="account-actions"><span className="admin-account-pill"><span/> @manu.german</span><button className="logout-btn" onClick={()=>setView('home')}><Compass size={15}/> Volver a ZUNO</button></div></header>
        <section className="zuno-admin-layout">
          <aside className="zuno-admin-sidebar">
            <div className="zuno-admin-sidebar-heading"><span className="zuno-admin-shield"><ShieldCheck size={21}/></span><div><strong>Administración</strong><small>Panel de control</small></div></div>
            <div className="zuno-admin-nav-label">PLATAFORMA</div>
            <nav aria-label="Secciones de administración">{adminSections.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} className={adminSection===item.id?'active':''} onClick={()=>setAdminSection(item.id)}><Icon size={18}/><span>{item.label}</span></button>})}</nav>
            <div className="zuno-admin-sidebar-bottom"><span className="admin-online-dot"/> Sesión de administrador<div>Acceso visual restringido</div></div>
          </aside>
          <div className="zuno-admin-main">
            <div className="zuno-admin-page-heading"><div><div className="eyebrow"><ShieldCheck size={14}/> ZUNO · ADMINISTRACIÓN</div><h1>{currentAdminTitle[0]}</h1><p>{currentAdminTitle[1]}</p></div><div className="admin-heading-actions"><span className="admin-secure-tag"><LockKeyhole size={13}/> Área privada</span><button type="button" className="admin-refresh" onClick={()=>setAdminSection('overview')}><RefreshCw size={15}/> Inicio</button></div></div>
            <div className="zuno-admin-security-notice"><ShieldCheck size={18}/><div><strong>Acceso administrativo verificado</strong><span>Supabase confirmó tu rol de administrador. Las consultas y acciones sensibles se validan nuevamente en el servidor.</span></div></div>
            {adminSection==='overview' ? <>
              <div className="zuno-admin-welcome"><div><span className="admin-welcome-kicker">CENTRO DE CONTROL</span><h2>Hola, administrador.</h2><p>Desde acá vas a poder supervisar la comunidad y mantener ZUNO seguro.</p></div><div className="admin-welcome-art"><ShieldCheck size={54}/><span/></div></div>
              <div className="zuno-admin-section-title admin-stats-heading"><div><h2>Estadísticas de ZUNO</h2><p>Indicadores generales consultados directamente en Supabase.</p></div><button type="button" className="admin-refresh" onClick={()=>setAdminStatsRefresh(value=>value+1)} disabled={adminStatsLoading}><RefreshCw size={15}/> {adminStatsLoading?'Actualizando...':'Actualizar cifras'}</button></div>
              {adminStatsError && <div className="admin-users-error"><CircleAlert size={16}/>{adminStatsError}</div>}
              <div className="zuno-admin-stats zuno-admin-live-stats">
                <article><span className="admin-stat-icon purple"><Users size={19}/></span><div><small>Usuarios registrados</small><strong>{Number(adminStats?.total_users||0).toLocaleString('es-UY')}</strong><em>Total de perfiles</em></div></article>
                <article><span className="admin-stat-icon pink"><Activity size={19}/></span><div><small>Activos visibles ahora</small><strong>{Number(adminStats?.active_visible_5m||0).toLocaleString('es-UY')}</strong><em>Últimos 5 minutos</em></div></article>
                <article><span className="admin-stat-icon blue"><Users size={19}/></span><div><small>Activos visibles 24 h</small><strong>{Number(adminStats?.active_visible_24h||0).toLocaleString('es-UY')}</strong><em>Últimas 24 horas</em></div></article>
                <article><span className="admin-stat-icon orange"><UserPlus size={19}/></span><div><small>Registros de hoy</small><strong>{Number(adminStats?.registrations_today||0).toLocaleString('es-UY')}</strong><em>{Number(adminStats?.registrations_7d||0).toLocaleString('es-UY')} en los últimos 7 días</em></div></article>
                <article><span className="admin-stat-icon purple"><Flag size={19}/></span><div><small>Denuncias recibidas</small><strong>{Number(adminStats?.total_reports||0).toLocaleString('es-UY')}</strong><em>{Number(adminStats?.pending_reports||0).toLocaleString('es-UY')} pendientes</em></div></article>
                <article><span className="admin-stat-icon pink"><ShieldCheck size={19}/></span><div><small>Sanciones activas</small><strong>{Number(adminStats?.active_sanctions||0).toLocaleString('es-UY')}</strong><em>{Number(adminStats?.total_sanctions||0).toLocaleString('es-UY')} medidas registradas</em></div></article>
              </div>
              <section className="admin-stats-chart-card"><div className="admin-stats-chart-heading"><div><h3>Registros de los últimos 7 días</h3><p>Altas nuevas por día, según la fecha de creación del perfil.</p></div><span>7 DÍAS</span></div><div className="admin-stats-bars">{(Array.isArray(adminStats?.registrations_by_day)?adminStats.registrations_by_day:[]).map((item,index)=>{const maximum=Math.max(1,...(adminStats?.registrations_by_day||[]).map(day=>Number(day.count)||0));const count=Number(item.count)||0;return <div className="admin-stats-bar-column" key={item.day||index}><strong>{count}</strong><div className="admin-stats-bar-track"><span style={{height:Math.max(5,Math.round(count/maximum*100))+'%'}}/></div><small>{item.day}</small></div>})}{!adminStatsLoading && !adminStats?.registrations_by_day?.length && <p className="admin-stats-no-data">Todavía no hay datos de registros.</p>}</div></section>
              <p className="admin-stats-privacy-note">La actividad se cuenta únicamente entre perfiles que permiten mostrar su estado en línea. Las cifras se actualizan al entrar al resumen o al pulsar «Actualizar cifras».</p>
              <div className="zuno-admin-section-title"><div><h2>Herramientas de administración</h2><p>Módulos previstos para gestionar la plataforma.</p></div></div>
              <div className="zuno-admin-module-grid">{adminModules.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} className="zuno-admin-module" onClick={()=>setAdminSection(item.id)}><span className="admin-module-icon"><Icon size={20}/></span><span className="admin-module-copy"><strong>{item.title}</strong><small>{item.description}</small></span><ChevronRight size={18}/></button>})}</div>
              <div className="zuno-admin-bottom-grid"><article className="zuno-admin-info-card"><div><Database size={18}/><strong>Base de datos</strong></div><p>Las denuncias y los mensajes conservados se consultan mediante funciones protegidas y con auditoría.</p><span className="admin-status-pending"><ShieldCheck size={13}/> Consultas protegidas</span></article><article className="zuno-admin-info-card"><div><CheckCircle2 size={18}/><strong>Acceso actual</strong></div><p>El acceso se valida con la función zuno_is_admin() de Supabase.</p><span className="admin-status-pending"><CheckCircle2 size={13}/> Rol verificado</span></article></div>
            </> : adminSection==='users' ? <section className="admin-users-workspace">
              <div className="admin-users-toolbar">
                <div><span className="admin-welcome-kicker">DIRECTORIO DE LA COMUNIDAD</span><h2>Usuarios registrados</h2><p>Listado obtenido mediante una función protegida de Supabase.</p></div>
                <button type="button" className="admin-refresh" onClick={()=>setAdminUsersRefresh(value=>value+1)} disabled={adminUsersLoading}><RefreshCw size={15}/> Actualizar</button>
              </div>
              <form className="admin-users-search" onSubmit={event=>{event.preventDefault();setAdminSelectedUser(null);setAdminUsersRefresh(value=>value+1)}}>
                <Search size={18}/><input value={adminSearch} onChange={event=>setAdminSearch(event.target.value)} placeholder="Buscar por usuario o nombre..."/><button type="submit">Buscar</button>
              </form>
              {adminUsersError && <div className="admin-users-error"><CircleAlert size={16}/>{adminUsersError}</div>}
              {adminUsersLoading ? <div className="admin-users-empty"><RefreshCw size={20}/> Cargando usuarios...</div> : adminSelectedUser ? <div className="admin-user-detail">
                <button type="button" className="admin-user-back" onClick={()=>setAdminSelectedUser(null)}><ChevronLeft size={16}/> Volver a usuarios</button>
                <div className="admin-user-detail-head"><ProfileAvatar person={adminSelectedUser} className="admin-user-avatar"/><div><h3>{adminSelectedUser.display_name || adminSelectedUser.username || 'Usuario'}</h3><p>@{adminSelectedUser.username || 'sin-usuario'}</p><small>Registrado: {adminSelectedUser.created_at ? new Date(adminSelectedUser.created_at).toLocaleString('es-UY') : 'Sin dato'}</small></div></div>
                <div className="admin-user-detail-grid"><article><small>Identificador</small><strong>{adminSelectedUser.id}</strong></article><article><small>Cuenta verificada</small><strong>{adminSelectedUser.zuno_verified ? 'Sí' : 'No'}</strong></article></div>
                <div className="admin-user-detail-bio"><strong>Biografía</strong><p>{adminSelectedUser.bio || 'Este usuario no agregó una biografía.'}</p></div>
                <section className="admin-user-media-section">
                  <div className="admin-user-media-heading"><div><strong>Fotos e historias</strong><small>Contenido consultado con permiso administrativo y acceso auditado.</small></div><span>{adminUserMedia.length} elementos</span></div>
                  {adminUserMediaLoading ? <div className="admin-users-empty"><RefreshCw size={20}/> Cargando contenido...</div> : adminUserMediaError ? <div className="admin-users-error"><CircleAlert size={16}/>{adminUserMediaError}</div> : adminUserMedia.length ? <div className="admin-user-media-grid">{adminUserMedia.map(item=><article className="admin-user-media-card" key={item.media_kind+'-'+item.media_id}>
                    {item.signedUrl ? item.media_type?.startsWith('video') ? <video src={item.signedUrl} controls preload="metadata"/> : <img src={item.signedUrl} alt={item.media_kind==='story'?'Historia del usuario':'Foto de perfil del usuario'} loading="lazy"/> : <div className="admin-user-media-unavailable"><Image size={22}/><span>Archivo no disponible</span></div>}
                    <div><strong>{item.media_kind==='story'?'Historia':'Foto de perfil'}</strong><small>{item.created_at ? new Date(item.created_at).toLocaleString('es-UY') : 'Fecha no disponible'}</small>{item.caption && <p>{item.caption}</p>}</div>
                  </article>)}</div> : <div className="admin-users-empty"><Image size={24}/><strong>Sin fotos ni historias disponibles</strong><span>Este usuario no tiene contenido registrado para mostrar.</span></div>}
                </section>
                <section className="admin-sanction-panel"><div><span className="admin-welcome-kicker">MEDIDAS DE MODERACIÓN</span><h3>Estado y sanciones de la cuenta</h3><p>Las medidas quedan registradas y se notifican al usuario.</p></div><label>Duración<select value={adminSanctionDuration} onChange={event=>setAdminSanctionDuration(event.target.value)}><option value="1">24 horas</option><option value="7">7 días</option><option value="30">30 días</option><option value="permanent">Permanente</option></select></label><label>Motivo<textarea value={adminSanctionReason} onChange={event=>setAdminSanctionReason(event.target.value)} placeholder="Explicá el motivo de la suspensión o expulsión..." maxLength={1000}/></label><button type="button" className="admin-sanction-submit" onClick={applyAdminSanction} disabled={adminSanctionBusy || !adminSanctionReason.trim()}>{adminSanctionBusy?'Procesando...':adminSanctionDuration==='permanent'?'Desactivar cuenta permanentemente':'Suspender cuenta'}</button>{adminSanctionMessage && <p className="admin-sanction-feedback">{adminSanctionMessage}</p>}<button type="button" className="admin-sanction-history-load" onClick={async()=>{const {data,error}=await supabase.rpc('admin_list_user_sanctions',{p_user_id:adminSelectedUser.id});if(error)setAdminSanctionMessage(error.message);else setAdminSanctionHistory(Array.isArray(data)?data:[])}}>Ver historial de sanciones</button>{adminSanctionHistory.map(item=><article className="admin-sanction-history-item" key={item.id}><div><strong>{item.is_permanent?'Desactivación permanente':item.expires_at?'Suspensión temporal':'Medida administrativa'}</strong><small>{item.reason} · {new Date(item.created_at).toLocaleString('es-UY')}</small></div>{item.active && <button type="button" disabled={adminSanctionBusy} onClick={()=>revokeAdminSanction(item.id)}>Levantar medida</button>}</article>)}</section>
                <div className="admin-users-placeholder"><ShieldAlert size={19}/><div><strong>Mensajes privados todavía protegidos</strong><p>Las conversaciones no se muestran desde esta ficha. Para revisarlas, primero conectaremos el acceso a contenido denunciado, con registro de auditoría y controles específicos. El material íntimo sospechoso o posiblemente relacionado con menores no se expondrá en una galería administrativa.</p></div></div>
              </div> : adminUsers.length ? <div className="admin-users-list">{adminUsers.map(user=><button type="button" key={user.id} className="admin-user-row" onClick={()=>setAdminSelectedUser(user)}><ProfileAvatar person={user} className="admin-user-row-avatar"/><span className="admin-user-row-copy"><strong>{user.display_name || 'Sin nombre'}</strong><small>@{user.username || 'sin-usuario'} · {user.created_at ? new Date(user.created_at).toLocaleDateString('es-UY') : 'Fecha no disponible'}</small></span>{user.zuno_verified && <span className="admin-user-verified"><CheckCircle2 size={14}/> Verificado</span>}<ChevronRight size={18}/></button>)}</div> : <div className="admin-users-empty"><Users size={24}/><strong>No se encontraron usuarios</strong><span>Probá con otro nombre o usuario.</span></div>}
            </section> : adminSection==='reports' ? <section className="admin-moderation-workspace">
              <div className="admin-users-toolbar">
                <div><span className="admin-welcome-kicker">SEGURIDAD DE LA COMUNIDAD</span><h2>Denuncias recibidas</h2><p>Reportes privados. Cada consulta y cambio de estado queda registrado.</p></div>
                <button type="button" className="admin-refresh" onClick={()=>setAdminReportsRefresh(value=>value+1)} disabled={adminReportsLoading}><RefreshCw size={15}/> Actualizar</button>
              </div>
              <div className="admin-moderation-filters">
                <label htmlFor="admin-report-filter">Estado</label>
                <select id="admin-report-filter" value={adminReportsFilter} onChange={event=>setAdminReportsFilter(event.target.value)}>
                  <option value="all">Todas</option><option value="pending">Pendientes</option><option value="reviewed">En revisión</option><option value="resolved">Resueltas</option><option value="dismissed">Descartadas</option>
                </select>
                <span>{adminReports.length} denuncias</span>
              </div>
              {adminReportsError && <div className="admin-users-error"><CircleAlert size={16}/>{adminReportsError}</div>}
              {adminReportsLoading ? <div className="admin-users-empty"><RefreshCw size={20}/> Cargando denuncias...</div> : adminReports.length ? <div className="admin-report-list">{adminReports.map(report=><article className="admin-report-card" key={report.report_id}>
                <div className="admin-report-head"><div><strong>{report.reason || 'Motivo no especificado'}</strong><small>{report.created_at ? new Date(report.created_at).toLocaleString('es-UY') : 'Fecha no disponible'}</small></div><span className={'admin-report-status status-'+(report.status||'pending')}>{({pending:'Pendiente',reviewed:'En revisión',resolved:'Resuelta',dismissed:'Descartada'})[report.status] || report.status || 'Pendiente'}</span></div>
                <div className="admin-report-people"><div><small>Denunciante</small><strong>{report.reporter_display_name || 'Usuario'} {report.reporter_username ? '@'+report.reporter_username : ''}</strong><code>{report.reporter_id}</code></div><div><small>Cuenta denunciada</small><strong>{report.reported_display_name || 'Usuario'} {report.reported_username ? '@'+report.reported_username : ''}</strong><code>{report.reported_user_id}</code></div></div>
                <p className="admin-report-details">{report.details || 'La denuncia no incluye detalles adicionales.'}</p>
                {report.message_id && <div className="admin-report-context"><button type="button" disabled={adminReportContextBusy===report.report_id} onClick={()=>loadAdminReportContext(report.report_id)}>{adminReportContextBusy===report.report_id?'Consultando…':'Ver contenido denunciado'}</button>{adminReportContexts[report.report_id] && <div className="admin-report-context-result"><strong>{({active_message:'Mensaje activo',retained_message:'Mensaje conservado',message_unavailable:'Mensaje no disponible',not_linked:'Sin mensaje asociado'})[adminReportContexts[report.report_id].content_state] || 'Contexto del reporte'}</strong><p>{adminReportContexts[report.report_id].message_body || (adminReportContexts[report.report_id].has_media?'El mensaje incluía un archivo adjunto.':'No hay texto disponible.')}</p><small>Tipo: {adminReportContexts[report.report_id].message_type || adminReportContexts[report.report_id].content_type || '—'} · Archivo adjunto: {adminReportContexts[report.report_id].has_media?'Sí':'No'}</small></div>}</div>}
                <div className="admin-report-reply"><label htmlFor={'admin-report-reply-'+report.report_id}>Responder al denunciante</label><textarea id={'admin-report-reply-'+report.report_id} value={adminReportReplies[report.report_id] || ''} onChange={event=>setAdminReportReplies(current=>({...current,[report.report_id]:event.target.value}))} placeholder="Ej.: Gracias por tu reporte. Revisamos la situación y tomaremos las medidas correspondientes…" maxLength={1000} rows={3}/><div><small>Se enviará de forma privada a quien realizó la denuncia.</small><button type="button" disabled={adminReportReplyBusy===report.report_id || !String(adminReportReplies[report.report_id]||'').trim()} onClick={()=>sendAdminReportReply(report.report_id)}>{adminReportReplyBusy===report.report_id?'Enviando…':'Enviar notificación'}</button></div></div>
                <div className="admin-report-actions">
                  <button type="button" disabled={adminReportBusy===report.report_id || report.status==='reviewed'} onClick={()=>updateAdminReport(report.report_id,'reviewed')}>Marcar en revisión</button>
                  <button type="button" disabled={adminReportBusy===report.report_id || report.status==='resolved'} onClick={()=>updateAdminReport(report.report_id,'resolved')}>Resolver</button>
                  <button type="button" className="subtle" disabled={adminReportBusy===report.report_id || report.status==='dismissed'} onClick={()=>updateAdminReport(report.report_id,'dismissed')}>Descartar</button>
                </div>
              </article>)}</div> : <div className="admin-users-empty"><Flag size={24}/><strong>No hay denuncias para mostrar</strong><span>Cuando una persona denuncie una cuenta, aparecerá acá.</span></div>}
            </section> : adminSection==='content' ? <section className="admin-moderation-workspace">
              <div className="admin-users-toolbar">
                <div><span className="admin-welcome-kicker">REGISTRO PRIVADO Y AUDITADO</span><h2>Mensajes conservados</h2><p>Mensajes vencidos o eliminados para todos que fueron archivados antes de retirarse del chat.</p></div>
                <button type="button" className="admin-refresh" onClick={()=>setAdminRetainedRefresh(value=>value+1)} disabled={adminRetainedLoading}><RefreshCw size={15}/> Actualizar</button>
              </div>
              <div className="admin-retention-notice"><ShieldCheck size={18}/><span>El acceso queda registrado. Esta vista muestra texto y metadatos; no abre automáticamente archivos privados ni álbumes.</span></div>
              {adminRetainedError && <div className="admin-users-error"><CircleAlert size={16}/>{adminRetainedError}</div>}
              {adminRetainedLoading ? <div className="admin-users-empty"><RefreshCw size={20}/> Cargando mensajes conservados...</div> : adminRetainedMessages.length ? <div className="admin-retained-list">{adminRetainedMessages.map(item=><article className="admin-retained-card" key={item.original_message_id}>
                <div className="admin-report-head"><div><strong>{item.message_type || 'Mensaje'}</strong><small>{item.original_created_at ? new Date(item.original_created_at).toLocaleString('es-UY') : 'Fecha no disponible'}</small></div><span className="admin-report-status">{item.deletion_reason==='expired'?'Venció':'Eliminado para todos'}</span></div>
                <p className="admin-retained-body">{item.body || (item.has_media ? 'Este mensaje contenía un archivo adjunto.' : 'Mensaje sin texto.')}</p>
                {item.has_media && <div className="admin-retained-attachment"><button type="button" disabled={adminRetainedMediaBusy===item.original_message_id} onClick={()=>openAdminRetainedMedia(item.original_message_id)}>{adminRetainedMediaBusy===item.original_message_id?'Consultando archivo...':adminRetainedMedia[item.original_message_id]?'Actualizar enlace privado':'Ver archivo adjunto'}</button>{adminRetainedMedia[item.original_message_id] && <div className="admin-retained-media-preview">{/image/i.test(adminRetainedMedia[item.original_message_id].type) || /\.(png|jpe?g|webp|gif)$/i.test(adminRetainedMedia[item.original_message_id].url) ? <img src={adminRetainedMedia[item.original_message_id].url} alt="Adjunto conservado"/> : /video/i.test(adminRetainedMedia[item.original_message_id].type) ? <video src={adminRetainedMedia[item.original_message_id].url} controls/> : /audio/i.test(adminRetainedMedia[item.original_message_id].type) ? <audio src={adminRetainedMedia[item.original_message_id].url} controls/> : <a href={adminRetainedMedia[item.original_message_id].url} target="_blank" rel="noreferrer">Abrir archivo privado</a>}<small>Enlace privado temporal · vence en 2 minutos</small></div>}</div>}
                <div className="admin-retained-meta"><span>Remitente: <code>{item.sender_id}</code></span><span>Conversación: <code>{item.conversation_id}</code></span><span>Conservado: {item.preserved_at ? new Date(item.preserved_at).toLocaleString('es-UY') : '—'}</span><span>Retención hasta: {item.retention_until ? new Date(item.retention_until).toLocaleString('es-UY') : '—'}</span></div>
              </article>)}</div> : <div className="admin-users-empty"><MessageCircle size={24}/><strong>No hay mensajes conservados</strong><span>Los mensajes aparecerán acá cuando hayan sido archivados por el sistema.</span></div>}
            </section> : adminSection==='announcements' ? <section className="admin-moderation-workspace">
              <div className="admin-users-toolbar">
                <div><span className="admin-welcome-kicker">AVISOS DE LA PLATAFORMA</span><h2>Enviar comunicación</h2><p>Los avisos se entregan como notificaciones dentro de ZUNO.</p></div>
                <button type="button" className="admin-refresh" onClick={async()=>{setCommunicationHistoryLoading(true);const {data,error}=await supabase.rpc('admin_list_communications',{p_limit:30,p_offset:0});if(error)setCommunicationError(error.message);else setCommunicationHistory(Array.isArray(data)?data:[]);setCommunicationHistoryLoading(false)}} disabled={communicationHistoryLoading}><RefreshCw size={15}/> Actualizar historial</button>
              </div>
              <form className="admin-communication-form" onSubmit={sendAdminCommunication}>
                <div className="admin-communication-mode"><label><input type="radio" name="communication-mode" value="all" checked={communicationMode==='all'} onChange={()=>{setCommunicationMode('all');setCommunicationTarget(null)}}/> Toda la comunidad</label><label><input type="radio" name="communication-mode" value="individual" checked={communicationMode==='individual'} onChange={()=>{setCommunicationMode('individual');setCommunicationTarget(null)}}/> Usuario individual</label></div>
                {communicationMode==='individual' && <div className="admin-communication-recipient"><label>Buscar destinatario</label><div className="admin-communication-search"><input value={communicationSearch} onChange={event=>setCommunicationSearch(event.target.value)} placeholder="Nombre o @usuario..."/><button type="button" onClick={searchCommunicationUsers}><Search size={15}/> Buscar</button></div>{communicationTarget && <div className="admin-communication-selected"><ProfileAvatar person={communicationTarget}/><span><strong>{communicationTarget.display_name || communicationTarget.username}</strong><small>@{communicationTarget.username}</small></span><button type="button" onClick={()=>setCommunicationTarget(null)}>Cambiar</button></div>}{communicationUsers.length>0 && !communicationTarget && <div className="admin-communication-results">{communicationUsers.map(user=><button type="button" key={user.id} onClick={()=>{setCommunicationTarget(user);setCommunicationUsers([])}}><ProfileAvatar person={user}/><span><strong>{user.display_name || user.username || 'Usuario'}</strong><small>@{user.username || 'sin-usuario'}</small></span><ChevronRight size={16}/></button>)}</div>}</div>}
                <label className="admin-communication-field">Título<input value={communicationTitle} onChange={event=>setCommunicationTitle(event.target.value)} placeholder="Ej.: Novedades de ZUNO" maxLength={120} required/></label>
                <label className="admin-communication-field">Mensaje<textarea value={communicationBody} onChange={event=>setCommunicationBody(event.target.value)} placeholder="Escribí el aviso que recibirá el usuario..." maxLength={2000} rows={5} required/></label>
                <div className="admin-communication-footer"><small>{communicationTitle.length}/120 · {communicationBody.length}/2000 caracteres</small><button type="submit" disabled={communicationBusy || !communicationTitle.trim() || !communicationBody.trim() || (communicationMode==='individual' && !communicationTarget)}><Send size={16}/>{communicationBusy?'Enviando...':'Enviar notificación'}</button></div>
              </form>
              {communicationError && <div className="admin-users-error"><CircleAlert size={16}/>{communicationError}</div>}
              {communicationFeedback && <div className="admin-communication-success"><CheckCircle2 size={17}/>{communicationFeedback}</div>}
              <div className="admin-communication-history"><div className="admin-users-toolbar"><div><span className="admin-welcome-kicker">REGISTRO AUDITADO</span><h2>Comunicaciones enviadas</h2><p>Historial de avisos enviados desde el panel administrativo.</p></div></div>
                {communicationHistoryLoading ? <div className="admin-users-empty">Cargando historial...</div> : communicationHistory.length ? <div className="admin-communication-history-list">{communicationHistory.map(item=><article key={item.id}><div><strong>{item.title}</strong><small>{new Date(item.created_at).toLocaleString('es-UY')} · {item.target_type==='all'?'Toda la comunidad':'Usuario individual'} · {item.recipient_count} destinatario(s)</small></div><p>{item.body}</p></article>)}</div> : <div className="admin-users-empty"><Megaphone size={22}/><strong>Todavía no enviaste comunicaciones</strong><span>Los avisos enviados aparecerán acá.</span></div>}
              </div>
            </section> : adminSection==='security' ? <section className="admin-moderation-workspace admin-security-workspace">
              <div className="admin-users-toolbar">
                <div><span className="admin-welcome-kicker">CENTRO DE SEGURIDAD</span><h2>Seguridad y auditoría</h2><p>Permisos administrativos y actividad registrada en ZUNO.</p></div>
                <button type="button" className="admin-refresh" onClick={()=>setAdminSecurityRefresh(value=>value+1)} disabled={adminSecurityLoading}><RefreshCw size={15}/>{adminSecurityLoading?'Actualizando...':'Actualizar datos'}</button>
              </div>
              <div className="admin-retention-notice"><ShieldCheck size={18}/><span>Los registros se consultan mediante funciones protegidas. Las tablas de auditoría no tienen políticas de acceso directo para usuarios.</span></div>
              {adminSecurityError && <div className="admin-users-error"><CircleAlert size={16}/>{adminSecurityError}</div>}
              {adminSecurityLoading && !adminSecurityOverview ? <div className="admin-users-empty"><RefreshCw size={20}/> Consultando controles de seguridad...</div> : <>
                <div className="zuno-admin-stats zuno-admin-live-stats admin-security-stats">
                  <article><span className="admin-stat-icon purple"><ShieldCheck size={19}/></span><div><small>Administradores</small><strong>{Number(adminSecurityOverview?.admin_count||0).toLocaleString('es-UY')}</strong><em>Permisos registrados</em></div></article>
                  <article><span className="admin-stat-icon pink"><Ban size={19}/></span><div><small>Sanciones activas</small><strong>{Number(adminSecurityOverview?.active_sanctions||0).toLocaleString('es-UY')}</strong><em>Restricciones vigentes</em></div></article>
                  <article><span className="admin-stat-icon blue"><Activity size={19}/></span><div><small>Eventos de moderación</small><strong>{Number(adminSecurityOverview?.moderation_events||0).toLocaleString('es-UY')}</strong><em>Acciones registradas</em></div></article>
                  <article><span className="admin-stat-icon purple"><Eye size={19}/></span><div><small>Accesos auditados</small><strong>{(Number(adminSecurityOverview?.access_events||0)+Number(adminSecurityOverview?.retained_access_events||0)).toLocaleString('es-UY')}</strong><em>Perfiles y mensajes conservados</em></div></article>
                </div>
                <div className="admin-security-admins">
                  <div className="admin-users-toolbar"><div><span className="admin-welcome-kicker">ACCESO PRIVILEGIADO</span><h2>Administradores autorizados</h2><p>Usuarios incluidos en la lista privada de administradores.</p></div></div>
                  {Array.isArray(adminSecurityOverview?.administrators) && adminSecurityOverview.administrators.length ? <div className="admin-security-admin-list">{adminSecurityOverview.administrators.map(admin=><article key={admin.user_id}><span className="admin-security-admin-icon"><ShieldCheck size={18}/></span><div><strong>Administrador ZUNO</strong><small><code>{admin.user_id}</code></small></div><time>{admin.created_at?new Date(admin.created_at).toLocaleDateString('es-UY'):'Fecha no disponible'}</time></article>)}</div> : <div className="admin-users-empty">No hay administradores registrados.</div>}
                </div>
                <div className="admin-security-audit">
                  <div className="admin-users-toolbar"><div><span className="admin-welcome-kicker">TRAZABILIDAD</span><h2>Registro de actividad</h2><p>Últimos 50 eventos de las distintas áreas de auditoría.</p></div><label className="admin-security-filter">Tipo de evento<select value={adminSecurityFilter} onChange={event=>setAdminSecurityFilter(event.target.value)}><option value="all">Todos los eventos</option><option value="moderation">Moderación</option><option value="access">Acceso a perfiles</option><option value="retained">Mensajes conservados</option></select></label></div>
                  {adminSecurityLoading ? <div className="admin-users-empty"><RefreshCw size={18}/> Cargando actividad...</div> : adminSecurityEvents.length ? <div className="admin-security-event-list">{adminSecurityEvents.map(item=><article key={item.source+'-'+item.event_id}><div className="admin-security-event-heading"><strong>{String(item.action||'Actividad').replaceAll('_',' ')}</strong><span>{item.source==='moderation'?'Moderación':item.source==='access'?'Acceso a perfil':'Mensajes conservados'}</span></div><div className="admin-security-event-meta"><span>Administrador: <code>{item.admin_user_id||'—'}</code></span><time>{item.created_at?new Date(item.created_at).toLocaleString('es-UY'):'Fecha no disponible'}</time></div><details><summary>Ver detalles del evento</summary><pre>{JSON.stringify(item.details||{},null,2)}</pre></details></article>)}</div> : <div className="admin-users-empty"><Activity size={22}/><strong>No hay eventos para este filtro</strong><span>Las nuevas acciones administrativas aparecerán acá.</span></div>}
                </div>
              </>}
            </section> : adminSection==='bots' ? <section className="admin-moderation-workspace admin-bots-workspace">
              <div className="admin-users-toolbar"><div><span className="admin-welcome-kicker">PERSONAJES VIRTUALES</span><h2>Administrar bots</h2><p>Definí sus perfiles, historias, personalidades y formas de interactuar.</p></div><button type="button" className="admin-back-overview" onClick={newAdminBot}><Sparkles size={16}/> Crear bot</button></div>
              {adminBotsError && <div className="admin-users-error"><CircleAlert size={16}/>{adminBotsError}</div>}
              {adminBotsFeedback && <div className="admin-communication-success"><CheckCircle2 size={16}/>{adminBotsFeedback}</div>}
              {adminBotsLoading ? <div className="admin-users-empty"><RefreshCw size={20}/> Cargando bots...</div> : adminBotEditor ? <form className="admin-bot-editor" onSubmit={saveAdminBot}>
                <div className="admin-users-toolbar"><div><span className="admin-welcome-kicker">{adminBotEditor.id?'EDITAR PERSONAJE':'NUEVO PERSONAJE'}</span><h2>{adminBotEditor.display_name||'Bot sin nombre'}</h2></div><button type="button" className="admin-user-back" onClick={()=>setAdminBotEditor(null)}>Cancelar</button></div>
                <section className="admin-platform-settings-card"><div className="admin-platform-settings-card-heading"><span><UserRound size={19}/></span><div><h3>Identidad y perfil</h3><p>Datos de presentación del personaje. Los datos privados no se muestran en su tarjeta.</p></div></div>
                  <div className="admin-bot-fields">
                    {[
                      ['display_name','Nombre','text'],['slug','Identificador (sin espacios)','text'],['age','Edad','number'],['gender','Género','text'],['bot_role','Rol en ZUNO','text'],['country','País','text'],['city','Ciudad','text'],['neighborhood','Barrio','text'],['street','Calle ficticia','text'],['occupation','Trabajo / profesión','text'],['workplace','Lugar de trabajo ficticio','text'],['employed_since','Desde cuándo trabaja','date'],['work_schedule','Horarios de trabajo','text'],['education','Estudios','text'],['avatar_url','URL de foto','url']
                    ].map(([key,label,type])=><label className="admin-communication-field" key={key}>{label}<input type={type} value={adminBotEditor[key]??''} onChange={event=>setAdminBotEditor(current=>({...current,[key]:event.target.value}))} required={['display_name','slug','age'].includes(key)} /></label>)}
                  </div>
                  <div className="admin-bot-location-control"><div><strong><MapPin size={16}/> Ubicación para Explorar</strong><small>{adminBotEditor.latitude != null && adminBotEditor.longitude != null ? (adminBotEditor.location_label ? adminBotEditor.location_label : `Coordenadas: ${Number(adminBotEditor.latitude).toFixed(5)}, ${Number(adminBotEditor.longitude).toFixed(5)}`) : 'Todavía no configuraste una ubicación para este bot.'}</small></div><button type="button" className="admin-refresh" onClick={()=>{setBotLocationDraft(adminBotEditor.latitude != null && adminBotEditor.longitude != null ? {latitude:Number(adminBotEditor.latitude),longitude:Number(adminBotEditor.longitude),location_label:adminBotEditor.location_label||''} : null);setBotLocationPickerOpen(true)}}><MapPin size={16}/>{adminBotEditor.latitude != null ? 'Cambiar ubicación' : 'Agregar ubicación'}</button></div>
                  <label className="admin-communication-field">Biografía<textarea rows={3} value={adminBotEditor.bio||''} onChange={event=>setAdminBotEditor(current=>({...current,bio:event.target.value}))}/></label>
                  <label className="admin-communication-field">Intereses (separados por comas)<input value={(adminBotEditor.interests||[]).join(', ')} onChange={event=>setAdminBotEditor(current=>({...current,interests:event.target.value.split(',').map(x=>x.trim()).filter(Boolean)}))}/></label>
                  <label className="admin-communication-field">Qué busca (separado por comas)<input value={(adminBotEditor.looking_for||[]).join(', ')} onChange={event=>setAdminBotEditor(current=>({...current,looking_for:event.target.value.split(',').map(x=>x.trim()).filter(Boolean)}))}/></label>
                  <label className="admin-communication-field">Rutina diaria<textarea rows={3} value={adminBotEditor.daily_routine||''} onChange={event=>setAdminBotEditor(current=>({...current,daily_routine:event.target.value}))}/></label>
                  <label className="admin-communication-field">Historia familiar ficticia<textarea rows={3} value={adminBotEditor.family_story||''} onChange={event=>setAdminBotEditor(current=>({...current,family_story:event.target.value}))}/></label>
                </section>
                <section className="admin-platform-settings-card"><div className="admin-platform-settings-card-heading"><span><Sparkles size={19}/></span><div><h3>Personalidad e inteligencia</h3><p>Estas instrucciones definen cómo hablará el bot cuando conectemos el motor de IA.</p></div></div>
                  {[
                    ['personality','Personalidad','Describe su carácter, gustos y manera de pensar.'],
                    ['speaking_style','Forma de hablar','Tono, idioma, expresiones y longitud de mensajes.'],
                    ['backstory','Historia personal','Datos ficticios que puede recordar y mencionar.'],
                    ['system_prompt','Instrucciones principales','Reglas detalladas para mantener una personalidad consistente.']
                  ].map(([key,label,placeholder])=><label className="admin-communication-field" key={key}>{label}<textarea rows={key==='system_prompt'?6:3} placeholder={placeholder} value={adminBotEditor.persona?.[key]||''} onChange={event=>setAdminBotEditor(current=>({...current,persona:{...(current.persona||{}),[key]:event.target.value}}))}/></label>)}
                  <label className="admin-communication-field">Reglas de seguridad (una por línea)<textarea rows={3} value={(adminBotEditor.persona?.safety_rules||[]).join('\n')} onChange={event=>setAdminBotEditor(current=>({...current,persona:{...(current.persona||{}),safety_rules:event.target.value.split('\n')}}))}/></label>
                </section>
                <section className="admin-platform-settings-card"><div className="admin-platform-settings-card-heading"><span><Clock3 size={19}/></span><div><h3>Comportamiento y actividad</h3><p>Configurá si puede iniciar chats, mandar taps y cuánto tarda en contestar.</p></div></div>
                  <label className="admin-platform-toggle"><span><strong>Puede iniciar conversaciones</strong><small>El bot podrá escribir primero, respetando límites de frecuencia.</small></span><input type="checkbox" checked={!!adminBotEditor.can_initiate} onChange={event=>setAdminBotEditor(current=>({...current,can_initiate:event.target.checked}))}/></label>
                  <label className="admin-platform-toggle"><span><strong>Puede mandar taps</strong><small>Puede enviar una señal de interés sin abrir un chat.</small></span><input type="checkbox" checked={!!adminBotEditor.can_send_taps} onChange={event=>setAdminBotEditor(current=>({...current,can_send_taps:event.target.checked}))}/></label>
                  <div className="admin-bot-fields">{[
                    ['proactive_min_minutes','Mínimo entre acciones espontáneas (minutos)'],['proactive_max_minutes','Máximo entre acciones espontáneas (minutos)'],['response_delay_min_seconds','Demora mínima al responder (segundos)'],['response_delay_max_seconds','Demora máxima al responder (segundos)'],['active_hours','Horario activo (ej. 09:00-23:00)'],['interaction_style','Estilo de interacción (chat, taps o mixto)']
                  ].map(([key,label])=><label className="admin-communication-field" key={key}>{label}<input type={key.includes('minutes')||key.includes('seconds')?'number':'text'} min="0" value={adminBotEditor[key]??''} onChange={event=>setAdminBotEditor(current=>({...current,[key]:event.target.value}))}/></label>)}</div>
                  <label className="admin-platform-toggle"><span><strong>Visible en Explorar</strong><small>Desactivá el bot sin eliminar su perfil ni su historial.</small></span><input type="checkbox" checked={!!adminBotEditor.is_active} onChange={event=>setAdminBotEditor(current=>({...current,is_active:event.target.checked}))}/></label>
                </section>
                <div className="admin-communication-footer"><small>Los cambios se guardan de forma segura en Supabase.</small><button type="submit" disabled={adminBotsSaving}>{adminBotsSaving?'Guardando...':'Guardar bot'}</button></div>
              </form> : adminBots.length ? <div className="admin-bot-list">{adminBots.map(bot=><article className="admin-bot-row" key={bot.id}><div className="admin-bot-avatar">{bot.avatar_url?<img src={bot.avatar_url} alt=""/>:<UserRound size={22}/>}</div><div className="admin-bot-copy"><strong>{bot.display_name} · {bot.age}</strong><small>{[bot.city,bot.country,bot.bot_role].filter(Boolean).join(' · ')}</small><span>{bot.is_active?'Activo en Explorar':'Desactivado'} · {bot.can_initiate?'Puede iniciar chats':'Solo responde'} · {bot.can_send_taps?'Puede mandar taps':'Sin taps'}</span></div><button type="button" className="admin-refresh" onClick={()=>setAdminBotEditor({...bot,persona:bot.persona||{personality:'',speaking_style:'',backstory:'',system_prompt:'',safety_rules:[]}})}>Editar</button><button type="button" className="admin-user-back" onClick={()=>deleteAdminBot(bot)} aria-label={'Eliminar '+bot.display_name}><Trash2 size={16}/></button></article>)}</div> : <div className="admin-users-empty"><Sparkles size={24}/><strong>Todavía no hay bots</strong><span>Creá el primer personaje virtual de ZUNO.</span></div>}
            </section> : adminSection==='settings' ? <section className="admin-moderation-workspace admin-platform-settings">
              <div className="admin-users-toolbar"><div><span className="admin-welcome-kicker">PREFERENCIAS GENERALES</span><h2>Configuración de ZUNO</h2><p>Controlá la identidad, el registro y la disponibilidad de la plataforma.</p></div><button type="button" className="admin-refresh" onClick={()=>setAdminSection('settings')}><RefreshCw size={15}/> Recargar</button></div>
              {adminPlatformLoading ? <div className="admin-users-empty">Cargando configuración...</div> : <form className="admin-platform-settings-form" onSubmit={saveAdminPlatformSettings}>
                <section className="admin-platform-settings-card"><div className="admin-platform-settings-card-heading"><span><Settings size={19}/></span><div><h3>Identidad de la plataforma</h3><p>Nombre y descripción que identifican a ZUNO.</p></div></div>
                  <label className="admin-communication-field">Nombre de la plataforma<input value={adminPlatformSettings.platform_name||''} maxLength={60} required onChange={event=>setAdminPlatformSettings(current=>({...current,platform_name:event.target.value}))}/></label>
                  <label className="admin-communication-field">Descripción<input value={adminPlatformSettings.platform_description||''} maxLength={180} onChange={event=>setAdminPlatformSettings(current=>({...current,platform_description:event.target.value}))}/></label>
                </section>
                <section className="admin-platform-settings-card"><div className="admin-platform-settings-card-heading"><span><Users size={19}/></span><div><h3>Registro de usuarios</h3><p>Decidí si se pueden crear nuevas cuentas.</p></div></div>
                  <label className="admin-platform-toggle"><span><strong>Permitir nuevos registros</strong><small>Si lo desactivás, las personas podrán iniciar sesión, pero no crear cuentas nuevas.</small></span><input type="checkbox" checked={Boolean(adminPlatformSettings.registration_enabled)} onChange={event=>setAdminPlatformSettings(current=>({...current,registration_enabled:event.target.checked}))}/></label>
                </section>
                <section className="admin-platform-settings-card"><div className="admin-platform-settings-card-heading"><span><ShieldAlert size={19}/></span><div><h3>Modo mantenimiento</h3><p>Mostrá un aviso y bloqueá el acceso normal a la interfaz mientras trabajás en ZUNO.</p></div></div>
                  <label className="admin-platform-toggle"><span><strong>Activar modo mantenimiento</strong><small>Tu cuenta de administrador seguirá pudiendo entrar al panel.</small></span><input type="checkbox" checked={Boolean(adminPlatformSettings.maintenance_mode)} onChange={event=>setAdminPlatformSettings(current=>({...current,maintenance_mode:event.target.checked}))}/></label>
                  <label className="admin-communication-field">Mensaje para los usuarios<textarea rows={3} maxLength={500} value={adminPlatformSettings.maintenance_message||''} onChange={event=>setAdminPlatformSettings(current=>({...current,maintenance_message:event.target.value}))}/></label>
                  {adminPlatformSettings.maintenance_mode && <div className="admin-platform-maintenance-preview"><ShieldAlert size={17}/><span><strong>Vista previa del aviso</strong>{adminPlatformSettings.maintenance_message}</span></div>}
                </section>
                {adminPlatformError && <div className="admin-users-error"><CircleAlert size={16}/>{adminPlatformError}</div>}
                {adminPlatformFeedback && <div className="admin-communication-success"><CheckCircle2 size={17}/>{adminPlatformFeedback}</div>}
                <div className="admin-platform-settings-actions"><small>Los cambios se guardan en Supabase y se aplican al actualizar la plataforma.</small><button type="submit" className="admin-back-overview" disabled={adminPlatformSaving || !adminPlatformSettings.platform_name?.trim()}><CheckCircle2 size={17}/>{adminPlatformSaving?'Guardando...':'Guardar configuración'}</button></div>
              </form>}
            </section> : <div className="zuno-admin-workspace">
              <div className="zuno-admin-workspace-icon"><AdminIcon size={28}/></div>
              <span className="admin-welcome-kicker">MÓDULO DE ADMINISTRACIÓN</span>
              <h2>{currentAdminTitle[0]}</h2><p>{currentAdminTitle[1]}</p>
              <div className="admin-workspace-checklist"><div><CheckCircle2 size={17}/><span>Diseño y navegación del módulo preparados.</span></div><div><ShieldAlert size={17}/><span>Este módulo requiere su propia consulta y autorización protegida.</span></div><div><LockKeyhole size={17}/><span>Las acciones se habilitarán después de validar las reglas de moderación.</span></div></div>
              <button type="button" className="admin-back-overview" onClick={()=>setAdminSection('overview')}><ChevronRight size={16}/> Volver al resumen</button>
            </div>}
          </div>
        </section>
        <ZunoBottomNav view={view} setView={setView} onLogout={logout} adminVisible unreadCount={Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)} notificationCount={notifications.filter(item=>!item.read_at).length} mapRequestCount={notifications.filter(item=>item.notification_type==='map_meetup_request'&&!item.read_at).length} albumRequestCount={notifications.filter(item=>item.notification_type==='album_access_request'&&!item.read_at).length}/>
      </main>
    )
  }

  if (session?.user && ['home', 'favorites', 'connections'].includes(view)) return (
    <main className="app-shell">{callOverlay}
      <header className="topbar discovery-topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="discovery-topbar-actions"><span className="verification-badge">{profile?.zuno_verified ? "✓ Cuenta verificada" : "Cuenta no verificada"}</span>{view === "home" && <><button type="button" className="discovery-filter-trigger discovery-top-filter" onClick={()=>setShowDiscoveryFilters(true)} aria-label="Abrir filtros y secciones"><SlidersHorizontal size={17}/> Filtros{discoveryFiltersActive && <span className="filter-active-dot" aria-label="Filtros activos"/>}</button><button type="button" className="discovery-top-refresh" onClick={()=>setPeopleRefresh(value=>value+1)} disabled={peopleLoading} aria-label="Actualizar perfiles"><RefreshCw size={16} className={peopleLoading?"discovery-refresh-icon":""}/> <span>Actualizar</span></button></>}</div></header>
      {view === 'home' && (
        <section className="zuno-stories" aria-label="Historias de 24 horas">
          <div className="stories-heading"><strong>Historias</strong><span>Desaparecen en 24 horas</span></div>
          <div className="stories-rail">
            <label className="story-create"><span className="story-create-avatar"><ImagePlus size={23}/></span><span>{storyBusy ? 'Subiendo…' : 'Agregar'}</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={uploadStory} disabled={storyBusy}/></label>
            <button type="button" className="story-person story-archive-shortcut" onClick={() => setShowStoryArchive(true)}><span className="story-create-avatar"><Archive size={21}/></span><span>Archivo</span></button>
            {(()=>{const own=stories.filter(story=>story.user_id===session.user.id).sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));if(!own.length)return null;const latest=own[own.length-1];return <button type="button" className="story-person own-story" onClick={()=>openStory(own[0],own)}><span className="story-ring">{latest.media_type==='video'?<video src={latest.url} muted playsInline preload="metadata"/>:<img src={latest.url} alt="Tus historias"/>}</span><span>Tu historia</span></button>})()}
            {Array.from(stories.filter(story=>story.user_id!==session.user.id).reduce((groups,story)=>{if(!groups.has(story.user_id))groups.set(story.user_id,{user_id:story.user_id,owner:story.owner,items:[]});groups.get(story.user_id).items.push(story);return groups},new Map()).values()).map(group=>{const items=[...group.items].sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));const latest=items[items.length-1];return <button type="button" className="story-person" key={group.user_id} onClick={()=>openStory(items[0],items)}><span className="story-ring">{latest.media_type==='video'?<video src={latest.url} muted playsInline preload="metadata"/>:<img src={latest.url} alt={`Historias de ${group.owner?.display_name||group.owner?.username||'usuario'}`}/>}</span><span>{group.owner?.display_name||group.owner?.username||'Usuario'}</span></button>})}

          </div>
          {storyMessage && <p className="story-feedback">{storyMessage}</p>}
        </section>
      )}
      <section className="home-content">
        {view !== 'home' && <div className="home-heading"><div><div className="eyebrow"><span/> {view === 'favorites' ? 'TUS PERSONAS GUARDADAS' : 'TUS CONEXIONES'}</div><h1>{view === 'favorites' ? <>Tus <span>favoritos.</span></> : <>Tus <span>conexiones.</span></>}</h1><p>{view === 'favorites' ? 'Perfiles que guardaste para volver a encontrarlos.' : 'Solicitudes recibidas, enviadas y conexiones aceptadas.'}</p></div><div className="home-actions"><button className="refresh-btn" onClick={()=>setView('home')}><Compass size={16}/> Descubrir</button></div></div>}

        {storyViewer && <div className="story-viewer-backdrop" role="presentation" onClick={() => setStoryViewer(null)}><section className="story-viewer" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
          <div className="story-progress-track" aria-label={"Historia "+(Math.max(1,storyQueue.filter(item=>item.user_id===storyViewer.user_id).findIndex(item=>item.id===storyViewer.id)+1))+" de "+(storyQueue.filter(item=>item.user_id===storyViewer.user_id).length||1)}>{storyQueue.filter(item=>item.user_id===storyViewer.user_id).map((item,index,personStories)=> <span key={item.id} className={item.id===storyViewer.id?'current':index<personStories.findIndex(row=>row.id===storyViewer.id)?'completed':''} style={item.id===storyViewer.id?{'--duration':(storyRemainingMs/1000)+'s',animationPlayState:storyPaused?'paused':'running'}:{}}/>)}</div><div className="story-viewer-top"><div className="story-viewer-identity"><span className="story-header-avatar">{storyViewer.owner?.avatar_url ? <img src={storyViewer.owner.avatar_url} alt=""/> : <UserRound size={19}/>}</span><span>{storyViewer.owner?.display_name || storyViewer.owner?.username || 'Tu historia'}</span></div><div className="story-viewer-top-actions"><button type="button" onClick={() => setShowStoryMenu(value => !value)} aria-label="Opciones de historia"><MoreVertical/></button><button type="button" onClick={() => {setStoryViewer(null);setShowStoryMenu(false)}} aria-label="Cerrar historia"><X/></button></div>{showStoryMenu && <div className="story-options-menu">{storyViewer.user_id === session.user.id && !storyViewer.archived_at && <button type="button" disabled={storyBusy} onClick={() => archiveStory(storyViewer)}><Archive size={16}/> Archivar historia</button>}{storyViewer.user_id !== session.user.id && <button type="button" onClick={() => {setReportTarget({id:storyViewer.user_id,display_name:storyViewer.owner?.display_name || storyViewer.owner?.username || 'este usuario',contentType:'story'});setReportReason('inappropriate_content');setReportDetails('');setShowStoryMenu(false)}}><Flag size={16}/> Denunciar</button>}</div>}</div>
          {storyViewer.media_type === 'video' ? <video src={storyViewer.url} controls autoPlay playsInline onClick={event => {const rect=event.currentTarget.getBoundingClientRect();if(event.clientX-rect.left<rect.width/2)navigateStory(-1);else navigateStory(1)}} onEnded={() => navigateStory(1)}/> : <img src={storyViewer.url} alt="Historia" draggable="false" onDragStart={event => event.preventDefault()} onPointerDown={event => { event.preventDefault(); event.stopPropagation(); storyPauseStartedRef.current = Date.now(); setStoryPaused(true); try { event.currentTarget.setPointerCapture(event.pointerId) } catch {} }} onPointerUp={event => { event.preventDefault(); event.stopPropagation(); const started=storyPauseStartedRef.current; const heldFor=started ? Date.now()-started : 0; if(started) setStoryRemainingMs(value => Math.max(0,value-heldFor)); storyPauseStartedRef.current=null; setStoryPaused(false); if(heldFor<220){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX-rect.left<rect.width/2)navigateStory(-1);else navigateStory(1)} }} onPointerCancel={event => {event.stopPropagation();if(storyPauseStartedRef.current){setStoryRemainingMs(value=>Math.max(0,value-(Date.now()-storyPauseStartedRef.current)));storyPauseStartedRef.current=null}setStoryPaused(false)}} onLostPointerCapture={() => {if(storyPauseStartedRef.current){setStoryRemainingMs(value=>Math.max(0,value-(Date.now()-storyPauseStartedRef.current)));storyPauseStartedRef.current=null;setStoryPaused(false)}}} onContextMenu={event => event.preventDefault()}/>}
          {storyViewer.caption && <p>{storyViewer.caption}</p>}
          {storyMessage && <p className="story-feedback" role="status">{storyMessage}</p>}
          {storyViewer.user_id !== session.user.id && !storyViewer.archived_at && <form className="story-reply-bar" onSubmit={sendStoryReply}>
            <input value={storyReplyDraft} onChange={event => setStoryReplyDraft(event.target.value)} onFocus={() => setStoryPaused(true)} onBlur={() => setStoryPaused(false)} placeholder="Responder a la historia..." maxLength={1000} aria-label="Responder a la historia"/>
            <button type="button" className={'story-like-button'+(storyLiked?' liked':'')} onClick={toggleStoryLike} disabled={storyBusy} aria-label={storyLiked?'Quitar Me gusta':'Me gusta'}><Heart size={21} fill={storyLiked?'currentColor':'none'}/></button>
            <button type="submit" className="story-send-button" disabled={!storyReplyDraft.trim() || storyReplyBusy} aria-label="Enviar respuesta"><Send size={19}/></button>
          </form>}

          {storyViewer.user_id === session.user.id && <button type="button" className="story-viewers-trigger story-likes-trigger" onClick={() => { setStoryPaused(true); setShowStoryViewers(true) }}><Heart size={17}/><strong>Me gusta · {storyLikeCount}</strong><span>Ver quién</span></button>}
          {storyViewer.user_id === session.user.id && <button type="button" className="story-viewers-trigger" onClick={() => setShowStoryViewers(true)}><Eye size={17}/><strong>Visto por {storyViewers.length}</strong><span>Ver lista</span></button>}
          {showStoryViewers && storyViewer.user_id === session.user.id && <div className="story-viewers-sheet-backdrop" onClick={() => { setShowStoryViewers(false); setStoryPaused(false) }}><section className="story-viewers-sheet" role="dialog" aria-modal="true" aria-label="Personas que vieron tu historia" onClick={event => event.stopPropagation()}><div className="story-viewers-sheet-heading"><div><strong>Visualizaciones</strong><small>{storyViewers.length} visualizaciones · {storyLikeCount} Me gusta</small></div><button type="button" onClick={() => setShowStoryViewers(false)} aria-label="Cerrar"><X size={19}/></button></div>{storyViewers.length || storyLikes.length ? <div className="story-viewers-list">{storyLikes.map(item => <div className="story-viewer-person" key={'like-'+item.user_id}><ProfileAvatar person={item.person} className="story-avatar"/><div><strong>{item.person?.display_name || item.person?.username || 'Usuario'}</strong><small>@{item.person?.username || 'usuario'}</small></div><time>❤️ Me gusta</time></div>)}{storyViewers.map(item => <div className="story-viewer-person" key={'view-'+item.viewer_id}><ProfileAvatar person={item.person} className="story-avatar"/><div><strong>{item.person?.display_name || item.person?.username || 'Usuario'}</strong><small>@{item.person?.username || 'usuario'}</small></div><time>{new Date(item.viewed_at).toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit'})}</time></div>)}</div> : <div className="story-viewers-empty"><Eye size={25}/><strong>Todavía no hay interacciones</strong><small>Cuando alguien vea o indique Me gusta, aparecerá acá.</small></div>}</section></div>}
          {storyViewer.user_id === session.user.id && storyViewer.archived_at && <button type="button" className="story-restore" disabled={storyBusy || !storyViewer.expires_at || new Date(storyViewer.expires_at).getTime() <= Date.now()} onClick={() => unarchiveStory(storyViewer)}><RefreshCw size={16}/> {storyViewer.expires_at && new Date(storyViewer.expires_at).getTime() > Date.now() ? 'Desarchivar y volver a publicar' : 'Venció · no se puede restaurar'}</button>}
          {storyViewer.user_id === session.user.id && <button type="button" className="story-delete" disabled={storyBusy} onClick={() => deleteStory(storyViewer)}><Trash2 size={16}/> Eliminar historia</button>}
        </section></div>}
        {showStoryArchive && <div className="story-viewer-backdrop" onClick={() => setShowStoryArchive(false)}><section className="story-archive-panel" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}><div className="story-viewers-sheet-heading"><div><strong>Historias archivadas</strong><small>Solo vos podés verlas</small></div><button type="button" onClick={() => setShowStoryArchive(false)} aria-label="Cerrar archivo"><X size={19}/></button></div><div className="story-archive-grid">{archivedStories.length ? archivedStories.map(item => <button type="button" key={item.id} onClick={() => { setShowStoryArchive(false); openStory(item) }}>{item.media_type === 'video' ? <video src={item.url} muted playsInline/> : <img src={item.url} alt="Historia archivada"/>}<span>{new Date(item.archived_at).toLocaleDateString('es-UY')}{item.expires_at && new Date(item.expires_at).getTime() > Date.now() ? ' · Disponible para restaurar' : ' · Vencida'}</span></button>) : <p>Todavía no archivaste historias.</p>}</div></section></div>}
        
        {peopleError && <div className="notice error">{peopleError}</div>}
        {peopleLoading && !people.length ? <div className="empty-state">Buscando perfiles…</div> : (
          <>
          {view === 'home' && showDiscoveryFilters && <div className="discovery-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setShowDiscoveryFilters(false)}}><section className="discovery-filter-modal" role="dialog" aria-modal="true" aria-labelledby="discovery-filter-title">
            <div className="discovery-modal-heading"><div><span className="discovery-modal-icon"><SlidersHorizontal size={20}/></span><div><h2 id="discovery-filter-title">Filtros de búsqueda</h2><small>{discoveryPeople.length} perfiles coinciden con tu búsqueda</small></div></div><button type="button" className="discovery-modal-close" onClick={()=>setShowDiscoveryFilters(false)} aria-label="Cerrar filtros"><X size={21}/></button></div>
            <nav className="discovery-modal-shortcuts" aria-label="Secciones de descubrir"><button type="button" className="selected" onClick={()=>setShowDiscoveryFilters(false)}><Compass size={16}/> Cerca de vos</button><button type="button" onClick={()=>{setShowDiscoveryFilters(false);setView('favorites')}}><Heart size={16}/> Favoritos <span>{favoriteIds.length}</span></button><button type="button" onClick={()=>{setShowDiscoveryFilters(false);setView('connections')}}><Users size={16}/> Conexiones <span>{connectionRows.filter(row=>row.status==='accepted').length}</span></button></nav>
            <div className="discovery-filter-grid">
              <label className="discovery-search-field"><span>Buscar personas</span><input type="search" value={discoverySearch} onChange={event=>setDiscoverySearch(event.target.value)} placeholder="Nombre, usuario, bio o intereses…"/></label>
              <label><span>Ciudad o región</span><input type="search" value={discoveryCity} onChange={event=>setDiscoveryCity(event.target.value)} placeholder="Ej. Montevideo"/></label>
              <label><span>Interés</span><select value={discoveryInterest} onChange={event=>setDiscoveryInterest(event.target.value)}><option value="">Todos los intereses</option>{['Música','Cine','Deportes','Viajes','Gastronomía','Videojuegos','Arte','Naturaleza','Fitness','Lectura','Series','Tecnología'].map(item=><option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Qué busca</span><select value={discoveryLookingFor} onChange={event=>setDiscoveryLookingFor(event.target.value)}><option value="">Cualquier preferencia</option>{['Amistad','Citas','Relación seria','Conocer personas','Charlar'].map(item=><option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Ordenar por</span><select value={discoverySort} onChange={event=>setDiscoverySort(event.target.value)}><option value="recent">Más recientes</option><option value="oldest">Más antiguos</option><option value="name">Nombre (A–Z)</option></select></label>
              <label><span>Edad mínima (18–99)</span><input type="number" min="18" max="99" placeholder="Sin mínimo" value={discoveryAgeMin} onChange={event=>setDiscoveryAgeMin(event.target.value)}/></label>
              <label><span>Edad máxima (18–99)</span><input type="number" min="18" max="99" placeholder="Sin máximo" value={discoveryAgeMax} onChange={event=>setDiscoveryAgeMax(event.target.value)}/></label>
              <label><span>Distancia aproximada</span><select value={discoveryDistanceKm} onChange={event=>setDiscoveryDistanceKm(event.target.value)}><option value="">Cualquier distancia</option><option value="5">Hasta 5 km</option><option value="10">Hasta 10 km</option><option value="25">Hasta 25 km</option><option value="50">Hasta 50 km</option><option value="100">Hasta 100 km</option></select><small>Requiere activar el mapa. Solo incluye personas que también eligieron aparecer allí.</small></label>
            </div>
            <div className="discovery-filter-toggles">
              <label><input type="checkbox" checked={discoveryVerifiedOnly} onChange={event=>setDiscoveryVerifiedOnly(event.target.checked)}/> Solo cuentas verificadas</label>
              <label><input type="checkbox" checked={discoveryWithPhotos} onChange={event=>setDiscoveryWithPhotos(event.target.checked)}/> Con fotos</label>
              <label><input type="checkbox" checked={discoveryOnlineRecently} onChange={event=>setDiscoveryOnlineRecently(event.target.checked)}/> En línea en los últimos 15 minutos</label>
            </div>
            <div className="discovery-modal-actions"><button type="button" className="filter-clear-btn" onClick={()=>{setDiscoverySearch('');setDiscoveryCity('');setDiscoveryInterest('');setDiscoveryLookingFor('');setDiscoveryVerifiedOnly(false);setDiscoveryWithPhotos(false);setDiscoverySort('recent');setDiscoveryAgeMin('');setDiscoveryAgeMax('');setDiscoveryDistanceKm('');setDiscoveryOnlineRecently(false)}}>Limpiar filtros</button><button type="button" className="submit-btn" onClick={()=>setShowDiscoveryFilters(false)}>Aplicar filtros <span>→</span></button></div>
          </section></div>}
          <div className="people-grid">
          {view === 'home' && <article className="person-card own-person-card person-card-clickable" key={session.user.id} role="button" tabIndex={0} onClick={()=>openMemberProfile({...profile,photos,visibleCity:profile?.show_location?[profile?.city,profile?.region].filter(Boolean).join(', '):''},true)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMemberProfile({...profile,photos,visibleCity:profile?.show_location?[profile?.city,profile?.region].filter(Boolean).join(', '):''},true)}}}>
            <div className="person-card-gallery">
              {photos.length ? <img src={photos[0].url} alt="Tu foto de perfil"/> : <ProfileAvatar person={{...profile,display_name:profile?.display_name||displayName}}/>}
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
          {(view === 'home' ? discoveryPeople : view === 'favorites' ? people.filter(person => person.isBot ? botFavoriteIds.includes(person.id) : favoriteIds.includes(person.id)) : people).map(person => <article className={`person-card${person.isBot ? ' person-card-bot' : ' person-card-clickable'}`} key={person.id} role="button" tabIndex={0} onClick={()=>openMemberProfile(person,false)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMemberProfile(person,false)}}}>
            <div className="person-card-gallery">
              {person.photos?.length ? <img src={person.photos[0].url} alt={`Foto de ${person.display_name || 'usuario'}`}/> : <ProfileAvatar person={person}/>}
              
            </div>
            <div className="person-info">
              <div className="person-title-row"><h3>{person.display_name || 'Usuario ZUNO'} {person.zuno_verified && <span className="verified-dot" title="Cuenta verificada">✓</span>}</h3>{person.isBot ? <span className="zuno-bot-badge"><Sparkles size={12}/> Bot de ZUNO</span> : <button type="button" className={`favorite-btn ${favoriteIds.includes(person.id) ? 'is-favorite' : ''}`} aria-label={favoriteIds.includes(person.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'} title={favoriteIds.includes(person.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'} disabled={favoriteBusy === person.id} onClick={event=>{event.stopPropagation();toggleFavorite(person.id)}}><Heart size={18} fill={favoriteIds.includes(person.id) ? 'currentColor' : 'none'}/></button>}</div>
              {person.show_distance && person.approximateDistanceKm!==null && person.approximateDistanceKm!==undefined && <p className="person-distance-label"><MapPin size={12}/> A {formatApproxDistance(person.approximateDistanceKm)}</p>}
              {person.show_online && person.activityStatus && <p className={`person-online-label ${person.activityStatus}`}><span/> {person.activityStatus === 'active' ? 'Activo ahora' : person.activityStatus === 'recent' ? 'En línea recientemente' : 'Desconectado'}</p>}
              {!person.isBot && <div className="person-card-actions"><button type="button" className="chat-start-btn" onClick={event=>{event.stopPropagation();openChat(person)}}><MessageCircle size={15}/> Chatear</button><ConnectionAction personId={person.id} currentUserId={session.user.id} rows={connectionRows} busy={connectionBusy} onSend={sendConnectionRequest} onRespond={respondToConnection}/></div>}
              {person.isBot && <div className="person-card-actions"><button type="button" className="favorite-btn" aria-label="Agregar a favoritos" title="Favoritos" onClick={event=>{event.stopPropagation();toggleBotFavorite(person)}}><Heart size={17} fill={botFavoriteIds.includes(person.id)?'currentColor':'none'}/></button><button type="button" className="favorite-btn" aria-label="Enviar tap" title="Tap" onClick={event=>{event.stopPropagation();botUnavailableAction('Tap')}}><Flame size={17}/></button><button type="button" className="chat-start-btn" onClick={event=>{event.stopPropagation();openBotChat(person)}}><MessageCircle size={15}/> Chatear</button></div>}
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
          {view === 'favorites' && !peopleLoading && !people.some(person => person.isBot ? botFavoriteIds.includes(person.id) : favoriteIds.includes(person.id)) && <div className="empty-state"><div className="empty-icon"><Heart size={24}/></div><h2>Todavía no guardaste favoritos</h2><p>Cuando encuentres un perfil que te interese, tocá el corazón para guardarlo acá.</p><button className="submit-btn home-refresh" onClick={()=>setView('home')}>Explorar perfiles <span>→</span></button></div>}
          </>
        )}
      </section><ZunoBottomNav view={view} setView={setView} onLogout={logout} adminVisible={String(profile?.username||'').trim().toLowerCase()==='manu.german'} unreadCount={Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)} notificationCount={notifications.filter(item=>!item.read_at).length} mapRequestCount={notifications.filter(item=>item.notification_type==='map_meetup_request'&&!item.read_at).length} albumRequestCount={notifications.filter(item=>item.notification_type==='album_access_request'&&!item.read_at).length}/><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  if (session?.user) return (
    <main className="app-shell">{callOverlay}
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><div className="account-actions">{profile?.display_name && <button className="logout-btn" onClick={()=>setView('home')}><Compass size={15}/> Volver</button>}<span className="verification-badge">{profile?.zuno_verified ? "✓ Cuenta verificada" : "Cuenta no verificada"}</span></div></header>
      <section className="account-layout">
        <div className="account-intro"><div className="eyebrow"><span/> TU ESPACIO EN ZUNO</div><h1>Hola,<br/><span>{displayName || 'bienvenido' }.</span></h1><p>Tu cuenta ya está activa. Ahora podés completar tu perfil para que otras personas te conozcan.</p><div className="feature-row"><span><ShieldCheck size={17}/> Cuenta protegida</span><span><Users size={17}/> Comunidad ZUNO</span></div></div>
        <div className="auth-card profile-card"><div className="card-icon"><UserRound size={21}/></div><h2>{profile?.display_name ? 'Editá tu perfil' : 'Completá tu perfil'}</h2><p className="card-sub">{profile?.display_name ? 'Actualizá la información que ve la comunidad.' : 'Estos datos ayudan a presentar quién sos.'}</p>
          <form onSubmit={saveProfile}>
            <label htmlFor="displayName">Nombre para mostrar</label><input id="displayName" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Cómo querés que te llamen" required maxLength={40}/>
            <label htmlFor="username">Nombre de usuario</label><input id="username" value={username} onChange={e=>setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g,''))} placeholder="ej. manu_uy" minLength={3} maxLength={24}/><p className="field-hint">3 a 24 caracteres. Letras, números, puntos y guion bajo.</p>
            <label htmlFor="bio">Sobre vos</label><textarea id="bio" value={bio} onChange={e=>setBio(e.target.value)} placeholder="Contá algo sobre vos…" maxLength={300} rows={4}/><div className="char-count">{bio.length}/300</div>
            <div className="profile-section"><h3><ImagePlus size={17}/> Fotos y galería</h3><p className="field-hint">Hasta 6 fotos. JPG, PNG o WEBP de hasta 10 MB.</p><div className="photo-gallery">{photos.map(photo=><div className="photo-thumb" key={photo.id}>{photo.url&&<img src={photo.url} alt="Foto de perfil"/>}<button type="button" onClick={()=>deletePhoto(photo)} disabled={photoBusy} aria-label="Eliminar foto"><Trash2 size={15}/></button></div>)}<label className="photo-add"><ImagePlus size={22}/><span>{photoBusy?'Procesando…':'Agregar fotos'}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadPhotos} disabled={photoBusy||photos.length>=6}/></label></div></div>
            <div className="profile-section"><h3><Images size={17}/> Álbum privado</h3><p className="field-hint">Hasta 20 fotos. Solo las personas a quienes apruebes podrán verlas. Las solicitudes las decidís vos.</p><div className="photo-gallery">{privateAlbumPhotos.map(photo=><div className="photo-thumb" key={photo.id}>{photo.url&&<img src={photo.url} alt="Foto privada"/>}<button type="button" onClick={()=>deletePrivateAlbumPhoto(photo)} disabled={privateAlbumBusy} aria-label="Eliminar foto privada"><Trash2 size={15}/></button></div>)}<label className="photo-add"><Images size={22}/><span>{privateAlbumBusy?'Procesando…':'Agregar al álbum privado'}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadPrivateAlbumPhotos} disabled={privateAlbumBusy||privateAlbumPhotos.length>=20}/></label></div>{privateAlbumMessage&&<div className="notice">{privateAlbumMessage}</div>}<h4>Solicitudes recibidas</h4>{privateAlbumRequests.filter(r=>r.status==='pending').length ? <div className="blocked-users-list">{privateAlbumRequests.filter(r=>r.status==='pending').map(request=><div className="blocked-user-row" key={request.id}><span><strong>{request.requester?.display_name || request.requester?.username || "Usuario ZUNO"}</strong><small>{request.requester?.username ? "@"+request.requester.username+" · " : ""}{new Date(request.created_at).toLocaleString()}</small></span><button type="button" className="submit-btn" disabled={privateAlbumBusy} onClick={()=>decidePrivateAlbumRequestFromProfile(request.id,'approved')}>Aceptar</button><button type="button" className="logout-btn" disabled={privateAlbumBusy} onClick={()=>decidePrivateAlbumRequestFromProfile(request.id,'rejected')}>Rechazar</button></div>)}</div>:<p className="detail-private-note">No tenés solicitudes pendientes.</p>}<h4>Personas con acceso</h4>{privateAlbumRequests.filter(r=>r.status==='approved').length ? <div className="blocked-users-list">{privateAlbumRequests.filter(r=>r.status==='approved').map(request=><div className="blocked-user-row" key={request.id}><span><strong>{request.requester?.display_name || request.requester?.username || "Usuario ZUNO"}</strong><small>{request.requester?.username ? "@"+request.requester.username+" · " : ""}Puede ver tu álbum privado</small></span><button type="button" className="logout-btn" disabled={privateAlbumBusy} onClick={()=>revokePrivateAlbumAccess(request.id)}>Revocar acceso</button></div>)}</div>:<p className="detail-private-note">Todavía no compartiste tu álbum con nadie.</p>}</div>
            <div className="profile-section"><h3>Datos personales</h3><label htmlFor="birthDate">Fecha de nacimiento (privada)</label><input id="birthDate" type="date" value={birthDate} max={new Date().toISOString().slice(0,10)} onChange={e=>setBirthDate(e.target.value)}/><p className="field-hint">Tu fecha completa no se muestra públicamente. ZUNO es solo para mayores de 18 años.</p><label htmlFor="city">Ciudad o localidad aproximada</label><input id="city" value={city} onChange={e=>setCity(e.target.value)} placeholder="Ej. Montevideo"/><label htmlFor="region">Departamento / región</label><input id="region" value={region} onChange={e=>setRegion(e.target.value)} placeholder="Ej. Montevideo"/></div>
            <div className="profile-section"><h3>Intereses y gustos</h3><div className="choice-chips">{interestOptions.map(item=><button type="button" key={item} className={interests.includes(item)?'selected':''} onClick={()=>setInterests(cur=>cur.includes(item)?cur.filter(x=>x!==item):[...cur,item])}>{item}</button>)}</div></div>
            <div className="profile-section"><h3>¿Qué estás buscando?</h3><div className="choice-chips">{lookingOptions.map(item=><button type="button" key={item} className={lookingFor.includes(item)?'selected':''} onClick={()=>setLookingFor(cur=>cur.includes(item)?cur.filter(x=>x!==item):[...cur,item])}>{item}</button>)}</div><label htmlFor="ageMin">Edad mínima</label><input id="ageMin" type="number" min="18" max="99" value={ageMin} onChange={e=>setAgeMin(e.target.value)}/><label htmlFor="ageMax">Edad máxima</label><input id="ageMax" type="number" min="18" max="99" value={ageMax} onChange={e=>setAgeMax(e.target.value)}/><label htmlFor="distanceKm">Distancia máxima aproximada (km)</label><input id="distanceKm" type="number" min="1" max="500" value={distanceKm} onChange={e=>setDistanceKm(e.target.value)}/></div>
            <div className="profile-section"><h3><ShieldCheck size={17}/> Privacidad</h3><div className="privacy-options"><p className="detail-private-note">Aceptaste los términos y condiciones al registrarte. Desde Explorar podés activar o desactivar la visibilidad de tu ubicación y distancia cuando quieras.</p><label className="privacy-toggle"><span>Aparecer en el mapa</span><input type="checkbox" checked={mapVisible} disabled={mapBusy || !locationTermsAccepted} onChange={e=>setMyMapVisibility(e.target.checked)}/></label>{[['show_online','Mostrar cuando estoy conectado'],['show_distance','Mostrar distancia en perfiles'],['show_age','Permitir mostrar mi edad'],['show_location','Mostrar ciudad o región']].map(([key,label])=><label className="privacy-toggle" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(privacy[key])} onChange={e=>setPrivacy(cur=>({...cur,[key]:e.target.checked}))}/></label>)}</div><p className="detail-private-note">Para mostrar la distancia, ambos usuarios deben aceptar estos términos, activar “Mostrar distancia en perfiles” y compartir una ubicación reciente. La opción “Aparecer en el mapa” es independiente. Si desactivás ambas opciones, ZUNO deja de usar tu ubicación para estas funciones.</p></div>
            <div className="profile-section"><h3><Ban size={17}/> Cuentas bloqueadas</h3>{blockedUsers.length ? <div className="blocked-users-list">{blockedUsers.map(item=><div className="blocked-user-row" key={item.id}><span><strong>{item.person?.display_name || 'Usuario ZUNO'}</strong><small>{item.person?.username ? '@'+item.person.username : 'Cuenta bloqueada'}</small></span><button type="button" className="logout-btn" disabled={blockBusy===item.blocked_id} onClick={()=>unblockUser(item.blocked_id)}>Desbloquear</button></div>)}</div> : <p className="detail-private-note">Todavía no bloqueaste ninguna cuenta.</p>}</div>
            {error && <div className="notice error">{error}</div>}{message && <div className="notice success">{message}</div>}
            <button className="submit-btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : profile?.display_name ? 'Guardar cambios' : 'Guardar perfil'} <span>→</span></button>
          </form>
          <p className="legal">Tu perfil podrá ampliarse más adelante con fotos, intereses y preferencias de privacidad.</p>
        </div>
      </section><ZunoBottomNav view={view} setView={setView} onLogout={logout} adminVisible={String(profile?.username||'').trim().toLowerCase()==='manu.german'} unreadCount={Object.values(unreadCounts).reduce((sum,count)=>sum+count,0)} notificationCount={notifications.filter(item=>!item.read_at).length} mapRequestCount={notifications.filter(item=>item.notification_type==='map_meetup_request'&&!item.read_at).length} albumRequestCount={notifications.filter(item=>item.notification_type==='album_access_request'&&!item.read_at).length}/><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )

  return (
    <main className="app-shell">{callOverlay}
      <header className="topbar"><a className="brand" href="#"><span className="brand-mark">z</span> zuno</a><span className="top-note">CONEXIONES AUTÉNTICAS</span></header>
      <section className="hero auth-landing">
        <div className="hero-copy auth-brand-panel">
          <div className="auth-brand-glow"/>
          <div className="auth-heart-mark"><Heart size={42} fill="currentColor"/></div>
          <div className="auth-wordmark">{publicPlatformSettings?.platform_name || 'ZUNO'}</div>
          <div className="auth-tagline">Conectar · Chatear · Descubrir</div>
          <div className="auth-divider"/>
          <p>{publicPlatformSettings?.platform_description || 'Encontrá personas cerca de vos.'}</p>
          <div className="auth-feature-pills"><span><Users size={15}/> Comunidad</span><span><MessageCircle size={15}/> Conversaciones</span></div>
          <div className="orb orb-one"/><div className="orb orb-two"/>
        </div>
        <div className="auth-wrap"><div className="auth-card auth-card-neon"><div className="card-icon"><Heart size={21} fill="currentColor"/></div><h2>{mode === 'signup' ? 'Creá tu cuenta' : 'Bienvenido de nuevo'}</h2><p className="card-sub">{mode === 'signup' ? 'Tu próxima conexión empieza acá.' : 'Iniciá sesión para continuar.'}</p>
          <div className="mode-switch" role="tablist" aria-label="Acceso a ZUNO"><button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={()=>{if(publicPlatformSettings?.registration_enabled===false)return;setMode('signup');setError('');setMessage('');setVerificationEmail('')}} disabled={publicPlatformSettings?.registration_enabled===false}>Crear cuenta</button><button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={()=>{setMode('login');setError('');setMessage('');setVerificationEmail('')}}>Iniciar sesión</button></div>
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && publicPlatformSettings?.registration_enabled === false ? <div className="notice error">ZUNO no está aceptando nuevos registros en este momento.</div> : mode === 'signup' && <><label htmlFor="displayName">¿Cómo querés que te llamemos?</label><input id="displayName" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Tu nombre para mostrar" required maxLength={40}/></>}
            <label htmlFor="email">Correo electrónico</label><input id="email" type="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
            <label htmlFor="password">Contraseña</label><div className="password-field"><input id="password" type={showPassword?'text':'password'} autoComplete={mode==='signup'?'new-password':'current-password'} placeholder="Mínimo 8 caracteres" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/><button type="button" aria-label={showPassword?'Ocultar contraseña':'Mostrar contraseña'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
            {mode === 'signup' && <label className="signup-terms-check"><input type="checkbox" checked={locationTermsAccepted} onChange={e=>setLocationTermsAccepted(e.target.checked)}/><span>Acepto los <button type="button" className="terms-inline-link" onClick={()=>setShowTermsModal(true)}>términos y condiciones</button> de ZUNO.</span></label>}
            {error && <div className="notice error" role="alert">{error}</div>}{message && <div className="notice success" role="status">{message}</div>}
            <button className="submit-btn" type="submit" disabled={busy || (mode === 'signup' && !locationTermsAccepted)}>{busy?'Un momento…':mode==='signup'?'Crear mi cuenta':'Iniciar sesión'} <span>→</span></button>
          </form>
          {showTermsModal && <div className="terms-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setShowTermsModal(false)}}><section className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="zuno-terms-title"><div className="terms-modal-header"><div><span className="eyebrow">ZUNO · CONDICIONES DE USO</span><h2 id="zuno-terms-title">Términos y condiciones</h2></div><button type="button" className="terms-modal-close" onClick={()=>setShowTermsModal(false)} aria-label="Cerrar términos">×</button></div><div className="terms-modal-content"><p><strong>1. Requisitos de uso.</strong> ZUNO es una plataforma destinada exclusivamente a personas mayores de 18 años. Al crear una cuenta declarás que cumplís este requisito y que los datos que proporcionás son correctos.</p><p><strong>2. Uso de ubicación precisa.</strong> Para calcular distancias entre usuarios, ZUNO puede solicitar permiso de ubicación al dispositivo y recibir coordenadas precisas (latitud y longitud). Estas coordenadas se utilizan para calcular la distancia entre personas y, cuando corresponda y esté habilitada la función, para ubicarte de forma aproximada en el mapa. La ubicación precisa no se muestra públicamente como dirección ni como coordenadas.</p><p><strong>3. Distancias y visibilidad.</strong> La distancia que se muestra puede expresarse en metros o kilómetros y es una estimación calculada a partir de las ubicaciones compartidas más recientes. Puede variar por movimiento, señal GPS, permisos y precisión del dispositivo. Para que se muestre la distancia, ambas personas deben haber aceptado estos términos, habilitado la visibilidad correspondiente y compartido una ubicación reciente.</p><p><strong>4. Almacenamiento y control.</strong> Las coordenadas se almacenan para permitir las funciones de proximidad y mapa. Podés dejar de compartir tu ubicación o desactivar la visibilidad desde los controles de privacidad de ZUNO; al desactivar la visibilidad, ZUNO elimina las coordenadas guardadas para esa función. Si retirás el permiso de ubicación en el dispositivo, no podremos obtener nuevas ubicaciones.</p><p><strong>5. Privacidad.</strong> ZUNO no debe utilizar tu ubicación para revelar tu domicilio exacto a otros usuarios. Aun así, la distancia y la posición aproximada pueden permitir inferir cercanía. Evitá compartir información personal que no quieras hacer pública y revisá tus opciones de privacidad.</p><p><strong>6. Conducta y seguridad.</strong> Te comprometés a respetar a las demás personas, no acosar, amenazar, suplantar identidades, publicar contenido ilegal ni utilizar la plataforma para actividades ilícitas. Podés bloquear o denunciar cuentas que incumplan estas reglas.</p><p><strong>7. Mensajes, archivos y conservación de contenido.</strong> Los mensajes y los archivos que compartas mediante ZUNO, incluidos textos, fotografías, videos, audios y otros adjuntos, pueden ser almacenados y procesados en nuestros sistemas para prestar el servicio, mantener su seguridad, prevenir abusos, atender denuncias, resolver conflictos y cumplir obligaciones legales o requerimientos válidos de autoridades. Esto también puede comprender contenido enviado mediante funciones de duración limitada o efímera: que un mensaje o archivo deje de estar visible para los participantes o expire en la aplicación no significa necesariamente que todas sus copias técnicas, registros o respaldos se eliminen en ese mismo momento. Cuando corresponda, ZUNO podrá preservar contenido y registros relevantes para una investigación de seguridad, una reclamación o un procedimiento legal. El acceso estará limitado a personal autorizado y sujeto a controles de seguridad y registro. La conservación no será indefinida por defecto: se limitará al tiempo necesario para las finalidades informadas o al plazo exigido o permitido por la normativa aplicable; luego se eliminará o anonimizará cuando corresponda, salvo conservación legalmente justificada.</p><p><strong>8. Privacidad y derechos.</strong> Podés solicitar información sobre el tratamiento de tus datos y ejercer los derechos que te reconoce la normativa aplicable, incluidos acceso, rectificación y supresión cuando corresponda, a través de los canales de contacto que ZUNO habilite. Algunas solicitudes de eliminación pueden estar sujetas a excepciones cuando exista una obligación legal o una necesidad legítima de preservar evidencia.</p><p><strong>9. Consentimiento.</strong> Al marcar «Acepto los términos y condiciones» y crear tu cuenta, confirmás que leíste y aceptás estas condiciones, incluido el tratamiento de contenido y la conservación descritos. La aceptación queda asociada a tu cuenta y a la fecha de registro. Podés retirar el permiso de ubicación desde Privacidad; algunas funciones de proximidad dejarán de estar disponibles.</p><p className="terms-modal-note">La aceptación es obligatoria para registrarte. Si no estás de acuerdo, no marques la casilla y no podrás crear una cuenta.</p></div><div className="terms-modal-actions"><button type="button" className="logout-btn" onClick={()=>setShowTermsModal(false)}>Cerrar</button><button type="button" className="submit-btn" onClick={()=>{setLocationTermsAccepted(true);setShowTermsModal(false)}}>Acepto los términos</button></div></section></div>}
          {verificationEmail && <div className="verification-resend"><p>¿No recibiste el correo de confirmación?</p><button type="button" className="logout-btn" onClick={resendVerification} disabled={busy}>Reenviar correo</button></div>}
          <p className="legal">ZUNO es para mayores de 18 años. Al continuar confirmás que tenés al menos 18 años y aceptás nuestras condiciones y política de privacidad.</p>
          {!isSupabaseConfigured && <p className="config-hint">Configuración pendiente: conectar las variables de Supabase.</p>}
        </div><div className="under-card"><ShieldCheck size={15}/> Tus datos y tu privacidad importan.</div></div>
      </section><footer>© 2026 ZUNO <span>BE YOURSELF. FIND YOUR CONNECTION.</span></footer>
    </main>
  )
}


function ZunoBottomNav({ view, setView, unreadCount, notificationCount, mapRequestCount, albumRequestCount, onLogout, adminVisible = false }) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const active = view === 'chat' ? 'chats' : ['detail','favorites','connections'].includes(view) ? (view==='favorites'?'favorites':'home') : view
  const go = (nextView) => { setProfileMenuOpen(false); setView(nextView) }
  return (
    <nav className={'zuno-bottom-nav'+(adminVisible?' has-admin':'')} aria-label="Navegación principal">
      <button type="button" className={active==='home'?'active':''} onClick={()=>go('home')}><Compass size={21}/><span>Descubrir</span></button>
      <button type="button" className={active==='chats'?'active':''} onClick={()=>go('chats')}><span className="zuno-nav-icon"><MessageCircle size={21}/>{unreadCount>0&&<i>{unreadCount>99?'99+':unreadCount}</i>}</span><span>Chats</span></button>
      <button type="button" className={active==='notifications'?'active':''} onClick={()=>go('notifications')}><span className="zuno-nav-icon"><Bell size={21}/>{notificationCount>0&&<i>{notificationCount>99?'99+':notificationCount}</i>}{(mapRequestCount>0||albumRequestCount>0)&&<b className="zuno-map-request-dot" aria-label="Nueva solicitud pendiente"/>}</span><span>Notificaciones</span></button>
      <button type="button" className={active==='map'?'active':''} onClick={()=>go('map')}><MapPin size={21}/><span>Mapa</span></button>
      {adminVisible && <button type="button" className={active==='admin'?'active zuno-admin-nav':'zuno-admin-nav'} onClick={()=>go('admin')}><ShieldCheck size={21}/><span>Admin</span></button>}
      <div className="zuno-profile-nav-wrap">
        {profileMenuOpen && <div className="zuno-profile-menu" role="menu">
          <button type="button" role="menuitem" onClick={()=>go('profile')}><Pencil size={17}/><span>Editar perfil</span></button>
          <button type="button" role="menuitem" onClick={()=>{setProfileMenuOpen(false);onLogout()}}><LogOut size={17}/><span>Cerrar sesión</span></button>
        </div>}
        <button type="button" className={active==='profile'?'active':''} aria-expanded={profileMenuOpen} aria-haspopup="menu" onClick={()=>setProfileMenuOpen(open=>!open)}><UserRound size={21}/><span>Perfil</span></button>
      </div>
    </nav>
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
