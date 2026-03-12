'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Download, Trash2, Undo2, ClipboardCopy, Check } from 'lucide-react'

const IMAGE_WIDTH = 1920
const IMAGE_HEIGHT = 1080
const DISPLAY_WIDTH = 960
const DISPLAY_HEIGHT = 540

const POINT_COLORS = [
    '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
    '#e11d48', '#7c3aed', '#0ea5e9', '#d946ef', '#10b981',
]

function getPointColor(index: number): string {
    return POINT_COLORS[index % POINT_COLORS.length]
}

function getPointLabel(index: number): string {
    // A, B, C, ... Z, AA, AB, ...
    let label = ''
    let i = index
    do {
        label = String.fromCharCode(65 + (i % 26)) + label
        i = Math.floor(i / 26) - 1
    } while (i >= 0)
    return label
}

export default function PolygonLineTracker() {
    const [image, setImage] = useState<HTMLImageElement | null>(null)
    const [points, setPoints] = useState<[number, number][]>([])
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
    const [copied, setCopied] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const scale = DISPLAY_WIDTH / IMAGE_WIDTH

    // Load points from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('polygonTrackerPoints')
            if (stored) {
                const parsed = JSON.parse(stored)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setPoints(parsed)
                }
            }
        } catch (error) {
            console.error('Failed to load points from localStorage', error)
        }
    }, [])

    // Save points to localStorage whenever they change
    const persistPoints = useCallback((pts: [number, number][]) => {
        localStorage.setItem('polygonTrackerPoints', JSON.stringify(pts))
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

        if (points.length === 0) return

        const displayPoints = points.map(([x, y]) => [x * scale, y * scale])

        // Draw polygon fill (semi-transparent)
        if (points.length >= 3) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
            ctx.beginPath()
            ctx.moveTo(displayPoints[0][0], displayPoints[0][1])
            for (let i = 1; i < displayPoints.length; i++) {
                ctx.lineTo(displayPoints[i][0], displayPoints[i][1])
            }
            ctx.closePath()
            ctx.fill()
        }

        // Draw lines between consecutive points
        if (points.length >= 2) {
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(displayPoints[0][0], displayPoints[0][1])
            for (let i = 1; i < displayPoints.length; i++) {
                ctx.lineTo(displayPoints[i][0], displayPoints[i][1])
            }
            // Close polygon
            ctx.closePath()
            ctx.stroke()
        }

        // Draw points
        displayPoints.forEach((dp, i) => {
            const color = getPointColor(i)
            const isActive = draggingIndex === i

            // Outer glow when active
            if (isActive) {
                ctx.fillStyle = color + '55'
                ctx.beginPath()
                ctx.arc(dp[0], dp[1], 14, 0, Math.PI * 2)
                ctx.fill()
            }

            // Point circle
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(dp[0], dp[1], isActive ? 9 : 7, 0, Math.PI * 2)
            ctx.fill()

            // White border
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(dp[0], dp[1], isActive ? 9 : 7, 0, Math.PI * 2)
            ctx.stroke()

            // Label
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 12px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(getPointLabel(i), dp[0], dp[1] - 14)
        })
    }, [image, points, draggingIndex, scale])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const img = new Image()
            img.onload = () => {
                setImage(img)
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

        // Check if clicking on an existing point
        const GRAB_RADIUS = 15
        for (let i = 0; i < points.length; i++) {
            const dp = [points[i][0] * scale, points[i][1] * scale]
            const dist = getDistanceToPoint(mouseX, mouseY, dp[0], dp[1])
            if (dist < GRAB_RADIUS) {
                setDraggingIndex(i)
                return
            }
        }

        // Otherwise, add a new point
        const realX = Math.round(mouseX / scale)
        const realY = Math.round(mouseY / scale)
        const clampedX = Math.max(0, Math.min(IMAGE_WIDTH, realX))
        const clampedY = Math.max(0, Math.min(IMAGE_HEIGHT, realY))

        const newPoints: [number, number][] = [...points, [clampedX, clampedY]]
        setPoints(newPoints)
        persistPoints(newPoints)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (draggingIndex === null || !canvasRef.current) return

        const rect = canvasRef.current.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const realX = Math.round(mouseX / scale)
        const realY = Math.round(mouseY / scale)

        const clampedX = Math.max(0, Math.min(IMAGE_WIDTH, realX))
        const clampedY = Math.max(0, Math.min(IMAGE_HEIGHT, realY))

        const newPoints = [...points] as [number, number][]
        newPoints[draggingIndex] = [clampedX, clampedY]
        setPoints(newPoints)
    }

    const handleMouseUp = () => {
        if (draggingIndex !== null) {
            setDraggingIndex(null)
            persistPoints(points)
        }
    }

    const handleCoordinateChange = (index: number, axis: 0 | 1, value: string) => {
        const numValue = parseInt(value, 10) || 0
        const clampedValue = Math.max(0, Math.min(axis === 0 ? IMAGE_WIDTH : IMAGE_HEIGHT, numValue))

        const newPoints = [...points] as [number, number][]
        newPoints[index] = [...newPoints[index]] as [number, number]
        newPoints[index][axis] = clampedValue
        setPoints(newPoints)
        persistPoints(newPoints)
    }

    const handleRemovePoint = (index: number) => {
        const newPoints = points.filter((_, i) => i !== index)
        setPoints(newPoints)
        persistPoints(newPoints)
    }

    const handleUndoLastPoint = () => {
        if (points.length === 0) return
        const newPoints = points.slice(0, -1)
        setPoints(newPoints)
        persistPoints(newPoints)
    }

    const handleClearAllPoints = () => {
        setPoints([])
        persistPoints([])
    }

    const handleCopyToClipboard = () => {
        const flat = points.flatMap(([x, y]) => [x, y])
        navigator.clipboard.writeText(JSON.stringify(flat)).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    const handleExportJson = () => {
        const data = {
            polygon: points.map(([x, y], i) => ({
                label: getPointLabel(i),
                x,
                y,
            })),
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'polygon-coordinates.json'
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
                            <Upload className="w-8 h-8 text-purple-400" />
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
                            <Upload className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-slate-300 font-medium">Image uploaded</div>
                            <div className="text-slate-500 text-sm">Click on the canvas to add polygon points</div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setImage(null)
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
                            className={`border-2 border-slate-600 rounded ${draggingIndex !== null ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleUndoLastPoint}
                            disabled={points.length === 0}
                            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                        >
                            <Undo2 className="w-4 h-4" />
                            Undo Last
                        </button>
                        <button
                            onClick={handleClearAllPoints}
                            disabled={points.length === 0}
                            className="bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All Points
                        </button>
                    </div>

                    {/* Points List */}
                    {points.length > 0 && (
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <h3 className="text-slate-300 font-medium mb-3">
                                Polygon Points ({points.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {points.map(([x, y], i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg p-3 border bg-slate-900 border-slate-600 flex items-center gap-3"
                                    >
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                            style={{ backgroundColor: getPointColor(i) }}
                                        >
                                            {getPointLabel(i)}
                                        </div>
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <label className="text-slate-400 text-xs font-medium">X</label>
                                            <input
                                                type="number"
                                                value={x}
                                                onChange={(e) => handleCoordinateChange(i, 0, e.target.value)}
                                                className="bg-slate-800 text-white rounded px-2 py-1 w-16 border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                                            />
                                            <label className="text-slate-400 text-xs font-medium">Y</label>
                                            <input
                                                type="number"
                                                value={y}
                                                onChange={(e) => handleCoordinateChange(i, 1, e.target.value)}
                                                className="bg-slate-800 text-white rounded px-2 py-1 w-16 border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemovePoint(i)}
                                            className="text-red-400 hover:text-red-300 transition-colors shrink-0"
                                            title={`Remove point ${getPointLabel(i)}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Final Coordinates Display */}
                    <div className="bg-gradient-to-r from-purple-900 to-violet-900 rounded-lg p-6 border border-purple-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-bold">✓ Polygon Coordinates</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyToClipboard}
                                    disabled={points.length === 0}
                                    className={`${copied ? 'bg-green-600' : 'bg-slate-600 hover:bg-slate-500'} disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2`}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={handleExportJson}
                                    disabled={points.length === 0}
                                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Save JSON
                                </button>
                            </div>
                        </div>
                        {points.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {points.map(([x, y], i) => (
                                    <div key={i} className="bg-slate-800 rounded p-3 border border-purple-600">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: getPointColor(i) }}
                                            />
                                            <span className="text-purple-300 text-sm font-medium">
                                                Point {getPointLabel(i)}
                                            </span>
                                        </div>
                                        <div className="text-white font-mono text-sm">
                                            X: {x}, Y: {y}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-purple-300 text-sm">
                                No polygon points yet. Click on the canvas to add points.
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="bg-purple-900 bg-opacity-30 rounded-lg p-4 border border-purple-700">
                        <p className="text-purple-300 text-sm">
                            <span className="font-medium">How to use:</span> Click anywhere on the canvas to add polygon vertices.
                            Drag existing points to reposition them. Use the coordinate inputs for precise placement.
                            Remove individual points with the trash icon, or use &quot;Undo Last&quot; / &quot;Clear All Points&quot; buttons.
                            The polygon automatically closes between the last and first point.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
