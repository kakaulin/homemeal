import localFont from "next/font/local";

/**
 * Lebowski by Pragmatica — все девять начертаний из локальной папки шрифтов.
 * Файлы лежат внутри проекта (app/fonts/Lebowski), поэтому сборка работает
 * на любой машине и не зависит от Z:\.
 */
export const lebowski = localFont({
  src: [
    { path: "./fonts/Lebowski/Lebowski-Thin.woff2", weight: "100", style: "normal" },
    { path: "./fonts/Lebowski/Lebowski-ExtraLight.woff2", weight: "200", style: "normal" },
    { path: "./fonts/Lebowski/Lebowski-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/Lebowski/Lebowski-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Lebowski/Lebowski-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Lebowski/Lebowski-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Lebowski/Lebowski-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Lebowski/Lebowski-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "./fonts/Lebowski/Lebowski-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-lebowski",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
