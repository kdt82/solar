import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname.startsWith("/login");
  const isOnApi = req.nextUrl.pathname.startsWith("/api");

  // Allow API routes (except auth routes will be handled by NextAuth)
  if (isOnApi) {
    if (!isLoggedIn && !req.nextUrl.pathname.startsWith("/api/auth")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // If logged in and on login page, redirect to home
  if (isLoggedIn && isOnLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If not logged in and not on login page, redirect to login
  if (!isLoggedIn && !isOnLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|icon-192.png|icon-512.png|manifest.json|.*\\.svg$).*)"],
};
