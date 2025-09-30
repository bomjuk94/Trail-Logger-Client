import { useEffect } from "react";
import { apiFetch } from "../lib/apiFetch";
import { useAuth } from "@/components/auth";
import type { UseFetchTrailsProps, HikeRow } from "@/types";
import { useAuthToken } from "../lib/userAuthToken";

export const useFetchTrails = ({
    setHikes,
}: UseFetchTrailsProps) => {

    const { signOut } = useAuth()
    const { token, loading: tokenLoading } = useAuthToken();

    useEffect(() => {
        let cancelled = false;
        const fetchTrails = async () => {

            if (tokenLoading) return;
            if (!token) {
                return;
            }

            try {
                const res = await apiFetch('/api/trails', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 401) {
                    await signOut();
                    return;
                }

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data: HikeRow[] = await res.json();

                if (!cancelled) {
                    setHikes(data)
                }
            } catch (e: any) {
                console.warn('Failed to load trails')
            } finally {
            }
        };
        fetchTrails();
        return () => { cancelled = true; };
    }, [token, tokenLoading, signOut]);
}