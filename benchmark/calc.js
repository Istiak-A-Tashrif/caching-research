// Define all scenarios to test
const val = [1.5, 1.7, 1.5, 1.7];

// ----------------------------------------

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values) {
  const avg = mean(values);
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

async function runCalc() {
  const res1 = mean(val);
  const res2 = stdDev(val);

  // Also log to console
  console.log("mean", res1);
  console.log("stdev", res2);
}

// Error handling for the main execution
runCalc.catch((error) => {
  console.error("❌ Fatal error running benchmarks:", error);
  process.exit(1);
});
