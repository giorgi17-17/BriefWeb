/**
 * Simplified Cost Reporting for Paid Tier Users
 * No rate limiting or free tier concerns - just accurate cost tracking
 */

import { getPaidTierCostSummary } from "./tokenUtils.js";

/**
 * Simple in-memory cost tracking for paid tier
 * Since you're paying per use, we just track costs without limits
 */
const dailyCosts = new Map();
const serviceCosts = {
  flashcard: { requests: 0, tokens: 0, cost: 0 },
  quiz: { requests: 0, tokens: 0, cost: 0 },
  brief: { requests: 0, tokens: 0, cost: 0 },
  evaluation: { requests: 0, tokens: 0, cost: 0 },
};

/**
 * Record a paid tier API usage
 * @param {Object} costTrackingData - Data from trackActualCostFromResponse
 */
export function recordPaidUsage(costTrackingData) {
  const today = new Date().toISOString().split("T")[0];
  const cost = costTrackingData.actualCost?.totalCost || 0;
  const tokens = costTrackingData.actualCost?.totalTokens || 0;
  const serviceType = costTrackingData.serviceType;

  // Update daily totals
  if (!dailyCosts.has(today)) {
    dailyCosts.set(today, { requests: 0, tokens: 0, cost: 0 });
  }

  const dayData = dailyCosts.get(today);
  dayData.requests += 1;
  dayData.tokens += tokens;
  dayData.cost += cost;

  // Update service totals
  if (serviceCosts[serviceType]) {
    serviceCosts[serviceType].requests += 1;
    serviceCosts[serviceType].tokens += tokens;
    serviceCosts[serviceType].cost += cost;
  }

  console.log(
    `💰 Paid usage recorded: ${serviceType} - ${tokens.toLocaleString()} tokens, $${cost.toFixed(
      6
    )}`
  );
}

/**
 * Get today's cost summary
 * @returns {Object} Cost summary for today
 */
export function getTodaysCostSummary() {
  const today = new Date().toISOString().split("T")[0];
  const todayData = dailyCosts.get(today) || {
    requests: 0,
    tokens: 0,
    cost: 0,
  };

  return {
    date: today,
    requests: todayData.requests,
    tokens: todayData.tokens,
    cost: todayData.cost,
    averageCostPerRequest:
      todayData.requests > 0 ? todayData.cost / todayData.requests : 0,
    averageTokensPerRequest:
      todayData.requests > 0 ? todayData.tokens / todayData.requests : 0,
    services: { ...serviceCosts },
  };
}

/**
 * Get cost breakdown by service
 * @returns {Object} Service-specific cost breakdown
 */
export function getServiceCostBreakdown() {
  const totalCost = Object.values(serviceCosts).reduce(
    (sum, service) => sum + service.cost,
    0
  );

  const breakdown = {};
  for (const [serviceName, data] of Object.entries(serviceCosts)) {
    breakdown[serviceName] = {
      ...data,
      percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
      averageCostPerRequest: data.requests > 0 ? data.cost / data.requests : 0,
    };
  }

  return {
    totalCost,
    services: breakdown,
    mostExpensive: Object.entries(breakdown).reduce(
      (max, [name, data]) => (data.cost > max.cost ? { name, ...data } : max),
      { name: "none", cost: 0 }
    ),
  };
}

/**
 * Generate a simple daily report
 * @returns {Object} Daily cost report
 */
export function generateDailyReport() {
  const summary = getTodaysCostSummary();
  const breakdown = getServiceCostBreakdown();

  console.log("\n📊 DAILY COST REPORT (PAID TIER)");
  console.log("=".repeat(50));
  console.log(`📅 Date: ${summary.date}`);
  console.log(`💰 Total cost today: $${summary.cost.toFixed(6)}`);
  console.log(`📞 Total requests: ${summary.requests}`);
  console.log(`🔤 Total tokens: ${summary.tokens.toLocaleString()}`);
  console.log(
    `💱 Avg cost per request: $${summary.averageCostPerRequest.toFixed(6)}`
  );
  console.log(
    `📈 Avg tokens per request: ${Math.round(summary.averageTokensPerRequest)}`
  );

  console.log("\n🏆 SERVICE BREAKDOWN:");
  for (const [service, data] of Object.entries(breakdown.services)) {
    if (data.requests > 0) {
      console.log(
        `   ${service}: ${data.requests} requests, $${data.cost.toFixed(
          6
        )} (${data.percentage.toFixed(1)}%)`
      );
    }
  }

  console.log(
    `\n🥇 Most expensive service: ${
      breakdown.mostExpensive.name
    } ($${breakdown.mostExpensive.cost.toFixed(6)})`
  );
  console.log("=".repeat(50));

  return { summary, breakdown };
}

/**
 * Clear old daily data (keep last 30 days)
 */
export function cleanupOldData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];

  for (const [date] of dailyCosts.entries()) {
    if (date < cutoffDate) {
      dailyCosts.delete(date);
    }
  }
}
