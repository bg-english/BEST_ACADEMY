import { Badge } from '@/lib/types'

interface Props {
  badges: Badge[]
}

export default function BadgeDisplay({ badges }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {badges.map(badge => (
        <div
          key={badge.id}
          className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center w-28 card-hover"
          title={badge.description}
        >
          <div className="text-4xl mb-2">{badge.icon}</div>
          <div className="text-white text-xs font-semibold">{badge.name}</div>
        </div>
      ))}
    </div>
  )
}