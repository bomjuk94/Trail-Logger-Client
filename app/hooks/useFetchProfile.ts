import { useEffect } from "react";
import { apiFetch } from "../lib/apiFetch";
import { useAuth } from "@/components/auth";
import type { Profile } from "@/types";
import { unitConverter } from "../lib/unitConverter";
import type { UseFetchProfileProps } from "@/types";

export const useFetchProfile = ({
    tokenLoading,
    token,
    setLoading,
    setErr,
    setUsername,
    setHeightFeet,
    setHeightInches,
    setWeight,
    setIsMetric,
    setIsPace,
}: UseFetchProfileProps) => {

    const { signOut } = useAuth()
    const {
        mmToFeetInches,
        gramsToKg,
        gramsToLbs,
    } = unitConverter()

    useEffect(() => {
        let cancelled = false;
        const fetchProfile = async () => {
            if (tokenLoading) return;
            if (!token) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setErr(null);
            try {
                const res = await apiFetch('/api/profile', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 401) {
                    await signOut();
                    return;
                }

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data: Profile = await res.json();

                if (!cancelled) {

                    if (data.userName !== null) {
                        setUsername(data.userName)
                    }

                    if (data.height != null) {
                        const { feet, inches } = mmToFeetInches(data.height);
                        setHeightFeet(feet.toString());
                        setHeightInches(inches.toString());
                    }

                    if (data.weight != null) {
                        if (data.unit === 'metric') {
                            setWeight(gramsToKg(data.weight));
                            setIsMetric(true);
                        } else {
                            setWeight(gramsToLbs(data.weight));
                            setIsMetric(false);
                        }
                    }

                    if (data.unit) setIsMetric(data.unit === 'metric');
                    if (data.timePreference) setIsPace(data.timePreference === 'pace');
                }
            } catch (e: any) {
                if (!cancelled) setErr(e.message ?? 'Failed to load profile');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchProfile();
        return () => { cancelled = true; };
    }, [token, tokenLoading, signOut]);
}