import { orbitalRandom, orbitalSeed } from './orbital-noise.ts';

type CentralProfile = {
  label: string;
  weight: number;
  colors: readonly [string, string, string];
  temperature: readonly [number, number] | null;
  radius: number;
  corona: number;
  glow: number;
};

// These are artistic encounter weights and sizes in map units.
export const centralProfiles = {
  'sun-like': {label:'Estrela amarela',weight:25,colors:['#fff3c2','#ffbf67','#a75227'],temperature:[5200,6150],radius:54,corona:2.06,glow:.66},
  'blue-white': {label:'Estrela branco-azulada',weight:14,colors:['#e8f6ff','#87b8ff','#294e99'],temperature:[9200,21600],radius:57,corona:2.28,glow:.69},
  'red-giant': {label:'Gigante vermelha',weight:10,colors:['#ffcc89','#ee673e','#8a231f'],temperature:[3150,4550],radius:62,corona:2.04,glow:.61},
  'red-dwarf': {label:'Anã vermelha',weight:19,colors:['#ffd0a2','#d9523a','#6a2029'],temperature:[2500,3700],radius:35,corona:1.79,glow:.55},
  'brown-dwarf': {label:'Anã marrom',weight:11,colors:['#e4a783','#8a4b42','#3a2334'],temperature:[820,2250],radius:34,corona:1.66,glow:.34},
  'white-dwarf': {label:'Anã branca',weight:10,colors:['#f7fbff','#c6dfed','#6992be'],temperature:[9000,34000],radius:24,corona:2.14,glow:.72},
  pulsar: {label:'Pulsar',weight:5,colors:['#ecefff','#91a7f7','#494f99'],temperature:[340000,1050000],radius:18,corona:2.35,glow:.64},
  magnetar: {label:'Magnetar',weight:3,colors:['#f7eaff','#d68be7','#6b3e91'],temperature:[1200000,4800000],radius:21,corona:2.22,glow:.63},
  'black-hole': {label:'Buraco negro',weight:3,colors:['#fff0cc','#f4a46e','#73354d'],temperature:null,radius:34.5,corona:2.48,glow:.52},
} as const satisfies Record<string, CentralProfile>;

export type CentralArchetype = keyof typeof centralProfiles;
const kinds = Object.keys(centralProfiles) as CentralArchetype[];
const totalWeight = kinds.reduce((sum, kind) => sum + centralProfiles[kind].weight, 0);

export function describeCentralObject(seed: number) {
  const random = orbitalRandom(orbitalSeed(seed ^ 0xa5c138db));
  let roll = random() * totalWeight;
  const archetype = kinds.find(kind => (roll -= centralProfiles[kind].weight) < 0) ?? 'sun-like';
  const {radius, temperature} = centralProfiles[archetype];
  return {
    archetype,
    mapRadius: radius * (.96 + .08 * random()),
    temperatureK: temperature ? Math.round(temperature[0] + (temperature[1]-temperature[0]) * random()) : null,
    axis: -37 + random() * 74,
  };
}

export type CentralObject = ReturnType<typeof describeCentralObject>;
