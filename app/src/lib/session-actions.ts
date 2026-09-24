"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  isAuthConfigured,
  passwordMatches,
} from "@/lib/auth";

export async function login(
  _state: string | null,
  formData: FormData,
): Promise<string | null> {
  if (!isAuthConfigured()) {
    return "Login is not configured — set APP_PASSWORD and AUTH_SECRET.";
  }

  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) return "Wrong password.";

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
