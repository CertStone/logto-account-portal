import { handleSignIn } from "@/lib/logto";
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  await handleSignIn(searchParams);

  redirect('/dashboard');
}
