import { useState } from "react";
import {
    PANEL_CONTENT, TRIAL_BANNER, TRIAL_BANNER_URGENT, TRIAL_BANNER_ICON, TRIAL_BANNER_TEXT,
    UPGRADE_PENDING_BANNER, PENDING_BANNER_ICON, PENDING_BANNER_BODY, PENDING_BANNER_TITLE, PENDING_BANNER_SUB,
    SUB_USAGE_CARD, SUB_USAGE_TITLE, SUB_USAGE_GRID, SUB_USAGE_ITEM, SUB_USAGE_LABEL, SUB_USAGE_VALUE,
    SUB_UPGRADE_HINT, USAGE_BAR, USAGE_BAR_FILL, USAGE_BAR_WARN,
    PLAN_TIER_GRID, PLAN_TIER_CARD, PLAN_TIER_CARD_CURRENT, PLAN_TIER_CARD_POPULAR,
    PLAN_TIER_CURRENT_BADGE, PLAN_TIER_POPULAR_BADGE, PLAN_TIER_NAME, PLAN_TIER_PRICE, PLAN_TIER_PRICE_SUB,
    PLAN_TIER_DIVIDER, PLAN_TIER_LIMITS, PLAN_TIER_FEATURE_LIST, PLAN_TIER_FEATURE_ITEM,
    PLAN_TIER_BTN, PLAN_TIER_BTN_GHOST, UPGRADE_SUCCESS_BANNER, UPGRADE_SUCCESS_TITLE,
    UPGRADE_MODAL_TITLE, UPGRADE_MODAL_SUB, BANK_CARD, BANK_CARD_TITLE, BANK_ROW, BANK_LABEL, BANK_VALUE,
    UPGRADE_FORM_SECTION, UPGRADE_FORM_LABEL, UPGRADE_FORM_INPUT, UPGRADE_FORM_TEXTAREA,
} from "../ownerStyles";
import { Modal, Button } from "../../../components/ui";
import { Usage, fmtBytes } from "../types";
import { usePlanConfig, useOrgUpgradeStatus, useSubmitUpgradeRequest } from "../../../hooks/useSubscription";

function fmtPKR(n: number): string {
    return `PKR ${n.toLocaleString("en-PK")}`;
}

const TIER_ORDER = ["trial", "starter", "pro", "enterprise"] as const;

const TIER_LABELS: Record<string, string> = {
    trial:      "Trial",
    starter:    "Starter",
    pro:        "Pro",
    enterprise: "Enterprise",
};

export const SubscriptionPanel = ({
    plan, usage, maxDocs, maxUsers, teamCount,
}: {
    plan:      string;
    usage:     Usage;
    maxDocs:   number;
    maxUsers:  number;
    teamCount: number;
}) => {
    const { data: config } = usePlanConfig();
    const { data: orgStatus } = useOrgUpgradeStatus();
    const submitUpgradeMutation = useSubmitUpgradeRequest();

    const trialEndsAt = orgStatus?.trial_ends_at ?? null;
    const pendingPlan = orgStatus?.requested_plan ?? null;
    const pendingAt   = orgStatus?.upgrade_requested_at ?? null;

    const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);
    const [payRef,        setPayRef]        = useState("");
    const [notes,         setNotes]         = useState("");
    const [submitDone,    setSubmitDone]    = useState(false);
    const [submitErr,     setSubmitErr]     = useState("");

    // Trial countdown
    const trialDaysLeft = (() => {
        if (!trialEndsAt) return null;
        const diff = new Date(trialEndsAt).getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / 86_400_000));
    })();

    // Usage calculations
    const unlimited = maxDocs >= 9_999_999;
    const maxStorageBytes = config?.plans[plan]?.max_bytes ?? 0;
    const unlimitedStorage = maxStorageBytes >= 25_000_000_000 * 0.99;

    const docPct  = unlimited ? 0 : Math.min(100, Math.round((usage.total_docs  / maxDocs)   * 100));
    const userPct = unlimited ? 0 : Math.min(100, Math.round((teamCount         / maxUsers)   * 100));
    const stPct   = unlimitedStorage ? 0 : maxStorageBytes > 0
        ? Math.min(100, Math.round((usage.total_bytes / maxStorageBytes) * 100))
        : 0;

    const openUpgrade = (tier: string) => {
        setUpgradeTarget(tier);
        setPayRef(""); setNotes(""); setSubmitDone(false); setSubmitErr("");
    };
    const closeModal = () => setUpgradeTarget(null);

    const submitUpgrade = () => {
        if (!payRef.trim()) { setSubmitErr("Please enter your payment / transaction reference."); return; }
        setSubmitErr("");
        submitUpgradeMutation.mutate(
            { requested_plan: upgradeTarget as string, payment_ref: payRef.trim(), notes: notes.trim() || undefined },
            {
                onSuccess: () => setSubmitDone(true),
                onError: (error: Error) => setSubmitErr(error.message || "Something went wrong. Please try again."),
            }
        );
    };

    return (
        <div className={PANEL_CONTENT}>

            {/* Trial countdown banner */}
            {plan === "trial" && trialDaysLeft !== null && (
                <div className={`${TRIAL_BANNER}${trialDaysLeft <= 3 ? " " + TRIAL_BANNER_URGENT : ""}`}>
                    <span className={TRIAL_BANNER_ICON}>⏳</span>
                    <span className={TRIAL_BANNER_TEXT}>
                        {trialDaysLeft === 0
                            ? <><strong>Your trial has ended.</strong> Upgrade now to continue using Project Ease.</>
                            : <><strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left on your trial.</strong>{" "}
                               Upgrade before it expires to keep your documents and access.</>}
                    </span>
                </div>
            )}

            {/* Pending upgrade notice */}
            {pendingPlan && (
                <div className={UPGRADE_PENDING_BANNER}>
                    <span className={PENDING_BANNER_ICON}>🕐</span>
                    <div className={PENDING_BANNER_BODY}>
                        <div className={PENDING_BANNER_TITLE}>
                            Upgrade to {TIER_LABELS[pendingPlan] ?? pendingPlan} — Under Review
                        </div>
                        <div className={PENDING_BANNER_SUB}>
                            Your payment is being verified. We'll activate your new plan within 1–2 business hours
                            {pendingAt ? ` (submitted ${new Date(pendingAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })})` : ""}.
                            Questions? WhatsApp us at {config?.support_whatsapp ?? "our support number"}.
                        </div>
                    </div>
                </div>
            )}

            {/* ── Usage ── */}
            <div className={SUB_USAGE_CARD}>
                <div className={SUB_USAGE_TITLE}>Current Usage — {TIER_LABELS[plan] ?? plan} Plan</div>
                <div className={SUB_USAGE_GRID}>

                    {/* Documents */}
                    <div className={SUB_USAGE_ITEM}>
                        <div className={SUB_USAGE_LABEL}>
                            <span>Documents</span>
                            <span className={SUB_USAGE_VALUE}>
                                {unlimited ? `${usage.total_docs} / ∞` : `${usage.total_docs} / ${maxDocs}`}
                            </span>
                        </div>
                        {!unlimited && (
                            <div className={USAGE_BAR}>
                                <div
                                    className={`${USAGE_BAR_FILL}${docPct >= 80 ? " " + USAGE_BAR_WARN : ""}`}
                                    style={{ width: `${docPct}%` }}
                                />
                            </div>
                        )}
                        {docPct >= 80 && !unlimited && (
                            <div className={SUB_UPGRADE_HINT}>
                                {docPct >= 100 ? "Limit reached — upgrade to upload more." : `${docPct}% used — consider upgrading.`}
                            </div>
                        )}
                    </div>

                    {/* Team */}
                    <div className={SUB_USAGE_ITEM}>
                        <div className={SUB_USAGE_LABEL}>
                            <span>Team Members</span>
                            <span className={SUB_USAGE_VALUE}>
                                {unlimited ? `${teamCount} / ∞` : `${teamCount} / ${maxUsers}`}
                            </span>
                        </div>
                        {!unlimited && (
                            <div className={USAGE_BAR}>
                                <div
                                    className={`${USAGE_BAR_FILL}${userPct >= 80 ? " " + USAGE_BAR_WARN : ""}`}
                                    style={{ width: `${userPct}%` }}
                                />
                            </div>
                        )}
                        {userPct >= 80 && !unlimited && (
                            <div className={SUB_UPGRADE_HINT}>
                                {userPct >= 100 ? "Limit reached — upgrade to invite more." : `${userPct}% used — consider upgrading.`}
                            </div>
                        )}
                    </div>

                    {/* Storage */}
                    <div className={SUB_USAGE_ITEM}>
                        <div className={SUB_USAGE_LABEL}>
                            <span>Storage</span>
                            <span className={SUB_USAGE_VALUE}>{fmtBytes(usage.total_bytes)}</span>
                        </div>
                        {!unlimitedStorage && maxStorageBytes > 0 && (
                            <div className={USAGE_BAR}>
                                <div
                                    className={`${USAGE_BAR_FILL}${stPct >= 80 ? " " + USAGE_BAR_WARN : ""}`}
                                    style={{ width: `${stPct}%` }}
                                />
                            </div>
                        )}
                        {stPct >= 80 && !unlimitedStorage && (
                            <div className={SUB_UPGRADE_HINT}>
                                {stPct >= 100 ? "Storage full — upgrade for more space." : `${stPct}% used.`}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* ── Plan comparison cards ── */}
            <div className={PLAN_TIER_GRID}>
                {TIER_ORDER.map(tier => {
                    const cfg         = config?.plans[tier];
                    const isCurrent   = tier === plan;
                    const isPopular   = tier === "pro";
                    const isUnlimited = (cfg?.max_docs ?? 0) >= 9_999_999;
                    const hasPending  = !!pendingPlan;

                    // Can upgrade: must be higher tier and no pending request
                    const tierIdx    = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]);
                    const currentIdx = TIER_ORDER.indexOf(plan as typeof TIER_ORDER[number]);
                    const canUpgrade = !isCurrent && tierIdx > currentIdx && !hasPending;

                    return (
                        <div
                            key={tier}
                            className={[
                                PLAN_TIER_CARD,
                                isCurrent ? PLAN_TIER_CARD_CURRENT : "",
                                isPopular && !isCurrent ? PLAN_TIER_CARD_POPULAR : "",
                            ].filter(Boolean).join(" ")}
                        >
                            {isCurrent && <div className={PLAN_TIER_CURRENT_BADGE}>Current Plan</div>}
                            {isPopular && !isCurrent && <div className={PLAN_TIER_POPULAR_BADGE}>Most Popular</div>}

                            <div className={PLAN_TIER_NAME}>{TIER_LABELS[tier]}</div>

                            <div className={PLAN_TIER_PRICE}>
                                {cfg ? fmtPKR(cfg.price_monthly) : "—"}
                            </div>
                            <div className={PLAN_TIER_PRICE_SUB}>
                                {cfg && cfg.price_monthly > 0 ? "per month" : tier === "trial" ? "14-day trial" : ""}
                                {cfg && cfg.price_annual > 0 ? ` · PKR ${cfg.price_annual.toLocaleString("en-PK")}/yr` : ""}
                            </div>

                            <div className={PLAN_TIER_DIVIDER} />

                            <div className={PLAN_TIER_LIMITS}>
                                {isUnlimited
                                    ? "Unlimited docs · Unlimited users"
                                    : `${cfg?.max_docs ?? "—"} docs · ${cfg?.max_users ?? "—"} users`}
                                <br />
                                {cfg && cfg.max_bytes >= 25_000_000_000 * 0.99
                                    ? "25 GB storage"
                                    : cfg ? fmtBytes(cfg.max_bytes) + " storage" : ""}
                                {cfg?.max_searches != null ? ` · ${cfg.max_searches} searches` : ""}
                            </div>

                            {cfg?.features && cfg.features.length > 0 && (
                                <ul className={PLAN_TIER_FEATURE_LIST}>
                                    {cfg.features.map((f, i) => (
                                        <li key={i} className={PLAN_TIER_FEATURE_ITEM}>{f}</li>
                                    ))}
                                </ul>
                            )}

                            {tier === "enterprise" ? (
                                <button
                                    className={`${PLAN_TIER_BTN} ${PLAN_TIER_BTN_GHOST}`}
                                    onClick={() => window.open("mailto:support@projectease.ai?subject=Enterprise Plan Inquiry", "_blank")}
                                >
                                    Contact Sales
                                </button>
                            ) : isCurrent ? (
                                <button className={PLAN_TIER_BTN} disabled>
                                    Active
                                </button>
                            ) : canUpgrade ? (
                                <button className={PLAN_TIER_BTN} onClick={() => openUpgrade(tier)}>
                                    Upgrade to {TIER_LABELS[tier]}
                                </button>
                            ) : hasPending ? (
                                <button className={PLAN_TIER_BTN} disabled title="An upgrade request is already pending">
                                    Request Pending
                                </button>
                            ) : (
                                <button className={PLAN_TIER_BTN} disabled>
                                    {tierIdx < currentIdx ? "Downgrade not available" : "Current"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Upgrade modal ── */}
            <Modal
                open={!!upgradeTarget}
                onClose={closeModal}
                maxWidth={520}
                footer={upgradeTarget && (
                    submitDone ? (
                        <Button onClick={closeModal}>Done</Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={closeModal} disabled={submitUpgradeMutation.isPending}>Cancel</Button>
                            <Button onClick={submitUpgrade} disabled={submitUpgradeMutation.isPending}>
                                {submitUpgradeMutation.isPending ? "Submitting…" : "Submit Upgrade Request"}
                            </Button>
                        </>
                    )
                )}
            >
                {upgradeTarget && (submitDone ? (
                    <div className={UPGRADE_SUCCESS_BANNER}>
                        <div className={UPGRADE_SUCCESS_TITLE}>✓ Upgrade Request Submitted</div>
                        Your request to upgrade to <strong>{TIER_LABELS[upgradeTarget]}</strong> has been received.
                        We will verify your payment and activate your plan within 1–2 business hours (Mon–Sat, 9 AM–6 PM PKT).
                        {config?.support_whatsapp && (
                            <> Questions? WhatsApp us at <strong>{config.support_whatsapp}</strong>.</>
                        )}
                    </div>
                ) : (
                    <>
                        <div className={UPGRADE_MODAL_TITLE}>
                            Upgrade to {TIER_LABELS[upgradeTarget]} Plan
                        </div>
                        <div className={UPGRADE_MODAL_SUB}>
                            Transfer the subscription amount to our bank account, then enter your transaction
                            reference below. We'll verify and activate your plan within 1–2 business hours.
                        </div>

                        {/* Bank details */}
                        {config?.bank && (
                            <div className={BANK_CARD}>
                                <div className={BANK_CARD_TITLE}>Bank Transfer Details</div>
                                {[
                                    ["Bank",    config.bank.name],
                                    ["Account", config.bank.account],
                                    ["IBAN",    config.bank.iban],
                                    ["Title",   config.bank.title],
                                ].map(([label, val]) => val && val !== "" && (
                                    <div key={label} className={BANK_ROW}>
                                        <span className={BANK_LABEL}>{label}</span>
                                        <span className={BANK_VALUE}>{val}</span>
                                    </div>
                                ))}
                                {config?.plans[upgradeTarget] && (
                                    <div className={BANK_ROW} style={{ marginTop: "0.4rem", borderTop: "1px solid var(--border)", paddingTop: "0.4rem" }}>
                                        <span className={BANK_LABEL}>Amount</span>
                                        <span className={BANK_VALUE} style={{ color: "var(--gold)" }}>
                                            {fmtPKR(config.plans[upgradeTarget].price_monthly)}/month
                                            {config.plans[upgradeTarget].price_annual > 0 && (
                                                <span style={{ fontWeight: 400, color: "var(--text-3)", fontSize: "0.75rem" }}>
                                                    {" "}· or PKR {config.plans[upgradeTarget].price_annual.toLocaleString("en-PK")}/yr
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Task #174 — Local payment methods */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", margin: "0.75rem 0" }}>
                            <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.6rem 0.75rem" }}>
                                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#1a9c3e", marginBottom: "2px" }}>📱 JazzCash</div>
                                <div style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>Account: <strong>PLACEHOLDER_JAZZCASH_NO</strong></div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Send to mobile wallet</div>
                            </div>
                            <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.6rem 0.75rem" }}>
                                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#6d28d9", marginBottom: "2px" }}>📱 Easypaisa</div>
                                <div style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>Account: <strong>PLACEHOLDER_EASYPAISA_NO</strong></div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Send to mobile wallet</div>
                            </div>
                        </div>

                        {/* Payment reference */}
                        <div className={UPGRADE_FORM_SECTION}>
                            <label className={UPGRADE_FORM_LABEL}>
                                Transaction / Payment Reference <span style={{ color: "var(--danger, #c94040)" }}>*</span>
                            </label>
                            <input
                                className={UPGRADE_FORM_INPUT}
                                placeholder="e.g. TRX-20240723-1234 or JazzCash/Easypaisa transaction ID"
                                value={payRef}
                                onChange={e => setPayRef(e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div className={UPGRADE_FORM_SECTION}>
                            <label className={UPGRADE_FORM_LABEL}>Notes (optional)</label>
                            <textarea
                                className={`${UPGRADE_FORM_INPUT} ${UPGRADE_FORM_TEXTAREA}`}
                                placeholder="Any additional info for our team"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {submitErr && (
                            <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.75rem" }}>
                                {submitErr}
                            </div>
                        )}
                    </>
                ))}
            </Modal>
        </div>
    );
};
