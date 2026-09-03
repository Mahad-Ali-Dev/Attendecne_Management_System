import { AppHeader } from "@/components/AppHeader";
import { requireAdmin } from "@/lib/data";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();
  return (
    <div className="min-h-screen">
      <AppHeader profile={profile} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
