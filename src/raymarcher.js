import {
  DepthTexture,
  GLSL3,
  MathUtils,
  Mesh,
  PlaneGeometry,
  RawShaderMaterial,
  UnsignedShortType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import lighting from './shaders/lighting.glsl';
import raymarcherFragment from './shaders/raymarcher.frag';
import raymarcherVertex from './shaders/raymarcher.vert';
import screenFragment from './shaders/screen.frag';
import screenVertex from './shaders/screen.vert';

const _size = new Vector2();

class Raymarcher extends Mesh {
  constructor({
  } = {}) {
    const plane = new PlaneGeometry(2, 2, 1, 1);
    plane.deleteAttribute('normal');
    plane.deleteAttribute('uv');
    const target = new WebGLRenderTarget(1, 1, { depthTexture: new DepthTexture(1, 1, UnsignedShortType) });
    const screen = new RawShaderMaterial({
      glslVersion: GLSL3,
      transparent: false,
      vertexShader: screenVertex,
      fragmentShader: screenFragment,
      uniforms: {
        colorTexture: { value: target.texture },
        depthTexture: { value: target.depthTexture },
      },
    });
    super(plane, screen);
    const material = new RawShaderMaterial({
      glslVersion: GLSL3,
      transparent: false,
      vertexShader: raymarcherVertex,
      fragmentShader: raymarcherFragment.replace('#include <lighting>', lighting),
      defines: {
        MAX_DISTANCE: '20.0',
        MAX_ITERATIONS: 200,
        MIN_COVERAGE: '0.02',
        MIN_DISTANCE: '0.005',
      },
      uniforms: {
        time: { value: 0 },
        cameraDirection: { value: new Vector3() },
        cameraFar: { value: 0 },
        cameraFov: { value: 0 },
        cameraNear: { value: 0 },
        resolution: { value: new Vector2() },
      },
    });
    const { defines, uniforms } = material;
    this.userData = {
      get time() {
        return uniforms.time.value;
      },
      set time(value) {
        uniforms.time.value = value;
      },
      resolution: 1,
      raymarcher: new Mesh(plane, material),
      target,
    };
    this.matrixAutoUpdate = this.userData.raymarcher.matrixAutoUpdate = false;
    this.frustumCulled = this.userData.raymarcher.frustumCulled = false;
  }

  dispose() {
    const { material, geometry, userData: { raymarcher, target } } = this;
    material.dispose();
    geometry.dispose();
    raymarcher.material.dispose();
    target.dispose();
    target.depthTexture.dispose();
    target.texture.dispose();
  }

  onBeforeRender(renderer, scene, camera) {
    const { userData: { resolution, raymarcher, target } } = this;
    const { material: { defines, uniforms } } = raymarcher;

    camera.getWorldDirection(uniforms.cameraDirection.value);
    uniforms.cameraFar.value = camera.far;
    uniforms.cameraFov.value = MathUtils.degToRad(camera.fov);
    uniforms.cameraNear.value = camera.near;

    renderer.getDrawingBufferSize(_size).multiplyScalar(resolution).floor();
    if (target.width !== _size.x || target.height !== _size.y) {
      target.setSize(_size.x, _size.y);
      uniforms.resolution.value.copy(_size);
    }

    const currentAutoClear = renderer.autoClear;
    const currentClearAlpha = renderer.getClearAlpha();
    const currentRenderTarget = renderer.getRenderTarget();
    const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
    const currentXrEnabled = renderer.xr.enabled;
    renderer.autoClear = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.xr.enabled = false;
    renderer.setClearAlpha(0);
    renderer.setRenderTarget(target);
    renderer.state.buffers.depth.setMask(true);

    renderer.clear();
    renderer.render(raymarcher, camera);

    renderer.autoClear = currentAutoClear;
    renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    renderer.xr.enabled = currentXrEnabled;
    renderer.setClearAlpha(currentClearAlpha);
    renderer.setRenderTarget(currentRenderTarget);
    if (camera.viewport) renderer.state.viewport(camera.viewport);
  }
}

export default Raymarcher;
