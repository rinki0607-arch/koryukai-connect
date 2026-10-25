import { SkeletonBar, SkeletonList, SkeletonStatRow } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <SkeletonStatRow count={3} />
      <div className="space-y-3">
        <SkeletonBar className="h-5 w-1/4" />
        <SkeletonList count={3} lines={2} />
      </div>
    </div>
  );
}
