export default function Card({
  title,
  value,
  subtitle,
  icon,
  accent = "#2563eb",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="card flex items-center gap-3.5 p-4.5 p-[18px] flex-1 min-w-[200px]">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-black shrink-0"
        style={{ background: `radial-gradient(circle at 35% 30%, ${accent}, ${accent}99)` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted font-medium">{title}</div>
        <div className="text-xl font-bold text-white truncate">{value}</div>
        {subtitle && <div className="text-[11px] text-muted/80">{subtitle}</div>}
      </div>
    </div>
  );
}
