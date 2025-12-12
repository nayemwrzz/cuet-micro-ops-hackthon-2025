import { useState } from 'react'
import { trace } from '@opentelemetry/api'
import Header from './components/Header'
import HealthStatus from './components/HealthStatus'
import DownloadJobs from './components/DownloadJobs'
import ErrorLog from './components/ErrorLog'
import PerformanceMetrics from './components/PerformanceMetrics'
import TraceViewer from './components/TraceViewer'

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'traces'>('dashboard')

  const handleTabChange = (tab: 'dashboard' | 'traces') => {
    const tracer = trace.getTracer('delineate-frontend')
    tracer.startActiveSpan('user.click.tab', (span) => {
      span.setAttribute('tab', tab)
      setActiveTab(tab)
      span.end()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-4">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('traces')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'traces'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Trace Viewer
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <HealthStatus />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DownloadJobs />
              <ErrorLog />
            </div>
            <PerformanceMetrics />
          </div>
        ) : (
          <TraceViewer />
        )}
      </div>
    </div>
  )
}

export default App

