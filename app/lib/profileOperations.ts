import { validateProfileFields } from "./validateProfileFields";
import { showToast } from "./showToast";
import { apiFetch } from "./apiFetch";
import { SaveProfileProps, ResetProfileFormProps } from "@/types";

export const profileActions = ({
    setPassword,
    setHeightFeet,
    setHeightInches,
    setWeight,
}: ResetProfileFormProps) => {

    const resetProfileForm = ({
        setPassword,
        setHeightFeet,
        setHeightInches,
        setWeight,
    }: ResetProfileFormProps) => {
        setPassword('');
        setHeightFeet('');
        setHeightInches('');
        setWeight('');
    };

    const saveProfile = async ({
        password,
        heightFeetNum,
        heightInchesNum,
        weightNum,
        token,
        isMetric,
        isPace,
    }: SaveProfileProps) => {
        const { errors } = validateProfileFields({
            password,
            heightFeetNum,
            heightInchesNum,
            weightNum,
        })

        if (errors.length > 0) {
            return showToast({ type: "error", errors });
        }

        const res = await apiFetch('/api/profile/save', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', },
            body: JSON.stringify({
                password,
                heightFeetNum,
                heightInchesNum,
                weightNum,
                isMetric,
                isPace,
            }),
        })
        if (!res.ok) {
            resetProfileForm({
                setPassword,
                setHeightFeet,
                setHeightInches,
                setWeight,
            })
            return showToast({ type: 'error', msg: 'Something went wrong. Please try again later.' })
        }

        return showToast({ type: "success", msg: 'Profile saved Successfully!' });
    };

    return {
        saveProfile,
    }
}