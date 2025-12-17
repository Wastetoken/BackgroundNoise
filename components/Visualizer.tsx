import React, { useRef, useEffect } from 'react';
import { SynthsState, AudioData, ExportFormat, VisualMode } from '../types';

interface VisualizerProps {
  state: SynthsState;
  audio: AudioData;
  userImage: HTMLImageElement | null;
  onExportRef: (fn: (format: ExportFormat) => void) => void;
  onResetRef: (fn: () => void) => void;
}

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ] : [0,0,0];
}

const vsSource = `
  attribute vec4 aVertexPosition;
  attribute vec2 aTextureCoord;
  varying highp vec2 vTextureCoord;
  void main(void) {
    gl_Position = aVertexPosition;
    vTextureCoord = aTextureCoord;
  }
`;

const fsSimSource = `
  precision highp float;
  varying highp vec2 vTextureCoord;

  uniform float uTime;
  uniform float uTurbulence;
  uniform float uFlow;
  uniform float uColorShift;
  uniform float uGrain;
  uniform float uSharpness;
  uniform float uFeedback; 
  uniform bool uMotion;
  
  uniform float uBass; 
  uniform float uMid;  
  uniform float uHigh; 
  
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform int uMode; 
  uniform vec2 uResolution;
  uniform sampler2D uPrevFrame;
  uniform sampler2D uImage;
  uniform bool uHasTexture;
  uniform bool uIsFirstFrame;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }
  
  vec2 random2(vec2 p) {
      return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
  }

  float noise(in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(in vec2 st) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; ++i) {
      v += a * noise(st);
      st = rot * st * 2.0 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }
  
  float voronoi(in vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float m_dist = 1.0;
    for( int j=-1; j<=1; j++ ) {
        for( int i=-1; i<=1; i++ ) {
            vec2 g = vec2(float(i),float(j));
            vec2 o = random2( n + g );
            o = 0.5 + 0.5*sin( uTime + 6.2831*o );
            vec2 r = g + o - f;
            float d = length(r);
            m_dist = min(m_dist, d);
        }
    }
    return m_dist;
  }

  vec3 hueShift(vec3 color, float hue) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float cosAngle = cos(hue);
    return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));
  }
  
  void main(void) {
    vec2 uv = vTextureCoord;
    if (uIsFirstFrame) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    float totalEnergy = uBass + uMid + uHigh;
    float isActive = smoothstep(0.001, 0.02, totalEnergy + 0.01); 

    vec2 p = -1.0 + 2.0 * uv;
    p.x *= uResolution.x / uResolution.y;
    float t = uTime; 
    
    vec2 displacement = vec2(0.0);
    vec3 genColor = vec3(0.0);
    float pattern = 0.0;
    float drive = (0.01 + uTurbulence * 0.02) * (1.0 + uBass * 4.0);
    
    if (uMode == 0) { // VAPOR
        float n = fbm(p * 2.0 + vec2(0.0, t * 0.5));
        displacement.y = (0.005 + (uFlow * 0.02)) + (uBass * 0.01); 
        displacement.x = (n - 0.5) * drive;
        pattern = fbm(p * 3.0 + t * 0.2);
        genColor = mix(uColorA, uColorB, clamp(pattern + (uMid * 0.5), 0.0, 1.0));
    } 
    else if (uMode == 1) { // MELT
        displacement.y = -((0.01 + (uFlow * 0.05)) + (uBass * 0.03));
        displacement.x = sin(uv.y * 10.0 + t) * drive * 0.5;
        float v = sin(p.x * 5.0 + t) + sin(p.y * 5.0 + t) + sin((p.x + p.y) * 5.0 + t);
        pattern = (v + 3.0) / 6.0;
        genColor = mix(uColorA, uColorB, clamp(pattern, 0.0, 1.0));
    }
    else if (uMode == 2) { // LIQUEFY
        float len = length(p);
        float angle = sin(len * 3.0 - t) * (drive + uFlow * 0.05);
        float s = sin(angle); float c = cos(angle);
        displacement = vec2(c * p.x - s * p.y, s * p.x + c * p.y) - p;
        float cells = voronoi(p * (3.0 + uMid * 5.0));
        pattern = smoothstep(0.0, 1.0, cells);
        genColor = mix(uColorA, uColorB, clamp(pattern, 0.0, 1.0));
    }
    else if (uMode == 3) { // SMUDGE
        float grid = 50.0;
        vec2 quantUV = floor(uv * grid) / grid;
        float n = random(quantUV + floor(t));
        if (n > 0.9 - (uBass * 0.5)) displacement.x = (random(quantUV) - 0.5) * 0.2;
        displacement.y += uFlow * 0.01;
        pattern = random(quantUV + t);
        genColor = mix(uColorA, uColorB, step(0.5, pattern));
    }
    else if (uMode == 4) { // RIPPLE
        float d = length(p); float w = sin(d * 20.0 - t * 2.0);
        displacement = normalize(p) * w * (drive * 0.2);
        pattern = w * 0.5 + 0.5; genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 5) { // LATTICE
        vec2 grid = fract(p * 5.0) - 0.5; float d = length(grid);
        displacement = vec2(sin(p.y * 10.0 + t), cos(p.x * 10.0 + t)) * (drive * 0.1);
        pattern = smoothstep(0.4, 0.5, d); genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 6) { // SPIRAL
        float ang = atan(p.y, p.x); float len = length(p);
        float spiral = sin(ang * 5.0 + len * 10.0 - t * 2.0);
        displacement = vec2(cos(ang + spiral), sin(ang + spiral)) * (drive * 0.1);
        pattern = spiral * 0.5 + 0.5; genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 7) { // TURBO
         float n = noise(p * 20.0 + t * 5.0); displacement = vec2(n, n) * drive * 0.5;
         pattern = n; genColor = mix(uColorA, uColorB, n);
    }
    else if (uMode == 8) { // SHARD
        vec2 m = abs(fract(p * 4.0 + t*0.1) - 0.5); float d = max(m.x, m.y);
        displacement = vec2(sign(p.x), sign(p.y)) * d * drive * 0.2;
        pattern = step(0.4, d); genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 9) { // PLASMA
         float v = sin(p.x * 10.0 + t) + sin(p.y * 10.0 + t) + sin((p.x + p.y) * 10.0 + t);
         displacement = vec2(sin(v), cos(v)) * drive * 0.1;
         pattern = v * 0.3 + 0.5; genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 10) { // ECHO
        displacement = vec2(sin(t), cos(t)) * 0.01 * (1.0 + uBass);
        pattern = distance(uv, vec2(0.5)); genColor = mix(uColorA, uColorB, uHigh);
    }
    else if (uMode == 11) { // VORTEX
         float ang = atan(p.y, p.x); float d = length(p); float v = sin(d * 10.0 - t * 4.0);
         displacement = vec2(sin(ang + v), cos(ang + v)) * drive * 0.2;
         pattern = smoothstep(0.0, 1.0, v); genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 12) { // CYBER
        vec2 gp = floor(p * 10.0); float rnd = random(gp + floor(t));
        if (rnd > 0.8) displacement = vec2(rnd - 0.5, 0.0) * drive;
        pattern = step(0.5, rnd); genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 13) { // NOISE
        float n = random(uv * t); displacement = vec2(n - 0.5) * drive * 0.5;
        pattern = n; genColor = mix(uColorA, uColorB, step(0.5, n));
    }
    else if (uMode == 14) { // FLOWFIELD
        float ang = noise(p * 3.0 + t * 0.1) * 6.28; displacement = vec2(cos(ang), sin(ang)) * drive * 0.2;
        pattern = noise(p * 10.0); genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 15) { // KALEIDO
        vec2 p2 = abs(p); float ang = atan(p2.y, p2.x); float d = length(p2);
        displacement = vec2(sin(ang*4.0 + t), cos(d*5.0 - t)) * drive * 0.1;
        pattern = sin(ang * 8.0); genColor = mix(uColorA, uColorB, pattern * 0.5 + 0.5);
    }
    else if (uMode == 16) { // DATAMOS
        vec2 blocks = floor(uv * 20.0) / 20.0; float n = random(blocks + floor(t * 5.0));
        displacement = (vec2(n) - 0.5) * drive * 0.5;
        pattern = step(0.5, n); genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 17) { // MEMBRANE
        float d = length(p); displacement = p * sin(d * 10.0 - t) * drive * 0.1;
        pattern = smoothstep(0.0, 1.0, sin(p.x * 20.0) * sin(p.y * 20.0));
        genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 18) { // REACTION
        float n1 = noise(p * 5.0 + t); float n2 = noise(p * 5.0 - t);
        displacement = vec2(n1 - n2, n2 - n1) * drive * 0.2;
        pattern = smoothstep(0.4, 0.6, n1); genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 19) { // MATRIX
        displacement.y = 0.05 + (drive * 0.1); displacement.x = 0.0;
        vec2 grid = floor(uv * vec2(50.0, 10.0)); float n = random(grid + floor(t * 10.0));
        pattern = step(0.9, n); genColor = mix(uColorA, uColorB, pattern); 
    }
    else if (uMode == 20) { // NEON
        float v = sin(p.x * 10.0 + p.y * 10.0 + t); displacement = vec2(v) * drive * 0.1;
        pattern = abs(v); genColor = mix(uColorA, uColorB, pow(pattern, 0.2));
    }
    else if (uMode == 21) { // CIRCUIT
        vec2 grid = floor(uv * 30.0); float r = random(grid);
        if (r > 0.5) displacement.x = drive * 0.1 * sign(r - 0.75);
        else displacement.y = drive * 0.1 * sign(r - 0.25);
        pattern = step(0.8, random(grid + t)); genColor = mix(uColorA, uColorB, pattern);
    }
    else if (uMode == 22) { // JITTER
        displacement = (vec2(random(uv + t), random(uv - t)) - 0.5) * drive * 0.5;
        pattern = random(uv * 2.0); genColor = mix(uColorA, uColorB, pattern);
    }
    else { // VOID (23)
        displacement = -normalize(p) * drive * 0.1 * length(p);
        pattern = length(p); genColor = mix(uColorA, uColorB, 1.0 - pattern);
    }
    
    if (!uMotion) displacement = vec2(0.0);
    else displacement *= isActive;
    
    vec2 sampleUV = fract(uv - displacement);
    vec4 prevColor = texture2D(uPrevFrame, sampleUV);
    
    if (uHasTexture) {
         vec3 imgColor = texture2D(uImage, uv).rgb;
         genColor = mix(imgColor, genColor, uColorShift * uBass);
    }
    
    float decay = 1.0; 
    float maxDrive = uFeedback * 0.3;
    float inputSensitivity = clamp(0.1 + uBass * 2.0 + uMid * 1.5, 0.0, 1.0);
    float paintAmount = inputSensitivity * maxDrive;
    
    vec3 result = mix(prevColor.rgb * decay, genColor, paintAmount);
    if (uColorShift > 0.0) result = hueShift(result, uColorShift * 0.002);

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
  }
`;

const fsCopySource = `
  precision highp float;
  varying highp vec2 vTextureCoord;
  uniform sampler2D uTexture;
  uniform float uGrain;
  uniform float uSharpness;
  uniform float uTime;
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }
  void main(void) {
    vec3 color = texture2D(uTexture, vTextureCoord).rgb;
    color = (color - 0.5) * (1.0 + uSharpness) + 0.5;
    float n = random(vTextureCoord * uTime * 100.0) - 0.5;
    color += n * uGrain;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export const Visualizer: React.FC<VisualizerProps> = ({ state, audio, userImage, onExportRef, onResetRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const simProgramRef = useRef<WebGLProgram | null>(null);
  const copyProgramRef = useRef<WebGLProgram | null>(null);
  const texturesRef = useRef<WebGLTexture[]>([]);
  const framebuffersRef = useRef<WebGLFramebuffer[]>([]);
  const userImageTextureRef = useRef<WebGLTexture | null>(null);
  const rafRef = useRef<number>(0);
  const timeAccumulatorRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const stateRef = useRef(state);
  const audioRef = useRef(audio);
  const imageRef = useRef(userImage);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { audioRef.current = audio; }, [audio]);
  
  useEffect(() => {
    onResetRef(() => {
        frameCountRef.current = 0;
    });
  }, [onResetRef]);

  useEffect(() => {
    imageRef.current = userImage;
    const gl = glRef.current;
    if (gl && userImage) {
        if (!userImageTextureRef.current) userImageTextureRef.current = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, userImageTextureRef.current);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, userImage);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        frameCountRef.current = 0;
    }
  }, [userImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = 1024; const height = 1024;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;
    glRef.current = gl;

    const createShader = (type: number, src: string) => {
      const s = gl.createShader(type); if(!s) return null;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const createProgram = (vsSrc: string, fsSrc: string) => {
        const vs = createShader(gl.VERTEX_SHADER, vsSrc);
        const fs = createShader(gl.FRAGMENT_SHADER, fsSrc);
        if(!vs || !fs) return null;
        const prog = gl.createProgram(); if(!prog) return null;
        gl.attachShader(prog, vs); gl.attachShader(prog, fs);
        gl.linkProgram(prog); return prog;
    };

    simProgramRef.current = createProgram(vsSource, fsSimSource);
    copyProgramRef.current = createProgram(vsSource, fsCopySource);
    if (!simProgramRef.current || !copyProgramRef.current) return;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1, 1,1, -1,-1, 1,-1]), gl.STATIC_DRAW);
    const tBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1, 1,1, 0,0, 1,0]), gl.STATIC_DRAW);

    const setupBuffers = () => {
        texturesRef.current.forEach(t => gl.deleteTexture(t));
        framebuffersRef.current.forEach(f => gl.deleteFramebuffer(f));
        texturesRef.current = []; framebuffersRef.current = [];
        for (let i = 0; i < 2; i++) {
            const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            texturesRef.current.push(tex);
            const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            framebuffersRef.current.push(fb);
        }
    };
    setupBuffers();

    if (!userImageTextureRef.current) {
        userImageTextureRef.current = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, userImageTextureRef.current);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1,1,0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
    }

    lastFrameTimeRef.current = performance.now();
    let readIndex = 0; let writeIndex = 1;

    const render = () => {
        const now = performance.now();
        const delta = (now - lastFrameTimeRef.current) / 1000;
        lastFrameTimeRef.current = now;
        const s = stateRef.current; const a = audioRef.current;
        timeAccumulatorRef.current += (delta * 0.5) + (a.bass * delta * 2.0);

        gl.useProgram(simProgramRef.current);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffersRef.current[writeIndex]);
        gl.viewport(0, 0, width, height);
        const uSim = (name: string) => gl.getUniformLocation(simProgramRef.current!, name);

        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(gl.getAttribLocation(simProgramRef.current!, 'aVertexPosition'));
        gl.vertexAttribPointer(gl.getAttribLocation(simProgramRef.current!, 'aVertexPosition'), 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
        gl.enableVertexAttribArray(gl.getAttribLocation(simProgramRef.current!, 'aTextureCoord'));
        gl.vertexAttribPointer(gl.getAttribLocation(simProgramRef.current!, 'aTextureCoord'), 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(uSim('uTime'), timeAccumulatorRef.current);
        gl.uniform1f(uSim('uTurbulence'), s.turbulence);
        gl.uniform1f(uSim('uFlow'), s.flow);
        gl.uniform1f(uSim('uColorShift'), s.colorShift);
        gl.uniform1f(uSim('uGrain'), s.grain);
        gl.uniform1f(uSim('uSharpness'), s.sharpness);
        gl.uniform1f(uSim('uFeedback'), s.feedback); 
        gl.uniform1i(uSim('uMotion'), s.motion ? 1 : 0);
        gl.uniform1f(uSim('uBass'), a.bass);
        gl.uniform1f(uSim('uMid'), a.mid);
        gl.uniform1f(uSim('uHigh'), a.high);
        const cA = hexToRgb(s.colorA); const cB = hexToRgb(s.colorB);
        gl.uniform3f(uSim('uColorA'), cA[0], cA[1], cA[2]);
        gl.uniform3f(uSim('uColorB'), cB[0], cB[1], cB[2]);
        gl.uniform1i(uSim('uMode'), s.mode);
        gl.uniform2f(uSim('uResolution'), width, height);
        gl.uniform1i(uSim('uIsFirstFrame'), frameCountRef.current < 2 ? 1 : 0);
        gl.uniform1i(uSim('uHasTexture'), !!imageRef.current ? 1 : 0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texturesRef.current[readIndex]);
        gl.uniform1i(uSim('uPrevFrame'), 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, userImageTextureRef.current);
        gl.uniform1i(uSim('uImage'), 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.useProgram(copyProgramRef.current);
        const uCopy = (name: string) => gl.getUniformLocation(copyProgramRef.current!, name);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(gl.getAttribLocation(copyProgramRef.current!, 'aVertexPosition'));
        gl.vertexAttribPointer(gl.getAttribLocation(copyProgramRef.current!, 'aVertexPosition'), 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuf);
        gl.enableVertexAttribArray(gl.getAttribLocation(copyProgramRef.current!, 'aTextureCoord'));
        gl.vertexAttribPointer(gl.getAttribLocation(copyProgramRef.current!, 'aTextureCoord'), 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uCopy('uGrain'), s.grain);
        gl.uniform1f(uCopy('uSharpness'), s.sharpness);
        gl.uniform1f(uCopy('uTime'), timeAccumulatorRef.current);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texturesRef.current[writeIndex]);
        gl.uniform1i(uCopy('uTexture'), 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        const temp = readIndex; readIndex = writeIndex; writeIndex = temp;
        frameCountRef.current++; rafRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    onExportRef(async (format: ExportFormat) => {
      const canvas = canvasRef.current; if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png', 0.95);
      const link = document.createElement('a');
      link.download = `CHROMA_SYS_EXPORT_${format}_${Date.now()}.png`;
      link.href = dataUrl; link.click();
    });
  }, [onExportRef]);

  return (
    <div className="w-full h-full relative group">
        <canvas ref={canvasRef} className="w-full h-full object-cover bg-black" />
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(51,255,170,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(51,255,170,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
    </div>
  );
};