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