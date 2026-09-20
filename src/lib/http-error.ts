import { NextResponse } from "next/server";

export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  const status = error instanceof AppError ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}
