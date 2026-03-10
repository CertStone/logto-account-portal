import { NextResponse } from "next/server";
import { deleteUserAccount, getLogtoContext } from "@/lib/logto";
import { isFeatureEnabled } from "@/config/features";
import { MfaVerificationHeaderSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function DELETE(request: Request) {
  try {
    const { isAuthenticated } = await getLogtoContext();

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 检查功能是否启用
    if (!isFeatureEnabled("accountDeletion")) {
      return NextResponse.json(
        { error: "账户删除功能未启用" },
        { status: 403 }
      );
    }

    // 验证密码验证记录（需要先通过密码验证接口获取 verificationRecordId）
    const headerResult = MfaVerificationHeaderSchema.safeParse({
      verificationRecordId: request.headers.get("logto-verification-id"),
    });

    if (!headerResult.success) {
      return NextResponse.json(
        { error: "缺少或无效的验证参数" },
        { status: 400 }
      );
    }

    // 调用删除账户API
    await deleteUserAccount();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Account deletion error", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
