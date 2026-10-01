// Re-seeds the rfqs table from seed/. The app also seeds automatically on first run.
// Usage: npm run seed
import { getDb, seedRfqs } from "../lib/db";

const count = seedRfqs(getDb());
console.log(`Seeded ${count} RFQs into data/app.db`);
