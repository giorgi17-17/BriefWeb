/**
 * Cost Report Generator for Paid Tier Users
 * Simple utilities to check your AI spending
 */

import {
  getTodaysCostSummary,
  getServiceCostBreakdown,
  generateDailyReport,
} from "./paidTierReporting.js";

/**
 * Generate a comprehensive cost report
 * @returns {Promise<Object>} Cost report
 */
export async function generateCostReport() {
  console.log("🔍 Generating paid tier cost report...\n");

  try {
    const dailyReport = generateDailyReport();

    return {
      success: true,
      report: dailyReport,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating cost report:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Quick cost check - just show today's total
 * @returns {Object} Quick cost summary
 */
export function quickCostCheck() {
  const summary = getTodaysCostSummary();

  console.log(`💰 Today's total cost: $${summary.cost.toFixed(6)}`);
  console.log(`📞 Requests made: ${summary.requests}`);
  console.log(`🔤 Tokens used: ${summary.tokens.toLocaleString()}`);

  if (summary.cost > 0) {
    console.log(
      `💱 Average cost per request: $${summary.averageCostPerRequest.toFixed(
        6
      )}`
    );
  }

  return summary;
}

/**
 * Show service efficiency - which services are most/least cost effective
 * @returns {Object} Service efficiency data
 */
export function showServiceEfficiency() {
  const breakdown = getServiceCostBreakdown();

  console.log("\n🎯 SERVICE EFFICIENCY ANALYSIS:");
  console.log("=".repeat(40));

  const services = Object.entries(breakdown.services)
    .filter(([_, data]) => data.requests > 0)
    .sort((a, b) => b[1].averageCostPerRequest - a[1].averageCostPerRequest);

  if (services.length === 0) {
    console.log("No services used today.");
    return breakdown;
  }

  services.forEach(([name, data], index) => {
    const emoji =
      index === 0 ? "🔴" : index === services.length - 1 ? "🟢" : "🟡";
    console.log(
      `${emoji} ${name}: $${data.averageCostPerRequest.toFixed(6)}/request (${
        data.requests
      } requests)`
    );
  });

  console.log(`\n💡 Most efficient: ${services[services.length - 1][0]}`);
  console.log(`💸 Most expensive: ${services[0][0]}`);
  console.log("=".repeat(40));

  return breakdown;
}

/**
 * Export cost data for external analysis
 * @returns {Object} Exportable cost data
 */
export function exportCostData() {
  const summary = getTodaysCostSummary();
  const breakdown = getServiceCostBreakdown();

  const exportData = {
    date: summary.date,
    totalCost: summary.cost,
    totalRequests: summary.requests,
    totalTokens: summary.tokens,
    services: breakdown.services,
    exportedAt: new Date().toISOString(),
  };

  console.log("📊 Cost data ready for export:");
  console.log(JSON.stringify(exportData, null, 2));

  return exportData;
}

// CLI usage examples
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case "quick":
      quickCostCheck();
      break;
    case "report":
      generateCostReport();
      break;
    case "efficiency":
      showServiceEfficiency();
      break;
    case "export":
      exportCostData();
      break;
    default:
      console.log("Usage:");
      console.log(
        "  node costReportGenerator.js quick      - Quick cost check"
      );
      console.log(
        "  node costReportGenerator.js report     - Full daily report"
      );
      console.log(
        "  node costReportGenerator.js efficiency - Service efficiency"
      );
      console.log(
        "  node costReportGenerator.js export     - Export cost data"
      );
  }
}
