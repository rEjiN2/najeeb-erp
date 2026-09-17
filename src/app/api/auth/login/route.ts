import { NextResponse } from "next/server";

import { MOCK_CREDENTIALS, MOCK_USER } from "@/features/auth/constants";
import { createServerSession } from "@/features/auth/session";
import type { LoginCredentials } from "@/features/auth/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<LoginCredentials>;

  const isValid =
    typeof body.email === "string" &&
    typeof body.password === "string" &&
    body.email.trim().toLowerCase() === MOCK_CREDENTIALS.email &&
    body.password === MOCK_CREDENTIALS.password;

  if (!isValid) {
    return NextResponse.json(
      { message: "Invalid email or password." },
      { status: 401 },
    );
  }

  await createServerSession(Boolean(body.rememberMe));

  return NextResponse.json({ user: MOCK_USER });
}
