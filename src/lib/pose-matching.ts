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

    case 'pool-laugh': {
      // Both hands behind head — wrists near ears, above shoulders
      const ref = leftEar ?? rightEar ?? nose;
      if (!ref) return 0;
      const l = near(leftWrist,  ref, sw * 1.5);
      const r = near(rightWrist, ref, sw * 1.5);
      return (l + r) / 2;
    }

    case 'fists-chin': {
      // Both fists under chin — wrists near nose/mouth level, close together
      const ref = nose ?? leftShoulder;
      if (!ref || !leftWrist || !rightWrist) return 0;
      const proximity = (near(leftWrist, ref, sw * 2) + near(rightWrist, ref, sw * 2)) / 2;
      const together  = clamp(1 - dist(leftWrist, rightWrist) / (sw * 1.5));
      return proximity * 0.6 + together * 0.4;
    }

    case 'point-forward': {
      // Both arms extended forward at roughly shoulder height — wrists far from body, spread wide
      if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return 0;
      const spread      = Math.abs(leftWrist.x - rightWrist.x);
      const spreadScore = clamp((spread - sw * 0.8) / (sw * 2));
      // Wrists near shoulder height (not above, not below)
      const lLevel = clamp(1 - Math.abs(leftWrist.y  - leftShoulder.y)  / (sw * 1.2));
      const rLevel = clamp(1 - Math.abs(rightWrist.y - rightShoulder.y) / (sw * 1.2));
      return spreadScore * 0.5 + ((lLevel + rLevel) / 2) * 0.5;
    }

    case 'sus': {
      // One finger near mouth/chin — same as thinking but tighter zone
      const ref = nose ?? leftShoulder;
      if (!ref) return 0;
      return Math.max(near(rightWrist, ref, sw * 1.2), near(leftWrist, ref, sw * 1.2));
    }

    case 'victory': {
      // Both fists pumped up — both wrists high above shoulders
      if (!leftWrist || !leftShoulder || !rightWrist || !rightShoulder) return 0;
      const l = clamp((leftShoulder.y  - leftWrist.y  + sw * 0.5) / (sw * 1.5));
      const r = clamp((rightShoulder.y - rightWrist.y + sw * 0.5) / (sw * 1.5));
      return (l + r) / 2;
    }

    case 'hands-on-head': {
      // Both hands on top of head — wrists near ears/top of head, close to each other
      const ref = nose ?? leftEar ?? rightEar;
      if (!ref || !leftWrist || !rightWrist) return 0;
      const proximity = (near(leftWrist, ref, sw * 1.5) + near(rightWrist, ref, sw * 1.5)) / 2;
      return proximity;
    }

    case 'finger-bite': {
      // One hand near mouth — wrist very close to nose
      const ref = nose ?? leftShoulder;
      if (!ref) return 0;
      return Math.max(near(rightWrist, ref, sw * 1.0), near(leftWrist, ref, sw * 1.0));
    }

    case 'arms-wide': {
      // Arms spread wide at shoulder height — maximum wrist spread
      if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return 0;
      const spread      = Math.abs(leftWrist.x - rightWrist.x);
      const spreadScore = clamp((spread - sw * 1.5) / (sw * 2));
      const lLevel      = clamp(1 - Math.abs(leftWrist.y  - leftShoulder.y)  / (sw * 1.5));
      const rLevel      = clamp(1 - Math.abs(rightWrist.y - rightShoulder.y) / (sw * 1.5));
      return spreadScore * 0.6 + ((lLevel + rLevel) / 2) * 0.4;
    }

    case 'shy': {
      // One hand scratching back of neck — wrist near ear
      const refL = leftEar  ?? nose;
      const refR = rightEar ?? nose;
      if (!refL && !refR) return 0;
      return Math.max(
        refL ? near(leftWrist,  refL, sw * 1.2) : 0,
        refR ? near(rightWrist, refR, sw * 1.2) : 0,
      );
    }

    case 'hair-flip': {
      // One hand tucking hair behind ear — wrist near ear
      const refL = leftEar  ?? nose;
      const refR = rightEar ?? nose;
      if (!refL && !refR) return 0;
      return Math.max(
        refL ? near(leftWrist,  refL, sw * 1.4) : 0,
        refR ? near(rightWrist, refR, sw * 1.4) : 0,
      );
    }

    case 'chill': {
      // Both hands laced behind head — both wrists near ears, above shoulders
      const refL = leftEar  ?? nose;
      const refR = rightEar ?? nose;
      if (!refL || !refR || !leftWrist || !rightWrist) return 0;
      const l = near(leftWrist,  refL, sw * 1.5);
      const r = near(rightWrist, refR, sw * 1.5);
      return (l + r) / 2;
    }

    case 'me': {
      // Pointing at yourself — one wrist near chest (between chin and belly)
      const ref = leftShoulder && rightShoulder
        ? { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 + sw * 0.3, score: 1, name: 'chest' }
        : leftShoulder ?? rightShoulder;
      if (!ref) return 0;
      return Math.max(near(rightWrist, ref as KP, sw * 1.5), near(leftWrist, ref as KP, sw * 1.5));
    }

    case 'heart': {
      // Both hands forming a heart at chest — wrists close together at mid-body
      if (!leftWrist || !rightWrist) return 0;
      const together = clamp(1 - dist(leftWrist, rightWrist) / (sw * 1.2));
      const ref = leftShoulder ?? rightShoulder;
      const heightScore = ref
        ? clamp(1 - Math.abs((leftWrist.y + rightWrist.y) / 2 - ref.y) / (sw * 1.5))
        : 0.5;
      return together * 0.7 + heightScore * 0.3;
    }

    case 'timeout': {
      // T sign — wrists close horizontally, one above the other
      if (!leftWrist || !rightWrist) return 0;
      const vDiff = Math.abs(leftWrist.y - rightWrist.y);
      const hDiff = Math.abs(leftWrist.x - rightWrist.x);
      // T shape: wrists stacked vertically (small horizontal gap) at chest height
      const stackScore = clamp(1 - hDiff / (sw * 1.5)) * clamp(vDiff / (sw * 0.8));
      return stackScore;
    }

    case 'monkey-omg': {
      // Both hands clasped at chest — wrists together at chest level
      if (!leftWrist || !rightWrist) return 0;
      const together = clamp(1 - dist(leftWrist, rightWrist) / (sw * 1.0));
      return together;
    }

    case 'thumbs-up': {
      // Thumbs up at chest — one wrist at chest/shoulder height, not raised overhead
      const ref = leftShoulder ?? rightShoulder;
      if (!ref) return 0;
      const lScore = leftWrist  ? clamp(1 - Math.abs(leftWrist.y  - ref.y) / (sw * 1.2)) : 0;
      const rScore = rightWrist ? clamp(1 - Math.abs(rightWrist.y - ref.y) / (sw * 1.2)) : 0;
      return Math.max(lScore, rScore);
    }

    default:
      return 0;
  }
}
