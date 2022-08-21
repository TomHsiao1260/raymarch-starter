vec3 getLight(const in vec3 position, const in vec3 normal, const in vec3 color) {
  vec3 light = normalize(vec3(sin(time), 1.0, cos(time)));

  float amb = 0.5 + 0.5 * dot(normal, vec3(0.0, 1.0, 0.0));
  float dif = clamp(dot(normal, light), 0.0, 1.0);

  return color * (0.25 * amb + 0.75 * dif);
}
