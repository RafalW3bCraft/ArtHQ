import { type Project, services, statusLabel } from "@shared/schema";
import { Records, Submitted, useRecords } from "./Records";
export function ProjectStatusPanel({ owner }: { owner: string }) {
  const result = useRecords<Project>("projects", owner);
  return (
    <section className="panel">
      <h2>Your projects</h2>
      <Records
        result={result}
        empty="You haven’t submitted a project brief yet."
      >
        {(project) => (
          <>
            <div className="record-title">
              <h3>{project.projectName}</h3>
              <span className="badge">{statusLabel(project.status)}</span>
            </div>
            <p>{project.description}</p>
            <div className="inline muted">
              <span>{services[project.serviceType]}</span>
              <Submitted at={project.createdAt} />
            </div>
          </>
        )}
      </Records>
    </section>
  );
}
