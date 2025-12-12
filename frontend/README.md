# Delineate Observability Dashboard

React-based observability dashboard for the Delineate download microservice.

## Features

- ✅ **Health Status Monitoring** - Real-time API and storage health
- ✅ **Download Jobs Management** - Initiate and track download jobs
- ✅ **Error Tracking** - Sentry integration for error capture and display
- ✅ **Distributed Tracing** - OpenTelemetry integration with Jaeger UI
- ✅ **Performance Metrics** - Response times and success/failure rates
- ✅ **Trace Viewer** - View and correlate traces end-to-end

## Tech Stack

- **Vite** + **React** + **TypeScript** - Modern frontend stack
- **Tailwind CSS** - Utility-first styling
- **React Query** - API state management
- **Sentry React SDK** - Error tracking
- **OpenTelemetry JavaScript** - Distributed tracing
- **Recharts** - Metrics visualization

## Setup

### Prerequisites

- Node.js >= 18
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_API_URL=http://localhost:3000
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
VITE_JAEGER_UI_URL=http://localhost:16686
```

### Development

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Production Preview

```bash
npm run preview
```

## Usage

1. **Health Status**: Monitor API and storage health in real-time
2. **Download Jobs**: Start downloads by entering a file ID and tracking job status
3. **Error Log**: View errors captured by Sentry
4. **Performance Metrics**: Monitor API response times and success rates
5. **Trace Viewer**: Create test traces or view existing traces in Jaeger

## Integration with Backend

The dashboard integrates with the backend API:

- Polls `/health` endpoint for health status
- Calls `/v1/download/check` to initiate downloads
- Calls `/v1/download/status/:fileId` to check job status
- Includes `traceparent` header in all requests for trace correlation

## Sentry Integration

- Automatic error capture via React Error Boundary
- API error interception and capture
- Custom error logging with context
- Error details displayed in the Error Log panel

## OpenTelemetry Integration

- Automatic trace creation for user interactions
- Trace propagation via `traceparent` header
- Correlation with backend traces
- Direct links to Jaeger UI for trace viewing

