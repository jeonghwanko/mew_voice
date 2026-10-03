import { Canvas } from '@react-three/fiber/native';
import { StudioScene } from './CatModel';
import { FitCamera } from './FitCamera';
import type { Appearance, CatMood } from './appearance';

export type StageProps = { appearance: Appearance; mood: CatMood; reducedMotion: boolean; active: boolean; standing?: boolean; onPet?: () => void };
export default function StageCanvas({ active, ...props }: StageProps) {
  return <Canvas camera={{ position: [0, 1.15, 6.4], fov: 34 }} frameloop={active && !props.reducedMotion ? 'always' : 'demand'} gl={{ antialias: true, alpha: true }}>
    <FitCamera /><StudioScene {...props} />
  </Canvas>;
}
