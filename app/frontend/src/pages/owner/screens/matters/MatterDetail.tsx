// Matter detail view: header (via MatterOverviewHeader) + the tab bar that
// switches between every per-matter sub-resource. Each tab component owns
// its own data fetching via its domain hook — this shell only tracks which
// tab is active and passes the loaded `matter` down.
import { useState } from "react";
import { PANEL_CONTENT, EMPTY_HINT, DETAIL_TAB_BAR, DETAIL_TAB_BTN, DETAIL_TAB_BTN_ACTIVE } from "../../ownerStyles";
import { useMatterDetail, useMatters } from "../../../../hooks/useMatters";
import { MatterOverviewHeader, MatterDocumentsTab } from "./MatterOverviewTab";
import { MatterOrdersTab } from "./MatterHearingsTab";
import { MatterFeesTab, MatterTimeTab, MatterExpensesTab, MatterCourtFeesTab, MatterAssocFeesTab, MatterChequesTab } from "./MatterFinancialsTab";
import { MatterFirTab, MatterChargesTab, MatterChallanTab, MatterBailBondsTab } from "./MatterCriminalTab";
import { MatterAdversaryTab, MatterWitnessesTab, MatterReliefTab } from "./MatterPartiesTab";
import {
    MatterNotesTab, MatterDocRequestsTab, MatterDeadlinesTab, MatterCorrespondenceTab,
    MatterOutcomeTab, MatterTransfersTab, MatterConflictTab,
} from "./MatterAdminTab";

type DetailTab =
    | "overview" | "docs" | "orders" | "fees" | "timelog" | "expenses" | "courtfee" | "assocfees" | "cheques"
    | "fir" | "charges" | "challan" | "bailbonds" | "adversary" | "witnesses" | "relief"
    | "notes" | "deadlines" | "docrequests" | "correspondence" | "outcome" | "transfers" | "conflict";

const TABS: { id: DetailTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Hearings" },
    { id: "docs", label: "Documents" },
    { id: "deadlines", label: "Deadlines" },
    { id: "docrequests", label: "Doc Requests" },
    { id: "fees", label: "Fees" },
    { id: "timelog", label: "Time Log" },
    { id: "expenses", label: "Expenses" },
    { id: "courtfee", label: "Court Fee" },
    { id: "assocfees", label: "Associate Fees" },
    { id: "cheques", label: "Cheques" },
    { id: "adversary", label: "Adverse Party" },
    { id: "witnesses", label: "Witnesses" },
    { id: "relief", label: "Bail/Relief" },
    { id: "fir", label: "FIR" },
    { id: "charges", label: "Charges" },
    { id: "challan", label: "Challan" },
    { id: "bailbonds", label: "Bail Bonds" },
    { id: "correspondence", label: "Correspondence" },
    { id: "notes", label: "Notes" },
    { id: "outcome", label: "Outcome" },
    { id: "transfers", label: "Transfers" },
    { id: "conflict", label: "Conflict Check" },
];

export function MatterDetail({ matterId, onBack }: { matterId: string; onBack: () => void }) {
    const { data: matter, isLoading } = useMatterDetail(matterId);
    const { data: allMatters = [] } = useMatters();
    const [tab, setTab] = useState<DetailTab>("overview");
    const [editDetail, setEditDetail] = useState(false);

    if (isLoading || !matter) {
        return <div className={PANEL_CONTENT}><div className={EMPTY_HINT}>Loading matter…</div></div>;
    }

    return (
        <div className={PANEL_CONTENT}>
            <MatterOverviewHeader matter={matter} onBack={onBack} onDeleted={onBack} editDetail={editDetail} setEditDetail={setEditDetail} allMatters={allMatters} />

            {!editDetail && (
                <>
                    <div className={DETAIL_TAB_BAR}>
                        {TABS.map(t => (
                            <button key={t.id} className={`${DETAIL_TAB_BTN} ${tab === t.id ? DETAIL_TAB_BTN_ACTIVE : ""}`} onClick={() => setTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === "overview" && null /* header above already covers overview */}
                    {tab === "orders" && <MatterOrdersTab matter={matter} />}
                    {tab === "docs" && <MatterDocumentsTab matter={matter} />}
                    {tab === "deadlines" && <MatterDeadlinesTab matter={matter} />}
                    {tab === "docrequests" && <MatterDocRequestsTab matter={matter} />}
                    {tab === "fees" && <MatterFeesTab matter={matter} />}
                    {tab === "timelog" && <MatterTimeTab matter={matter} />}
                    {tab === "expenses" && <MatterExpensesTab matter={matter} />}
                    {tab === "courtfee" && <MatterCourtFeesTab matter={matter} />}
                    {tab === "assocfees" && <MatterAssocFeesTab matter={matter} />}
                    {tab === "cheques" && <MatterChequesTab matter={matter} />}
                    {tab === "adversary" && <MatterAdversaryTab matter={matter} />}
                    {tab === "witnesses" && <MatterWitnessesTab matter={matter} />}
                    {tab === "relief" && <MatterReliefTab matter={matter} />}
                    {tab === "fir" && <MatterFirTab matter={matter} />}
                    {tab === "charges" && <MatterChargesTab matter={matter} />}
                    {tab === "challan" && <MatterChallanTab matter={matter} />}
                    {tab === "bailbonds" && <MatterBailBondsTab matter={matter} />}
                    {tab === "correspondence" && <MatterCorrespondenceTab matter={matter} />}
                    {tab === "notes" && <MatterNotesTab matter={matter} />}
                    {tab === "outcome" && <MatterOutcomeTab matter={matter} />}
                    {tab === "transfers" && <MatterTransfersTab matter={matter} />}
                    {tab === "conflict" && <MatterConflictTab matter={matter} />}
                </>
            )}
        </div>
    );
}
