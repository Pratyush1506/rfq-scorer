import { listRfqs } from "@/lib/db";

// RFQ ids and titles for the dropdown.
export async function GET() {
  return Response.json(listRfqs());
}
