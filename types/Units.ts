export interface ToggleUnitProps {
    weight: string
    isMetric: boolean
    setWeight: React.Dispatch<React.SetStateAction<string>>
    setIsMetric: React.Dispatch<React.SetStateAction<boolean>>
}