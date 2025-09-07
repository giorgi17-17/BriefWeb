// pages/PaymentError.tsx
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PaymentResultHero } from "../../components/PaymentResultHero";

export default function PaymentError() {
    const { t } = useTranslation();
    const [sp] = useSearchParams();

    const orderId = sp.get("order_id") ?? undefined;
    const amount = sp.get("amount") ?? undefined;
    const currency = sp.get("currency") ?? undefined;
    const email = sp.get("email") ?? undefined;
    const retry = sp.get("retry_to") || "/checkout";

    return (
        <PaymentResultHero
            variant="error"
            title={t("payments.error.title")}
            message={t("payments.error.message")}
            details={{ orderId, amount, currency, email }}
            primaryTo={retry}
            primaryLabel={t("payments.error.primaryCta")}
            secondaryTo="/support"
            secondaryLabel={t("payments.error.secondaryCta")}
        />
    );
}
