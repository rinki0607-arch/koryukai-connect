import { SkeletonBar, SkeletonList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBar className="h-3 w-1/4" />
        <SkeletonBar className="h-7 w-2/3" />
      </div>
      <SkeletonList count={3} lines={2} />
    </div>
  );
}
