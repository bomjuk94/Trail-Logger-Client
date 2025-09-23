export const fontSizes = {
  inputHeading: 16,
  subTitle: 20,
  subHeading: 24,
  btn: 25,
  title: 30,
} as const
export const fontWeight = {
  semiBold: 600,
  bold: 'bold',
} as const
export const spacing = {
  sm: 10,
  md: 20,
  lg: 30,
} as const
export const colors = {
  primary: '#4CAF50',
  white: '#fff',
  black: '#000',
  gray: '#ccc',
  lightGray: '#e3e3e3ff',
} as const
export const padding = {
  sm: 12,
  md: 24,
} as const
export const radii = {
  md: 8,
} as const
export const opacity = {
  sm: 0.7,
} as const
export const gap = {
  xs: 10,
  sm: 12,
  md: 20,
  lg: 30,
  xl: 40,
} as const
export const border = {
  sm: 1,
} as const
export const devices = {
  tablet: 640,
} as const

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};
