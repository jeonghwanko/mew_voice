import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';

/** Keep the complete silhouette visible beside the narrow mobile controls. */
export function FitCamera() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.position.set(0, 1.15, Math.max(6.4, 4.2 / Math.max(0.2, size.width / size.height)));
      camera.updateProjectionMatrix(); invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);
  return null;
}
