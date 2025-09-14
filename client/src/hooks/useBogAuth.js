import { buildPlanOrderBodyDummy } from '../utils/buildPlanOrder'
import { useAuth } from "../utils/authHooks";
import { useMutation } from "@tanstack/react-query";
import { orderRequest } from "bogpay"
import { supabase } from "../utils/supabaseClient";


export function useStartBogCheckout(opts = {}) {
  const { user } = useAuth()

  return useMutation({
    mutationKey: ["bog", "startCheckout"],
    mutationFn: async (payload) => {
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
      return res.json();
    },

   onSuccess: async (data) => {
      try {
        const userObject = {
          username: user.user_metadata?.name,
          email: user.email,
          phone: user.phone || '',
          user_id: user.id
        };

        const body = buildPlanOrderBodyDummy({
          user: userObject,
          planCode: "premium",
          planName: "premium plan",
          price: 6.99,
          successUrl: "https://briefly.ge/payment/success",
          failUrl: "https://briefly.ge/payment/error"
        });

        const externalOrderId = body.external_order_id;
        if (!externalOrderId) throw new Error("buildPlanOrderBodyDummy did not set external_order_id");

        const { error: planErr } = await supabase
          .from("user_plans")
          .upsert(
            {
              user_id: user.id,                   
              external_order_id: externalOrderId, 
              plan_type: "free",
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

        window.open(link, "_blank", "noopener,noreferrer");
      } catch (e) {
        console.error("Checkout start failed:", e);
        alert("Could not start checkout. " + (e.message || e));
      }
    }
  });
}