import { SkeletonCard, SkeletonProfileHeader } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonProfileHeader />
      <SkeletonCard lines={4} />
    </div>
  );
}
