export type Profile = {
    userName: string
    height: number | null
    weight: number | null
    unit: string | null
    timePreference: string | null
};
export interface ValidateProfileFieldsProps {
    password: string
    heightFeetNum: number | null
    heightInchesNum: number | null
    weightNum: number | null
}
export interface UseGetUserWeightProps {
    token: string | null
    setUserWeight: React.Dispatch<React.SetStateAction<number | null>>
    signOut: () => Promise<void>
}
export interface UseFetchProfileProps {
    tokenLoading: boolean
    token: string | null
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
    setErr: React.Dispatch<React.SetStateAction<string | null>>
    setUsername: React.Dispatch<React.SetStateAction<string>>
    setHeightFeet: React.Dispatch<React.SetStateAction<string>>
    setHeightInches: React.Dispatch<React.SetStateAction<string>>
    setWeight: React.Dispatch<React.SetStateAction<string>>
    setIsMetric: React.Dispatch<React.SetStateAction<boolean>>
    setIsPace: React.Dispatch<React.SetStateAction<boolean>>
}
export interface SaveProfileProps {
    password: string
    heightFeetNum: number | null
    heightInchesNum: number | null
    weightNum: number | null
    token: string | null
    isMetric: boolean
    isPace: boolean
}
export interface ResetProfileFormProps {
    setPassword: React.Dispatch<React.SetStateAction<string>>
    setHeightFeet: React.Dispatch<React.SetStateAction<string>>
    setHeightInches: React.Dispatch<React.SetStateAction<string>>
    setWeight: React.Dispatch<React.SetStateAction<string>>
}
