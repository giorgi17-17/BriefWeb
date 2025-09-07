// pages/PaymentSuccess.tsx
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PaymentResultHero } from "../../components/PaymentResultHero";

export default function PaymentSuccess() {
    const { t } = useTranslation();
    const [sp] = useSearchParams();

    const orderId = sp.get("order_id") ?? undefined;
    const amount = sp.get("amount") ?? undefined;
    const currency = sp.get("currency") ?? undefined;
    const email = sp.get("email") ?? undefined;

    return (
        <PaymentResultHero
            variant="success"
            title={t("payments.success.title")}
            message={t("payments.success.message")}
            details={{ orderId, amount, currency, email }}
            primaryTo="/dashboard"
            primaryLabel={t("payments.success.primaryCta")}
            secondaryTo="/orders"
        />
    );
}
