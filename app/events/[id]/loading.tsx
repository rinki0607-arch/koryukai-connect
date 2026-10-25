import { SkeletonBar, SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonBar className="h-7 w-2/3" />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={3} />
    </div>
  );
}
