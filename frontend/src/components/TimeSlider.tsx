import { useAppStore } from '@/store/useAppStore'
import { Play, Pause } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function TimeSlider() {
  const { selectedDate, setSelectedDate } = useAppStore()
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const today = new Date()
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  const todayStr = today.toISOString().split('T')[0]
  
  const selectedDateObj = new Date(selectedDate)
  const daysFromToday = Math.floor((selectedDateObj.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

  const handleDateChange = (days: number) => {
    const newDate = new Date(today)
    newDate.setDate(today.getDate() + days)
    setSelectedDate(newDate.toISOString().split('T')[0])
  }

  const togglePlay = () => {
    if (isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      intervalRef.current = setInterval(() => {
        const currentDate = new Date(selectedDate)
        const nextDate = new Date(currentDate)
        nextDate.setDate(currentDate.getDate() + 1)
        
        if (nextDate <= maxDate) {
          setSelectedDate(nextDate.toISOString().split('T')[0])
        } else {
          // Reset to today
          setSelectedDate(todayStr)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setIsPlaying(false)
        }
      }, 1000) // Change date every second
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-gray-700" />
          ) : (
            <Play className="w-5 h-5 text-gray-700" />
          )}
        </button>
        
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Today</span>
            <span>+{daysFromToday} days</span>
            <span>+30 days</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={daysFromToday}
            onChange={(e) => handleDateChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
        
        <div className="text-sm font-medium text-gray-900 min-w-[100px] text-right">
          {new Date(selectedDate).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </div>
      </div>
    </div>
  )
}

