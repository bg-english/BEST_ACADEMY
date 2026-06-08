import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, requireTeacher } from '@/lib/supabaseAdmin'
import { slugifyName, emailForSlug, pinToPassword } from '@/lib/studentAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearer(req: NextRequest) {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
}

function randomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString() // 4 dígitos
}

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

// POST /api/students/import  { students: [{ name, age? }] }  -> crea en lote (solo profesor)
// Devuelve la lista con el PIN generado para cada alumno (para que el profesor lo reparta).
export async function POST(req: NextRequest) {
  const teacher = await requireTeacher(bearer(req))
  if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const list = Array.isArray(body?.students) ? body.students : null
  if (!list || list.length === 0) {
    return NextResponse.json({ error: 'Se esperaba un arreglo "students"' }, { status: 400 })
  }

  const admin = getAdminClient()
  const created: { name: string; email: string; pin: string }[] = []
  const skipped: { name: string; reason: string }[] = []

  for (const raw of list) {
    const name = (raw?.name || '').toString().trim()
    const age = raw?.age != null && raw.age !== '' ? Number(raw.age) : null
    if (!name) {
      skipped.push({ name: '(vacío)', reason: 'sin nombre' })
      continue
    }
    const email = await uniqueEmail(admin, name)
    const pin = randomPin()
    const { data: user, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: pinToPassword(pin),
      email_confirm: true,
      user_metadata: { name },
    })
    if (cErr || !user.user) {
      skipped.push({ name, reason: cErr?.message || 'no se pudo crear' })
      continue
    }
    const { error: iErr } = await admin.from('students').insert({
      id: user.user.id,
      name,
      email,
      age,
      total_xp: 0,
      current_streak: 0,
      level: 1,
    })
    if (iErr) {
      await admin.auth.admin.deleteUser(user.user.id)
      skipped.push({ name, reason: iErr.message })
      continue
    }
    created.push({ name, email, pin })
  }

  return NextResponse.json({ created, skipped })
}
