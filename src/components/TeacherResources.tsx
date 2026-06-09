'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Unit, Topic } from '@/lib/types'

export default function TeacherResources() {
  const [units, setUnits] = useState<Unit[]>([])
  const [unitId, setUnitId] = useState<number | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [videoInputs, setVideoInputs] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('units').select('id, number, title').order('number').then(({ data }) => {
      if (data) { setUnits(data as Unit[]); if (data[0]) setUnitId(data[0].id) }
    })
  }, [])

  const loadTopics = useCallback(async () => {
    if (!unitId) return
    const { data } = await supabase.from('topics').select('*').eq('unit_id', unitId).order('order_index')
    if (data) {
      setTopics(data as Topic[])
      const vi: Record<number, string> = {}
      ;(data as Topic[]).forEach((t) => { vi[t.id] = t.video_url || '' })
      setVideoInputs(vi)
    }
  }, [unitId])

  useEffect(() => { loadTopics() }, [loadTopics])

  const saveVideo = async (t: Topic) => {
    const url = (videoInputs[t.id] || '').trim()
    const { error } = await supabase.from('topics').update({ video_url: url || null }).eq('id', t.id)
    setMsg(error ? `❌ ${error.message}` : '✅ Video guardado.')
    loadTopics()
  }

  const uploadImage = async (t: Topic, file: File) => {
    setBusy(t.id); setMsg('')
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `topic-${t.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('theory-media').upload(path, file, { upsert: true })
    if (error) { setBusy(null); setMsg(`❌ Error al subir: ${error.message} (¿corriste media_upgrades.sql?)`); return }
    const { data } = supabase.storage.from('theory-media').getPublicUrl(path)
    await supabase.from('topics').update({ image_url: data.publicUrl }).eq('id', t.id)
    setBusy(null); setMsg('✅ Infografía subida.')
    loadTopics()
  }

  const removeField = async (t: Topic, field: 'video_url' | 'image_url') => {
    await supabase.from('topics').update({ [field]: null }).eq('id', t.id)
    loadTopics()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass-card rounded-2xl p-5 mb-4">
        <label className="block text-sm font-button-text text-on-surface mb-2">Unidad</label>
        <select value={unitId ?? ''} onChange={(e) => setUnitId(Number(e.target.value))}
          className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl px-4 py-2 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30">
          {units.map((u) => <option key={u.id} value={u.id}>Unit {u.number}: {u.title}</option>)}
        </select>
        {msg && <p className="text-sm mt-2 text-on-surface-variant">{msg}</p>}
      </div>

      <div className="space-y-4">
        {topics.map((t) => (
          <div key={t.id} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{t.kind === 'vocabulary' ? '🗂️' : t.kind === 'discover' ? '🧩' : '📐'}</span>
              <h3 className="font-headline-md text-on-surface">{t.title}</h3>
            </div>

            {/* Video (YouTube o URL) */}
            <label className="block text-xs font-button-text text-on-surface-variant mb-1">🎬 Video (pega un enlace de YouTube)</label>
            <div className="flex gap-2 mb-1">
              <input
                value={videoInputs[t.id] ?? ''}
                onChange={(e) => setVideoInputs((v) => ({ ...v, [t.id]: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-secondary placeholder:text-outline/50"
              />
              <button onClick={() => saveVideo(t)} className="bg-gradient-to-r from-primary to-secondary text-on-primary px-4 rounded-xl text-sm font-button-text">Guardar</button>
            </div>
            {t.video_url && <button onClick={() => removeField(t, 'video_url')} className="text-xs text-error hover:underline mb-3">Quitar video</button>}

            {/* Infografía (archivo) */}
            <label className="block text-xs font-button-text text-on-surface-variant mb-1 mt-3">📊 Infografía (imagen)</label>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" disabled={busy === t.id}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(t, f) }}
                className="text-sm text-on-surface-variant file:bg-surface-container-high file:text-on-surface file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3" />
              {busy === t.id && <span className="text-xs text-on-surface-variant">Subiendo…</span>}
              {t.image_url && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.image_url} alt="" className="h-10 w-10 object-cover rounded-lg" />
                  <button onClick={() => removeField(t, 'image_url')} className="text-xs text-error hover:underline">Quitar</button>
                </>
              )}
            </div>
          </div>
        ))}
        {topics.length === 0 && <p className="text-on-surface-variant text-sm text-center py-6">Esta unidad no tiene temas de teoría.</p>}
      </div>
    </div>
  )
}
