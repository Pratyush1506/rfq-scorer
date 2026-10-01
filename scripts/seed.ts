// Re-seeds the rfqs table from seed/. The app also seeds automatically on first run.
// Usage: npm run seed
import { db, seedRfqs } from "../lib/db";

const count = seedRfqs(db);
console.log(`Seeded ${count} RFQs into data/app.db`);
