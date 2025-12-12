import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trace } from "@opentelemetry/api";
import { apiClient } from "../lib/api";
import { formatDate, formatDuration, extractTraceId } from "../lib/utils";
import * as Sentry from "@sentry/react";

interface Job {
  jobId?: string;
  fileId: number;
  status: string;
  createdAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
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
      return tracer.startActiveSpan("api.download.initiate", async (span) => {
        try {
          span.setAttribute("file_id", id);
          const response = await apiClient.initiateDownload(id);
          span.setAttribute("job_id", response.data?.jobId || "");
          span.end();
          return response.data;
        } catch (error) {
          span.recordException(error as Error);
          span.end();
          throw error;
        }
      });
    },
    onSuccess: (data, fileId) => {
      const newJob: Job = {
        fileId,
        status: "initiated",
        jobId: data?.jobId,
        createdAt: new Date().toISOString(),
      };
      setJobs((prev) => [newJob, ...prev]);
      // Start polling for this job
      startPolling(fileId);
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
    const interval = setInterval(async () => {
      try {
        const job = await pollJobStatus(fileId);
        setJobs((prev) =>
          prev.map((j) => (j.fileId === fileId ? { ...j, ...job } : j)),
        );

        // Stop polling if job is completed or failed
        if (
          ["completed", "failed", "timeout", "not_found"].includes(job.status)
        ) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
        clearInterval(interval);
      }
    }, 2000); // Poll every 2s
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
            const traceId = job.jobId ? extractTraceId(job.jobId) : null;
            const jaegerUrl = import.meta.env.VITE_JAEGER_UI_URL;

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
                    {traceId && jaegerUrl && (
                      <a
                        href={`${jaegerUrl}/trace/${traceId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline"
                      >
                        View Trace in Jaeger →
                      </a>
                    )}
                  </div>
                </div>

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
