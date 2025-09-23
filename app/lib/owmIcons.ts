import { ImageSourcePropType } from "react-native";

export const OWM_ICONS = {
    "01d": require("../../assets/owm/01d.png"),
    "01n": require("../../assets/owm/01n.png"),
    "02d": require("../../assets/owm/02d.png"),
    "02n": require("../../assets/owm/02n.png"),
    "03d": require("../../assets/owm/03d.png"),
    "03n": require("../../assets/owm/03n.png"),
    "04d": require("../../assets/owm/04d.png"),
    "04n": require("../../assets/owm/04n.png"),
    "09d": require("../../assets/owm/09d.png"),
    "09n": require("../../assets/owm/09n.png"),
    "10d": require("../../assets/owm/10d.png"),
    "10n": require("../../assets/owm/10n.png"),
    "11d": require("../../assets/owm/11d.png"),
    "11n": require("../../assets/owm/11n.png"),
    "13d": require("../../assets/owm/13d.png"),
    "13n": require("../../assets/owm/13n.png"),
    "50d": require("../../assets/owm/50d.png"),
    "50n": require("../../assets/owm/50n.png"),
} as const;

export const getOwmIcon = (code: string): ImageSourcePropType =>
    OWM_ICONS[code] ?? OWM_ICONS["01d"];
