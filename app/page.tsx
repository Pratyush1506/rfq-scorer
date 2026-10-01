import { connection } from "next/server";
import { listEvaluations, listRfqs } from "@/lib/db";
import Scorer from "./scorer";

export default async function Home() {
  // better-sqlite3 is synchronous, so without this the page would be
  // prerendered at build time with a frozen evaluation history.
  await connection();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">RFQ Vendor Scorer</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Score a vendor profile against a stored RFQ.
      </p>
      <Scorer rfqs={listRfqs()} initialEvaluations={listEvaluations()} />
    </main>
  );
}
