import { FastifyInstance, FastifyReply } from "fastify";
import { StatusCodes } from "http-status-codes";
import { httpError } from "./http";
import mongoose from "mongoose";
import { config } from "../config";

interface VerificationResult {
  user_id?: number;
  username?: string;
  email?: string;
  expired?: boolean; // Add a flag for expiration
  error?: string; // Add a general error message
}

export async function verifyToken(
  token: string | undefined,
  reply: FastifyReply,
  server: FastifyInstance
): Promise<VerificationResult | null> {
  if (!token) {
    httpError({
      reply,
      message: "Token is required",
      code: StatusCodes.BAD_REQUEST,
    });
    return null; // Return null to indicate failure
  }

  try {
    const decoded = server.jwt.verify<{
      user_id: number;
      username: string;
      email: string;
    }>(token);
    return { ...decoded }; // Return decoded payload
  } catch (err: any) {
    let errorMessage = "Unable to verify token";
    let errorCode = StatusCodes.UNAUTHORIZED;
    let userId: number | undefined = undefined; // Store potential user ID
    let expired = false;

    if (err.code === "FAST_JWT_EXPIRED") {
      errorMessage = "Token Expired";
      errorCode = StatusCodes.UNAUTHORIZED;
      expired = true;

      try {
        // Attempt to decode the token WITHOUT verifying signature to get user_id
        const decodedToken: any = server.jwt.decode(token); // Type 'any' to avoid TS errors with decode
        if (decodedToken && decodedToken.user_id) {
          userId = decodedToken.user_id;
        }
      } catch (decodeErr) {
        console.error("Error decoding expired token:", decodeErr);
      }
    }

    // Don't call httpError here anymore

    return {
      user_id: userId,
      expired: expired,
      error: errorMessage, // Include the error message
    };
  }
}
