import type { ScavengerHunt } from '@/types/hunt';
import { berkeleyKidsEyes } from './berkeley-kids-eyes';
import { oaklandBlackPanther } from './oakland-black-panther';
import { rigaOldTownWeekend } from './riga-old-town-weekend';
import { rigaZooWeekend } from './riga-zoo-weekend';
import { richmondRosie } from './richmond-rosie';
import { zklLatvianSchool75 } from './zkl-latvian-school-75';

export const SEED_HUNTS: ScavengerHunt[] = [
  rigaZooWeekend,
  rigaOldTownWeekend,
  zklLatvianSchool75,
  berkeleyKidsEyes,
  oaklandBlackPanther,
  richmondRosie,
];
