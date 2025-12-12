import { useState } from 'react'
import { trace } from '@opentelemetry/api'
import { extractTraceId } from '../lib/utils'

export default function TraceViewer() {
  const [traceId, setTraceId] = useState<string>('')
  const [activeTraces, setActiveTraces] = useState<string[]>([])

  const jaegerUrl = import.meta.env.VITE_JAEGER_UI_URL || 'http://localhost:16686'

  const handleCreateTrace = () => {
    const tracer = trace.getTracer('delineate-frontend')
    tracer.startActiveSpan('user.action.create_test_trace', (span) => {
      span.setAttribute('action', 'test_trace_creation')
      span.setAttribute('source', 'trace_viewer')

      const spanContext = span.spanContext()
      if (spanContext.isValid && spanContext.traceId) {
        const newTraceId = spanContext.traceId
        setTraceId(newTraceId)
        if (!activeTraces.includes(newTraceId)) {
          setActiveTraces((prev) => [newTraceId, ...prev].slice(0, 10))
        }
      }

      // Simulate some work
      setTimeout(() => {
        span.end()
      }, 100)
    })
  }

  const handleViewTrace = () => {
    if (traceId.trim()) {
      window.open(`${jaegerUrl}/trace/${traceId.trim()}`, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Trace ID Input */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Trace Viewer</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trace ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={traceId}
                onChange={(e) => setTraceId(e.target.value)}
                placeholder="Enter trace ID (32 hex characters)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <button
                onClick={handleViewTrace}
                disabled={!traceId.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                View in Jaeger
              </button>
              <button
                onClick={handleCreateTrace}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Test Trace
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How to use:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Create a test trace by clicking "Create Test Trace"</li>
              <li>Or paste a trace ID from the Download Jobs panel</li>
              <li>Click "View in Jaeger" to open the trace in Jaeger UI</li>
              <li>
                Trace IDs are also automatically linked in the Download Jobs list
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Active Traces */}
      {activeTraces.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Traces</h3>
          <div className="space-y-2">
            {activeTraces.map((tId) => (
              <div
                key={tId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <code className="text-sm font-mono text-gray-700">{tId}</code>
                <button
                  onClick={() => {
                    setTraceId(tId)
                    window.open(`${jaegerUrl}/trace/${tId}`, '_blank')
                  }}
                  className="px-4 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correlation Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Trace Correlation Flow</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
{`User Action (Frontend)
    │
    ▼
OpenTelemetry SDK creates trace
    │ traceId: abc123...
    ▼
API Request includes traceparent header
    │ Header: traceparent: 00-abc123-...
    ▼
Backend extracts trace context
    │
    ▼
Backend creates child spans
    │
    ▼
All spans linked by traceId
    │
    ▼
View in Jaeger UI
    │ Full end-to-end trace visible
`}
          </pre>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <strong>Jaeger UI:</strong>{' '}
            <a
              href={jaegerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              {jaegerUrl}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

