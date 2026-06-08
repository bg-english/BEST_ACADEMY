import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient, requireTeacher } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearer(req: NextRequest) {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
}

// POST /api/students/update  { studentId, name?, age?, email? }  (solo profesor)
// Edita nombre, edad y/o correo. Si cambia el correo, lo sincroniza con la
// cuenta de Supabase Auth (el correo es el identificador de login del alumno).
export async function POST(req: NextRequest) {
  const teacher = await requireTeacher(bearer(req))
  if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const studentId = (body?.studentId || '').toString()
  if (!studentId) return NextResponse.json({ error: 'Falta studentId' }, { status: 400 })

  const name = body?.name != null ? body.name.toString().trim() : undefined
  const email = body?.email != null ? body.email.toString().trim().toLowerCase() : undefined
  const age =
    body?.age === '' || body?.age == null ? null : Number(body.age)

  if (name !== undefined && !name) {
    return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
  }
  if (email !== undefined && email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Correo no válido' }, { status: 400 })
  }

  const admin = getAdminClient()

  // Fila actual (para saber si el correo cambió)
  const { data: current, error: curErr } = await admin
    .from('students')
    .select('email')
    .eq('id', studentId)
    .maybeSingle()
  if (curErr || !current) {
    return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
  }

  // Si cambia el correo: actualizar primero la cuenta de auth
  if (email !== undefined && email && email !== current.email) {
    const { error: authErr } = await admin.auth.admin.updateUserById(studentId, {
      email,
      email_confirm: true,
    })
    if (authErr) {
      return NextResponse.json(
        { error: `No se pudo cambiar el correo: ${authErr.message}` },
        { status: 400 }
      )
    }
  }

  // Actualizar la fila del alumno
  const patch: Record<string, unknown> = {}
  if (name !== undefined) patch.name = name
  if (email !== undefined && email) patch.email = email
  if (body?.age !== undefined) patch.age = age
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const { data: updated, error: updErr } = await admin
    .from('students')
    .update(patch)
    .eq('id', studentId)
    .select('id, name, email, age')
    .maybeSingle()
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ student: updated })
}
