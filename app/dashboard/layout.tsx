import { getLogtoContext, getAccountInfo, signOut } from "@/lib/logto";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, claims } = await getLogtoContext();

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  let accountInfo = null;
  try {
    accountInfo = await getAccountInfo();
  } catch (error) {
    logger.error("Failed to get account info", error);
  }

  const user = {
    name: claims?.name || accountInfo?.name,
    username: claims?.username || accountInfo?.username,
    email: claims?.email || accountInfo?.primaryEmail,
    avatar: accountInfo?.avatar ?? claims?.picture ?? undefined,
  };

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <div className="md:pl-64">
        <Navbar user={user} onSignOut={handleSignOut} />
        <main className="p-4 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
