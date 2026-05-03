import type { Keypoint } from '@tensorflow-models/pose-detection';

type KP = Keypoint & { name: string };

function get(kps: KP[], name: string): KP | undefined {
  return kps.find(k => k.name === name && (k.score ?? 0) > 0.05);
}

function dist(a: KP, b: KP): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function scorePose(memeId: string, keypoints: Keypoint[]): number {
  const kps = keypoints as KP[];

  const nose          = get(kps, 'nose');
  const leftShoulder  = get(kps, 'left_shoulder');
  const rightShoulder = get(kps, 'right_shoulder');
  const leftWrist     = get(kps, 'left_wrist');
  const rightWrist    = get(kps, 'right_wrist');
  const leftHip       = get(kps, 'left_hip');
  const rightHip      = get(kps, 'right_hip');
  const leftEar       = get(kps, 'left_ear');
  const rightEar      = get(kps, 'right_ear');

  // Use a big fallback so nothing divides by zero on tiny/far bodies
  const sw = leftShoulder && rightShoulder
    ? Math.abs(leftShoulder.x - rightShoulder.x)
    : 150;

  // Score: 0 at shoulder level, 1.0 when wrist is ~0.67×sw above shoulder
  function aboveShoulder(wrist: KP | undefined, shoulder: KP | undefined): number {
    if (!wrist || !shoulder) return 0;
    // sw*0.5 offset: wrist must be clearly above shoulder to reach 0.40 threshold
    return clamp((shoulder.y - wrist.y + sw * 0.5) / (sw * 1.5));
  }

  // Score: 1.0 at zero distance, 0.0 at `range`
  function near(wrist: KP | undefined, ref: KP | undefined, range: number): number {
    if (!wrist || !ref) return 0;
    return clamp(1 - dist(wrist, ref) / range);
  }

  switch (memeId) {

    case 'point-up': {
      // One arm raised — wrist at or above shoulder is enough
      return Math.max(aboveShoulder(rightWrist, rightShoulder), aboveShoulder(leftWrist, leftShoulder));
    }

    case 'thinking': {
      // Hand must actually be near the face — tight zone so resting arms don't trigger
      const ref = nose ?? leftShoulder;
      if (!ref) return 0;
      return Math.max(near(rightWrist, ref, sw * 1.5), near(leftWrist, ref, sw * 1.5));
    }

    case 'hands-up': {
      // Use a more lenient offset so wrists at shoulder level already score ~0.47
      // (global aboveShoulder uses 0.5 which requires wrists above shoulder)
      if (!leftWrist || !leftShoulder || !rightWrist || !rightShoulder) return 0;
      const l = clamp((leftShoulder.y - leftWrist.y + sw * 0.7) / (sw * 1.5));
      const r = clamp((rightShoulder.y - rightWrist.y + sw * 0.7) / (sw * 1.5));
      return (l + r) / 2;
    }

    case 'shocked': {
      // Both hands near face — requires actually bringing hands up
      const ref = nose ?? leftShoulder;
      if (!ref) return 0;
      const l = near(leftWrist,  ref, sw * 1.5);
      const r = near(rightWrist, ref, sw * 1.5);
      return (l + r) / 2;
    }

    case 'chefs-kiss': {
      // One hand near collar/chest — tighter than face but looser than chin
      const ref = nose ?? leftShoulder ?? rightShoulder;
      if (!ref) return 0;
      return Math.max(near(rightWrist, ref, sw * 2), near(leftWrist, ref, sw * 2));
    }

    case 'vibing': {
      // Wrists spread apart at roughly shoulder height — lenient spread check
      if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return 0;
      const spread      = Math.abs(leftWrist.x - rightWrist.x);
      const spreadScore = clamp((spread - sw * 0.5) / (sw * 2));
      const lH          = aboveShoulder(leftWrist, leftShoulder);
      const rH          = aboveShoulder(rightWrist, rightShoulder);
      return spreadScore * 0.5 + ((lH + rH) / 2) * 0.5;
    }

    case 'side-eye': {
      if (leftEar && rightEar) {
        return clamp(Math.abs(leftEar.y - rightEar.y) / (sw * 0.3));
      }
      return 0;
    }

    case 'smug': {
      const r = rightHip ? near(rightWrist, rightHip, sw * 2)   : 0;
      const l = leftHip  ? near(leftWrist,  leftHip,  sw * 2)   : 0;
      return Math.max(r, l);
    }

    case 'judging': {
      if (!leftWrist || !rightWrist) return 0;
      return clamp(1 - dist(leftWrist, rightWrist) / (sw * 2));
    }

    case 'hype': {
      if (!nose) return 0;
      const l = clamp((nose.y - (leftWrist?.y  ?? nose.y + 1)) / sw);
      const r = clamp((nose.y - (rightWrist?.y ?? nose.y + 1)) / sw);
      return (l + r) / 2;
    }

    case 'nope': {
      return Math.max(aboveShoulder(rightWrist, rightShoulder), aboveShoulder(leftWrist, leftShoulder));
    }

    default:
      return 0;
  }
}
