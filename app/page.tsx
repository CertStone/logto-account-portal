import { redirect } from "next/navigation";
import { getLogtoContext } from "@/lib/logto";
import { portalEnabled } from "@/lib/config/app-flags";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let isAuthenticated = false;

  try {
    const context = await getLogtoContext();
    isAuthenticated = Boolean(context?.isAuthenticated);
  } catch {
    isAuthenticated = false;
  }

  if (!portalEnabled) {
    redirect(isAuthenticated ? "/dashboard" : "/sign-in");
  }

  redirect(isAuthenticated ? "/dashboard" : "/portal");
}
