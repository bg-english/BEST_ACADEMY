import { supabase } from './supabase'

/** Suma XP al alumno y recalcula su nivel. No-op si amount <= 0. */
export async function awardXp(studentId: string, amount: number) {
  if (!amount || amount <= 0) return
  const { data } = await supabase.from('students').select('total_xp').eq('id', studentId).maybeSingle()
  if (!data) return
  const newXp = (data.total_xp || 0) + amount
  await supabase
    .from('students')
    .update({ total_xp: newXp, level: Math.floor(newXp / 100) + 1 })
    .eq('id', studentId)
}
