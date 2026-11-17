import { Skia } from '@shopify/react-native-skia';

/**
 * Holographic foil. The rainbow phase depends on pixel position *and* tilt, so
 * tilting the card slides the colour bands across it the way a diffraction
 * foil does. A cell-noise layer adds sparkles that switch on/off with tilt.
 * Output is premultiplied alpha, composited with normal src-over.
 */
const source = `
uniform vec2 size;
uniform vec2 tilt;
uniform float strength;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

half4 main(vec2 xy) {
  vec2 uv = xy / size;
  float d = uv.x * 0.9 + uv.y * 0.55 + tilt.x * 0.85 + tilt.y * 0.6;
  vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (d * 1.4 + vec3(0.0, 0.33, 0.67)));

  // Soft diagonal bands so the foil reads as stripes, not a flat tint.
  float band = pow(abs(sin(3.14159 * d * 3.0)), 3.0);

  // Sparkles: each 3px cell has a random phase; only a few are lit at a time.
  vec2 cell = floor(xy / 3.0);
  float phase = fract(hash(cell) + tilt.x * 1.9 + tilt.y * 1.3);
  float sparkle = smoothstep(0.975, 1.0, phase) * step(0.35, hash(cell + 7.0));

  float a = strength * (0.16 + 0.26 * band);
  vec3 col = rainbow * a + vec3(sparkle) * 0.85 * strength;
  float alpha = clamp(a + sparkle * 0.85 * strength, 0.0, 1.0);
  return half4(col, alpha);
}
`;

/** Null if the device's Skia build fails to compile the shader (foil is then skipped). */
export const foilEffect = Skia.RuntimeEffect.Make(source);
