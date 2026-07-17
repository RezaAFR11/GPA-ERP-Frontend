import { useQuery } from "@tanstack/react-query";
import { useAuth, useRole } from "@/lib/auth-context";
import { getActionCenterQueues, loadActionCenterExpenses } from "@/lib/action-center";
import { operationsApi } from "@/lib/api";

export function useActionCenterCount(enabled = true): number {
  const { user } = useAuth();
  const { role } = useRole();
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", "action-center"],
    queryFn: loadActionCenterExpenses,
    enabled: enabled && !!user,
    staleTime: 30_000,
  });
  const { data: operationalRecords = [] } = useQuery({
    queryKey: ["operational-action-queue"],
    queryFn: () => operationsApi.actionQueue().then(response => response.data),
    enabled: enabled && !!user,
    staleTime: 30_000,
  });

  return getActionCenterQueues(expenses, role, user?.id ?? null).total + operationalRecords.length;
}
