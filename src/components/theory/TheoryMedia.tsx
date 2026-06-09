'use client'

import { useState } from 'react'
import { Topic } from '@/lib/types'

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

/** Muestra video, infografía y/o slides de un tema. Si no hay ninguno, no renderiza nada. */
export default function TheoryMedia({ topic }: { topic: Topic }) {
  const slides = topic.slides && topic.slides.length > 0 ? topic.slides : null
  const [slide, setSlide] = useState(0)

  const hasVideo = !!topic.video_url
  const hasImage = !!topic.image_url
  if (!hasVideo && !hasImage && !slides) return null

  const yt = hasVideo ? youTubeId(topic.video_url!) : null

  return (
    <div className="space-y-4 mb-5">
      {/* Video */}
      {hasVideo && (
        <div className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-black">
          {yt ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${yt}`}
              title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video className="w-full h-full" src={topic.video_url} controls />
          )}
        </div>
      )}

      {/* Infografía */}
      {hasImage && (
        <a href={topic.image_url} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={topic.image_url} alt="Infografía" className="w-full rounded-2xl shadow-lg" />
        </a>
      )}

      {/* Slides */}
      {slides && (
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="text-center">
            {slides[slide].image_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={slides[slide].image_url} alt="" className="max-h-56 mx-auto rounded-xl mb-3" />
            )}
            {slides[slide].title && <h4 className="font-bold text-gray-800 mb-1">{slides[slide].title}</h4>}
            {slides[slide].text && <p className="text-sm text-gray-600">{slides[slide].text}</p>}
          </div>
          <div className="flex items-center justify-between mt-3">
            <button disabled={slide === 0} onClick={() => setSlide((s) => s - 1)}
              className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40">←</button>
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <span key={i} className={`w-2 h-2 rounded-full ${i === slide ? 'bg-blue-600' : 'bg-gray-300'}`} />
              ))}
            </div>
            <button disabled={slide === slides.length - 1} onClick={() => setSlide((s) => s + 1)}
              className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-40">→</button>
          </div>
        </div>
      )}
    </div>
  )
}
