/**
 * 読み込み中に表示する「骨組み」部品。
 * データの取得が終わるまでの間、白い画面のまま待たせず、
 * おおよその形をすぐに表示して「固まっていない」ことを伝える。
 */

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-4 rounded-full ${className}`} />;
}

export function SkeletonCircle({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-full ${className}`} />;
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card space-y-3">
      <SkeletonBar className="h-3 w-1/4" />
      <SkeletonBar className="h-5 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-1/2" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonList({
  count = 3,
  lines = 2,
}: {
  count?: number;
  lines?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}

export function SkeletonStatRow({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-2">
          <SkeletonBar className="h-3 w-2/3" />
          <SkeletonBar className="h-7 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfileHeader() {
  return (
    <div className="flex items-center gap-4">
      <SkeletonCircle className="h-16 w-16 shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBar className="h-5 w-1/2" />
        <SkeletonBar className="h-3 w-1/3" />
      </div>
    </div>
  );
}
