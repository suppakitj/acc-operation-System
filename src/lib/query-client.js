import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			retry: 1,
			staleTime: 60_000,   // 60s — prevent refetch on every page switch
			gcTime: 15 * 60_000, // 15min — keep unused cache longer for shared data
		},
	},
});