import { type CookieOptions } from "express";

import { env } from "./env.js";

export const csrfCookieName = "csrfToken";
export const csrfHeaderName = "x-csrf-token";

export const csrfCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};