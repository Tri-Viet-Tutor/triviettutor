import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMeetingRecordingInfo } from "@/services/meetingService";
import { api } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";
import { Icon } from "@/components/ui/Icon";

interface SessionRecordingPlayerProps {
  sessionId: number;
  className?: string;
  showWhenEmpty?: boolean;
}

export function SessionRecordingPlayer({
  sessionId,
  className = "",
  showWhenEmpty = false,
}: SessionRecordingPlayerProps) {
  const token = useAuthStore((state) => state.token);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["session-recording", sessionId],
    queryFn: () => getMeetingRecordingInfo(sessionId),
    enabled: sessionId > 0,
    staleTime: 60 * 1000,
  });

  const downloadName = data?.fileName || `buoi_hoc_${sessionId}_recording.webm`;
  const audioSrcWithToken = data?.recordingUrl
    ? `${data.recordingUrl}${token ? `?token=${encodeURIComponent(token)}` : ""}`
    : "";

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (data?.hasRecording && data?.recordingUrl) {
      api
        .get(data.recordingUrl, { responseType: "blob" })
        .then((res) => {
          if (active) {
            createdUrl = URL.createObjectURL(res.data);
            setBlobUrl(createdUrl);
          }
        })
        .catch((err) => {
          console.warn("Could not pre-fetch audio blob, falling back to direct URL with token:", err);
        });
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [data?.hasRecording, data?.recordingUrl]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!data?.recordingUrl || isDownloading) return;

    setIsDownloading(true);
    try {
      const response = await api.get(data.recordingUrl, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi khi tải file qua api, chuyển hướng sang link trực tiếp:", err);
      window.open(audioSrcWithToken, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  // State 1: Loading
  if (isLoading) {
    return (
      <div
        className={`rounded-xl border border-brand-sandLine bg-brand-sand/40 p-4 animate-pulse ${className}`}
        aria-busy="true"
        aria-label="Đang tải bản ghi âm"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-36 rounded bg-brand-sandLine/80" />
          <div className="h-4 w-20 rounded bg-brand-sandLine/60" />
        </div>
        <div className="mt-3 h-9 w-full rounded bg-brand-sandLine/60" />
      </div>
    );
  }

  // State 2: Error
  if (isError) {
    return (
      <div
        className={`rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-rose-800 flex items-center justify-between text-xs ${className}`}
        role="alert"
      >
        <div className="flex items-center gap-1.5">
          <Icon name="error_outline" className="text-base text-rose-600" />
          <span>Không thể tải thông tin bản ghi âm.</span>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-semibold text-rose-700 hover:text-rose-900 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600 rounded px-1.5 py-0.5 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // State 3: Empty
  if (!data || !data.hasRecording || !data.recordingUrl) {
    if (!showWhenEmpty) {
      return null;
    }
    return (
      <div
        className={`rounded-xl border border-brand-sandLine bg-white/70 p-3 text-xs text-brand-muted flex items-center gap-2 ${className}`}
      >
        <Icon name="mic_off" className="text-base text-brand-muted" />
        <span>Chưa có bản ghi âm được lưu cho buổi học này.</span>
      </div>
    );
  }

  // State 4 & 5: Default and Active Playback
  const finalAudioSrc = blobUrl || audioSrcWithToken;

  return (
    <section
      aria-label="Bản ghi âm buổi học"
      className={`rounded-xl border border-brand-sandLine bg-white p-3.5 shadow-sm transition-colors duration-150 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Icon name="graphic_eq" className="text-brand-orange text-lg" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy">
            Bản ghi âm buổi học
          </h4>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-navy hover:text-brand-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-orange rounded px-1.5 py-0.5 transition-colors disabled:opacity-50"
          title="Tải tệp ghi âm về máy"
        >
          <Icon name="download" className="text-sm" />
          <span>{isDownloading ? "Đang tải..." : "Tải tệp"}</span>
        </button>
      </div>

      <div className="rounded-lg bg-brand-sand/50 p-2">
        <audio
          key={finalAudioSrc}
          controls
          className="w-full h-8 outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded"
          src={finalAudioSrc}
          preload="metadata"
          aria-label="Trình phát bản ghi âm bài giảng"
        />
      </div>
    </section>
  );
}
