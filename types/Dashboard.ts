import type { HikeRow } from "./Hike"

export interface UseRefreshOnDashboardFocusProps {
    userId: string | null
    setHikes: React.Dispatch<React.SetStateAction<HikeRow[]>>
}