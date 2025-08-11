#!/usr/bin/env node

/**
 * Quick Cost Checker for Paid Tier Users
 * Run this anytime to see your current AI spending
 */

import {
  quickCostCheck,
  generateDailyReport,
  showServiceEfficiency,
} from "./costReportGenerator.js";

console.log("💰 GEMINI API COST CHECKER (PAID TIER)\n");

// Show quick summary
console.log("📊 QUICK SUMMARY:");
console.log("-".repeat(30));
const summary = quickCostCheck();

if (summary.cost > 0) {
  console.log("\n📋 DETAILED REPORT:");
  console.log("-".repeat(30));
  generateDailyReport();

  console.log("\n🎯 EFFICIENCY ANALYSIS:");
  console.log("-".repeat(30));
  showServiceEfficiency();

  // Cost projections
  const monthlyCost = summary.cost * 30;
  const yearlyCost = summary.cost * 365;

  console.log("\n📈 COST PROJECTIONS:");
  console.log("-".repeat(30));
  console.log(`📅 If today's usage continues:`);
  console.log(`   • Monthly: $${monthlyCost.toFixed(2)}`);
  console.log(`   • Yearly: $${yearlyCost.toFixed(2)}`);

  if (summary.cost > 1) {
    console.log("\n⚠️  High usage detected! Consider optimizing prompts.");
  } else if (summary.cost > 0.1) {
    console.log("\n💡 Moderate usage. Monitor for optimization opportunities.");
  } else {
    console.log("\n✅ Low cost usage. Current efficiency looks good!");
  }
} else {
  console.log("\n💡 No API usage recorded today.");
  console.log("   Start using your AI services to see cost tracking!");
}

console.log("\n" + "=".repeat(50));
console.log("💰 Tracking powered by accurate Gemini API token counts");
console.log("=".repeat(50));
