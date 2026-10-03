/* eslint-disable react/no-unknown-property -- JSX here targets the Three.js renderer. */
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { AnimationMixer, Box3, Group, LoopOnce, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { type Appearance, type CatMood } from './appearance';

// Metro resolves bundled GLB assets through require on both native and web.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const asset = require('../../../assets/avatar/v13-sit-stand/v13-sit-stand.glb');
export function clearCatAsset() { useLoader.clear(GLTFLoader, asset as string); }

type Props = { appearance: Appearance; mood: CatMood; reducedMotion: boolean; standing?: boolean; onPet?: () => void };
export function CatModel({ appearance, reducedMotion, standing = false, onPet }: Props) {
  const gltf = useLoader(GLTFLoader, asset as string);
  const root = useRef<Group>(null);
  const time = useRef(0);
  const invalidate = useThree(state => state.invalidate);
  const model = useMemo(() => {
    const scene = clone(gltf.scene);
    const materials: MeshStandardMaterial[] = [];
    scene.traverse(object => {
      if (object instanceof Mesh) {
        const copies = (Array.isArray(object.material) ? object.material : [object.material]).map(material => {
          const copy = material.clone() as MeshStandardMaterial; materials.push(copy); return copy;
        });
        object.material = Array.isArray(object.material) ? copies : copies[0];
      }
    });
    const mixer = new AnimationMixer(scene);
    const clip = gltf.animations.find(clip => clip.name === 'Animation');
    if (!clip) throw new Error('Missing sit/stand animation');
    const action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play();
    mixer.setTime(0); scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene, true);
    mixer.setTime(2); scene.updateMatrixWorld(true);
    box.union(new Box3().setFromObject(scene, true));
    mixer.setTime(0); scene.updateMatrixWorld(true);
    const size = box.getSize(new Vector3()), center = box.getCenter(new Vector3());
    return { scene, materials, mixer, clip, scale: 2.65 / size.y, offset: [-center.x, -box.min.y, -center.z] as [number, number, number] };
  }, [gltf]);
  useEffect(() => {
    time.current = 0; model.mixer.clipAction(model.clip).play(); model.mixer.setTime(0); invalidate();
    return () => { model.mixer.stopAllAction(); model.materials.forEach(material => material.dispose()); };
  }, [model, invalidate]);
  useEffect(() => {
    if (reducedMotion) { time.current = standing ? 2 : 0; model.mixer.setTime(time.current); }
    invalidate();
  }, [standing, reducedMotion, model, invalidate]);
  useFrame((_, delta) => {
    const difference = (standing ? 2 : 0) - time.current;
    if (Math.abs(difference) > 0.00001) {
      time.current += Math.sign(difference) * Math.min(Math.abs(difference), Math.min(delta, 0.05));
      model.mixer.setTime(time.current);
    }
    if (root.current) {
      root.current.rotation.y = appearance.turn;
    }
  });
  return <group ref={root} onClick={onPet}>
    <group scale={model.scale}><primitive object={model.scene} position={model.offset} dispose={null} /></group>
  </group>;
}

export function StudioScene(props: Props) {
  return <>
    <ambientLight intensity={0.7} />
    <hemisphereLight args={['#FFF6E9', '#979F85', 1.2]} />
    <directionalLight position={[-3, 5, 5]} intensity={2.7} color="#FFF4E3" />
    <directionalLight position={[4, 2, -3]} intensity={1.3} color="#DAE9E0" />
    <group position={[0, -1.28, 0]}>
      <mesh position={[0, -0.08, 0]}><cylinderGeometry args={[1.55, 1.62, 0.13, 64]} /><meshStandardMaterial color="#D9DCCC" roughness={1} /></mesh>
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[0.08, -0.006 + i * 0.001, 0.03]} rotation={[-Math.PI / 2, 0, 0]} scale={[1 - i * 0.09, 0.58 - i * 0.045, 1]}>
        <circleGeometry args={[1, 48]} /><meshBasicMaterial color="#535B49" transparent opacity={0.035} depthWrite={false} />
      </mesh>)}
      <Suspense fallback={null}><CatModel {...props} /></Suspense>
    </group>
  </>;
}
