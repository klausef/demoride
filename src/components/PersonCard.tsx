import { Star } from "lucide-react";
import { initials } from "@/lib/glide";

export function Avatar({
  name,
  url,
  size = 44,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  return url ? (
    <img
      src={url}
      alt={name}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover ring-1 ring-white/15"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-primary/20 font-display text-sm font-bold text-primary ring-1 ring-primary/30"
    >
      {initials(name)}
    </div>
  );
}

export function Rating({ value, count }: { value: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-foreground/60">
      <Star className="size-3 fill-primary text-primary" />
      {Number(value).toFixed(2)}
      <span className="text-foreground/35">({count})</span>
    </span>
  );
}

export function PersonRow({
  name,
  photo,
  rating,
  ratingCount,
  detail,
  right,
  selected,
  onClick,
}: {
  name: string;
  photo?: string | null;
  rating?: number;
  ratingCount?: number;
  detail?: string;
  right?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        selected ? "bg-primary/15 ring-1 ring-primary/40" : "bg-card/45 ring-1 ring-white/10"
      }`}
    >
      <Avatar name={name} url={photo} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
        <span className="flex items-center gap-2">
          {typeof rating === "number" && <Rating value={rating} count={ratingCount ?? 0} />}
          {detail && (
            <span className="truncate font-mono text-[10px] text-foreground/45">{detail}</span>
          )}
        </span>
      </span>
      {right}
    </Tag>
  );
}
