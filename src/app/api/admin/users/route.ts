import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { listAllUsers } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if ("status" in authResult) {
    return NextResponse.json(authResult.body, { status: authResult.status });
  }

  const users = await listAllUsers();
  return NextResponse.json({ users });
}
