const RING_COLORS = [
  "bg-primary text-accent",
  "bg-accent text-[#241a03]",
  "bg-primary-light text-primary",
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export default function Avatar({
  name,
  size = 44,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  const label = (name || "?").trim();
  const initial = label.charAt(0) || "?";
  const colorClass = RING_COLORS[hashName(label) % RING_COLORS.length];

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold ${colorClass}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
