import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/dashboard", "/offres", "/analyse", "/lettre", "/profil"],
};
