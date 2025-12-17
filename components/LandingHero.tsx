import React, { useEffect, useRef } from 'react';

const vertexShaderSource = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision highp float;
    uniform vec3 iResolution;
    uniform float iTime;

    #define RESOLUTION 0.03
    #define MAX_STEPS 64
    #define TIME_SCALE 0.15

    struct ComplexFrame {
        vec3 real_ux, real_uy, real_uz;
        vec3 imag_ux, imag_uy, imag_uz;
        float scalar_part;
    };

    ComplexFrame get_complex_frame(vec3 p, float t) {
        ComplexFrame cf;
        float r = length(p);
        cf.real_ux = normalize(vec3(p.z, 0.0, -p.x));
        cf.real_uy = normalize(cross(cf.real_ux, vec3(0.0, 1.0, 0.0)));
        cf.real_uz = normalize(cross(cf.real_ux, cf.real_uy));
        float phase = t * 0.3 + r * 1.5;
        cf.imag_ux = vec3(sin(phase), 0.0, cos(phase)) * 0.4;
        cf.imag_uy = vec3(0.0, sin(phase * 1.2), 0.0) * 0.4;
        cf.imag_uz = vec3(cos(phase * 0.8), 0.0, sin(phase * 0.8)) * 0.4;
        cf.scalar_part = clamp(0.6 / (r * r + 0.05), 0.0, 12.0); // Clamped to prevent white-out
        return cf;
    }

    vec3 artistic_color_transform(vec3 color, vec3 p, float t) {
        vec3 wave = sin(color * 3.14159 * 2.0 - t * 0.3);
        color = mix(color, wave, 0.25);
        float glow = exp(-length(p) * 0.4) * 0.35;
        color += vec3(glow * sin(t) * 0.8, glow * cos(t * 0.8) * 0.6, glow * sin(t * 1.2) * 1.0);
        return clamp(color, 0.0, 1.0);
    }

    void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 uv = (fragCoord * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
        float t = iTime * TIME_SCALE;
        
        vec3 cam_pos = vec3(3.5 * sin(t * 0.15), 2.5, 3.5 * cos(t * 0.15));
        vec3 cam_dir = normalize(-cam_pos);
        vec3 cam_up = vec3(0.0, 1.0, 0.0);
        vec3 cam_right = normalize(cross(cam_dir, cam_up));
        vec3 ray_dir = normalize(cam_dir + uv.x * cam_right + uv.y * cam_up);
        vec3 ray_pos = cam_pos;
        vec3 total_color = vec3(0.0);
        float step_size = RESOLUTION;
        
        for(int i = 0; i < MAX_STEPS; i++) {
            ComplexFrame cf = get_complex_frame(ray_pos, t);
            vec3 dir_color = abs(cf.real_ux) * vec3(1.0, 0.3, 0.2) +
                            abs(cf.real_uy) * vec3(0.2, 0.4, 1.0) +
                            abs(cf.real_uz) * vec3(0.9, 0.5, 0.2);
            float blend = 0.5 + 0.5 * sin(t * 1.5);
            vec3 complex_color = mix(dir_color, abs(cf.imag_ux + cf.imag_uy + cf.imag_uz), blend);
            complex_color *= (0.6 + cf.scalar_part * 0.8);
            complex_color = artistic_color_transform(complex_color, ray_pos, t);
            float alpha = 0.12;
            total_color = total_color * (1.0 - alpha) + clamp(complex_color, 0.0, 1.0) * alpha;
            ray_pos += ray_dir * step_size;
        }
        gl_FragColor = vec4(clamp(total_color, 0.0, 1.0), 1.0);
    }
`;

export const LandingHero: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const timeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const gl = canvas.getContext('webgl');
        if (!gl) return;

        const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        };

        const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        const posLoc = gl.getAttribLocation(program, 'position');
        const resLoc = gl.getUniformLocation(program, 'iResolution');
        const timeLoc = gl.getUniformLocation(program, 'iTime');

        const posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        };
        window.addEventListener('resize', resize);
        resize();

        let startTime = Date.now();
        const render = () => {
            gl.useProgram(program);
            gl.uniform3f(resLoc, canvas.width, canvas.height, 1.0);
            gl.uniform1f(timeLoc, (Date.now() - startTime) / 1000);
            gl.enableVertexAttribArray(posLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(render);
        };
        render();

        const handleMove = (e: MouseEvent) => {
            if (cursorRef.current) {
                cursorRef.current.style.left = `${e.clientX}px`;
                cursorRef.current.style.top = `${e.clientY}px`;
                cursorRef.current.style.opacity = '1';
            }
        };
        const handleLeave = () => { if (cursorRef.current) cursorRef.current.style.opacity = '0'; };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseleave', handleLeave);

        const timeInterval = setInterval(() => {
            if (timeRef.current) timeRef.current.innerText = `${new Date().toLocaleTimeString('en-US', { hour12: false })} LOCAL`;
        }, 1000);

        return () => {
            window.removeEventListener('resize', resize);
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseleave', handleLeave);
            clearInterval(timeInterval);
        };
    }, []);

    return (
        <section id="hero" className="relative w-full h-screen overflow-hidden bg-black">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            
            <div ref={cursorRef} className="absolute w-[60px] h-[60px] pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 mix-blend-exclusion">
                <div className="absolute inset-[-20px] rounded-full bg-white/10 backdrop-blur-[4px] shadow-[inset_0_0_15px_rgba(255,255,255,0.8),-2px_0_10px_rgba(0,255,255,0.6),2px_0_10px_rgba(255,0,255,0.6),0_0_20px_rgba(255,255,255,0.2)]" />
            </div>

            <div className="relative z-20 w-full h-full flex flex-col p-8 md:p-14 pointer-events-none">
                <header className="flex justify-between items-start pointer-events-auto">
                    <div className="font-clash font-bold text-3xl md:text-5xl tracking-tight uppercase leading-none hover:text-white/80 transition-colors">
                        NOT A CLUB
                    </div>
                    <nav className="flex flex-col text-right gap-1 md:gap-2 text-xs md:text-sm font-medium tracking-widest uppercase">
                        <a href="#what" className="hover:text-white/100 text-white/50 transition-all hover:pl-2">WHAT</a>
                        <a href="#why" className="hover:text-white/100 text-white/50 transition-all hover:pl-2">WHY</a>
                        <a href="#how" className="hover:text-white/100 text-white/50 transition-all hover:pl-2">HOW</a>
                        <a href="#synth" className="text-white hover:pl-2 transition-all font-bold">BEGIN</a>
                    </nav>
                </header>

                <div className="absolute top-14 right-40 hidden lg:block text-right">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Sync</div>
                    <div ref={timeRef} className="font-mono text-xs text-white/70">--:--:-- LOCAL</div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center">
                    <h1 className="font-clash font-medium text-[10vw] leading-[0.85] text-center tracking-tight mix-blend-difference select-none">
                        BACKGROUND<br />
                        <span className="italic font-light opacity-80 backdrop-blur-sm">NOISE</span>
                    </h1>
                    <p className="mt-8 text-center max-w-md text-sm md:text-base text-white/50 leading-relaxed font-light select-none">
                        Noise Reborn: Gradients from Any Sound. Raw physical digital synthesis.
                    </p>
                </div>

                <footer className="flex justify-between items-end border-t border-white/10 pt-8 pointer-events-auto">
                    <div className="flex flex-col gap-1">
                        <h3 className="font-clash text-lg font-medium">Manifesto</h3>
                        <p className="text-xs text-white/40 max-w-[200px]">Raw digital physics. Capturing the ephemeral.</p>
                    </div>
                    <div className="flex gap-12 text-right">
                        <div className="hidden md:block">
                            <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Status</h3>
                            <p className="text-sm">Online</p>
                        </div>
                        <div>
                            <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Year</h3>
                            <p className="text-sm">2025</p>
                        </div>
                    </div>
                    <div className="text-3xl animate-bounce opacity-50">↓</div>
                </footer>
            </div>
            <div className="noise-overlay" />
        </section>
    );
};