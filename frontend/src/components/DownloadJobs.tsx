import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trace } from "@opentelemetry/api";
import { apiClient } from "../lib/api";
import { formatDate, formatDuration } from "../lib/utils";
import * as Sentry from "@sentry/react";

interface Job {
  jobId?: string;
  fileId: number;
  status: string;
  createdAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  progress?: number; // Progress percentage (0-100)
  startTime?: number; // Timestamp when job started
}

export default function DownloadJobs() {
  const [fileId, setFileId] = useState<string>("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const queryClient = useQueryClient();

  // Poll for job status
  const pollJobStatus = async (fileId: number) => {
    try {
      const response = await apiClient.getDownloadStatus(fileId);
      const job = {
        fileId,
        status: response.data?.status || "unknown",
        jobId: response.data?.jobId,
        createdAt: response.data?.createdAt,
        completedAt: response.data?.completedAt,
        duration: response.data?.duration,
        error: response.data?.error,
      };
      return job;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { fileId, status: "not_found", error: "Job not found" };
      }
      throw error;
    }
  };

  // Mutation to initiate download
  const initiateMutation = useMutation({
    mutationFn: async (id: number) => {
      const tracer = trace.getTracer("delineate-frontend");
      return tracer.startActiveSpan("api.download.start", async (span) => {
        try {
          span.setAttribute("file_id", id);
          // Use /v1/download/start for long-running downloads
          const response = await apiClient.startDownload(id);
          span.setAttribute("status", response.data?.status || "");
          span.end();
          return response.data;
        } catch (error) {
          span.recordException(error as Error);
          span.end();
          throw error;
        }
      });
    },
    onMutate: async (fileId) => {
      // Add job immediately when user clicks "Start Download"
      const startTime = Date.now();
      const newJob: Job = {
        fileId,
        status: "pending",
        jobId: `job-${fileId}`, // Temporary ID, will be updated from backend
        createdAt: new Date().toISOString(),
        progress: 0,
        startTime,
      };
      setJobs((prev) => [newJob, ...prev]);
      // Start polling immediately
      startPolling(fileId);
    },
    onSuccess: (data, fileId) => {
      // Update job with final status when backend responds
      setJobs((prev) =>
        prev.map((j) =>
          j.fileId === fileId
            ? {
                ...j,
                status: data?.status || "completed",
                completedAt:
                  data?.status === "completed"
                    ? new Date().toISOString()
                    : undefined,
                duration: data?.processingTimeMs,
                error:
                  data?.status === "failed"
                    ? "File not found in storage"
                    : undefined,
                progress: data?.status === "completed" ? 100 : j.progress || 0,
              }
            : j,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["download", fileId] });
    },
    onError: (error: any) => {
      Sentry.captureException(error, {
        tags: {
          action: "initiate_download",
        },
        extra: {
          fileId,
        },
      });
    },
  });

  const startPolling = (fileId: number) => {
    // Get start time from existing job - this is critical for progress calculation
    let startTime: number = Date.now();
    setJobs((prev) => {
      const existingJob = prev.find((j) => j.fileId === fileId);
      if (existingJob?.startTime) {
        startTime = existingJob.startTime;
      } else {
        // Ensure startTime is set in the job
        startTime = Date.now();
        return prev.map((j) => (j.fileId === fileId ? { ...j, startTime } : j));
      }
      return prev;
    });

    const minDelay = 10000; // 10 seconds (from backend DOWNLOAD_DELAY_MIN_MS)
    const maxDelay = 200000; // 200 seconds (from backend DOWNLOAD_DELAY_MAX_MS)
    const avgDelay = (minDelay + maxDelay) / 2; // Average delay: 105 seconds

    // Store interval IDs to clean up properly
    let progressIntervalId: NodeJS.Timeout | null = null;
    let statusIntervalId: NodeJS.Timeout | null = null;

    // Update progress smoothly and gradually - this runs independently
    const updateProgress = () => {
      setJobs((prev) => {
        const job = prev.find((j) => j.fileId === fileId);
        if (!job) return prev;

        // Always use the job's startTime (it should be set)
        const currentStartTime = job.startTime || startTime;
        const elapsed = Date.now() - currentStartTime;

        // Only update progress if job is still in progress
        if (job.status === "in_progress" || job.status === "pending") {
          // Calculate progress: (elapsed / avgDelay) * 100
          // Cap at 95% until backend confirms completion
          let progress = (elapsed / avgDelay) * 100;
          progress = Math.min(95, Math.max(0, progress)); // Clamp between 0 and 95

          // Round to 1 decimal for smoother display
          progress = Math.round(progress * 10) / 10;

          return prev.map((j) =>
            j.fileId === fileId
              ? {
                  ...j,
                  progress,
                  status: elapsed > 100 ? "in_progress" : j.status, // Auto-update status after 100ms
                }
              : j,
          );
        }

        // Don't update progress if job is completed or failed
        return prev;
      });
    };

    // Start progress updates immediately and continue every 100ms for very smooth animation
    updateProgress();
    progressIntervalId = setInterval(updateProgress, 100);

    // Poll backend for status updates (less frequently)
    statusIntervalId = setInterval(async () => {
      try {
        const job = await pollJobStatus(fileId);

        setJobs((prev) => {
          const existingJob = prev.find((j) => j.fileId === fileId);
          const currentStartTime = existingJob?.startTime || startTime;

          // Only update status, keep progress calculation running
          let finalProgress = existingJob?.progress || 0;

          if (job.status === "completed") {
            finalProgress = 100;
            // Stop progress updates when completed
            if (progressIntervalId) clearInterval(progressIntervalId);
          } else if (job.status === "failed" || job.status === "not_found") {
            // Stop progress updates on failure
            if (progressIntervalId) clearInterval(progressIntervalId);
          }

          return prev.map((j) =>
            j.fileId === fileId
              ? {
                  ...j,
                  ...job,
                  progress: finalProgress,
                  startTime: j.startTime || currentStartTime, // Preserve startTime
                }
              : j,
          );
        });

        // Stop polling if job is completed or failed
        if (
          ["completed", "failed", "timeout", "not_found"].includes(job.status)
        ) {
          if (statusIntervalId) clearInterval(statusIntervalId);
          if (progressIntervalId) clearInterval(progressIntervalId);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
        if (statusIntervalId) clearInterval(statusIntervalId);
        if (progressIntervalId) clearInterval(progressIntervalId);
      }
    }, 2000); // Poll API every 2s
  };

  const handleInitiate = () => {
    const id = parseInt(fileId, 10);
    if (isNaN(id) || id <= 0) {
      alert("Please enter a valid file ID");
      return;
    }
    initiateMutation.mutate(id);
    setFileId("");
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
      case "timeout":
        return "bg-red-100 text-red-800";
      case "in_progress":
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Download Jobs</h2>

      {/* Initiate Download Form */}
      <div className="mb-6 flex gap-2">
        <input
          type="number"
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          placeholder="Enter File ID"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          onKeyPress={(e) => e.key === "Enter" && handleInitiate()}
        />
        <button
          onClick={handleInitiate}
          disabled={initiateMutation.isPending}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {initiateMutation.isPending ? "Starting..." : "Start Download"}
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {jobs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No download jobs yet. Start one above!
          </p>
        ) : (
          jobs.map((job, index) => {
            return (
              <div
                key={`${job.fileId}-${index}`}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        File ID: {job.fileId}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                          job.status,
                        )}`}
                      >
                        {job.status.toUpperCase()}
                      </span>
                    </div>
                    {job.jobId && (
                      <p className="text-xs text-gray-500">
                        Job ID: {job.jobId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {(job.status === "in_progress" || job.status === "pending") && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Progress</span>
                      <span className="text-xs font-medium text-gray-700">
                        {Math.round(job.progress ?? 0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-200 ease-linear"
                        style={{ width: `${job.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Completed Progress */}
                {job.status === "completed" && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Progress</span>
                      <span className="text-xs font-medium text-green-700">
                        100%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-green-600 h-2 rounded-full w-full" />
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-600 space-y-1">
                  {job.createdAt && <p>Started: {formatDate(job.createdAt)}</p>}
                  {job.completedAt && (
                    <p>Completed: {formatDate(job.completedAt)}</p>
                  )}
                  {job.duration && (
                    <p>Duration: {formatDuration(job.duration)}</p>
                  )}
                  {job.error && (
                    <p className="text-red-600">Error: {job.error}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
