export interface Unit {
  id: number
  number: number
  title: string
  description: string
  duration_hours: number
  xp_reward: number
}

export interface Activity {
  id: number
  unit_id: number
  area: string
  type: string
  difficulty: number
  xp_reward: number
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

export interface Student {
  id: string
  name: string
  email: string
  avatar_url?: string
  age?: number
  total_xp: number
  current_streak: number
  level: number
  created_at: string
}

export interface StudentProgress {
  id: number
  student_id: string
  unit_id: number
  area: string
  total_attempts: number
  correct_attempts: number
  accuracy_percentage: number
  last_activity_at: string
}

export interface Badge {
  id: number
  name: string
  description: string
  icon: string
  condition_type: string
  condition_value: number
}

export interface StudentBadge {
  id: number
  student_id: string
  badge_id: number
  earned_at: string
  badge?: Badge
}

export interface AreaPerformance {
  student_id: string
  area: string
  total_attempts: number
  correct_attempts: number
  accuracy: number
}

// ---- Motor de Teoría ----
export interface Topic {
  id: number
  unit_id: number
  order_index: number
  kind: 'grammar' | 'vocabulary'
  title: string
  explanation: string
}

export interface TopicExample {
  id: number
  topic_id: number
  order_index: number
  text: string
  note?: string
}

export interface TopicPractice {
  id: number
  topic_id: number
  order_index: number
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

export interface VocabWord {
  id: number
  topic_id: number
  order_index: number
  word: string
  part_of_speech?: string
  phonetic?: string
}

export interface StudentTopicProgress {
  topic_id: number
  completed: boolean
}

export interface GradeResult {
  correct: boolean
  feedback: string
  suggestion: string
  examples?: string[]
}

// ---- Motor de Práctica ----
export interface PracticeExercise {
  id: number
  unit_id: number
  area: string
  level: number
  type: 'multiple_choice' | 'fill_blank' | 'true_false' | 'reorder' | 'listening' | 'speaking'
  timed: boolean
  time_limit_seconds?: number
  prompt: string
  payload: { options?: string[]; words?: string[]; accept?: string[]; audio?: string; target?: string }
  correct_answer: string
  explanation?: string
  xp_reward: number
}