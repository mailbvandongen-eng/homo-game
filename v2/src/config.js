// Alle afmetingen zijn in "wereldpixels": één tegel is 32 bij 32.
export const TILE = 32;
// Zoveel tegelrijen zijn verticaal in beeld, ongeacht het scherm.
export const VIEW_ROWS = 13;
// Vaste natuurkundige stap (120 Hz) voor voorspelbaar springen op elk apparaat.
export const STEP = 1 / 120;

export const PHYS = {
  walk: 150,          // loopsnelheid
  run: 238,           // rensnelheid na even vasthouden
  runDelay: 0.42,     // seconden vasthouden voordat je gaat rennen
  accel: 1050,
  airAccel: 800,
  friction: 1400,
  skid: 2300,         // afremmen bij omdraaien
  jumpV: 680,
  runJumpBonus: 55,
  gravUp: 1900,       // zwaartekracht omhoog terwijl springknop ingedrukt
  gravDown: 2700,     // zwaartekracht bij vallen
  gravCut: 5200,      // zwaartekracht als je de springknop loslaat (korte sprong)
  maxFall: 720,
  coyote: 0.1,        // nog springen net na de rand
  buffer: 0.13,       // sprong onthouden net voor de landing
  stompBounce: 470,
  stompBounceHeld: 700,
  springV: 930,
  hurtInvuln: 1.5,
};

export const START_LIVES = 5;
export const MAX_HEARTS = 3;
export const MAX_STONES = 9;
