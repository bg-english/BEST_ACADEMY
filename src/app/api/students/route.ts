import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, requireTeacher } from '@/lib/supabaseAdmin'
import { slugifyName, emailForSlug, pinToPassword } from '@/lib/studentAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearer(req: NextRequest) {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
}

// GET /api/students  -> lista de alumnos (solo profesor)
export async function GET(req: NextRequest) {
  const teacher = await requireTeacher(bearer(req))
  if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('students')
    .select('id, name, email, age, total_xp, current_streak, level, created_at')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ students: data })
}

// Genera un email único a partir del nombre (maneja colisiones añadiendo -2, -3...)
async function uniqueEmail(admin: ReturnType<typeof getAdminClient>, name: string) {
  const base = slugifyName(name) || 'student'
  let slug = base
  let n = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const email = emailForSlug(slug)
    const { data } = await admin.from('students').select('id').eq('email', email).maybeSingle()
    if (!data) return email
    n += 1
    slug = `${base}-${n}`
  }
}

// POST /api/students  { name, age?, pin }  -> crea alumno (solo profesor)
export async function POST(req: NextRequest) {
  const teacher = await requireTeacher(bearer(req))
  if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const name = (body?.name || '').toString().trim()
  const pin = (body?.pin || '').toString().trim()
  const age = body?.age != null && body.age !== '' ? Number(body.age) : null
  if (!name || !pin) {
    return NextResponse.json({ error: 'Nombre y PIN son obligatorios' }, { status: 400 })
  }
  if (!/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: 'El PIN debe tener entre 4 y 8 dígitos' }, { status: 400 })
  }

  const admin = getAdminClient()
  const email = await uniqueEmail(admin, name)

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: pinToPassword(pin),
    email_confirm: true,
    user_metadata: { name },
  })
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || 'No se pudo crear el usuario' }, { status: 500 })
  }

  const { error: insErr } = await admin.from('students').insert({
    id: created.user.id,
    name,
    email,
    age,
    total_xp: 0,
    current_streak: 0,
    level: 1,
  })
  if (insErr) {
    // Revertir el usuario de auth si falla la fila del alumno
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ student: { id: created.user.id, name, email, age } })
}
