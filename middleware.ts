import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.role === "ADMIN";
    const isModerator = token?.role === "MODERATOR";

    if (
      req.nextUrl.pathname.startsWith("/dashboard") &&
      !isAdmin &&
      !isModerator
    ) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) =>
        !!token &&
        (!req.nextUrl.pathname.startsWith("/dashboard") ||
          token.role === "ADMIN" ||
          token.role === "MODERATOR"),
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/my-reports/:path*"],
};
