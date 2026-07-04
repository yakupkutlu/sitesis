import express from "express";

import { csrfCookieName, csrfCookieOptions } from "../config/csrf.js";
import { generateCsrfToken } from "../middlewares/csrf.middleware.js";

const router = express.Router();

router.get("/", (_request, response) => {
  const csrfToken = generateCsrfToken();

  response.cookie(csrfCookieName, csrfToken, csrfCookieOptions);

  response.status(200).json({
    success: true,
    data: {
      csrfToken,
    },
  });
});

export default router;