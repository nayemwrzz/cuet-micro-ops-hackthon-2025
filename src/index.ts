import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { sentry } from "@hono/sentry";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { rateLimiter } from "hono-rate-limiter";

// Helper for optional URL that treats empty string as undefined
const optionalUrl = z
  .string()
  .optional()
  .transform((val) => (val === "" ? undefined : val))
  .pipe(z.url().optional());

// Environment schema
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: optionalUrl,
  S3_BUCKET_NAME: z.string().default(""),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  SENTRY_DSN: optionalUrl,
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),
  CORS_ORIGINS: z
    .string()
    .default("*")
    .transform((val) => (val === "*" ? "*" : val.split(","))),
  // Download delay simulation (in milliseconds)
  DOWNLOAD_DELAY_MIN_MS: z.coerce.number().int().min(0).default(10000), // 10 seconds
  DOWNLOAD_DELAY_MAX_MS: z.coerce.number().int().min(0).default(200000), // 200 seconds
  DOWNLOAD_DELAY_ENABLED: z.coerce.boolean().default(true),
  JAEGER_QUERY_URL: optionalUrl,
});

// Parse and validate environment
const env = EnvSchema.parse(process.env);

// S3 Client
const s3Client = new S3Client({
  region: env.S3_REGION,
  ...(env.S3_ENDPOINT && { endpoint: env.S3_ENDPOINT }),
  ...(env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY && {
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    }),
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
});

// Initialize OpenTelemetry SDK
const otelSDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "delineate-hackathon-challenge",
  }),
  traceExporter: env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
        url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
      })
    : new OTLPTraceExporter(), // Default to http://localhost:4318/v1/traces
});
otelSDK.start();

const app = new OpenAPIHono();

// Request ID middleware - adds unique ID to each request
app.use(async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
});

// CORS middleware - MUST be before secureHeaders to allow cross-origin requests
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "traceparent",
      "sentry-trace",
      "baggage",
    ],
    exposeHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
    maxAge: 86400,
  }),
);

// Security headers middleware (helmet-like) - configured to allow cross-origin in development
app.use(
  secureHeaders({
    crossOriginOpenerPolicy: env.NODE_ENV === "production" ? "same-origin" : false,
    crossOriginResourcePolicy: env.NODE_ENV === "production" ? "same-origin" : false,
  }),
);

// Request timeout middleware
app.use(timeout(env.REQUEST_TIMEOUT_MS));

// Rate limiting middleware
app.use(
  rateLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: "draft-6",
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "anonymous",
  }),
);

// OpenTelemetry middleware
app.use(
  httpInstrumentationMiddleware({
    serviceName: "delineate-hackathon-challenge",
  }),
);

// Sentry middleware
app.use(
  sentry({
    dsn: env.SENTRY_DSN,
  }),
);

// Error response schema for OpenAPI
const ErrorResponseSchema = z
  .object({
    error: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  })
  .openapi("ErrorResponse");

// Error handler with Sentry
app.onError((err, c) => {
  c.get("sentry").captureException(err);
  const requestId = c.get("requestId") as string | undefined;
  return c.json(
    {
      error: "Internal Server Error",
      message:
        env.NODE_ENV === "development"
          ? err.message
          : "An unexpected error occurred",
      requestId,
    },
    500,
  );
});

// Schemas
const MessageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi("MessageResponse");

const HealthResponseSchema = z
  .object({
    status: z.enum(["healthy", "unhealthy"]),
    checks: z.object({
      storage: z.enum(["ok", "error"]),
    }),
  })
  .openapi("HealthResponse");

// Download API Schemas
const DownloadInitiateRequestSchema = z
  .object({
    file_ids: z
      .array(z.number().int().min(10000).max(100000000))
      .min(1)
      .max(1000)
      .openapi({ description: "Array of file IDs (10K to 100M)" }),
  })
  .openapi("DownloadInitiateRequest");

const DownloadInitiateResponseSchema = z
  .object({
    jobId: z.string().openapi({ description: "Unique job identifier" }),
    status: z.enum(["queued", "processing"]),
    totalFileIds: z.number().int(),
  })
  .openapi("DownloadInitiateResponse");

const DownloadCheckRequestSchema = z
  .object({
    file_id: z
      .number()
      .int()
      .min(10000)
      .max(100000000)
      .openapi({ description: "Single file ID to check (10K to 100M)" }),
  })
  .openapi("DownloadCheckRequest");

const DownloadCheckResponseSchema = z
  .object({
    file_id: z.number().int(),
    available: z.boolean(),
    s3Key: z
      .string()
      .nullable()
      .openapi({ description: "S3 object key if available" }),
    size: z
      .number()
      .int()
      .nullable()
      .openapi({ description: "File size in bytes" }),
  })
  .openapi("DownloadCheckResponse");

const DownloadStartRequestSchema = z
  .object({
    file_id: z
      .number()
      .int()
      .min(10000)
      .max(100000000)
      .openapi({ description: "File ID to download (10K to 100M)" }),
  })
  .openapi("DownloadStartRequest");

const DownloadStatusResponseSchema = z
  .object({
    file_id: z.number().int(),
    jobId: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed", "failed", "not_found"]),
    createdAt: z.string().optional(),
    completedAt: z.string().optional(),
    duration: z.number().optional(),
    error: z.string().optional(),
    downloadUrl: z.string().nullable().optional(),
    size: z.number().int().nullable().optional(),
    processingTimeMs: z.number().optional(),
  })
  .openapi("DownloadStatusResponse");

const DownloadStartResponseSchema = z
  .object({
    file_id: z.number().int(),
    status: z.enum(["completed", "failed"]),
    downloadUrl: z
      .string()
      .nullable()
      .openapi({ description: "Presigned download URL if successful" }),
    size: z
      .number()
      .int()
      .nullable()
      .openapi({ description: "File size in bytes" }),
    processingTimeMs: z
      .number()
      .int()
      .openapi({ description: "Time taken to process the download in ms" }),
    message: z.string().openapi({ description: "Status message" }),
  })
  .openapi("DownloadStartResponse");

// Input sanitization for S3 keys - prevent path traversal
const sanitizeS3Key = (fileId: number): string => {
  // Ensure fileId is a valid integer within bounds (already validated by Zod)
  const sanitizedId = Math.floor(Math.abs(fileId));
  // Construct safe S3 key without user-controlled path components
  // Note: Bucket is already 'downloads', so key should be just the filename
  return `${String(sanitizedId)}.zip`;
};

// S3 health check
const checkS3Health = async (): Promise<boolean> => {
  if (!env.S3_BUCKET_NAME) return true; // Mock mode
  try {
    // Use a lightweight HEAD request on a known path
    const command = new HeadObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: "__health_check_marker__",
    });
    await s3Client.send(command);
    return true;
  } catch (err) {
    // NotFound is fine - bucket is accessible
    if (err instanceof Error && err.name === "NotFound") return true;
    // AccessDenied or other errors indicate connection issues
    return false;
  }
};

// S3 availability check
const checkS3Availability = async (
  fileId: number,
): Promise<{
  available: boolean;
  s3Key: string | null;
  size: number | null;
}> => {
  const s3Key = sanitizeS3Key(fileId);

  // If no bucket configured, use mock mode
  if (!env.S3_BUCKET_NAME) {
    const available = fileId % 7 === 0;
    return {
      available,
      s3Key: available ? s3Key : null,
      size: available ? Math.floor(Math.random() * 10000000) + 1000 : null,
    };
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: s3Key,
    });
    const response = await s3Client.send(command);
    return {
      available: true,
      s3Key,
      size: response.ContentLength ?? null,
    };
  } catch {
    return {
      available: false,
      s3Key: null,
      size: null,
    };
  }
};

// Random delay helper for simulating long-running downloads
const getRandomDelay = (): number => {
  if (!env.DOWNLOAD_DELAY_ENABLED) return 0;
  const min = env.DOWNLOAD_DELAY_MIN_MS;
  const max = env.DOWNLOAD_DELAY_MAX_MS;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// In-memory job tracking (for demo - in production, use Redis)
interface JobStatus {
  jobId: string;
  fileId: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  downloadUrl?: string | null;
  size?: number | null;
  processingTimeMs?: number;
}

// Jaeger API response types
interface JaegerTrace {
  traceID: string;
  spans: unknown[];
  processes: Record<string, unknown>;
}

interface JaegerTracesResponse {
  data: JaegerTrace[];
  total?: number;
  limit?: number;
  offset?: number;
}

const jobStore = new Map<number, JobStatus>();

// Helper to get or create job status
const getJobStatus = (fileId: number): JobStatus | null => {
  return jobStore.get(fileId) ?? null;
};

// Helper to update job status
const updateJobStatus = (
  fileId: number,
  updates: Partial<JobStatus>,
): void => {
  const existing = jobStore.get(fileId);
  if (existing) {
    jobStore.set(fileId, { ...existing, ...updates });
  }
};

// Helper to create job
const createJob = (fileId: number, jobId: string): JobStatus => {
  const job: JobStatus = {
    jobId,
    fileId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  jobStore.set(fileId, job);
  return job;
};

// Routes
const rootRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["General"],
  summary: "Root endpoint",
  description: "Returns a welcome message",
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": {
          schema: MessageResponseSchema,
        },
      },
    },
  },
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Health check endpoint",
  description: "Returns the health status of the service and its dependencies",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
    },
    503: {
      description: "Service is unhealthy",
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

app.openapi(rootRoute, (c) => {
  return c.json({ message: "Hello Hono!" }, 200);
});

app.openapi(healthRoute, async (c) => {
  const storageHealthy = await checkS3Health();
  const status = storageHealthy ? "healthy" : "unhealthy";
  const httpStatus = storageHealthy ? 200 : 503;
  return c.json(
    {
      status,
      checks: {
        storage: storageHealthy ? "ok" : "error",
      },
    },
    httpStatus,
  );
});

// Download API Routes
const downloadInitiateRoute = createRoute({
  method: "post",
  path: "/v1/download/initiate",
  tags: ["Download"],
  summary: "Initiate download job",
  description: "Initiates a download job for multiple IDs",
  request: {
    body: {
      content: {
        "application/json": {
          schema: DownloadInitiateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Download job initiated",
      content: {
        "application/json": {
          schema: DownloadInitiateResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

const downloadCheckRoute = createRoute({
  method: "post",
  path: "/v1/download/check",
  tags: ["Download"],
  summary: "Check download availability",
  description:
    "Checks if a single ID is available for download in S3. Add ?sentry_test=true to trigger an error for Sentry testing.",
  request: {
    query: z.object({
      sentry_test: z.string().optional().openapi({
        description:
          "Set to 'true' to trigger an intentional error for Sentry testing",
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: DownloadCheckRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Availability check result",
      content: {
        "application/json": {
          schema: DownloadCheckResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

app.openapi(downloadInitiateRoute, (c) => {
  const { file_ids } = c.req.valid("json");
  const jobId = crypto.randomUUID();
  return c.json(
    {
      jobId,
      status: "queued" as const,
      totalFileIds: file_ids.length,
    },
    200,
  );
});

app.openapi(downloadCheckRoute, async (c) => {
  const { sentry_test } = c.req.valid("query");
  const { file_id } = c.req.valid("json");

  // Intentional error for Sentry testing (hackathon challenge)
  if (sentry_test === "true") {
    throw new Error(
      `Sentry test error triggered for file_id=${String(file_id)} - This should appear in Sentry!`,
    );
  }

  const s3Result = await checkS3Availability(file_id);
  return c.json(
    {
      file_id,
      ...s3Result,
    },
    200,
  );
});

// Download Start Route - simulates long-running download with random delay
const downloadStartRoute = createRoute({
  method: "post",
  path: "/v1/download/start",
  tags: ["Download"],
  summary: "Start file download (long-running)",
  description: `Starts a file download with simulated processing delay.
    Processing time varies randomly between ${String(env.DOWNLOAD_DELAY_MIN_MS / 1000)}s and ${String(env.DOWNLOAD_DELAY_MAX_MS / 1000)}s.
    This endpoint demonstrates long-running operations that may timeout behind proxies.`,
  request: {
    body: {
      content: {
        "application/json": {
          schema: DownloadStartRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Download completed successfully",
      content: {
        "application/json": {
          schema: DownloadStartResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

app.openapi(downloadStartRoute, async (c) => {
  const { file_id } = c.req.valid("json");
  const jobId = crypto.randomUUID();
  const startTime = Date.now();

  // Create job in tracking system
  createJob(file_id, jobId);
  updateJobStatus(file_id, { status: "in_progress" });

  // Get random delay and log it
  const delayMs = getRandomDelay();
  const delaySec = (delayMs / 1000).toFixed(1);
  const minDelaySec = (env.DOWNLOAD_DELAY_MIN_MS / 1000).toFixed(0);
  const maxDelaySec = (env.DOWNLOAD_DELAY_MAX_MS / 1000).toFixed(0);
  console.log(
    `[Download] Starting file_id=${String(file_id)} | jobId=${jobId} | delay=${delaySec}s (range: ${minDelaySec}s-${maxDelaySec}s) | enabled=${String(env.DOWNLOAD_DELAY_ENABLED)}`,
  );

  // Simulate long-running download process
  await sleep(delayMs);

  // Check if file is available in S3
  const s3Result = await checkS3Availability(file_id);
  const processingTimeMs = Date.now() - startTime;
  const completedAt = new Date().toISOString();

  console.log(
    `[Download] Completed file_id=${String(file_id)}, jobId=${jobId}, actual_time=${String(processingTimeMs)}ms, available=${String(s3Result.available)}`,
  );

  if (s3Result.available) {
    const downloadUrl = `https://storage.example.com/${s3Result.s3Key ?? ""}?token=${crypto.randomUUID()}`;
    updateJobStatus(file_id, {
      status: "completed",
      completedAt,
      duration: processingTimeMs,
      downloadUrl,
      size: s3Result.size,
      processingTimeMs,
    });

    return c.json(
      {
        file_id,
        status: "completed" as const,
        downloadUrl,
        size: s3Result.size,
        processingTimeMs,
        message: `Download ready after ${(processingTimeMs / 1000).toFixed(1)} seconds`,
      },
      200,
    );
  } else {
    updateJobStatus(file_id, {
      status: "failed",
      completedAt,
      duration: processingTimeMs,
      error: "File not found in storage",
      processingTimeMs,
    });

    return c.json(
      {
        file_id,
        status: "failed" as const,
        downloadUrl: null,
        size: null,
        processingTimeMs,
        message: `File not found after ${(processingTimeMs / 1000).toFixed(1)} seconds of processing`,
      },
      200,
    );
  }
});

// Download Status Route - Get job status by file ID
const downloadStatusRoute = createRoute({
  method: "get",
  path: "/v1/download/status/{fileId}",
  tags: ["Download"],
  summary: "Get download job status",
  description: "Returns the status of a download job by file ID",
  request: {
    params: z.object({
      fileId: z.coerce.number().int().min(10000).max(100000000),
    }),
  },
  responses: {
    200: {
      description: "Job status found",
      content: {
        "application/json": {
          schema: DownloadStatusResponseSchema,
        },
      },
    },
    404: {
      description: "Job not found",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(downloadStatusRoute, (c) => {
  try {
    const params = c.req.valid("params");
    
    // Handle case where params might be undefined
    const fileId = params?.fileId;
    if (typeof fileId === "undefined") {
      // Try to get fileId from path parameter directly
      const fileIdParam = c.req.param("fileId");
      if (!fileIdParam) {
        return c.json(
          {
            error: "Bad Request",
            message: "fileId parameter is required",
          },
          400,
        );
      }
      
      const parsedFileId = parseInt(fileIdParam, 10);
      if (isNaN(parsedFileId) || parsedFileId < 10000 || parsedFileId > 100000000) {
        return c.json(
          {
            error: "Bad Request",
            message: "fileId must be a number between 10000 and 100000000",
          },
          400,
        );
      }
      
      const job = getJobStatus(parsedFileId);
      if (!job) {
        return c.json(
          {
            file_id: parsedFileId,
            status: "not_found" as const,
          },
          200,
        );
      }
      
      return c.json(job, 200);
    }
    
    const job = getJobStatus(fileId);

    if (!job) {
      return c.json(
        {
          file_id: fileId,
          status: "not_found" as const,
        },
        200, // Return 200 with not_found status for frontend compatibility
      );
    }

    return c.json(job, 200);
  } catch (error) {
    console.error("[Download Status] Error:", error);
    return c.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// Jaeger Traces Proxy Route - Fetch traces from Jaeger API (bypasses CORS)
const jaegerTracesRoute = createRoute({
  method: "get",
  path: "/v1/jaeger/traces",
  tags: ["Observability"],
  summary: "Get traces from Jaeger",
  description: "Proxy endpoint to fetch traces from Jaeger API (bypasses CORS)",
  request: {
    query: z.object({
      service: z.string().optional().openapi({
        description: "Service name to filter traces",
      }),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20).openapi({
        description: "Maximum number of traces to return",
      }),
    }),
  },
  responses: {
    200: {
      description: "Traces from Jaeger",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(z.unknown()),
            total: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          }),
        },
      },
    },
    500: {
      description: "Internal server error",
    },
  },
});

app.openapi(jaegerTracesRoute, async (c) => {
  const { service, limit } = c.req.valid("query");
  const jaegerUrl = env.JAEGER_QUERY_URL ?? "http://delineate-jaeger:16686";

  try {
    // Jaeger API requires service parameter, so if no service provided,
    // try multiple known services and combine results
    if (!service) {
      console.log(`[Jaeger Proxy] No service specified, trying multiple services`);
      const services = [
        "delineate-observability-dashboard",
        "delineate-hackathon-challenge",
      ];
      
      const allTraces: JaegerTrace[] = [];
      
      for (const svc of services) {
        try {
          const queryParams = new URLSearchParams();
          queryParams.append("service", svc);
          queryParams.append("limit", limit.toString());
          const jaegerApiUrl = `${jaegerUrl}/api/traces?${queryParams.toString()}`;
          
          const response = await fetch(jaegerApiUrl);
          if (response.ok) {
            const data = (await response.json()) as JaegerTracesResponse;
            if (data.data && Array.isArray(data.data)) {
              allTraces.push(...data.data);
              console.log(`[Jaeger Proxy] Found ${data.data.length} traces for ${svc}`);
            }
          }
        } catch (svcError) {
          console.warn(`[Jaeger Proxy] Failed to fetch traces for ${svc}:`, svcError);
        }
      }
      
      return c.json({
        data: allTraces,
        total: allTraces.length,
        limit: limit,
        offset: 0,
      }, 200);
    }

    // Build query URL with service
    const queryParams = new URLSearchParams();
    queryParams.append("service", service);
    queryParams.append("limit", limit.toString());

    const jaegerApiUrl = `${jaegerUrl}/api/traces?${queryParams.toString()}`;
    console.log(`[Jaeger Proxy] Fetching traces from: ${jaegerApiUrl}`);

    // Fetch from Jaeger API
    const response = await fetch(jaegerApiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Jaeger Proxy] Error: ${response.status} ${response.statusText}`, errorText);
      return c.json(
        {
          error: "Failed to fetch traces from Jaeger",
          message: `Jaeger API returned ${response.status}: ${errorText}`,
        },
        500,
      );
    }

    const data = (await response.json()) as JaegerTracesResponse;
    console.log(`[Jaeger Proxy] Fetched ${data.data?.length ?? 0} traces`);
    
    return c.json(data, 200);
  } catch (error) {
    console.error("[Jaeger Proxy] Error:", error);
    return c.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// Test Trace Endpoints - For demonstrating Jaeger traces to judges
const testTraceErrorRoute = createRoute({
  method: "get",
  path: "/v1/test/trace/error",
  tags: ["Test"],
  summary: "Test trace with error (for demo)",
  description: "Intentionally fails to demonstrate error tracing in Jaeger",
  responses: {
    500: {
      description: "Intentional error for tracing demo",
    },
  },
});

app.openapi(testTraceErrorRoute, async (c) => {
  const tracer = trace.getTracer("delineate-hackathon-challenge");
  
  return tracer.startActiveSpan("test.error.trace", async (span) => {
    try {
      span.setAttribute("test.type", "error_demo");
      span.setAttribute("error.scenario", "tcp_connection_failure");
      
      // Simulate a TCP connection error by trying to connect to a non-existent URL
      span.addEvent("Attempting connection to invalid URL");
      
      const invalidUrl = "http://invalid-host-that-does-not-exist-12345:8080/api";
      console.log(`[Test Trace] Attempting to connect to: ${invalidUrl}`);
      
      const response = await fetch(invalidUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      span.setAttribute("http.status_code", response.status);
      span.end();
      
      return c.json({ message: "Unexpected success" }, 200);
    } catch (error: unknown) {
      // Capture the error in the span
      const errorObj = error instanceof Error ? error : new Error(String(error));
      span.recordException(errorObj);
      span.setAttribute("error.name", errorObj.name ?? "UnknownError");
      span.setAttribute("error.message", errorObj.message ?? String(error));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorObj.message });
      span.end();
      
      console.error("[Test Trace] Error captured:", errorObj);
      
      return c.json(
        {
          error: "Intentional Error for Tracing Demo",
          message: errorObj.message ?? "Connection failed",
          type: errorObj.name ?? "NetworkError",
          traceId: span.spanContext().traceId,
        },
        500,
      );
    }
  });
});

const testTraceSuccessRoute = createRoute({
  method: "get",
  path: "/v1/test/trace/success",
  tags: ["Test"],
  summary: "Test trace with success (for demo)",
  description: "Successful operation to demonstrate normal tracing in Jaeger",
  responses: {
    200: {
      description: "Successful trace demo",
    },
  },
});

app.openapi(testTraceSuccessRoute, async (c) => {
  const tracer = trace.getTracer("delineate-hackathon-challenge");
  
  return tracer.startActiveSpan("test.success.trace", async (span) => {
    try {
      span.setAttribute("test.type", "success_demo");
      span.setAttribute("operation", "health_check");
      
      // Simulate a successful operation
      span.addEvent("Checking service health");
      
      // Check internal health
      const healthCheck = await checkS3Health();
      span.setAttribute("health.status", healthCheck ? "healthy" : "unhealthy");
      
      span.addEvent("Health check completed");
      
      // Add a child span to show trace hierarchy
      tracer.startActiveSpan("test.success.child_operation", {
        attributes: {
          "child.operation": "data_processing",
        },
      }, (childSpan) => {
        // Simulate some work
        const startTime = Date.now();
        while (Date.now() - startTime < 50) {
          // Small delay
        }
        childSpan.setAttribute("processing.time_ms", Date.now() - startTime);
        childSpan.end();
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      
      return c.json(
        {
          message: "Successful trace demo",
          status: "success",
          health: healthCheck ? "healthy" : "unhealthy",
          traceId: span.spanContext().traceId,
        },
        200,
      );
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      span.recordException(errorObj);
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorObj.message });
      span.end();
      
      return c.json(
        {
          error: "Unexpected error",
          message: errorObj.message,
        },
        500,
      );
    }
  });
});

// OpenAPI spec endpoint (disabled in production)
if (env.NODE_ENV !== "production") {
  app.doc("/openapi", {
    openapi: "3.0.0",
    info: {
      title: "Delineate Hackathon Challenge API",
      version: "1.0.0",
      description: "API for Delineate Hackathon Challenge",
    },
    servers: [{ url: "http://localhost:3000", description: "Local server" }],
  });

  // Scalar API docs
  app.get("/docs", Scalar({ url: "/openapi" }));
}

// Prometheus metrics endpoint (basic implementation)
app.get("/metrics", (c) => {
  // Basic Prometheus metrics format
  // In production, use prom-client or similar library
  const metrics = [
    "# HELP http_requests_total Total number of HTTP requests",
    "# TYPE http_requests_total counter",
    "http_requests_total{method=\"get\",endpoint=\"/health\"} 0",
    "http_requests_total{method=\"post\",endpoint=\"/v1/download/check\"} 0",
    "",
    "# HELP http_request_duration_seconds HTTP request duration in seconds",
    "# TYPE http_request_duration_seconds histogram",
    "http_request_duration_seconds_bucket{le=\"0.1\"} 0",
    "http_request_duration_seconds_bucket{le=\"0.5\"} 0",
    "http_request_duration_seconds_bucket{le=\"1.0\"} 0",
    "http_request_duration_seconds_bucket{le=\"+Inf\"} 0",
    "http_request_duration_seconds_sum 0",
    "http_request_duration_seconds_count 0",
    "",
    "# HELP up Service availability",
    "# TYPE up gauge",
    "up 1",
  ].join("\n");

  return c.text(metrics, 200, {
    "Content-Type": "text/plain; version=0.0.4",
  });
});

// Graceful shutdown handler
const gracefulShutdown = (server: ServerType) => (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    console.log("HTTP server closed");

    // Shutdown OpenTelemetry to flush traces
    otelSDK
      .shutdown()
      .then(() => {
        console.log("OpenTelemetry SDK shut down");
      })
      .catch((err: unknown) => {
        console.error("Error shutting down OpenTelemetry:", err);
      })
      .finally(() => {
        // Destroy S3 client
        s3Client.destroy();
        console.log("S3 client destroyed");
        console.log("Graceful shutdown completed");
      });
  });
};

// Start server
const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
    hostname: "0.0.0.0", // Listen on all interfaces to accept connections from outside Docker
  },
  (info) => {
    console.log(`Server is running on http://0.0.0.0:${String(info.port)}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    if (env.NODE_ENV !== "production") {
      console.log(`API docs: http://localhost:${String(info.port)}/docs`);
    }
  },
);

// Register shutdown handlers
const shutdown = gracefulShutdown(server);
process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  shutdown("SIGINT");
});
