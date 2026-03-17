import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserList() {
  return useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listUsers', {});
      return res.data?.users || [];
    },
    staleTime: 60000, // cache 1 min
  });
}