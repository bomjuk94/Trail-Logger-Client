import { apiFetch } from "./apiFetch";
import type { HikeRow } from "@/types";

export async function fetchTrailsFromApi(token: string | null): Promise<HikeRow[]> {

    const res = await apiFetch("/api/trails", {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
        throw new Error("Unauthorized");
    }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
}
