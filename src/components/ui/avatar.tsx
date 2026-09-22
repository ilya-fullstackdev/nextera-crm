import { cn, initials } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

const PALETTE = [
  "bg-primary-100 text-primary-700",
  "bg-success-100 text-success-700",
  "bg-warning-100 text-warning-700",
  "bg-info-100 text-info-700",
  "bg-danger-100 text-danger-700",
];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({
  firstName,
  lastName,
  size = "md",
  className,
}: {
  firstName: string;
  lastName: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const label = initials(firstName, lastName);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none",
        SIZE_CLASSES[size],
        colorFor(firstName + lastName),
        className
      )}
      title={`${firstName} ${lastName}`}
    >
      {label}
    </span>
  );
}
