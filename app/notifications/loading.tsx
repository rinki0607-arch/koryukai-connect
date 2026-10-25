import { SkeletonBar, SkeletonList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonBar className="h-6 w-1/3" />
      <SkeletonList count={6} lines={1} />
    </div>
  );
}
