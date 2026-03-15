import { redirect } from "next/navigation";
import { getLogtoContext } from "@/lib/logto";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let isAuthenticated = false;

  try {
    const context = await getLogtoContext();
    isAuthenticated = Boolean(context?.isAuthenticated);
  } catch {
    isAuthenticated = false;
  }

  redirect(isAuthenticated ? "/dashboard" : "/portal");
}
