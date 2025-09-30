import { useEffect } from "react";
import { apiFetch } from "../lib/apiFetch";
import { useAuth } from "@/components/auth";
import type { Profile } from "@/types";
import type { UseGetUserWeightProps } from "@/types";

export const useGetUserWeight = ({ token, setUserWeight }: UseGetUserWeightProps) => {
    const { signOut } = useAuth();

    useEffect(() => {
        if (!token) {
            setUserWeight(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const res = await apiFetch("/api/profile", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 401) {
                    if (!cancelled) await signOut();
                    return;
                }

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const data: Profile = await res.json();
                if (!cancelled) {
                    setUserWeight(data.weight ?? null);
                }
            } catch (e) {
                console.warn("error getting user weight", e);
                if (!cancelled) setUserWeight(null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token, signOut, setUserWeight])
