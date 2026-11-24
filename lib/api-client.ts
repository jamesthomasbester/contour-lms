import type {
  CreateConsultationInput,
  UpdateConsultationInput,
} from "@/lib/validation";

type ErrorBody = { error?: string; fields?: Record<string, string[]> };

export class ApiError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data: ErrorBody | null = await res.json().catch(() => null);
    throw new ApiError(data?.error ?? "Something went wrong", data?.fields);
  }
}

export function createConsultation(input: CreateConsultationInput) {
  return send("/api/consultations", "POST", input);
}

export function updateConsultation(id: string, input: UpdateConsultationInput) {
  return send(`/api/consultations/${id}`, "PATCH", input);
}
