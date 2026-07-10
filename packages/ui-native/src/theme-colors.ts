// Mirrors the CSS variables in apps/expo/src/styles.css.
// Kept as plain hex/rgb here because React Navigation's header, tab bar,
// and status bar are native components — they can't read Tailwind/NativeWind
// CSS variables, so these need to be manually kept in sync with styles.css.
export const lightColors: Record<string, string> = {
  background: "#fbfaf7",
  card: "#ffffff",
  text: "#2b2118",
  border: "#e6e1d6",
  primary: "#e2711d",
  notification: "#d4362d",
};

export const darkColors: Record<string, string> = {
  background: "#22273f",
  card: "#262c4a",
  text: "#f5f3ee",
  border: "#3a4066",
  primary: "#f2934a",
  notification: "#e0574a",
};
