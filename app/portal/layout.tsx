import { getLogtoContext } from "@/lib/logto";
import { PortalHeader } from "@/components/portal/portal-header";
import { signIn } from "@/lib/logto";
import { portalEnabled } from "@/lib/config/app-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!portalEnabled) {
    let isAuthenticated = false;
    try {
      const context = await getLogtoContext();
      isAuthenticated = Boolean(context?.isAuthenticated);
    } catch {
      isAuthenticated = false;
    }

    redirect(isAuthenticated ? "/dashboard" : "/sign-in");
  }

  let isAuthenticated = false;
  try {
    const context = await getLogtoContext();
    isAuthenticated = Boolean(context?.isAuthenticated);
  } catch {
    isAuthenticated = false;
  }
  const accountCenterHref = isAuthenticated ? "/dashboard" : "/sign-in";

  async function handleSignIn() {
    "use server";
    await signIn();
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader
        accountCenterHref={accountCenterHref}
        signInAction={isAuthenticated ? undefined : handleSignIn}
      />

      {/* Main Content */}
      <main className="px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
