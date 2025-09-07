// components/PaymentResultHero.tsx
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as React from "react";

export function PaymentResultHero({
    variant,
    title,
    subtitle,
    message,
    details,
    primaryTo,
    secondaryTo,
    primaryLabel,
    secondaryLabel,
    onPrimaryClick,
    onSecondaryClick,
}) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const isSuccess = variant === "success";
    const Icon = isSuccess ? CheckCircle2 : XCircle;

    const copyOrderId = async () => {
        if (!details?.orderId) return;
        try {
            await navigator.clipboard.writeText(details.orderId);
        } catch { }
    };

    return (
        <section
            className={`min-h-[calc(100svh-4rem)] flex items-stretch -mt-8 -mb-8 }`}
            itemScope
            itemType="https://schema.org/PayAction"
        >
            <meta
                itemProp="actionStatus"
                content={isSuccess ? "https://schema.org/CompletedActionStatus" : "https://schema.org/FailedActionStatus"}
            />
            <div className="w-full">
                <div className="relative isolate overflow-hidden rounded-none sm:rounded-3xl bg-gradient-to-br from-white/70 to-white/10 dark:from-transparent dark:to-transparent px-4 sm:px-8 md:px-12 min-h-full flex items-center">
                    {/* glows (green/blue for success, red/blue for error) */}
                    {isSuccess ? (
                        <>
                            <div className="pointer-events-none absolute -top-40 right-[-5%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.6),transparent_70%)] blur-[120px] dark:opacity-80" />
                            <div className="pointer-events-none absolute -bottom-40 left-[-5%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.55),transparent_72%)] blur-[120px] dark:opacity-80" />
                        </>
                    ) : (
                        <>
                            <div className="pointer-events-none absolute -top-40 right-[-5%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.55),transparent_70%)] blur-[120px] dark:opacity-80" />
                            <div className="pointer-events-none absolute -bottom-40 left-[-5%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.45),transparent_72%)] blur-[120px] dark:opacity-80" />
                        </>
                    )}

                    {/* neutral edges (same as hero) */}
                    <div
                        className="pointer-events-none absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-3xl blur-[100px]"
                        style={{ background: "linear-gradient(135deg, var(--background) 0%, rgba(0,0,0,0) 65%)" }}
                    />
                    <div
                        className="pointer-events-none absolute -bottom-40 -right-40 h-[38rem] w-[38rem] rounded-3xl blur-[100px]"
                        style={{ background: "linear-gradient(315deg, var(--background) 0%, rgba(0,0,0,0) 68%)" }}
                    />

                    <header className="relative text-center max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center space-y-10 md:space-y-16">
                        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-sm ring-1 ring-black/5 dark:ring-white/10 ${isSuccess ? "text-emerald-900 bg-emerald-100/70 dark:text-emerald-50 dark:bg-emerald-500/10" : "text-red-900 bg-red-100/80 dark:text-red-50 dark:bg-red-500/10"}`}>
                            <Icon className="size-4" />
                            <span itemProp="name text-white">{isSuccess ? t("payments.result.tag.success") : t("payments.result.tag.error")}</span>
                        </div>

                        <h1 className={`text-4xl text-white sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight }`}>
                            {title}
                        </h1>

                        {subtitle && (
                            <p className={`text-base text-white sm:text-lg md:text-xl max-w-2xl mx-auto`}>
                                {subtitle}
                            </p>
                        )}

                        {message && (
                            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                                {message}
                            </p>
                        )}

                        {/* Details card */}
                        {(details?.orderId || details?.amount || details?.email) && (
                            <div className="w-full max-w-xl rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur p-4 sm:p-6 text-left">
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {details.orderId && (
                                        <div>
                                            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                {t("payments.result.fields.orderId")}
                                            </dt>
                                            <dd className="mt-1 font-mono text-sm flex items-center gap-2">
                                                <span className="truncate">{details.orderId}</span>
                                                <button
                                                    type="button"
                                                    onClick={copyOrderId}
                                                    title={t("payments.result.actions.copy")}
                                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </dd>
                                        </div>
                                    )}
                                    {details.amount && (
                                        <div>
                                            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                {t("payments.result.fields.amount")}
                                            </dt>
                                            <dd className="mt-1 text-sm font-semibold">
                                                {details.amount}
                                                {details.currency ? ` ${details.currency}` : ""}
                                            </dd>
                                        </div>
                                    )}
                                    {details.email && (
                                        <div className="sm:col-span-2">
                                            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                {t("payments.result.fields.email")}
                                            </dt>
                                            <dd className="mt-1 text-sm">{details.email}</dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        )}

                        {/* CTAs */}
                        <div
                            className="flex flex-wrap justify-center gap-4 md:gap-6"
                            itemProp="potentialAction"
                            itemScope
                            itemType="https://schema.org/StartAction"
                        >
                            {primaryTo ? (
                                <Link
                                    to={primaryTo}
                                    onClick={onPrimaryClick}
                                    className={`group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm md:text-base font-medium shadow-sm transition-colors ${isSuccess
                                        ? "bg-blue-700 text-white hover:bg-blue-800"
                                        : "bg-red-600 text-white hover:bg-red-700"
                                        }`}
                                >
                                    {primaryLabel}
                                    <ArrowRight className="size-4 md:size-5 opacity-90 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                            ) : (
                                <button
                                    onClick={onPrimaryClick ?? (() => navigate("/"))}
                                    className={`group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm md:text-base font-medium shadow-sm transition-colors ${isSuccess
                                        ? "bg-blue-700 text-white hover:bg-blue-800"
                                        : "bg-red-600 text-white hover:bg-red-700"
                                        }`}
                                >
                                    {primaryLabel}
                                    <ArrowRight className="size-4 md:size-5 opacity-90 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            )}

                            {secondaryLabel &&
                                (secondaryTo ? (
                                    <Link
                                        to={secondaryTo}
                                        onClick={onSecondaryClick}
                                        className="inline-flex items-center text-white gap-2 rounded-full bg-transparent px-6 py-3 text-sm md:text-base font-medium border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
                                    >
                                        {secondaryLabel}
                                    </Link>
                                ) : (
                                    <button
                                        onClick={onSecondaryClick}
                                        className="inline-flex items-center gap-2 rounded-full bg-transparent px-6 py-3 text-sm md:text-base font-medium border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
                                    >
                                        {secondaryLabel}
                                    </button>
                                ))}
                        </div>
                    </header>
                </div>
            </div>
        </section>
    );
}
