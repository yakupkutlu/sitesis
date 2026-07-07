import { type CookieOptions } from "express";

import { env } from "./env.js";

export const accessTokenCookieName = "accessToken";

const isProduction = env.NODE_ENV === "production";
const shouldUseSecureCookie = isProduction || env.COOKIE_SAME_SITE === "none";

export const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: shouldUseSecureCookie,
  sameSite: env.COOKIE_SAME_SITE,
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
};

export const clearAccessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: shouldUseSecureCookie,
  sameSite: env.COOKIE_SAME_SITE,
  path: "/",
};

