var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(
  60,
  innerWidth / innerHeight,
  0.1,
  500
);
camera.position.set(0, -25, 80);

const canvas = document.getElementById("three-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.maxDistance = 150;
controls.enableDamping = true;

// lanterns

let geoms = [];
let pts = [
  new THREE.Vector2(0, 1 - 0),
  new THREE.Vector2(0.25, 1 - 0),
  new THREE.Vector2(0.25, 1 - 0.125),
  new THREE.Vector2(0.45, 1 - 0.125),
  new THREE.Vector2(0.45, 1 - 0.95),
];
var geom = new THREE.LatheBufferGeometry(pts, 20);
geoms.push(geom);

var geomLight = new THREE.CylinderBufferGeometry(0.1, 0.1, 0.05, 20);
//geomLight.rotateX(Math.PI * 0.5);
geoms.push(geomLight);

var fullGeom = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms);

var instGeom = new THREE.InstancedBufferGeometry().copy(fullGeom);

var num = 500;
let instPos = []; //3
let instSpeed = []; //1
let instLight = []; // 2 (initial intensity, frequency)
for (let i = 0; i < num; i++) {
  instPos.push(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
  instSpeed.push(Math.random() * 0.25 + 1);
  instLight.push(Math.PI + Math.PI * Math.random(), Math.random() + 5);
}
instGeom.setAttribute(
  "instPos",
  new THREE.InstancedBufferAttribute(new Float32Array(instPos), 3)
);
instGeom.setAttribute(
  "instSpeed",
  new THREE.InstancedBufferAttribute(new Float32Array(instSpeed), 1)
);
instGeom.setAttribute(
  "instLight",
  new THREE.InstancedBufferAttribute(new Float32Array(instPos), 2)
);

var mat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uLight: { value: new THREE.Color("red").multiplyScalar(1.5) },
    uColor: { value: new THREE.Color("maroon").multiplyScalar(1) },
    uFire: { value: new THREE.Color(1, 0.75, 0) },
  },
  vertexShader: `
    uniform float uTime;

    attribute vec3 instPos;
    attribute float instSpeed;
    attribute vec2 instLight;

    varying vec2 vInstLight;
    varying float vY;
    
    void main() {
      
      vInstLight = instLight;
      vY = position.y;

      vec3 pos = vec3(position) * 2.;
      vec3 iPos = instPos * 200.;
      
      iPos.xz += vec2(
        cos(instLight.x + instLight.y * uTime),
        sin(instLight.x + instLight.y * uTime * fract(sin(instLight.x)))
      );

      iPos.y = mod(iPos.y + 100. + (uTime * instSpeed), 200.) - 100.;
      pos += iPos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
    }
`,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uLight;
    uniform vec3 uColor;
    uniform vec3 uFire;

    varying vec2 vInstLight;
    varying float vY;
    
    void main() {
      
      vec3 col = vec3(0);
      float t = vInstLight.x + (vInstLight.y * uTime * 10.);
      float ts = sin(t * 3.14) * 0.5 + 0.5;
      float tc = cos(t * 2.7) * 0.5 + 0.5;
      float f = smoothstep(0.12, 0.12 + (ts + tc) * 0.25, vY);
      float li = (0.5 + smoothstep(0., 1., ts * ts + tc * tc) * 0.5);
      col = mix(uLight * li, uColor * (0.75 + li * 0.25), f);

      col = mix(col, uFire, step(vY, 0.05) * (0.75 + li * 0.25));

      gl_FragColor = vec4(col, 1);
    }
`,
  side: THREE.DoubleSide,
});

var lantern = new THREE.Mesh(instGeom, mat);
scene.add(lantern);

// Koi

let oUs = [];

let loader = new THREE.STLLoader();
//https://clara.io/view/b47726c8-02cf-4eb5-b275-d9b2be591bad
loader.load("https://cywarr.github.io/small-shop/fish.stl", (objGeom) => {
  console.log(objGeom);
  //objGeom.rotateX(-MathPI * 0.5);

  // path
  let baseVector = new THREE.Vector3(40, 0, 0);
  let axis = new THREE.Vector3(0, 1, 0);
  let cPts = [];
  let cSegments = 6;
  let cStep = (Math.PI * 2) / cSegments;
  for (let i = 0; i < cSegments; i++) {
    cPts.push(
      new THREE.Vector3()
        .copy(baseVector)
        //.setLength(35 + (Math.random() - 0.5) * 5)
        .applyAxisAngle(axis, cStep * i)
        .setY(THREE.MathUtils.randFloat(-10, 10))
    );
  }
  let curve = new THREE.CatmullRomCurve3(cPts);
  curve.closed = true;

  console.log(curve);

  let numPoints = 511;
  let cPoints = curve.getSpacedPoints(numPoints);
  let cObjects = curve.computeFrenetFrames(numPoints, true);
  console.log(cObjects);
  let pGeom = new THREE.BufferGeometry().setFromPoints(cPoints);
  let pMat = new THREE.LineBasicMaterial({ color: "yellow" });
  let pathLine = new THREE.Line(pGeom, pMat);
  //scene.add(pathLine);

  // data texture
  let data = [];
  cPoints.forEach((v) => {
    data.push(v.x, v.y, v.z);
  });
  cObjects.binormals.forEach((v) => {
    data.push(v.x, v.y, v.z);
  });
  cObjects.normals.forEach((v) => {
    data.push(v.x, v.y, v.z);
  });
  cObjects.tangents.forEach((v) => {
    data.push(v.x, v.y, v.z);
  });

  let dataArray = new Float32Array(data);

  let tex = new THREE.DataTexture(
    dataArray,
    numPoints + 1,
    4,
    THREE.RGBFormat,
    THREE.FloatType
  );
  tex.magFilter = THREE.NearestFilter;
  console.log(tex);

  objGeom.center();
  objGeom.rotateX(-Math.PI * 0.5);
  objGeom.scale(0.5, 0.5, 0.5);
  let objBox = new THREE.Box3().setFromBufferAttribute(
    objGeom.getAttribute("position")
  );
  let objSize = new THREE.Vector3();
  objBox.getSize(objSize);
  //objGeom.translate(0, 0, objBox.z);

  objUniforms = {
    uSpatialTexture: { value: tex },
    uTextureSize: { value: new THREE.Vector2(numPoints + 1, 4) },
    uTime: { value: 0 },
    uLengthRatio: { value: objSize.z / curve.cacheArcLengths[200] }, // more or less real lenght along the path
    uObjSize: { value: objSize }, // lenght
  };
  oUs.push(objUniforms);

  let objMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    wireframe: true,
  });
  objMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSpatialTexture = objUniforms.uSpatialTexture;
    shader.uniforms.uTextureSize = objUniforms.uTextureSize;
    shader.uniforms.uTime = objUniforms.uTime;
    shader.uniforms.uLengthRatio = objUniforms.uLengthRatio;
    shader.uniforms.uObjSize = objUniforms.uObjSize;

    shader.vertexShader =
      `
      uniform sampler2D uSpatialTexture;
      uniform vec2 uTextureSize;
      uniform float uTime;
      uniform float uLengthRatio;
      uniform vec3 uObjSize;

      struct splineData {
        vec3 point;
        vec3 binormal;
        vec3 normal;
      };

      splineData getSplineData(float t){
        float step = 1. / uTextureSize.y;
        float halfStep = step * 0.5;
        splineData sd;
        sd.point    = texture2D(uSpatialTexture, vec2(t, step * 0. + halfStep)).rgb;
        sd.binormal = texture2D(uSpatialTexture, vec2(t, step * 1. + halfStep)).rgb;
        sd.normal   = texture2D(uSpatialTexture, vec2(t, step * 2. + halfStep)).rgb;
        return sd;
      }
  ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>

      vec3 pos = position;

      float wStep = 1. / uTextureSize.x;
      float hWStep = wStep * 0.5;

      float d = pos.z / uObjSize.z;
      float t = fract((uTime * 0.1) + (d * uLengthRatio));
      float numPrev = floor(t / wStep);
      float numNext = numPrev + 1.;
      //numNext = numNext > (uTextureSize.x - 1.) ? 0. : numNext;
      float tPrev = numPrev * wStep + hWStep;
      float tNext = numNext * wStep + hWStep;
      //float tDiff = tNext - tPrev;
      splineData splinePrev = getSplineData(tPrev);
      splineData splineNext = getSplineData(tNext);

      float f = (t - tPrev) / wStep;
      vec3 P = mix(splinePrev.point, splineNext.point, f);
      vec3 B = mix(splinePrev.binormal, splineNext.binormal, f);
      vec3 N = mix(splinePrev.normal, splineNext.normal, f);

      transformed = P + (N * pos.x) + (B * pos.y);
  `
    );
    //console.log(shader.vertexShader);
  };
  let obj = new THREE.Mesh(objGeom, objMat);
  scene.add(obj);
});

var clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  controls.update();
  let t = clock.getElapsedTime();
  mat.uniforms.uTime.value = t;
  oUs.forEach((ou) => {
    ou.uTime.value = t;
  });
  renderer.render(scene, camera);
});
