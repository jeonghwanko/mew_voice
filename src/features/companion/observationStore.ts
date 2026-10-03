import { changeDemo, type DemoObservation } from './demo';

export type RemovedDemoObservation = Pick<DemoObservation, 'localPhotoUri' | 'localAudioUri' | 'localVideoUri'>;

/**
 * Remove one photo, cry, or video observation.
 * Reactions saved on that observation go with it. Nothing is inserted in its place.
 * The cat, other observations, care check-ins, and saved questions stay.
 * Stored conversation text is left untouched. A missing row is already gone.
 */
export async function deleteDemoObservation(id: string): Promise<RemovedDemoObservation | null> {
  return changeDemo(data => {
    const existing = data.observations.find(item => item.id === id);
    if (!existing) return null;
    data.observations = data.observations.filter(item => item.id !== id);
    data.feedback = data.feedback.filter(item => item.observationId !== id);
    return { localPhotoUri: existing.localPhotoUri, localAudioUri: existing.localAudioUri, localVideoUri: existing.localVideoUri };
  });
}
