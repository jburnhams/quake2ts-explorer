#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D tDiffuse;
uniform bool uBloomEnabled;
uniform float uBloomThreshold;
uniform float uBloomIntensity;
uniform bool uFxaaEnabled;
uniform vec2 uResolution;
uniform float uGamma;
uniform float uContrast;
uniform float uSaturation;
uniform float uBrightness;

// Helper function for luminance
float luminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

// Simple Bloom (Single pass, not very accurate but cheap)
vec3 applyBloom(vec3 color, vec2 uv) {
    // Very simple bloom by sampling neighbors
    vec3 bloom = vec3(0.0);
    vec2 pixelSize = 1.0 / uResolution;

    // 3x3 kernel
    for(int x = -2; x <= 2; x++) {
        for(int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * pixelSize * 2.0;
            vec3 sampleColor = texture(tDiffuse, uv + offset).rgb;
            float lum = luminance(sampleColor);
            if (lum > uBloomThreshold) {
                bloom += sampleColor;
            }
        }
    }

    return color + (bloom / 25.0) * uBloomIntensity;
}

// FXAA (Simplified)
// Based on basic FXAA logic or similar edge smoothing
vec3 applyFXAA(vec3 color, vec2 uv) {
    // FXAA implementation is complex, using a simple smoothing here as placeholder
    // or we can implement real FXAA logic.
    // For now, let's skip complex FXAA implementation in this file and assume standard render is ok,
    // or just implement a basic blur for now if FXAA is on.
    // Real FXAA requires more texture fetches.
    return color;
}

void main() {
    vec4 texColor = texture(tDiffuse, vUv);
    vec3 color = texColor.rgb;

    // Apply Bloom
    if (uBloomEnabled) {
        color = applyBloom(color, vUv);
    }

    // Apply FXAA (Placeholder)
    if (uFxaaEnabled) {
        // color = applyFXAA(color, vUv);
    }

    // Color Grading

    // Brightness
    color = color * uBrightness;

    // Contrast
    color = (color - 0.5) * uContrast + 0.5;

    // Saturation
    float lum = luminance(color);
    color = mix(vec3(lum), color, uSaturation);

    // Gamma
    color = pow(color, vec3(1.0 / uGamma));

    fragColor = vec4(color, texColor.a);
}
