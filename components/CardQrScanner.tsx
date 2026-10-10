"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { redeemCardQr, CardQrResult } from "@/app/mypage/cards/actions";
import Avatar from "@/components/Avatar";

export default function CardQrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CardQrResult | null>(null);
  const [active, setActive] = useState(false);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!active) return;
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
      } catch {
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
          if (code && code.data) {
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
  }, [active]);

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

    const res = await redeemCardQr(value);
    setResult(res);
    busyRef.current = false;
    if (res.ok) {
      setActive(false);
    }
  }

  if (!active) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setError(null);
            setActive(true);
          }}
          className="btn-primary"
        >
          📷 カメラでQRコードを読み取る
        </button>

        {result && (
          <div
            className={`card mt-4 border ${
              result.ok
                ? "border-green-300 bg-green-50 text-green-700"
                : "border-red-300 bg-red-50 text-red-700"
            }`}
          >
            {result.ok ? (
              <div className="flex items-center gap-3">
                <Avatar name={result.name} avatarUrl={result.avatarUrl} size={44} />
                <div>
                  <p className="font-bold">
                    {result.alreadyExchanged
                      ? "交換済みの相手です"
                      : "名刺交換が完了しました🎉"}
                  </p>
                  <p className="mt-0.5 text-sm">
                    {result.name || "(名前未設定)"}
                    {result.company ? `(${result.company})` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p>{result.message}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      {error && <p className="card mb-4 text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
        <video ref={videoRef} className="w-full" playsInline muted />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          相手のQRコードをカメラに映してください。
        </p>
        <button
          type="button"
          onClick={() => setActive(false)}
          className="btn-ghost shrink-0"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
