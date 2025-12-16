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

// FXAA Implementation
// Optimized for WebGL
#define FXAA_SPAN_MAX 8.0
#define FXAA_REDUCE_MUL   (1.0/8.0)
#define FXAA_REDUCE_MIN   (1.0/128.0)

vec3 applyFXAA(vec3 colorInput, vec2 uv) {
    vec2 inverseVP = 1.0 / uResolution;
    vec3 rgbNW = texture(tDiffuse, uv + (vec2(-1.0, -1.0) * inverseVP)).xyz;
    vec3 rgbNE = texture(tDiffuse, uv + (vec2(1.0, -1.0) * inverseVP)).xyz;
    vec3 rgbSW = texture(tDiffuse, uv + (vec2(-1.0, 1.0) * inverseVP)).xyz;
    vec3 rgbSE = texture(tDiffuse, uv + (vec2(1.0, 1.0) * inverseVP)).xyz;
    vec3 rgbM  = colorInput;

    vec3 luma = vec3(0.299, 0.587, 0.114);
    float lumaNW = dot(rgbNW, luma);
    float lumaNE = dot(rgbNE, luma);
    float lumaSW = dot(rgbSW, luma);
    float lumaSE = dot(rgbSE, luma);
    float lumaM  = dot(rgbM,  luma);

    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);

    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
          max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
          dir * rcpDirMin)) * inverseVP;

    vec3 rgbA = 0.5 * (
        texture(tDiffuse, uv + dir * (1.0 / 3.0 - 0.5)).xyz +
        texture(tDiffuse, uv + dir * (2.0 / 3.0 - 0.5)).xyz);

    vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture(tDiffuse, uv + dir * -0.5).xyz +
        texture(tDiffuse, uv + dir * 0.5).xyz);

    float lumaB = dot(rgbB, luma);
    if ((lumaB < lumaMin) || (lumaB > lumaMax)) {
        return rgbA;
    } else {
        return rgbB;
    }
}

void main() {
    vec4 texColor = texture(tDiffuse, vUv);
    vec3 color = texColor.rgb;

    // Apply FXAA first if enabled (smoothing edges before other effects usually better)
    if (uFxaaEnabled) {
        color = applyFXAA(color, vUv);
    }

    // Apply Bloom
    if (uBloomEnabled) {
        color = applyBloom(color, vUv);
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
