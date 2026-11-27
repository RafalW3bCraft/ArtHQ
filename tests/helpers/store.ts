import type { BusinessStore, RecordData } from "../../server/business-store";
import type { Content } from "../../shared/business";
export class MemoryStore implements BusinessStore {
  data = new Map<string, RecordData>();
  private locks = new Map<string, Promise<unknown>>();
  async get<T extends RecordData>(c: string, id: string) {
    return structuredClone(this.data.get(`${c}/${id}`) || null) as T | null;
  }
  async list<T extends RecordData>(c: string, field?: string, value?: unknown) {
    return [...this.data.entries()]
      .filter(
        ([key, v]) => key.startsWith(`${c}/`) && (!field || v[field] === value),
      )
      .map(([, v]) => structuredClone(v)) as T[];
  }
  async page<T extends RecordData>(
    c: string,
    after?: string,
    filter?: { field: string; value: unknown },
  ) {
    const all = (await this.list<T>(c, filter?.field, filter?.value))
      .sort((a, b) => a.id.localeCompare(b.id))
      .filter((x) => !after || x.id > after);
    return {
      items: all.slice(0, 100),
      nextCursor: all.length > 100 ? all[99].id : null,
    };
  }
  async put<T extends RecordData>(c: string, id: string, value: T) {
    this.data.set(`${c}/${id}`, structuredClone(value));
  }
  async remove(c: string, id: string) {
    this.data.delete(`${c}/${id}`);
  }
  async change<T extends RecordData>(
    c: string,
    id: string,
    fn: (value: T | null) => T,
  ): Promise<T> {
    const key = `${c}/${id}`;
    const task = (this.locks.get(key) || Promise.resolve())
      .catch(() => {})
      .then(async () => {
        const next = fn(await this.get<T>(c, id));
        await this.put(c, id, next);
        return structuredClone(next);
      });
    this.locks.set(key, task);
    return task;
  }
  async completeGeneration(
    jobId: string,
    lease: string,
    content: Content,
    model: string,
  ) {
    const key = `generation_jobs/${jobId}`;
    const job = this.data.get(key);
    if (!job || job.state !== "running" || job.lease !== lease)
      throw new Error("Lease changed.");
    const contentKey = `content/${content.id}`;
    if (!this.data.has(contentKey))
      this.data.set(contentKey, structuredClone(content));
    this.data.set(key, {
      ...job,
      state: "complete",
      error: "",
      contentId: content.id,
      model,
      leaseUntil: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}
