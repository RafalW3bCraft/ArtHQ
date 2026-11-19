import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CreateProjectPanel } from "@/components/dashboard/CreateProjectPanel";
import { ProjectStatusPanel } from "@/components/dashboard/ProjectStatusPanel";
import { SupportPanel } from "@/components/dashboard/SupportPanel";

export default function DashboardPage() {
  const { currentUser, userProfile } = useAuth();
  const [tab, setTab] = useState("Projects");
  if (!currentUser || !userProfile) return null;
  return (
    <>
      <h1>{userProfile.companyName}</h1>
      <div className="tab-bar" aria-label="Workspace sections">
        {["Projects", "Support"].map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "Projects" ? (
        <div className="portal-grid">
          <CreateProjectPanel owner={currentUser.uid} />
          <ProjectStatusPanel owner={currentUser.uid} />
        </div>
      ) : (
        <SupportPanel owner={currentUser.uid} />
      )}
    </>
  );
}
