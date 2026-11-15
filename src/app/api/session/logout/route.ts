import { NextResponse } from "next/server";

import { clearSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/market", request.url), { status: 303 });
}
