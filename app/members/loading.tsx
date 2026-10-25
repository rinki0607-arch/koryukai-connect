import { SkeletonBar, SkeletonCircle } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonBar className="h-6 w-1/3" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="card space-y-3 text-center">
            <SkeletonCircle className="mx-auto h-16 w-16" />
            <SkeletonBar className="mx-auto h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
