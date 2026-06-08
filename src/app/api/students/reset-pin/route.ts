import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, requireTeacher } from '@/lib/supabaseAdmin'
import { pinToPassword } from '@/lib/studentAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearer(req: NextRequest) {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
}

// POST /api/students/reset-pin  { studentId, pin }  -> cambia el PIN (solo profesor)
export async function POST(req: NextRequest) {
  const teacher = await requireTeacher(bearer(req))
  if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const studentId = (body?.studentId || '').toString()
  const pin = (body?.pin || '').toString().trim()
  if (!studentId || !pin) {
    return NextResponse.json({ error: 'studentId y PIN son obligatorios' }, { status: 400 })
  }
  if (!/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: 'El PIN debe tener entre 4 y 8 dígitos' }, { status: 400 })
  }

  const admin = getAdminClient()
  const { error } = await admin.auth.admin.updateUserById(studentId, {
    password: pinToPassword(pin),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
