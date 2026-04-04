import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/admin/login", "/api/auth"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isPublicRoute) {
    // Redirect authenticated users away from login pages
    if (session?.user) {
      if (pathname === "/admin/login" && session.user.role === "admin") {
        return NextResponse.redirect(new URL("/admin/overview", request.url));
      }
      if (pathname === "/login" && session.user.role === "employee") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect dashboard routes (employee only)
  if (pathname.startsWith("/dashboard")) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.user.role !== "employee") {
      return NextResponse.redirect(new URL("/admin/overview", request.url));
    }
    return NextResponse.next();
  }

  // Protect API routes
  if (pathname.startsWith("/api/admin")) {
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (pathname.startsWith("/api/employee")) {
    if (!session?.user || session.user.role !== "employee") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/api/admin/:path*",
    "/api/employee/:path*",
    "/login",
    "/admin/login",
  ],
};
