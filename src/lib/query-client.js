import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 30_000,   // 30s — prevent refetch on every page switch
			gcTime: 5 * 60_000,  // 5min — keep unused cache longer
		},
	},
});