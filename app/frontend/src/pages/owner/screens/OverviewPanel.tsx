// Overview panel — purely presentational, driven entirely by props passed
// down from the OwnerPortal shell (which already owns the docs/team/usage
// fetches). No local fetching of its own, so no service/hook layer needed.

import {
    PANEL_CONTENT, WELCOME_BANNER, WELCOME_TITLE, WELCOME_SUB, STATS_GRID, STAT_CARD,
    STAT_BADGE, STAT_VALUE, STAT_LABEL, STAT_SUB, QUICK_ACTIONS, SECTION_TITLE,
    ACTION_CARDS, ACTION_CARD, ACTION_CARD_ICON, ACTION_CARD_TITLE, ACTION_CARD_SUB,
} from "../ownerStyles";
import type { DocFile, TeamMember, Usage } from "../types";
import { fmtBytes } from "../types";

export const OverviewPanel = ({ orgName, docs, team, usage }: {
    orgName: string; docs: DocFile[]; team: TeamMember[]; usage: Usage;
}) => {
    const stats = [
        { label: "Documents",    value: docs.length,           icon: "D", sub: "In your library"  },
        { label: "Team Members", value: team.length,           icon: "T", sub: "With access"       },
        { label: "Storage Used", value: fmtBytes(usage.total_bytes), icon: "S", sub: "Across all docs" },
        { label: "Queries",      value: "--",                  icon: "Q", sub: "Requires analytics" },
    ];

    return (
        <div className={PANEL_CONTENT}>
            <div className={WELCOME_BANNER}>
                <div className={WELCOME_TITLE}>Welcome back, {orgName}</div>
                <div className={WELCOME_SUB}>
                    Your workspace is set up and ready. Upload documents and your team can start asking questions immediately.
                </div>
            </div>

            <div className={STATS_GRID}>
                {stats.map(s => (
                    <div key={s.label} className={STAT_CARD}>
                        <div className={STAT_BADGE}>{s.icon}</div>
                        <div className={STAT_VALUE}>{s.value}</div>
                        <div className={STAT_LABEL}>{s.label}</div>
                        <div className={STAT_SUB}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className={QUICK_ACTIONS}>
                <div className={SECTION_TITLE}>Quick Actions</div>
                <div className={ACTION_CARDS}>
                    <div className={ACTION_CARD}>
                        <div className={ACTION_CARD_ICON}>D</div>
                        <div>
                            <div className={ACTION_CARD_TITLE}>Upload Documents</div>
                            <div className={ACTION_CARD_SUB}>Add contracts, case files, or reports to your library</div>
                        </div>
                    </div>
                    <div className={ACTION_CARD}>
                        <div className={ACTION_CARD_ICON}>T</div>
                        <div>
                            <div className={ACTION_CARD_TITLE}>Invite Team Members</div>
                            <div className={ACTION_CARD_SUB}>Give your staff access to the workspace</div>
                        </div>
                    </div>
                    <div className={ACTION_CARD}>
                        <div className={ACTION_CARD_ICON}>C</div>
                        <div>
                            <div className={ACTION_CARD_TITLE}>Ask a Question</div>
                            <div className={ACTION_CARD_SUB}>Search your documents using plain language</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
