'use client'

import ImageLineTracker from '@/components/image-line-tracker'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Image Line Tracker</h1>
          <p className="text-slate-300">Upload an image and position the line to get real-time coordinates</p>
        </div>
        <ImageLineTracker />
      </div>
    </main>
  )
}
