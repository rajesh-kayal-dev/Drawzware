import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtUserPayload } from "../types/auth.types.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Missing or malformed Authorization header. Bearer token required.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      error: "SERVER_CONFIGURATION_ERROR",
      message: "JWT_SECRET environment variable is missing.",
    });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtUserPayload;
    const userId = payload.id || payload.sub;

    if (!userId) {
      res.status(401).json({
        error: "INVALID_TOKEN",
        message: "Token subject (user ID) is missing.",
      });
      return;
    }

    req.user = {
      id: userId,
      email: payload.email,
    };

    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: "TOKEN_EXPIRED",
        message: "Authentication token has expired.",
      });
      return;
    }
    res.status(401).json({
      error: "INVALID_TOKEN",
      message: "Failed to verify authentication token.",
      details: err instanceof Error ? err.message : undefined,
    });
  }
}
