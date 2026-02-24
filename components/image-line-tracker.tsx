'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Download } from 'lucide-react'

const IMAGE_WIDTH = 1920
const IMAGE_HEIGHT = 1080
const DISPLAY_WIDTH = 960
const DISPLAY_HEIGHT = 540

export default function ImageLineTracker() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [pointA, setPointA] = useState<[number, number]>([0, 540])
  const [pointB, setPointB] = useState<[number, number]>([1920, 540])
  const [isDragging, setIsDragging] = useState<'A' | 'B' | null>(null)
  const [finalCoordinates, setFinalCoordinates] = useState<{ A: [number, number]; B: [number, number] } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scale = DISPLAY_WIDTH / IMAGE_WIDTH

  // Load points from localStorage on mount
  useEffect(() => {
    try {
      const storedA = localStorage.getItem('lineTrackerPointA')
      if (storedA) setPointA(JSON.parse(storedA))

      const storedB = localStorage.getItem('lineTrackerPointB')
      if (storedB) setPointB(JSON.parse(storedB))
    } catch (error) {
      console.error('Failed to load points from localStorage', error)
    }
  }, [])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT)

    // Draw image
    if (image) {
      ctx.drawImage(image, 0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT)
    } else {
      ctx.fillStyle = '#334155'
      ctx.font = '14px sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.textAlign = 'center'
      ctx.fillText('Upload an image to start', DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2)
    }

    // Draw line
    const displayPointA = [pointA[0] * scale, pointA[1] * scale]
    const displayPointB = [pointB[0] * scale, pointB[1] * scale]

    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(displayPointA[0], displayPointA[1])
    ctx.lineTo(displayPointB[0], displayPointB[1])
    ctx.stroke()

    // Draw end points
    // Point A (red)
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(displayPointA[0], displayPointA[1], 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('A', displayPointA[0], displayPointA[1] - 16)

    // Point B (green)
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(displayPointB[0], displayPointB[1], 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('B', displayPointB[0], displayPointB[1] + 20)
  }, [image, pointA, pointB])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        setImage(img)
        setFinalCoordinates(null)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const getDistanceToPoint = (mouseX: number, mouseY: number, pointX: number, pointY: number): number => {
    const dx = mouseX - pointX
    const dy = mouseY - pointY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const displayPointA = [pointA[0] * scale, pointA[1] * scale]
    const displayPointB = [pointB[0] * scale, pointB[1] * scale]

    const distA = getDistanceToPoint(mouseX, mouseY, displayPointA[0], displayPointA[1])
    const distB = getDistanceToPoint(mouseX, mouseY, displayPointB[0], displayPointB[1])

    const GRAB_RADIUS = 15

    if (distA < GRAB_RADIUS) {
      setIsDragging('A')
      setFinalCoordinates(null)
    } else if (distB < GRAB_RADIUS) {
      setIsDragging('B')
      setFinalCoordinates(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const realX = Math.round(mouseX / scale)
    const realY = Math.round(mouseY / scale)

    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(IMAGE_WIDTH, realX))
    const clampedY = Math.max(0, Math.min(IMAGE_HEIGHT, realY))

    if (isDragging === 'A') {
      setPointA([clampedX, clampedY])
    } else if (isDragging === 'B') {
      setPointB([clampedX, clampedY])
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(null)
      setFinalCoordinates({ A: pointA, B: pointB })
      // Persist to localStorage
      localStorage.setItem('lineTrackerPointA', JSON.stringify(pointA))
      localStorage.setItem('lineTrackerPointB', JSON.stringify(pointB))
    }
  }

  const handleCoordinateChange = (point: 'A' | 'B', axis: 0 | 1, value: string) => {
    // allow empty to result in 0
    const numValue = parseInt(value, 10) || 0
    const clampedValue = Math.max(0, Math.min(axis === 0 ? IMAGE_WIDTH : IMAGE_HEIGHT, numValue))

    if (point === 'A') {
      const newPointA = [...pointA] as [number, number]
      newPointA[axis] = clampedValue
      setPointA(newPointA)
      setFinalCoordinates({ A: newPointA, B: pointB })
      localStorage.setItem('lineTrackerPointA', JSON.stringify(newPointA))
    } else {
      const newPointB = [...pointB] as [number, number]
      newPointB[axis] = clampedValue
      setPointB(newPointB)
      setFinalCoordinates({ A: pointA, B: newPointB })
      localStorage.setItem('lineTrackerPointB', JSON.stringify(newPointB))
    }
  }

  const handleExportJson = () => {
    const data = {
      pointA: { x: pointA[0], y: pointA[1] },
      pointB: { x: pointB[0], y: pointB[1] }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'coordinates.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Upload/Clear Section */}
      {!image ? (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <label className="flex items-center justify-center w-full cursor-pointer hover:bg-slate-700 transition rounded-lg p-6 border-2 border-dashed border-slate-600">
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-blue-400" />
              <span className="text-slate-300 font-medium">Click to upload image</span>
              <span className="text-slate-400 text-sm">Recommended: 1920x1080px</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-slate-300 font-medium">Image uploaded</div>
              <div className="text-slate-500 text-sm">You can now adjust the points</div>
            </div>
          </div>
          <button
            onClick={() => {
              setImage(null)
              setFinalCoordinates(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
          >
            Clear Image
          </button>
        </div>
      )}

      {/* Canvas Section */}
      {image && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 flex justify-center">
            <canvas
              ref={canvasRef}
              width={DISPLAY_WIDTH}
              height={DISPLAY_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`border-2 border-slate-600 rounded ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            />
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Point A */}
            <div className={`rounded-lg p-4 border transition-colors ${isDragging === 'A' ? 'bg-red-900 border-red-600' : 'bg-slate-800 border-slate-700'}`}>
              <h3 className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Point A
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-red-400 font-bold text-xl w-6">X:</label>
                  <input
                    type="number"
                    value={pointA[0]}
                    onChange={(e) => handleCoordinateChange('A', 0, e.target.value)}
                    className="bg-slate-900 text-white rounded px-3 py-1 w-24 border border-red-700/50 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-red-400 font-bold text-xl w-6">Y:</label>
                  <input
                    type="number"
                    value={pointA[1]}
                    onChange={(e) => handleCoordinateChange('A', 1, e.target.value)}
                    className="bg-slate-900 text-white rounded px-3 py-1 w-24 border border-red-700/50 focus:border-red-500 focus:outline-none"
                  />
                </div>
                {finalCoordinates && (
                  <div className="text-green-400 text-xs font-medium">✓ Final coordinates locked</div>
                )}
              </div>
            </div>

            {/* Point B */}
            <div className={`rounded-lg p-4 border transition-colors ${isDragging === 'B' ? 'bg-green-900 border-green-600' : 'bg-slate-800 border-slate-700'}`}>
              <h3 className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                Point B
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-green-400 font-bold text-xl w-6">X:</label>
                  <input
                    type="number"
                    value={pointB[0]}
                    onChange={(e) => handleCoordinateChange('B', 0, e.target.value)}
                    className="bg-slate-900 text-white rounded px-3 py-1 w-24 border border-green-700/50 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-green-400 font-bold text-xl w-6">Y:</label>
                  <input
                    type="number"
                    value={pointB[1]}
                    onChange={(e) => handleCoordinateChange('B', 1, e.target.value)}
                    className="bg-slate-900 text-white rounded px-3 py-1 w-24 border border-green-700/50 focus:border-green-500 focus:outline-none"
                  />
                </div>
                {finalCoordinates && (
                  <div className="text-green-400 text-xs font-medium">✓ Final coordinates locked</div>
                )}
              </div>
            </div>
          </div>

          {/* Final Coordinates Display */}
          <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-lg p-6 border border-green-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">✓ Final Coordinates</h3>
              <button
                onClick={handleExportJson}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Save JSON
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded p-3 border border-green-600">
                <div className="text-green-400 text-sm font-medium mb-1">Point A (Top)</div>
                <div className="text-white font-mono text-lg">
                  X: {finalCoordinates ? finalCoordinates.A[0] : pointA[0]}, Y: {finalCoordinates ? finalCoordinates.A[1] : pointA[1]}
                </div>
              </div>
              <div className="bg-slate-800 rounded p-3 border border-green-600">
                <div className="text-green-400 text-sm font-medium mb-1">Point B (Bottom)</div>
                <div className="text-white font-mono text-lg">
                  X: {finalCoordinates ? finalCoordinates.B[0] : pointB[0]}, Y: {finalCoordinates ? finalCoordinates.B[1] : pointB[1]}
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4 border border-blue-700">
            <p className="text-blue-300 text-sm">
              <span className="font-medium">How to use:</span> Drag Point A (red) or Point B (green) anywhere within the canvas.
              Both points can move freely within the 1920x1080 image bounds. Release the mouse to lock in the final coordinates.
              Coordinates are displayed in real-time, with (0,0) at the top-left corner.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
