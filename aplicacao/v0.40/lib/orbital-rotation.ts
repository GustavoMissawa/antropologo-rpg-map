type OrbitalRotation = {phase: number; speed: number};

export function advanceOrbitalRotation(rotation: OrbitalRotation, seconds: number, slow: boolean): OrbitalRotation {
  const target = slow ? 0.2 : 1;
  const timeConstant = slow ? 0.14 : 0.11;
  const difference = rotation.speed - target;
  const approached = -Math.expm1(-seconds / timeConstant);

  return {
    // Integrate the easing itself so the phase is continuous at either frame rate.
    phase: rotation.phase + target * seconds + difference * timeConstant * approached,
    speed: rotation.speed - difference * approached,
  };
}
