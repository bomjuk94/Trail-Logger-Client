import { jwtDecode } from "jwt-decode";

type TokenPayload = {
    userId: string;
    userName?: string;
};

export function decodeUserId(token: string | null) {
    if (!token) return null;
    try {
        const p = jwtDecode<TokenPayload>(token);
        return p.userId ?? null;
    } catch { return null; }
}
