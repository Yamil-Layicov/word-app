export const colors = {
  backgroundWarm: "#FFF8EF",
  backgroundSoft: "#FFFDF9",
  white: "#FFFFFF",
  navy: "#081D33",
  navySoft: "#102A43",
  text: "#122238",
  textMuted: "#697386",
  border: "#EEDFCC",
  borderStrong: "#DDC8AE",
  inputBackground: "#FFFDF9",
  orange: "#FF6416",
  orangePressed: "#EA520B",
  green: "#5A8B3E",
  error: "#C2410C",
  shadow: "#2A1A0A",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    black: "900",
  },
} as const;
