import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			retry: 1,
			staleTime: 45_000,   // 45s — prevent refetch on every page switch
			gcTime: 10 * 60_000, // 10min — keep unused cache much longer for shared data
		},
	},
});