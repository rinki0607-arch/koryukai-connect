import { SkeletonBar, SkeletonCard, SkeletonList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonBar className="mb-2 h-6 w-1/2" />
      <SkeletonBar className="mb-6 h-3 w-3/4" />
      <SkeletonCard lines={2} />
      <div className="mt-3">
        <SkeletonList count={4} lines={3} />
      </div>
    </div>
  );
}
