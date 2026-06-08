import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/teacher/bootstrap  { email, password }
// Crea el PRIMER profesor (email ya confirmado) y lo registra en `teachers`.
// Solo funciona si todavía no existe ningún profesor; después queda deshabilitado.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = (body?.email || '').toString().trim().toLowerCase()
  const password = (body?.password || '').toString()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña obligatorios' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  const admin = getAdminClient()

  const { count } = await admin.from('teachers').select('*', { count: 'exact', head: true })
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Ya existe un profesor. Inicia sesión o pide que te añadan.' },
      { status: 403 }
    )
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || 'No se pudo crear la cuenta' }, { status: 500 })
  }

  const { error: insErr } = await admin
    .from('teachers')
    .insert({ user_id: created.user.id, email })
  if (insErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
