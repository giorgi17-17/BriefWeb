// jobs/cron.js
import cron from "node-cron";
import { supabaseClient } from "../config/supabaseClient.js";

function oneMonthAgoISO(from = new Date()) {
  const d = new Date(from);
  const targetDay = d.getDate();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

export async function getExpiredPlans(supabaseClient) {
  const cutoffISO = oneMonthAgoISO();

  const { data, error } = await supabaseClient
    .from("user_plans")
    .select("id,user_id,plan_type,active,created_at")
    .lte("created_at", cutoffISO)
    .in("active", [true]).in('plan_type', ['premium'])
    .order("created_at", { ascending: true })

  if (error) throw error;
  return data;
}

async function updateUsersToFreePlan(supabaseClient, userIds) {
  const { data, error } = await supabaseClient
    .from("user_plans")
    .update({ 
      plan_type: "free",
      active: true,
      updated_at: new Date().toISOString()
    })
    .in("user_id", userIds)
    .select();

  if (error) throw error;
  return data;
}


const paymentChecker = async () => {
  try {
    const expiredPlans = await getExpiredPlans(supabaseClient);
    
    if (expiredPlans.length === 0) {
      console.log('No expired plans found');
      return;
    }

    console.log(`Found ${expiredPlans.length} expired plans`);
    
    // Extract user IDs from expired plans
    const userIds = expiredPlans.map(plan => plan.user_id);
    
    // Update all expired users to free plan
    const updatedPlans = await updateUsersToFreePlan(supabaseClient, userIds);
    
    console.log(`Successfully updated ${updatedPlans.length} users to free plan:`, userIds);
    
  } catch (error) {
    console.error('Error checking expired plans:', error);
  }
}

// ✅ Correct syntax: runs every 10 minutes
cron.schedule('0 0 * * *', paymentChecker);

console.log('Cron job scheduled: checking expired plans every 10 minutes');