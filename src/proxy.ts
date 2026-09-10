import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APPLICANT_PREFIX = "/app";
const ORGANIZER_PREFIX = "/org";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const wantsApplicant = pathname === APPLICANT_PREFIX || pathname.startsWith(`${APPLICANT_PREFIX}/`);
  const wantsOrganizer = pathname === ORGANIZER_PREFIX || pathname.startsWith(`${ORGANIZER_PREFIX}/`);
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";

  if (!user && (wantsApplicant || wantsOrganizer)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && (wantsApplicant || wantsOrganizer || isAuthPage)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = profile?.role ?? "applicant";
    const home = role === "organizer" ? ORGANIZER_PREFIX : APPLICANT_PREFIX;
    if (isAuthPage || (wantsOrganizer && role !== "organizer") || (wantsApplicant && role === "organizer")) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
