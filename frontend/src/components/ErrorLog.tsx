import { useState, useEffect } from 'react'
import { formatDate } from '../lib/utils'
import * as Sentry from '@sentry/react'

interface ErrorEvent {
  id: string
  message: string
  level: string
  timestamp: string
  tags?: Record<string, string>
  extra?: Record<string, any>
}

export default function ErrorLog() {
  const [errors, setErrors] = useState<ErrorEvent[]>([])
  const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null)

  // Listen for Sentry errors (in production, you'd fetch from Sentry API)
  useEffect(() => {
    // For demo purposes, we'll track errors manually
    // In production, integrate with Sentry API: https://docs.sentry.io/api/events/list-a-projects-events/
    const loadErrors = () => {
      const storedErrors = localStorage.getItem('sentry_errors')
      if (storedErrors) {
        try {
          setErrors(JSON.parse(storedErrors))
        } catch (e) {
          console.error('Failed to parse stored errors:', e)
        }
      }
    }
    
    loadErrors()
    
    // Poll for new errors (stored by API interceptor)
    const interval = setInterval(loadErrors, 1000)
    
    return () => clearInterval(interval)

    // Listen for new errors captured by Sentry
    const originalCaptureException = Sentry.captureException
    Sentry.captureException = function (...args) {
      const errorEvent: ErrorEvent = {
        id: Date.now().toString(),
        message: args[0]?.message || 'Unknown error',
        level: 'error',
        timestamp: new Date().toISOString(),
        tags: args[1]?.tags,
        extra: args[1]?.extra,
      }
      setErrors((prev) => [errorEvent, ...prev].slice(0, 50)) // Keep last 50
      localStorage.setItem(
        'sentry_errors',
        JSON.stringify([errorEvent, ...errors].slice(0, 50))
      )
      return originalCaptureException.apply(this, args)
    }
  }, [])

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      case 'info':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Error Log</h2>
        <span className="text-sm text-gray-500">
          {errors.length} {errors.length === 1 ? 'error' : 'errors'}
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {errors.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No errors captured yet. Errors will appear here when they occur.
          </p>
        ) : (
          errors.map((error) => (
            <div
              key={error.id}
              onClick={() => setSelectedError(error)}
              className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${getLevelColor(error.level)}`}>
                      {error.level.toUpperCase()}
                    </span>
                    {error.tags?.traceId && (
                      <span className="text-xs text-gray-500 font-mono">
                        Trace: {error.tags.traceId.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2">{error.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(error.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Error Details</h3>
              <button
                onClick={() => setSelectedError(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Message:</span>
                <p className="text-sm text-gray-700 mt-1">{selectedError.message}</p>
              </div>
              <div>
                <span className="font-medium">Level:</span>
                <p className="text-sm text-gray-700 mt-1">{selectedError.level}</p>
              </div>
              <div>
                <span className="font-medium">Timestamp:</span>
                <p className="text-sm text-gray-700 mt-1">
                  {formatDate(selectedError.timestamp)}
                </p>
              </div>
              {selectedError.tags && Object.keys(selectedError.tags).length > 0 && (
                <div>
                  <span className="font-medium">Tags:</span>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedError.tags, null, 2)}
                  </pre>
                </div>
              )}
              {selectedError.extra && Object.keys(selectedError.extra).length > 0 && (
                <div>
                  <span className="font-medium">Extra Context:</span>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedError.extra, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

