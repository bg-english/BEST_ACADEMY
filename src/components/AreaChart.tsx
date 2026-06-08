'use client'

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import { AreaPerformance } from '@/lib/types'

interface Props {
  performance: AreaPerformance[]
  studentName: string
}

const AREA_LABELS: Record<string, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  listening: 'Listening',
  speaking: 'Speaking',
  writing: 'Writing',
}

const ALL_AREAS = ['vocabulary', 'grammar', 'listening', 'speaking', 'writing']

export default function AreaChart({ performance, studentName }: Props) {
  const data = ALL_AREAS.map(area => {
    const p = performance.find(p => p.area === area)
    return {
      area: AREA_LABELS[area],
      accuracy: p ? Math.round(p.accuracy || 0) : 0,
      fullMark: 100,
    }
  })

  if (performance.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📊</div>
        <p>No activity data yet</p>
        <p className="text-sm">This student hasn't completed any activities</p>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="area" tick={{ fontSize: 12 }} />
          <Radar
            name={studentName}
            dataKey="accuracy"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
          />
          <Tooltip formatter={(value: number) => [`${value}%`, 'Accuracy']} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-5 gap-2 mt-4">
        {data.map(d => (
          <div key={d.area} className="text-center">
            <div className={`text-lg font-bold ${d.accuracy >= 80 ? 'text-green-600' : d.accuracy >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
              {d.accuracy}%
            </div>
            <div className="text-xs text-gray-400">{d.area}</div>
          </div>
        ))}
      </div>
    </div>
  )
}