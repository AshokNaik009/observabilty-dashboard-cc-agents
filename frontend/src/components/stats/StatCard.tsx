interface Props {
  label: string;
  value: string | number;
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="bg-panel border border-border rounded-lg px-4 py-3 flex-1 animate-in">
      <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
      <div className="text-xl font-semibold text-white mt-1">{value}</div>
    </div>
  );
}
