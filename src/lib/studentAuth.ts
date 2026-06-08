// Utilidades compartidas (cliente y servidor). NO contienen secretos.

// Dominio de los emails sintéticos de alumnos (no se envían correos reales).
export const STUDENT_EMAIL_DOMAIN = 'students.bestacademy.app'

// Convierte un nombre en un slug estable para el email sintético.
export function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function emailForSlug(slug: string): string {
  return `${slug}@${STUDENT_EMAIL_DOMAIN}`
}

// El PIN que escribe el alumno se transforma en la contraseña real de Supabase Auth.
// Se aplica IGUAL en creación (servidor) y en login (cliente), y garantiza la
// longitud mínima que exige Supabase aunque el PIN sea corto.
export function pinToPassword(pin: string): string {
  return `BEST-pin-${pin}`
}
