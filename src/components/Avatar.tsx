import { initials } from "@/lib/format";

export function Avatar({
  name,
  src,
  size = 40,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-white"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-2 ring-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name) || "?"}
    </div>
  );
}
