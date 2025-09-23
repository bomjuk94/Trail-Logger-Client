import Toast from "react-native-toast-message";
import type { ShowToastProps } from "@/types";

export const showToast = ({ type, msg, errors }: ShowToastProps) => {

    if (type === "success" && msg) {
        Toast.show({
            type: "success",
            text1: msg,
        });
    } else if (type === "error") {
        if (errors?.length) {
            Toast.show({
                type: "list",
                props: { items: errors },
            });
        } else {
            Toast.show({
                type: "list",
                props: { items: [msg] },
            });
        }
    }
};
