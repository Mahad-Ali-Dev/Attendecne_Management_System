import { Logo } from "@/components/Logo";
import { CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(600px circle at 20% 10%, rgba(37,99,235,0.35), transparent 45%), radial-gradient(500px circle at 80% 90%, rgba(37,99,235,0.25), transparent 40%)",
          }}
        />
        <div className="relative">
          <Logo variant="light" />
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Attendance,
            <br />
            engineered for scale.
          </h1>
          <p className="max-w-md text-white/70">
            One clean workspace for the Evolut team to clock in, track hours, and
            give admins full visibility over who&apos;s present — every day.
          </p>
          <ul className="space-y-3 text-sm text-white/80">
            {[
              "One-tap check-in / check-out",
              "Complete employee profiles with verified CNIC",
              "Live admin view of who's in today",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-brand-500" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Evolut Ecommerce Solutions · Jhelum, Pakistan
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
