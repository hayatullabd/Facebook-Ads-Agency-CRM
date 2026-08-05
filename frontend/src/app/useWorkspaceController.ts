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
  const refreshGeneration = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    setLoading(true);
    const resources = getWorkspaceRequests(agencyId, role);
    const results = await Promise.allSettled(resources.map((resource) => resource.load()));
    if (generation !== refreshGeneration.current) return false;

    const nextData: Partial<WorkspaceData> = {};
    const nextErrors: Partial<Record<WorkspaceResource, string>> = {};
    results.forEach((result, index) => {
      const key = resources[index].key;
      if (result.status === "fulfilled") {
        Object.assign(nextData, { [key]: result.value });
      } else {
        nextErrors[key] = result.reason instanceof Error ? result.reason.message : "Could not load this resource";
      }
    });

    setData((current) => ({ ...current, ...nextData }));
    setErrors(nextErrors);
    setLoading(false);
    return results.every((result) => result.status === "fulfilled");
  }, [agencyId, role]);

  useEffect(() => {
    setData(emptyWorkspace);
    setErrors({});
    void refresh();
    return () => { refreshGeneration.current += 1; };
  }, [refresh]);

  return { data, errors, loading, refresh };
}
