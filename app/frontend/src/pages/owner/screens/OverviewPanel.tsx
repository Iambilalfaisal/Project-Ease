// Overview panel — purely presentational, driven entirely by props passed
// down from the OwnerPortal shell (which already owns the docs/team/usage
// fetches). No local fetching of its own, so no service/hook layer needed.

import styles from "../OwnerPortal.module.css";
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
        <div className={styles.panelContent}>
            <div className={styles.welcomeBanner}>
                <div className={styles.welcomeTitle}>Welcome back, {orgName}</div>
                <div className={styles.welcomeSub}>
                    Your workspace is set up and ready. Upload documents and your team can start asking questions immediately.
                </div>
            </div>

            <div className={styles.statsGrid}>
                {stats.map(s => (
                    <div key={s.label} className={styles.statCard}>
                        <div className={styles.statBadge}>{s.icon}</div>
                        <div className={styles.statValue}>{s.value}</div>
                        <div className={styles.statLabel}>{s.label}</div>
                        <div className={styles.statSub}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className={styles.quickActions}>
                <div className={styles.sectionTitle}>Quick Actions</div>
                <div className={styles.actionCards}>
                    <div className={styles.actionCard}>
                        <div className={styles.actionCardIcon}>D</div>
                        <div>
                            <div className={styles.actionCardTitle}>Upload Documents</div>
                            <div className={styles.actionCardSub}>Add contracts, case files, or reports to your library</div>
                        </div>
                    </div>
                    <div className={styles.actionCard}>
                        <div className={styles.actionCardIcon}>T</div>
                        <div>
                            <div className={styles.actionCardTitle}>Invite Team Members</div>
                            <div className={styles.actionCardSub}>Give your staff access to the workspace</div>
                        </div>
                    </div>
                    <div className={styles.actionCard}>
                        <div className={styles.actionCardIcon}>C</div>
                        <div>
                            <div className={styles.actionCardTitle}>Ask a Question</div>
                            <div className={styles.actionCardSub}>Search your documents using plain language</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
