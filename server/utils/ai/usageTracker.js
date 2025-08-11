/**
 * Usage Tracking System for Gemini API
 * Monitors request counts and token usage to ensure free tier compliance
 */

import fs from "fs/promises";
import path from "path";
import { checkFreeTierLimits } from "./tokenUtils.js";

const USAGE_DATA_PATH = path.join(process.cwd(), "data", "ai-usage.json");

/**
 * Ensure the data directory exists
 */
async function ensureDataDirectory() {
  const dataDir = path.dirname(USAGE_DATA_PATH);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    console.warn("Could not create data directory:", error.message);
  }
}

/**
 * Load usage data from file
 * @returns {Object} Usage data or default structure
 */
async function loadUsageData() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(USAGE_DATA_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // Return default structure if file doesn't exist
    return {
      dailyUsage: {},
      hourlyUsage: {},
      totalRequests: 0,
      totalTokens: 0,
      services: {
        flashcard: { requests: 0, tokens: 0, totalCost: 0 },
        quiz: { requests: 0, tokens: 0, totalCost: 0 },
        brief: { requests: 0, tokens: 0, totalCost: 0 },
        evaluation: { requests: 0, tokens: 0, totalCost: 0 },
      },
      lastReset: new Date().toISOString(),
    };
  }
}

/**
 * Save usage data to file
 * @param {Object} data - Usage data to save
 */
async function saveUsageData(data) {
  try {
    await ensureDataDirectory();
    await fs.writeFile(USAGE_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving usage data:", error.message);
  }
}

/**
 * Get current date and hour keys for tracking
 * @returns {Object} Date and hour keys
 */
function getTimeKeys() {
  const now = new Date();
  const dateKey = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const hourKey = `${dateKey}-${now.getHours().toString().padStart(2, "0")}`; // YYYY-MM-DD-HH
  const minuteKey = `${hourKey}-${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`; // YYYY-MM-DD-HH-MM

  return { dateKey, hourKey, minuteKey };
}

/**
 * Record a new API usage event
 * @param {Object} costTrackingData - Data from trackActualCost function
 */
export async function recordApiUsage(costTrackingData) {
  try {
    const data = await loadUsageData();
    const { dateKey, hourKey, minuteKey } = getTimeKeys();

    // Initialize structures if needed
    if (!data.dailyUsage[dateKey]) {
      data.dailyUsage[dateKey] = { requests: 0, tokens: 0, cost: 0 };
    }
    if (!data.hourlyUsage[hourKey]) {
      data.hourlyUsage[hourKey] = { requests: 0, tokens: 0, cost: 0 };
    }

    // Update counters
    const tokens = costTrackingData.actualCost?.totalTokens || 0;
    const cost = costTrackingData.actualCost?.totalCost || 0;
    const serviceType = costTrackingData.serviceType;
    const isActualData = costTrackingData.isActualData || false;

    // Daily totals
    data.dailyUsage[dateKey].requests += 1;
    data.dailyUsage[dateKey].tokens += tokens;
    data.dailyUsage[dateKey].cost += cost;

    // Hourly totals
    data.hourlyUsage[hourKey].requests += 1;
    data.hourlyUsage[hourKey].tokens += tokens;
    data.hourlyUsage[hourKey].cost += cost;

    // Service-specific totals
    if (data.services[serviceType]) {
      data.services[serviceType].requests += 1;
      data.services[serviceType].tokens += tokens;
      data.services[serviceType].totalCost += cost;
    }

    // Global totals
    data.totalRequests += 1;
    data.totalTokens += tokens;

    // Clean up old data (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];

    // Clean daily usage
    for (const date in data.dailyUsage) {
      if (date < cutoffDate) {
        delete data.dailyUsage[date];
      }
    }

    // Clean hourly usage (keep last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffHour =
      sevenDaysAgo.toISOString().split("T")[0] +
      "-" +
      sevenDaysAgo.getHours().toString().padStart(2, "0");

    for (const hour in data.hourlyUsage) {
      if (hour < cutoffHour) {
        delete data.hourlyUsage[hour];
      }
    }

    await saveUsageData(data);

    console.log(
      `📊 Usage recorded: ${serviceType} - ${tokens.toLocaleString()} tokens, $${cost.toFixed(
        6
      )} (${isActualData ? "✅ REAL DATA" : "⚠️ ESTIMATED"})`
    );
  } catch (error) {
    console.error("Error recording API usage:", error.message);
  }
}

/**
 * Get current usage statistics for rate limiting checks
 * @returns {Object} Current usage statistics
 */
export async function getCurrentUsageStats() {
  try {
    const data = await loadUsageData();
    const { dateKey, hourKey, minuteKey } = getTimeKeys();

    // Get today's usage
    const todayUsage = data.dailyUsage[dateKey] || {
      requests: 0,
      tokens: 0,
      cost: 0,
    };

    // Get current hour's usage
    const currentHourUsage = data.hourlyUsage[hourKey] || {
      requests: 0,
      tokens: 0,
      cost: 0,
    };

    // Calculate last minute usage (approximate from current hour)
    const now = new Date();
    const currentMinute = now.getMinutes();
    const estimatedMinuteUsage = Math.ceil(currentHourUsage.requests / 60); // Rough estimate
    const estimatedMinuteTokens = Math.ceil(currentHourUsage.tokens / 60);

    return {
      requestsToday: todayUsage.requests,
      tokensToday: todayUsage.tokens,
      costToday: todayUsage.cost,
      requestsThisHour: currentHourUsage.requests,
      tokensThisHour: currentHourUsage.tokens,
      requestsLastMinute: estimatedMinuteUsage,
      tokensLastMinute: estimatedMinuteTokens,
      services: data.services,
      totalLifetime: {
        requests: data.totalRequests,
        tokens: data.totalTokens,
      },
    };
  } catch (error) {
    console.error("Error getting usage stats:", error.message);
    return {
      requestsToday: 0,
      tokensToday: 0,
      costToday: 0,
      requestsThisHour: 0,
      tokensThisHour: 0,
      requestsLastMinute: 0,
      tokensLastMinute: 0,
      services: {},
      totalLifetime: { requests: 0, tokens: 0 },
    };
  }
}

/**
 * Check if a new request can be made within free tier limits
 * @returns {Object} Rate limit status
 */
export async function checkRateLimits() {
  const usageStats = await getCurrentUsageStats();
  const limits = checkFreeTierLimits(usageStats);

  console.log("\n🚦 RATE LIMIT CHECK:");
  console.log(
    `   • Daily requests: ${usageStats.requestsToday}/${15000} (${
      limits.dailyRequestsRemaining
    } remaining)`
  );
  console.log(
    `   • Minute requests: ${usageStats.requestsLastMinute}/${15} (${
      limits.minuteRequestsRemaining
    } remaining)`
  );
  console.log(
    `   • Minute tokens: ${usageStats.tokensLastMinute.toLocaleString()}/${(1000000).toLocaleString()} (${limits.tokensRemainingThisMinute.toLocaleString()} remaining)`
  );
  console.log(
    `   • Within limits: ${limits.isWithinLimits ? "✅ YES" : "❌ NO"}`
  );

  return limits;
}

/**
 * Generate a comprehensive usage report
 * @returns {Object} Detailed usage report
 */
export async function generateUsageReport() {
  const usageStats = await getCurrentUsageStats();
  const limits = checkFreeTierLimits(usageStats);

  const report = {
    timestamp: new Date().toISOString(),
    currentUsage: usageStats,
    freeTierStatus: limits,
    summary: {
      totalRequestsToday: usageStats.requestsToday,
      totalCostToday: usageStats.costToday,
      mostUsedService: Object.keys(usageStats.services).reduce(
        (a, b) =>
          usageStats.services[a]?.requests > usageStats.services[b]?.requests
            ? a
            : b,
        "flashcard"
      ),
      projectedDailyCost:
        usageStats.costToday > 0
          ? (usageStats.costToday / (new Date().getHours() + 1)) * 24
          : 0,
    },
  };

  console.log("\n📈 USAGE REPORT:");
  console.log(`   • Today's requests: ${report.summary.totalRequestsToday}`);
  console.log(
    `   • Today's cost: $${report.summary.totalCostToday.toFixed(6)}`
  );
  console.log(`   • Most used service: ${report.summary.mostUsedService}`);
  console.log(
    `   • Projected daily cost: $${report.summary.projectedDailyCost.toFixed(
      6
    )}`
  );

  return report;
}
