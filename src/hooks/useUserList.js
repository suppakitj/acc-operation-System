import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserList() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listUsers', {});
      return res.data?.users || [];
    },
    staleTime: 2 * 60_000, // 2min — user list rarely changes
    gcTime: 10 * 60_000,   // keep in cache 10min
  });
}