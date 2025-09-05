import { buildPlanOrderBodyDummy } from '../utils/buildPlanOrder'
import { useAuth } from "../utils/authHooks";
import { useMutation } from "@tanstack/react-query";
import { orderRequest } from "bogpay"
import { supabase } from "../utils/supabaseClient";
  
/**
 * React hook to start BOG checkout.
 * Calls your REST endpoint: POST `${apiBase}/payments/order`
 * and (optionally) opens the bank redirect URL in a new tab.
 *
 * Options:
 * - apiBase: server base path (default '/api')
 * - lang: Accept-Language header (default 'ka')
 * - autoOpen: open redirect automatically (default true)
 * - onSaveOrderId: async (orderId) => void (optional persistence)
 *
 * Returns: { start, loading, error, data, reset, abort }
 */



export function useStartBogCheckout(opts = {}) {
  const { user } = useAuth()

  return useMutation({
    mutationKey: ["bog", "startCheckout"],
    // 🔹 Inline logic: no separate startBogCheckout function
    mutationFn: async (payload) => {

      // If your backend expects Supabase bearer; remove if not needed
      // let authHeader = {};
      // try {
      //   const { data } = await supabase.auth.getSession();
      //   const token = data?.session?.access_token;
      //   if (token) authHeader = { Authorization: `Bearer ${token}` };
      // } catch (_) {}

      const res = await fetch("https://briefweb.onrender.com/api/user-plans/payments/order", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });


      if (!res.ok) {

        const text = await res.text().catch(() => "");
        throw new Error(text || `BOG checkout failed (${res.status})`);
      }
      return res.json(); // expect { orderId, iframeUrl?, redirectUrl? }
    },

   onSuccess: async (data) => {
      try {
        // 0) Build order body (must include a unique external_order_id)
        const userObject = {
          username: user.user_metadata?.name,
          email: user.email,
          phone: "557434206",
          user_id: user.id
        };

        const body = buildPlanOrderBodyDummy({
          user: userObject,
          planCode: "premium",
          planName: "premium plan",
          price: 0.10,
        });

        const externalOrderId = body.external_order_id;
        if (!externalOrderId) throw new Error("buildPlanOrderBodyDummy did not set external_order_id");

        // 1) Pre-create / upsert user plan as "initiated" (idempotent by external_order_id)
        const { error: planErr } = await supabase
          .from("user_plans")
          .upsert(
            {
              user_id: user.id,                   
              external_order_id: externalOrderId, 
              plan_type: "premium",
              active: false,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",             
              ignoreDuplicates: false,
              defaultToNull: false,
            }
          )
          .select()
          .maybeSingle();

        if (planErr) {
          console.error("user_plans upsert error:", planErr);
          throw planErr;
        }

        // 3) Create the bank order and redirect
        const requestCredentials = {
          headers: {
            Authorization: `Bearer ${data.token}`,
            "Content-Type": "application/json",
            "Accept-Language": "ka",
          },
          body,
        };

        const responseOrder = await orderRequest(requestCredentials);
        const link = responseOrder?._links?.redirect?.href;
        if (!link) throw new Error("Bank order response missing redirect link");

        // Open in a new tab/window
        window.open(link, "_blank", "noopener,noreferrer");
      } catch (e) {
        console.error("Checkout start failed:", e);
        alert("Could not start checkout. " + (e.message || e));
      }
    }
  });
}