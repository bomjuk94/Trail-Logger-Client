import * as Location from 'expo-location'

export interface UseLocationProps {
    setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>
    setLocation: React.Dispatch<React.SetStateAction<Location.LocationObject | null>>
}
export interface UseGetLocationPermissionProps {
    token: string | null
    tokenLoading: boolean
    ensureLocationPermissionOnce: () => Promise<{
        status: Location.PermissionStatus;
        canAskAgain: boolean;
    }>
    setPermStatus: React.Dispatch<React.SetStateAction<Location.PermissionStatus | null>>
}
export interface PositionProps {
    permStatus: Location.PermissionStatus | null
    setLocation: React.Dispatch<React.SetStateAction<Location.LocationObject | null>>
}