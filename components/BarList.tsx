export interface BarItem {
  label: string;
  value: number;
}

export default function BarList({
  items,
  unit = "",
}: {
  items: BarItem[];
  unit?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">データがありません。</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-medium text-gray-900">
              {item.value}
              {unit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
