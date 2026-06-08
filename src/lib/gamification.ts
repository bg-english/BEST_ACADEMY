import { supabase } from './supabase'
import { Badge } from './types'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}

export interface ProgressResult {
  newBadges: Badge[]
  totalXp: number
  streak: number
}

type Metrics = Record<string, number>

async function checkAchievements(studentId: string, totalXp: number, streak: number): Promise<Badge[]> {
  const [badgesRes, earnedRes, topicsRes, vocabRes, statsRes] = await Promise.all([
    supabase.from('badges').select('*'),
    supabase.from('student_badges').select('badge_id').eq('student_id', studentId),
    supabase.from('student_topic_progress').select('topic_id').eq('student_id', studentId).eq('completed', true),
    supabase.from('student_vocab').select('word_id').eq('student_id', studentId).eq('sentences_ok', true),
    supabase.from('student_practice_stats').select('level_reached').eq('student_id', studentId),
  ])
  const badges = (badgesRes.data || []) as Badge[]
  const earnedIds = new Set((earnedRes.data || []).map((e: { badge_id: number }) => e.badge_id))
  const metrics: Metrics = {
    total_xp: totalXp,
    current_streak: streak,
    topics_done: (topicsRes.data || []).length,
    vocab_done: (vocabRes.data || []).length,
    levels_done: (statsRes.data || []).reduce((a: number, x: { level_reached: number }) => a + (x.level_reached || 0), 0),
  }
  const toAward = badges.filter(
    (b) => !earnedIds.has(b.id) && (metrics[b.condition_type] ?? 0) >= b.condition_value
  )
  if (toAward.length > 0) {
    await supabase.from('student_badges').insert(
      toAward.map((b) => ({ student_id: studentId, badge_id: b.id }))
    )
  }
  return toAward
}

/** Suma XP, recalcula nivel, actualiza la racha diaria y otorga logros nuevos. */
export async function recordProgress(studentId: string, xpToAdd: number): Promise<ProgressResult> {
  const { data: s } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle()
  if (!s) return { newBadges: [], totalXp: 0, streak: 0 }

  const newXp = (s.total_xp || 0) + Math.max(0, xpToAdd)
  const newLevel = Math.floor(newXp / 100) + 1

  // Racha diaria
  const today = todayStr()
  let streak = s.current_streak || 0
  const last: string | undefined = s.last_active
  if (last) {
    const d = daysBetween(last, today)
    if (d === 1) streak = streak + 1
    else if (d > 1) streak = 1
    // d === 0 (mismo día): se mantiene
  } else {
    streak = Math.max(1, streak)
  }

  const upd: Record<string, unknown> = {
    total_xp: newXp, level: newLevel, current_streak: streak, last_active: today,
  }
  const { error } = await supabase.from('students').update(upd).eq('id', studentId)
  if (error) {
    // Probablemente falta la columna last_active (correr upgrades.sql): reintentar sin ella
    delete upd.last_active
    await supabase.from('students').update(upd).eq('id', studentId)
  }

  const newBadges = await checkAchievements(studentId, newXp, streak)
  return { newBadges, totalXp: newXp, streak }
}
