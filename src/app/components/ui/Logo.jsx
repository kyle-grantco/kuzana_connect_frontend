import { Users } from "lucide-react";

// Group-of-people mark on the brand-yellow tile (matches the agreed design).
export default function Logo({ size = 46 }) {
  const icon = Math.round(size * 0.55);
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-brand-yellow"
      style={{ width: size, height: size }}
    >
      <Users size={icon} strokeWidth={1.9} className="text-brand-navy" />
    </div>
  );
}
