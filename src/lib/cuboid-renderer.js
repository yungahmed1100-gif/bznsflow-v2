import { CUBOID_COLORS, cuboidPosition } from './hero-cuboids';

const vertexSource = `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec3 a_offset;
in vec3 a_color;
in float a_seed;
uniform vec3 u_rotation;
uniform float u_time;
uniform float u_squeeze;
uniform float u_aspect;
uniform float u_motion;
out vec3 v_color;
mat3 rotateY(float a) { return mat3(cos(a),0.,-sin(a),0.,1.,0.,sin(a),0.,cos(a)); }
mat3 rotateX(float a) { return mat3(1.,0.,0.,0.,cos(a),sin(a),0.,-sin(a),cos(a)); }
void main() {
  mat3 rotation = rotateY(u_rotation.y) * rotateX(u_rotation.x);
  vec3 local = a_position * vec3(.115, .19, .115);
  vec3 drift = vec3(sin(u_time*.6+a_seed), cos(u_time*.5+a_seed), sin(u_time*.4+a_seed)) * .055 * u_motion;
  vec3 position = rotation * (local + a_offset * (1. - u_squeeze * .16) + drift);
  float perspective = 7. / (7. - position.z);
  gl_Position = vec4(position.x * .285 * perspective / u_aspect, position.y * .285 * perspective, -position.z * .08, 1.);
  vec3 normal = rotation * a_normal;
  float light = .67 + .33 * max(dot(normal, normalize(vec3(-.4,.8,1.))),0.);
  v_color = a_color * light;
}`;

const fragmentSource = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 outColor;
void main() { outColor = vec4(v_color, 1.); }`;

function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    gl.deleteShader(result);
    throw new Error('cuboid_shader_unavailable');
  }
  return result;
}

export function createCuboidRenderer(canvas, count) {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!gl) return null;
  const vertex = shader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffers = [];
  const attribute = (name, data, size, divisor = 0, usage = gl.STATIC_DRAW) => {
    const buffer = gl.createBuffer();
    buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(location, divisor);
    return buffer;
  };
  const vertices = [], normals = [];
  const faces = [
    [[1,0,0], [[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],
    [[-1,0,0], [[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],
    [[0,1,0], [[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],
    [[0,-1,0], [[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],
    [[0,0,1], [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],
    [[0,0,-1], [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],
  ];
  for (const [normal, corners] of faces) {
    for (const i of [0,1,2,0,2,3]) { vertices.push(...corners[i]); normals.push(...normal); }
  }
  attribute('a_position', new Float32Array(vertices), 3);
  attribute('a_normal', new Float32Array(normals), 3);
  const offsets = new Float32Array(count * 3);
  const offsetBuffer = attribute('a_offset', offsets, 3, 1, gl.DYNAMIC_DRAW);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const color = CUBOID_COLORS[i % CUBOID_COLORS.length].slice(1);
    for (let j = 0; j < 3; j++) colors[i * 3 + j] = parseInt(color.slice(j * 2, j * 2 + 2), 16) / 255;
    seeds[i] = i * 2.39;
  }
  attribute('a_color', colors, 3, 1);
  attribute('a_seed', seeds, 1, 1);
  const shapes = Array.from({ length: 5 }, (_, stage) => Float32Array.from(Array.from({ length: count }, (_, i) => cuboidPosition(i, count, stage)).flat()));
  const uniforms = Object.fromEntries(['rotation','time','squeeze','aspect','motion'].map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);
  return {
    resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    draw(phase, time, pointer, squeeze, reduced) {
      const bounded = Math.max(0, Math.min(4, phase));
      const from = Math.floor(bounded), to = Math.min(4, from + 1), mix = bounded - from;
      for (let i = 0; i < offsets.length; i++) offsets[i] = shapes[from][i] + (shapes[to][i] - shapes[from][i]) * mix;
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, offsets);
      gl.uniform3f(uniforms.rotation, -.22 + pointer.y * .16, .32 + pointer.x * .25 + (reduced ? 0 : Math.sin(time * .18) * .15), 0);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.squeeze, squeeze);
      gl.uniform1f(uniforms.aspect, canvas.width / canvas.height);
      gl.uniform1f(uniforms.motion, reduced ? 0 : 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, count);
    },
    destroy() {
      for (const buffer of buffers) gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };
}
