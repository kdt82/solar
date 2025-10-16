import { prisma } from "../src/lib/prisma";

async function clearHistoricalData() {
  console.log("🗑️  Clearing all historical snapshot data...");
  
  const result = await prisma.snapshot.deleteMany({});
  
  console.log(`✅ Deleted ${result.count} snapshots`);
  console.log("Fresh data will be collected starting now.");
}

clearHistoricalData()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
