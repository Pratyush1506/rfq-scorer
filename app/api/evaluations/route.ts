import { z } from "zod";
import { getRfq, listEvaluations } from "@/lib/db";
import { evaluateVendor } from "@/lib/evaluate";

const MAX_PROFILE_CHARS = 50_000;

const requestSchema = z.object({
  rfqId: z.string().min(1, "Select an RFQ"),
  vendorProfile: z
    .string()
    .trim()
    .min(1, "Vendor profile is empty")
    .max(MAX_PROFILE_CHARS, `Vendor profile is over ${MAX_PROFILE_CHARS} characters`),
});

// Past evaluations, most recent first.
export async function GET() {
  return Response.json(listEvaluations());
}

// Runs one evaluation, stores it, and returns the saved record.
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { rfqId, vendorProfile } = parsed.data;
  if (!getRfq(rfqId)) {
    return Response.json({ error: `Unknown RFQ: ${rfqId}` }, { status: 404 });
  }

  try {
    const evaluation = await evaluateVendor(rfqId, vendorProfile);
    return Response.json(evaluation, { status: 201 });
  } catch (err) {
    console.error("Evaluation failed:", err);
    return Response.json(
      { error: "The AI evaluation failed. Please try again." },
      { status: 502 },
    );
  }
}
