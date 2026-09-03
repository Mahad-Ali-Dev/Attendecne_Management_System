import Image from "next/image";

export function Logo({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const text = variant === "light" ? "text-white" : "text-navy";
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="https://evolutecomsolutions.com/logo_1.png"
        alt="Evolut Ecommerce Solutions"
        width={36}
        height={36}
        className="h-9 w-9 rounded-lg object-contain"
        unoptimized
      />
      <div className="leading-tight">
        <div className={`text-sm font-bold tracking-tight ${text}`}>Evolut</div>
        <div
          className={`text-[10px] font-medium uppercase tracking-[0.18em] ${
            variant === "light" ? "text-white/60" : "text-slate-400"
          }`}
        >
          Attendance
        </div>
      </div>
    </div>
  );
}
