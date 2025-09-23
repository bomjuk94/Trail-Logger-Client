import * as Location from 'expo-location';

export type Weather = {
    name: string
    icon: string
    temperatureCurr: number
    temperatureFeels: number
    temperatureHigh: number
    temperatureLow: number
    humidity: number
    visibility: number
    speedW: number
    clouds: number
}
export interface UseGetWeatherProps {
    permStatus: Location.PermissionStatus | null
    location: Location.LocationObject | null
    lastFetchRef: React.RefObject<{
        t: number;
        lat: number;
        lon: number;
    } | null>
    setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>
    setWeather: React.Dispatch<React.SetStateAction<Weather | null>>
}