import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

export type IconName = "pot" | "barcode" | "plate" | "drop" | "pill" | "home" | "journal" | "more" | "walk" | "family" | "report" | "settings" | "care" | "lock";

/** Iconițe desenate, în linie, 2 px: același stil peste tot, nu emoji. */
export function Icon({ name, size = 28, color = "#14202B", strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const s = { width: size, height: size, viewBox: "0 0 24 24" };
  switch (name) {
    case "barcode": return <Svg {...s}><Path {...p} d="M3 6V4h2M19 4h2v2M21 18v2h-2M5 20H3v-2" /><Line {...p} x1="7" y1="8" x2="7" y2="16" /><Line {...p} x1="10" y1="8" x2="10" y2="16" /><Line {...p} x1="13" y1="8" x2="13" y2="16" strokeWidth={strokeWidth * 1.6} /><Line {...p} x1="17" y1="8" x2="17" y2="16" /></Svg>;
    case "plate": return <Svg {...s}><Circle {...p} cx="12" cy="12" r="5.5" /><Path {...p} d="M3.5 3v4.5a1.5 1.5 0 0 0 3 0V3M5 3v18" /><Path {...p} d="M20.5 3c-1.4 1.6-1.9 4.5-1.9 8V21M18.6 13h1.9" /></Svg>;
    case "drop": return <Svg {...s}><Path {...p} d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /><Path {...p} d="M9.5 14.5a2.5 2.5 0 0 0 2 2.3" opacity={0.6} /></Svg>;
    case "pill": return <Svg {...s}><Circle {...p} cx="12" cy="12" r="8.5" /><Line {...p} x1="6" y1="12" x2="18" y2="12" /><Line {...p} x1="12" y1="12" x2="12" y2="18" opacity={0.6} /></Svg>;
    case "home": return <Svg {...s}><Path {...p} d="M3 11l9-7 9 7" /><Path {...p} d="M5 10v10h5v-6h4v6h5V10" /></Svg>;
    case "journal": return <Svg {...s}><Rect {...p} x="5" y="3" width="14" height="18" rx="2" /><Line {...p} x1="9" y1="8" x2="15" y2="8" /><Line {...p} x1="9" y1="12" x2="15" y2="12" /><Line {...p} x1="9" y1="16" x2="13" y2="16" /></Svg>;
    case "more": return <Svg {...s}><Line {...p} x1="4" y1="7" x2="20" y2="7" /><Line {...p} x1="4" y1="12" x2="20" y2="12" /><Line {...p} x1="4" y1="17" x2="20" y2="17" /></Svg>;
    case "walk": return <Svg {...s}><Circle {...p} cx="13" cy="4" r="1.8" /><Path {...p} d="M10 21l2-7-2-2v-4l3-1 2 3 3 1M8 13l-2 4M14 14l3 6" /></Svg>;
    case "family": return <Svg {...s}><Circle {...p} cx="9" cy="8" r="3" /><Circle {...p} cx="17" cy="10" r="2.2" /><Path {...p} d="M3 20a6 6 0 0 1 12 0M14 20a4 4 0 0 1 7 0" /></Svg>;
    case "report": return <Svg {...s}><Path {...p} d="M7 3h7l4 4v14H7z" /><Path {...p} d="M14 3v4h4" /><Path {...p} d="M10 15l2-3 2 2 2-4" /></Svg>;
    case "settings": return <Svg {...s}><Circle {...p} cx="12" cy="12" r="3" /><Path {...p} d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></Svg>;
    case "care": return <Svg {...s}><Path {...p} d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></Svg>;
    case "pot": return <Svg {...s}><Path {...p} d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6z" /><Path {...p} d="M2 10h20M8 10V8M16 10V8M9 5c0-1 1-1 1-2M13 5c0-1 1-1 1-2" /></Svg>;
    case "lock": return <Svg {...s}><Rect {...p} x="5" y="11" width="14" height="10" rx="2" /><Path {...p} d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
  }
}
