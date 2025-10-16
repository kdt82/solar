import { prisma } from "../src/lib/prisma";

async function fixSnapshotUnits() {
  console.log("Checking for snapshots with incorrect units (values > 100 kW)...");
  
  // Find snapshots where generation is suspiciously high (> 100 kW means it's likely in watts, not kW)
  const badSnapshots = await prisma.snapshot.findMany({
    where: {
      OR: [
        { generation: { gt: 100 } },
        { consumption: { gt: 100 } },
        { grid: { gt: 100 } },
        { grid: { lt: -100 } },
      ],
    },
    select: {
      id: true,
      generation: true,
      consumption: true,
      grid: true,
      timestamp: true,
    },
  });

  console.log(`Found ${badSnapshots.length} snapshots with incorrect units`);

  if (badSnapshots.length === 0) {
    console.log("✅ No data issues found!");
    return;
  }

  console.log("Sample of bad data:");
  badSnapshots.slice(0, 5).forEach(s => {
    console.log(`  ${s.timestamp.toISOString()}: gen=${s.generation} kW, cons=${s.consumption} kW, grid=${s.grid} kW`);
  });

  const shouldFix = process.argv.includes("--fix");

  if (!shouldFix) {
    console.log("\n⚠️  To delete these incorrect snapshots, run:");
    console.log("npm run fix-units -- --fix");
    return;
  }

  console.log("\n🗑️  Deleting incorrect snapshots...");
  
  const result = await prisma.snapshot.deleteMany({
    where: {
      OR: [
        { generation: { gt: 100 } },
        { consumption: { gt: 100 } },
        { grid: { gt: 100 } },
        { grid: { lt: -100 } },
      ],
    },
  });

  console.log(`✅ Deleted ${result.count} snapshots`);
  console.log("New snapshots will be recorded with correct units (kW)");
}

fixSnapshotUnits()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
