import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Modelo más económico y de sobra capaz para calificar texto corto de nivel A1.3.
const MODEL = 'claude-haiku-4-5'

interface GradeBody {
  task: 'definition' | 'sentence'
  word: string
  partOfSpeech?: string
  referenceDefinition?: string
  studentText: string
}

function buildPrompt(b: GradeBody): string {
  const common =
    `Eres un profesor de inglés paciente y motivador. El alumno es principiante (nivel A1.3) ` +
    `e hispanohablante. Sé flexible con errores menores de ortografía o mayúsculas; lo importante es el concepto. ` +
    `Si está mal, explica con cariño por qué y anímalo a intentarlo otra vez (nunca regañes).\n` +
    `Responde SOLO con un objeto JSON válido, sin texto adicional ni bloques de código, con esta forma exacta:\n` +
    `{"correct": true|false, "feedback": "1-2 frases breves y alentadoras en español", "suggestion": "ejemplo o definición modelo, corta"}`

  if (b.task === 'definition') {
    return (
      `${common}\n\n` +
      `Tarea: el alumno debe escribir el SIGNIFICADO de la palabra inglesa "${b.word}"` +
      (b.partOfSpeech ? ` (${b.partOfSpeech})` : '') + `.\n` +
      (b.referenceDefinition ? `Definición de referencia: "${b.referenceDefinition}".\n` : '') +
      `Definición del alumno: "${b.studentText}".\n` +
      `Marca correct=true si captó la idea esencial, aunque sea simple.`
    )
  }
  return (
    `${common}\n\n` +
    `Tarea: el alumno debe escribir una ORACIÓN en inglés que use correctamente la palabra "${b.word}"` +
    (b.partOfSpeech ? ` (${b.partOfSpeech})` : '') + `.\n` +
    `Oración del alumno: "${b.studentText}".\n` +
    `Marca correct=true si la oración usa la palabra de forma correcta y es comprensible en inglés ` +
    `(no exijas perfección gramatical absoluta a un principiante).`
  )
}

function extractJson(text: string): { correct: boolean; feedback: string; suggestion: string } | null {
  let t = text.trim()
  // Quitar fences ```json ... ``` si los hubiera
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    const obj = JSON.parse(t.slice(start, end + 1))
    return {
      correct: !!obj.correct,
      feedback: String(obj.feedback ?? ''),
      suggestion: String(obj.suggestion ?? ''),
    }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Falta ANTHROPIC_API_KEY en el servidor (configúrala en .env.local y en Vercel).' },
      { status: 503 }
    )
  }

  const body = (await req.json().catch(() => null)) as GradeBody | null
  if (!body || !body.task || !body.word || !body.studentText?.trim()) {
    return NextResponse.json({ error: 'Faltan datos (task, word, studentText).' }, { status: 400 })
  }

  const client = new Anthropic()
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: buildPrompt(body) }],
    })

    const textBlock = msg.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined
    const parsed = textBlock ? extractJson(textBlock.text) : null
    if (!parsed) {
      return NextResponse.json(
        { error: 'No se pudo interpretar la respuesta del calificador.' },
        { status: 502 }
      )
    }
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al calificar'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
