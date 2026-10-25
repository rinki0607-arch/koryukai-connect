import {
  SkeletonList,
  SkeletonProfileHeader,
  SkeletonStatRow,
} from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonProfileHeader />
      <SkeletonStatRow count={3} />
      <SkeletonList count={3} lines={2} />
    </div>
  );
}
