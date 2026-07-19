import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireRole";
import { getUserById, setUserRole } from "@/lib/firebase/admin";
import { isRole } from "@/lib/firebase/roles";

export async function POST(request: Request) {
  const authResult = await requireAdmin(request);
  if ("status" in authResult) {
    return NextResponse.json(authResult.body, { status: authResult.status });
  }

  let body: { uid?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      { error: { message: `Invalid JSON body: ${err instanceof Error ? err.message : String(err)}` } },
      { status: 400 }
    );
  }

  const { uid, role } = body;
  if (typeof uid !== "string" || uid.length === 0) {
    return NextResponse.json({ error: { message: "uid is required and must be a string." } }, { status: 400 });
  }
  if (!isRole(role)) {
    return NextResponse.json({ error: { message: "role must be one of PENDING, USER, ADMIN, SUPERADMIN." } }, { status: 400 });
  }

  if (uid === authResult.uid) {
    return NextResponse.json(
      { error: { message: "You cannot change your own role — ask another admin." } },
      { status: 400 }
    );
  }

  const target = await getUserById(uid);

  // SUPERADMIN accounts are off-limits to regular admins in both
  // directions: a plain ADMIN can neither promote someone to SUPERADMIN
  // nor change an existing SUPERADMIN's role.
  if ((target.role === "SUPERADMIN" || role === "SUPERADMIN") && authResult.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: { message: "Only a superadmin can assign or change a superadmin's role." } },
      { status: 403 }
    );
  }

  await setUserRole(uid, role);
  return NextResponse.json({ uid, role });
}
