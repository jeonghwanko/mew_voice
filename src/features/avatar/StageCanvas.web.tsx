import { Canvas } from '@react-three/fiber';
import { StudioScene } from './CatModel';
import { FitCamera } from './FitCamera';
import type { Appearance, CatMood } from './appearance';

type StageProps = { appearance: Appearance; mood: CatMood; reducedMotion: boolean; active: boolean; standing?: boolean; onPet?: () => void };
export default function StageCanvas({ active, ...props }: StageProps) {
  return <Canvas camera={{ position: [0, 1.15, 6.4], fov: 34 }} dpr={[1, 1.5]} frameloop={active && !props.reducedMotion ? 'always' : 'demand'} gl={{ antialias: true, alpha: true }}>
    <FitCamera /><StudioScene {...props} />
  </Canvas>;
}
