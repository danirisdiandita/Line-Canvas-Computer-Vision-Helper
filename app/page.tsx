'use client'

import ImageLineTracker from '@/components/image-line-tracker'
import PolygonLineTracker from '@/components/polygon-line-tracker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Line & Polygon Tracker</h1>
          <p className="text-slate-300">Upload an image and position lines or polygon points to get real-time coordinates</p>
        </div>

        <Tabs defaultValue="line" className="w-full">
          <TabsList className="mb-6 bg-slate-800 border border-slate-700">
            <TabsTrigger
              value="line"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 px-6"
            >
              📏 Line Tracker
            </TabsTrigger>
            <TabsTrigger
              value="polygon"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-300 px-6"
            >
              🔷 Polygon Tracker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="line">
            <ImageLineTracker />
          </TabsContent>

          <TabsContent value="polygon">
            <PolygonLineTracker />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
