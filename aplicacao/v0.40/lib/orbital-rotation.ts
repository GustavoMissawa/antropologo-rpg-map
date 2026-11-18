import type {Point3} from './hero-die-geometry';

type OrbitalRotation = {phase: number; speed: number};

export function advanceOrbitalRotation(rotation: OrbitalRotation, seconds: number, slow: boolean, manual = false): OrbitalRotation {
  const target = manual ? 0 : slow ? 0.2 : 1;
  const timeConstant = manual ? 0.085 : slow ? 0.14 : 0.11;
  const difference = rotation.speed - target;
  const approached = -Math.expm1(-seconds / timeConstant);

  return {
    // Integrate the easing itself so the phase is continuous at either frame rate.
    phase: rotation.phase + target * seconds + difference * timeConstant * approached,
    speed: rotation.speed - difference * approached,
  };
}

type Quaternion = [x: number, y: number, z: number, w: number];
type Angles = {pitch: number; yaw: number};
type DieMotion = {
  orientation: Quaternion;
  automatic: OrbitalRotation;
  pending: Angles;
  velocity: Angles;
  lastInput: number | null;
};

const INITIAL_ANGLES: Point3 = [.51, .68, .26];
const stopped = {pitch: 0, yaw: 0};
const inputTimeConstant = .042;
const inertiaTimeConstant = .15;

function multiply([x, y, z, w]: Quaternion, [a, b, c, d]: Quaternion): Quaternion {
  return [
    w * a + x * d + y * c - z * b,
    w * b - x * c + y * d + z * a,
    w * c + x * b - y * a + z * d,
    w * d - x * a - y * b - z * c,
  ];
}

function automaticPose(phase: number): Quaternion {
  const [x, y, z] = INITIAL_ANGLES;
  const pitch = (x + Math.sin(phase * .42) * .47) / 2;
  const yaw = (y + phase * .57) / 2;
  const roll = (z + phase * .21) / 2;
  return multiply(
    [0, 0, Math.sin(roll), Math.cos(roll)],
    multiply([0, Math.sin(yaw), 0, Math.cos(yaw)], [Math.sin(pitch), 0, 0, Math.cos(pitch)]),
  );
}

export function createOrbitalDie(): DieMotion {
  return {orientation: automaticPose(0), automatic: {phase: 0, speed: 1}, pending: stopped, velocity: stopped, lastInput: null};
}

export function rotateOrbitalPoint([x, y, z]: Point3, [a, b, c, w]: Quaternion): Point3 {
  const u = 2 * (b * z - c * y);
  const v = 2 * (c * x - a * z);
  const t = 2 * (a * y - b * x);
  return [x + w * u + b * t - c * v, y + w * v + c * u - a * t, z + w * t + a * v - b * u];
}

export function beginOrbitalInput(die: DieMotion, now: number) {
  die.lastInput = now;
  die.velocity = stopped;
}

export function addOrbitalInput(die: DieMotion, pitch: number, yaw: number, now: number) {
  if (pitch === 0 && yaw === 0) return;
  die.pending = {pitch: die.pending.pitch + pitch, yaw: die.pending.yaw + yaw};
  if (die.lastInput === null) return;
  const seconds = Math.max(1 / 180, now - die.lastInput);
  const blend = -Math.expm1(-seconds / .045);
  const scale = Math.min(1 / seconds, 11 / Math.hypot(pitch, yaw));
  die.velocity = {
    pitch: die.velocity.pitch * (1 - blend) + pitch * scale * blend,
    yaw: die.velocity.yaw * (1 - blend) + yaw * scale * blend,
  };
  die.lastInput = now;
}

export function endOrbitalInput(die: DieMotion, now: number, fling: boolean) {
  const age = die.lastInput === null ? Infinity : Math.max(0, now - die.lastInput);
  const carry = fling ? .46 * Math.exp(-age / .07) : 0;
  die.velocity = {pitch: die.velocity.pitch * carry, yaw: die.velocity.yaw * carry};
  die.lastInput = null;
}

export function clearOrbitalInput(die: DieMotion) {
  die.lastInput = null;
  die.pending = stopped;
  die.velocity = stopped;
}

export function advanceOrbitalDie(die: DieMotion, seconds: number, slow: boolean, reduced: boolean) {
  const manual = die.lastInput !== null;
  const input = reduced ? 1 : -Math.expm1(-seconds / inputTimeConstant);
  let pitch = die.pending.pitch * input;
  let yaw = die.pending.yaw * input;
  die.pending = {pitch: die.pending.pitch - pitch, yaw: die.pending.yaw - yaw};

  let pose = die.orientation;
  if (!reduced) {
    const before = automaticPose(die.automatic.phase);
    die.automatic = advanceOrbitalRotation(die.automatic, seconds, slow, manual);
    const [x, y, z, w] = before;
    // Apply only the incremental automatic turn to the orientation left by the user.
    const delta = multiply(automaticPose(die.automatic.phase), [-x, -y, -z, w]);
    pose = multiply(delta, pose);
    if (!manual) {
      const decayed = -Math.expm1(-seconds / inertiaTimeConstant);
      pitch += die.velocity.pitch * inertiaTimeConstant * decayed;
      yaw += die.velocity.yaw * inertiaTimeConstant * decayed;
      die.velocity = {pitch: die.velocity.pitch * (1 - decayed), yaw: die.velocity.yaw * (1 - decayed)};
    }
  } else {
    die.velocity = stopped;
  }

  const angle = Math.hypot(pitch, yaw);
  if (angle > 0) {
    const scale = Math.sin(angle / 2) / angle;
    pose = multiply([pitch * scale, yaw * scale, 0, Math.cos(angle / 2)], pose);
  }
  const length = Math.hypot(...pose);
  die.orientation = [pose[0] / length, pose[1] / length, pose[2] / length, pose[3] / length];
}

const surgeAxisLength = Math.hypot(.42, .8, .43);

/** The transformation adds a turn around the current pose, without resetting its orientation. */
export function turnOrbitalDie(die: DieMotion, angle: number) {
  const scale = Math.sin(angle / 2) / surgeAxisLength;
  die.orientation = multiply([.42 * scale, .8 * scale, .43 * scale, Math.cos(angle / 2)], die.orientation);
}
