/**
 * Cost Reporting and Analytics Utilities
 * Provides insights into AI usage patterns and costs
 */

import { getCurrentUsageStats, generateUsageReport } from "./usageTracker.js";
import { checkFreeTierLimits } from "./tokenUtils.js";

/**
 * Generate a detailed cost analysis report
 * @param {string} period - Time period for analysis ('today', 'week', 'month')
 * @returns {Promise<Object>} Comprehensive cost analysis
 */
export async function generateCostAnalysis(period = "today") {
  try {
    const usageStats = await getCurrentUsageStats();
    const usageReport = await generateUsageReport();
    const freeTierStatus = checkFreeTierLimits(usageStats);

    const analysis = {
      period,
      timestamp: new Date().toISOString(),
      overview: {
        totalRequests: usageStats.requestsToday,
        totalTokens: usageStats.tokensToday,
        totalCost: usageStats.costToday,
        averageTokensPerRequest:
          usageStats.requestsToday > 0
            ? Math.round(usageStats.tokensToday / usageStats.requestsToday)
            : 0,
      },
      services: {
        breakdown: usageStats.services,
        mostExpensive: getMostExpensiveService(usageStats.services),
        mostUsed: getMostUsedService(usageStats.services),
        efficiency: calculateServiceEfficiency(usageStats.services),
      },
      costs: {
        current: usageStats.costToday,
        projected: {
          daily: usageReport.summary.projectedDailyCost,
          weekly: usageReport.summary.projectedDailyCost * 7,
          monthly: usageReport.summary.projectedDailyCost * 30,
        },
        tier: freeTierStatus.isWithinLimits ? "free" : "approaching_limits",
      },
      freeTierStatus: {
        isWithinLimits: freeTierStatus.isWithinLimits,
        dailyUsage: `${usageStats.requestsToday}/1500 requests`,
        minuteUsage: `${usageStats.requestsLastMinute}/15 requests`,
        tokenUsage: `${usageStats.tokensLastMinute.toLocaleString()}/1,000,000 tokens`,
        remainingToday: freeTierStatus.dailyRequestsRemaining,
        nextReset: freeTierStatus.nextResetTimes.dailyReset,
      },
      recommendations: generateOptimizationRecommendations(
        usageStats,
        freeTierStatus
      ),
    };

    return analysis;
  } catch (error) {
    console.error("Error generating cost analysis:", error);
    throw new Error("Failed to generate cost analysis");
  }
}

/**
 * Find the most expensive service by total cost
 * @param {Object} services - Services usage data
 * @returns {Object} Most expensive service info
 */
function getMostExpensiveService(services) {
  let maxCost = 0;
  let mostExpensive = null;

  for (const [serviceName, data] of Object.entries(services)) {
    if (data.totalCost > maxCost) {
      maxCost = data.totalCost;
      mostExpensive = {
        name: serviceName,
        cost: data.totalCost,
        requests: data.requests,
        tokens: data.tokens,
      };
    }
  }

  return mostExpensive || { name: "none", cost: 0, requests: 0, tokens: 0 };
}

/**
 * Find the most used service by request count
 * @param {Object} services - Services usage data
 * @returns {Object} Most used service info
 */
function getMostUsedService(services) {
  let maxRequests = 0;
  let mostUsed = null;

  for (const [serviceName, data] of Object.entries(services)) {
    if (data.requests > maxRequests) {
      maxRequests = data.requests;
      mostUsed = {
        name: serviceName,
        requests: data.requests,
        tokens: data.tokens,
        cost: data.totalCost,
      };
    }
  }

  return mostUsed || { name: "none", requests: 0, tokens: 0, cost: 0 };
}

/**
 * Calculate efficiency metrics for each service
 * @param {Object} services - Services usage data
 * @returns {Object} Efficiency metrics per service
 */
function calculateServiceEfficiency(services) {
  const efficiency = {};

  for (const [serviceName, data] of Object.entries(services)) {
    if (data.requests > 0) {
      efficiency[serviceName] = {
        tokensPerRequest: Math.round(data.tokens / data.requests),
        costPerRequest: data.totalCost / data.requests,
        costPerToken: data.tokens > 0 ? data.totalCost / data.tokens : 0,
      };
    } else {
      efficiency[serviceName] = {
        tokensPerRequest: 0,
        costPerRequest: 0,
        costPerToken: 0,
      };
    }
  }

  return efficiency;
}

/**
 * Generate optimization recommendations based on usage patterns
 * @param {Object} usageStats - Current usage statistics
 * @param {Object} freeTierStatus - Free tier status
 * @returns {Array} Array of recommendation objects
 */
function generateOptimizationRecommendations(usageStats, freeTierStatus) {
  const recommendations = [];

  // Check if approaching free tier limits
  if (!freeTierStatus.isWithinLimits) {
    recommendations.push({
      type: "rate_limit",
      priority: "high",
      title: "Rate Limit Warning",
      description: "You are approaching or have exceeded free tier limits",
      action: "Consider implementing request queuing or upgrading to paid tier",
    });
  }

  // Check for high token usage per request
  const avgTokensPerRequest =
    usageStats.requestsToday > 0
      ? usageStats.tokensToday / usageStats.requestsToday
      : 0;

  if (avgTokensPerRequest > 5000) {
    recommendations.push({
      type: "optimization",
      priority: "medium",
      title: "High Token Usage",
      description: `Average ${Math.round(
        avgTokensPerRequest
      )} tokens per request`,
      action:
        "Consider optimizing prompts or splitting large content into smaller chunks",
    });
  }

  // Check for imbalanced service usage
  const totalRequests = Object.values(usageStats.services).reduce(
    (sum, service) => sum + service.requests,
    0
  );

  for (const [serviceName, data] of Object.entries(usageStats.services)) {
    const servicePercentage =
      totalRequests > 0 ? (data.requests / totalRequests) * 100 : 0;

    if (servicePercentage > 70) {
      recommendations.push({
        type: "balance",
        priority: "low",
        title: "Service Usage Imbalance",
        description: `${serviceName} accounts for ${servicePercentage.toFixed(
          1
        )}% of requests`,
        action:
          "Consider if other services could provide better value for some use cases",
      });
    }
  }

  // If no recommendations, add a positive note
  if (recommendations.length === 0) {
    recommendations.push({
      type: "success",
      priority: "info",
      title: "Optimal Usage",
      description: "Your AI usage appears well-optimized",
      action: "Continue monitoring usage patterns for any changes",
    });
  }

  return recommendations;
}

/**
 * Generate a simple summary for dashboard display
 * @returns {Promise<Object>} Simple usage summary
 */
export async function getUsageSummary() {
  try {
    const usageStats = await getCurrentUsageStats();
    const freeTierStatus = checkFreeTierLimits(usageStats);

    return {
      requests: {
        today: usageStats.requestsToday,
        remaining: freeTierStatus.dailyRequestsRemaining,
        percentage: (usageStats.requestsToday / 1500) * 100,
      },
      tokens: {
        today: usageStats.tokensToday,
        lastMinute: usageStats.tokensLastMinute,
        percentage: (usageStats.tokensLastMinute / 1000000) * 100,
      },
      cost: {
        today: usageStats.costToday,
        lifetime: Object.values(usageStats.services).reduce(
          (sum, service) => sum + service.totalCost,
          0
        ),
      },
      status: freeTierStatus.isWithinLimits ? "good" : "warning",
    };
  } catch (error) {
    console.error("Error getting usage summary:", error);
    return {
      requests: { today: 0, remaining: 1500, percentage: 0 },
      tokens: { today: 0, lastMinute: 0, percentage: 0 },
      cost: { today: 0, lifetime: 0 },
      status: "unknown",
    };
  }
}
