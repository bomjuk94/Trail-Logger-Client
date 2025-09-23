import type { ValidateProfileFieldsProps } from "@/types"

export const validateProfileFields = ({
    password,
    heightFeetNum,
    heightInchesNum,
    weightNum,
}: ValidateProfileFieldsProps) => {
    const errors: string[] = []

    if (password !== null && password !== '') {
        if (typeof password !== "string" || password.length < 6) {
            errors.push("Password must be at least 6 characters.")
        }
    }

    if (heightFeetNum !== null) {
        if (typeof heightFeetNum !== "number" || heightFeetNum < 0) {
            errors.push("Enter valid height in feet")
        }
    }

    if (heightInchesNum !== null) {
        if (typeof heightInchesNum !== "number" || heightInchesNum < 0) {
            errors.push("Enter valid height in inches")
        }
    }

    if (weightNum !== null) {
        if (typeof weightNum !== "number" || weightNum <= 0) {
            errors.push("Enter valid weight")
        }
    }

    return { errors }
}
