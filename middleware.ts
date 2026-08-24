import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, NextRequest } from "next/server";

// Force Next.js Webpack to inline these environment variables into the Edge bundle
const dummy1 = process.env.CLERK_SECRET_KEY;
const dummy2 = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const isProtectedRoute = createRouteMatcher([
  "/(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/book(.*)",
  "/terms-of-service",
  "/privacy-policy",
  "/unauthorized-sign-in",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/public(.*)",
  "/api/analytics",
  "/test-analytics",
  "/api/health",
  "/debug",
  "/api/debug-migrations",
  "/inv/(.*)",
]);

const clerkMw = clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // IMPORTANT: Prevent infinite redirect loops with Clerk's internal routes (like /__clerk/v1/client/handshake)
  // If we don't skip them, auth.protect() will intercept them and redirect back to sign-in recursively!
  if (pathname.startsWith("/__clerk")) {
    return NextResponse.next();
  }

  // 1) Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // 2) Protect protected routes
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
    await auth.protect();
  }

  // 3) Resolve tenant from Clerk session claims
  const authObject = await auth();
  const claims = authObject.sessionClaims || {};
  const tenantId =
    (claims.org_id as string) ||
    (claims.tenantId as string) ||
    (claims.tenant_Id as string) ||
    authObject.orgId ||
    null;

  const tenantKey =
    (claims.org_slug as string) ||
    (claims.organization_slug as string) ||
    (claims.org_name as string) ||
    null;

  // 4) Prepare request headers to forward to route handlers
  const requestHeaders = new Headers(req.headers);
  if (tenantId) requestHeaders.set("x-tenant-id", tenantId);
  if (tenantKey) requestHeaders.set("x-tenant-key", tenantKey);

  // 5) Handle CORS for API routes
  if (pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, Clerk-Auth, x-tenant-id, x-tenant-key",
        },
      });
    }

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Clerk-Auth, x-tenant-id, x-tenant-key"
    );
    return res;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export default async function middleware(req: NextRequest, event: any) {
  try {
    return await clerkMw(req, event);
  } catch (error: any) {
    console.error("Middleware crash caught:", error);
    
    const edgeEnv = {
      hasSecret: !!process.env.CLERK_SECRET_KEY,
      secretLength: process.env.CLERK_SECRET_KEY?.length || 0,
      hasPublishable: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      allKeys: Object.keys(process.env).filter(k => k.includes("CLERK") || k.includes("NEXT"))
    };

    return new NextResponse(
      JSON.stringify({ 
        error: "Middleware Error", 
        message: error?.message || String(error),
        edgeEnv,
        hint: edgeEnv.hasSecret ? "Key exists but Clerk still says missing" : "Key is completely missing in Edge runtime"
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
    "/api/:path*",
  ],
};
