precision highp float;
precision highp int;

struct SDF {
  float distance;
  vec3 color;
};

out vec4 fragColor;
in vec3 ray;

uniform float time;
uniform vec3 cameraDirection;
uniform float cameraFar;
uniform float cameraFov;
uniform float cameraNear;
uniform vec3 cameraPosition;

#define saturate(a) clamp(a, 0.0, 1.0)
#define texture2D texture
#include <encodings_pars_fragment>
#include <lighting>

float sdSphere(const in vec3 p, const in float r) {
  return length(p)-r;
}

SDF map(const in vec3 p) {
  float distance = sdSphere(p, 1.0);
  vec3 color = vec3(0.5);

  return SDF(distance, color);
}

vec3 getNormal(const in vec3 p, const in float d) {
  const vec2 o = vec2(0.001, 0);
  return normalize(
    d - vec3(
      map(p - o.xyy).distance,
      map(p - o.yxy).distance,
      map(p - o.yyx).distance
    )
  );
}

void march(inout vec4 color, inout float distance) {
  for (int i = 0; i < MAX_ITERATIONS && distance < MAX_DISTANCE; i++) {
    vec3 position = cameraPosition + ray * distance;

    SDF step = map(position);
    if (step.distance <= MIN_DISTANCE) {
      color = vec4(getLight(position, getNormal(position, step.distance), step.color), 1.0);
      break;
    }
    distance += step.distance;
  }
}

void main() {
  vec4 color = vec4(0.0);
  float distance = cameraNear;
  march(color, distance);
  fragColor = saturate(LinearTosRGB(color));
  float z = (distance >= MAX_DISTANCE) ? cameraFar : (distance * dot(cameraDirection, ray));
  float ndcDepth = -((cameraFar + cameraNear) / (cameraNear - cameraFar)) + ((2.0 * cameraFar * cameraNear) / (cameraNear - cameraFar)) / z;
  gl_FragDepth = ((gl_DepthRange.diff * ndcDepth) + gl_DepthRange.near + gl_DepthRange.far) / 2.0;
}
