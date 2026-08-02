import { useCallback, useEffect, useRef, useState } from "react";
import type { Role } from "../types/crm";
import { getWorkspaceRequests, type WorkspaceData, type WorkspaceResource } from "./workspaceRepository";

const emptyWorkspace: WorkspaceData = {
  clients: [],
  requests: [],
  campaigns: [],
  invoices: [],
  updates: [],
  users: [],
  facebook: null,
  facebookAccounts: [],
};

export function useWorkspaceController(agencyId: string, role: Role) {
  const [data, setData] = useState<WorkspaceData>(emptyWorkspace);
  const [errors, setErrors] = useState<Partial<Record<WorkspaceResource, string>>>({});
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const requestGeneration = ++generation.current;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setLoading(true);
    const resources = getWorkspaceRequests(agencyId, role, controller.signal);
    const results = await Promise.allSettled(resources.map((resource) => resource.load()));
    if (requestGeneration !== generation.current || controller.signal.aborted) return false;
    const nextErrors: Partial<Record<WorkspaceResource, string>> = {};
    const updates: Partial<WorkspaceData> = {};

    results.forEach((result, index) => {
      const key = resources[index].key;
      if (result.status === "fulfilled") {
        (updates as Record<WorkspaceResource, WorkspaceData[WorkspaceResource]>)[key] = result.value;
      } else {
        nextErrors[key] = result.reason instanceof Error ? result.reason.message : "Could not load this resource";
      }
    });

    setData((current) => ({ ...current, ...updates }));
    setErrors(nextErrors);
    setLoading(false);
    return results.every((result) => result.status === "fulfilled");
  }, [agencyId, role]);

  useEffect(() => {
    setData(emptyWorkspace);
    void refresh();
    return () => {
      generation.current += 1;
      activeController.current?.abort();
    };
  }, [refresh]);

  return { data, errors, loading, refresh };
}
