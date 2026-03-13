import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signIn, getLogtoContext } from "@/lib/logto";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const { isAuthenticated } = await getLogtoContext();

  if (isAuthenticated) {
    redirect("/dashboard");
  }

  async function handleSignIn() {
    "use server";
    await signIn();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form action={handleSignIn}>
        <Button type="submit" className="w-full">
          登录中，点击继续
        </Button>
      </form>
    </div>
  );
}
