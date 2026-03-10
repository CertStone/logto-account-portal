import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>登录账户中心</CardTitle>
          <CardDescription>
            登录后可进入账户中心管理资料、安全设置与社交连接。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSignIn}>
            <Button type="submit" className="w-full">
              使用 Logto 登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
