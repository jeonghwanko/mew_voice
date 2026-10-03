import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type MewIconName = 'home' | 'diary' | 'shop' | 'fish' | 'menu' | 'close' | 'mail' | 'notice' | 'help' | 'invite' | 'cat' | 'settings' | 'talk' | 'palette' | 'arrow';

/** Original 24px glyphs; color comes from the consuming surface, not the asset. */
export function MewIcon({ name, size = 24, color = '#566D58' }: { name: MewIconName; size?: number; color?: string }) {
  const paths: Record<MewIconName, React.ReactNode> = {
    home: <><Path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><Path d="M8 21v-8l4 2 4-2v8" /></>,
    diary: <><Rect x="5" y="3" width="15" height="18" rx="3" /><Path d="M3 7h4M3 12h4M3 17h4M10 17h6" /><Circle cx="13" cy="10" r="1.5" /><Path d="m10 7-.2-.5M13 6v-.5M16 7l.2-.5" /></>,
    shop: <><Path d="M4 9h16l-1-5H5ZM5 12v8h14v-8M9 20v-6h6v6M3 9v1a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9" /></>,
    fish: <><Path d="M6 12C10 5 17 5 22 12c-5 7-12 7-16 0Zm0 0L2 8v8ZM14 7l-2-3-3 4" /><Circle cx="17.5" cy="11" r=".6" fill={color} /></>,
    menu: <Path d="M4 6h16M4 12h16M4 18h16" />,
    close: <Path d="m6 6 12 12M6 18 18 6" />,
    mail: <><Rect x="3" y="5" width="18" height="14" rx="3" /><Path d="m4 7 8 6 8-6" /></>,
    notice: <><Path d="m4 10 14-5v14L4 14ZM4 10H2v4h2M6 15l2 6h3l-2-5M21 9v6" /></>,
    help: <><Circle cx="12" cy="12" r="9" /><Path d="M9 9a3 3 0 1 1 5 2.2c-1.5.8-2 1.2-2 2.3M12 17v.1" /></>,
    invite: <><Circle cx="9" cy="8" r="3" /><Path d="M3 20v-2a6 6 0 0 1 12 0v2M19 8v8M15 12h8" /></>,
    cat: <><Path d="M4 11V4l5 3h6l5-3v7c5 11-21 11-16 0Z" /><Path d="M8 12v1M16 12v1m-5 2 1 1 1-1M1 14l5 1m12 0 5-1" /></>,
    settings: <><Path d="M4 7h16M4 17h16" /><Circle cx="9" cy="7" r="3" fill="#FFFCF6" /><Circle cx="15" cy="17" r="3" fill="#FFFCF6" /></>,
    talk: <><Path d="M20 14a4 4 0 0 1-4 4H9l-5 3v-6a7 7 0 0 1-1-4 8 8 0 0 1 17 0Z" /><Path d="M8 10h.1M12 10h.1M16 10h.1" /></>,
    palette: <><Path d="M12 3a9 9 0 0 0 0 18c3 0 1-4 3-4h2c6 0 5-14-5-14Z" /><Circle cx="7" cy="11" r="1" /><Circle cx="10" cy="7" r="1" /><Circle cx="15" cy="7" r="1" /><Circle cx="18" cy="11" r="1" /></>,
    arrow: <Path d="m9 5 7 7-7 7" />,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{paths[name]}</Svg>;
}
