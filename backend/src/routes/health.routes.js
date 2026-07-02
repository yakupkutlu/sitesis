import express from "express";

const router = express.Router();

router.get("/", (_request, response) => {
  response.status(200).json({
    success: true,
    status: "ok",
    message: "Backend çalışıyor.",
  });
});

export default router;