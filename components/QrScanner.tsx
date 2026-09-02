"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { recordScan, ScanResult } from "@/app/admin/checkin/[eventId]/actions";

const ACTION_LABEL: Record<string, string> = {
  checked_in: "受付完了",
  checked_out: "退出記録",
  already_out: "記録済み",
};

const ACTION_COLOR: Record<string, string> = {
  checked_in: "bg-green-50 border-green-300 text-green-700",
  checked_out: "bg-blue-50 border-blue-300 text-blue-700",
  already_out: "bg-yellow-50 border-yellow-300 text-yellow-700",
};

export default function QrScanner({ eventId }: { eventId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(true);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (e: any) {
        setError(
          "カメラにアクセスできませんでした。ブラウザのカメラ許可を確認してください。"
        );
      }
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data && scanning) {
            handleDecoded(code.data);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  async function handleDecoded(value: string) {
    const now = Date.now();
    if (
      lastScanRef.current &&
      lastScanRef.current.value === value &&
      now - lastScanRef.current.at < 4000
    ) {
      return; // 同じコードの連続読み取りを抑制
    }
    if (busyRef.current) return;
    busyRef.current = true;
    lastScanRef.current = { value, at: now };

    const res = await recordScan(eventId, value);
    setResult(res);
    busyRef.current = false;
  }

  return (
    <div>
      {error && (
        <p className="card mb-4 text-sm text-red-600">{error}</p>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
        <video
          ref={videoRef}
          className="w-full"
          playsInline
          muted
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {result && (
        <div
          className={`card mt-4 border ${
            result.ok
              ? ACTION_COLOR[result.action || ""] ||
                "bg-green-50 border-green-300 text-green-700"
              : "bg-red-50 border-red-300 text-red-700"
          }`}
        >
          <p className="text-lg font-bold">
            {result.ok
              ? ACTION_LABEL[result.action || ""] || result.message
              : "エラー"}
          </p>
          {result.ok && (
            <p className="mt-1">
              {result.name || "(名前未設定)"}
              {result.company ? `(${result.company})` : ""}
            </p>
          )}
          {!result.ok && <p className="mt-1">{result.message}</p>}
        </div>
      )}

      <p className="mt-4 text-center text-sm text-gray-500">
        参加者のQRコードをカメラに映してください。読み取ると自動的に記録されます。
      </p>
    </div>
  );
}
