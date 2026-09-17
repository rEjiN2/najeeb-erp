import { NextResponse } from "next/server";

import { destroyServerSession } from "@/features/auth/session";

export async function POST() {
  await destroyServerSession();
  return NextResponse.json({ success: true });
}
