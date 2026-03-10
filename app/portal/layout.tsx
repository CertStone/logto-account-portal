import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { getLogtoContext } from "@/lib/logto";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getLogtoContext();
  const accountCenterHref = isAuthenticated ? "/dashboard" : "/sign-in";

  return (
    <div className="min-h-screen bg-background">
      {/* Portal Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href={accountCenterHref}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 font-semibold">
              <LayoutGrid className="h-5 w-5" />
              <span>服务门户</span>
            </div>
          </div>
          <Link href={accountCenterHref}>
            <Button variant="ghost" size="sm">
              返回账户中心
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
