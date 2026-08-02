import { useCallback, useEffect, useState } from "react";
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

  const refresh = useCallback(async () => {
    setLoading(true);
    const resources = getWorkspaceRequests(agencyId, role);
    const results = await Promise.allSettled(resources.map((resource) => resource.load()));
    const nextErrors: Partial<Record<WorkspaceResource, string>> = {};

    results.forEach((result, index) => {
      const key = resources[index].key;
      if (result.status === "fulfilled") {
        setData((current) => ({ ...current, [key]: result.value }));
      } else {
        nextErrors[key] = result.reason instanceof Error ? result.reason.message : "Could not load this resource";
      }
    });

    setErrors(nextErrors);
    setLoading(false);
    return results.every((result) => result.status === "fulfilled");
  }, [agencyId, role]);

  useEffect(() => {
    setData(emptyWorkspace);
    void refresh();
  }, [refresh]);

  return { data, errors, loading, refresh };
}
