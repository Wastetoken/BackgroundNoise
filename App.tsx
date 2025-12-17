import React, { useState, useEffect, useRef } from 'react';
import { Knob } from './components/Knob';
import { Switch } from './components/Switch';
import { RotarySwitch } from './components/RotarySwitch';
import { Visualizer } from './components/Visualizer';
import { Display } from './components/Display';
import { LandingHero } from './components/LandingHero';
import { InfoSections } from './components/InfoSections';
import { audioService } from './services/audioService';
import { SynthsState, AudioData, ExportFormat, VisualMode } from './types';
import { Download, Code, Upload, X, ChevronDown, Volume2, VolumeX, Shuffle } from 'lucide-react';

const DEFAULT_STATE: SynthsState = {
  turbulence: 0.0, 
  flow: 0.1, 
  colorShift: 0.5, 
  grain: 0.15, 
  sharpness: 0.5, 
  feedback: 0.0, 
  mode: VisualMode.DEFAULT,
  colorA: '#ff0055', 
  colorB: '#00ffff',
  motion: true
};

const Screw = ({ type = 'silver', className }: { type?: 'silver'|'black', className?: string }) => (
    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${type === 'silver' ? 'screw-head-silver' : 'screw-head-black'} ${className}`}>
        <div className="w-1.5 h-0.5 bg-[#111] opacity-80 transform rotate-[35deg]"></div>
    </div>
);

const Module = ({ children, title, variant = 'black', width = 'w-full' }: React.PropsWithChildren<{ title: string, variant?: 'black'|'silver'|'titanium', width?: string }>) => {
    const bgClass = {
        black: 'bg-module-black bg-texture-matte',
        silver: 'bg-module-silver bg-texture-brushed border-t border-white/50',
        titanium: 'bg-module-titanium bg-texture-brushed'
    }[variant];
    const textClass = variant === 'silver' ? 'text-black' : 'text-gray-400';
    const borderClass = variant === 'silver' ? 'border-gray-400' : 'border-gray-700';

    return (
        <div className={`relative ${width} min-h-[220px] lg:h-full flex-none flex flex-col ${bgClass} shadow-module-outset rounded-sm overflow-hidden mb-1 lg:mb-0`}>
            <Screw type={variant === 'silver' ? 'black' : 'silver'} className="absolute top-2 left-2" />
            <Screw type={variant === 'silver' ? 'black' : 'silver'} className="absolute top-2 right-2" />
            <Screw type={variant === 'silver' ? 'black' : 'silver'} className="absolute bottom-2 left-2" />
            <Screw type={variant === 'silver' ? 'black' : 'silver'} className="absolute bottom-2 right-2" />
            
            <div className="mt-4 mb-2 px-6 text-center">
                 <div className={`inline-block px-2 py-0.5 border ${borderClass} rounded-sm`}>
                    <h3 className={`font-mono text-[9px] font-bold tracking-[0.2em] uppercase ${textClass}`}>{title}</h3>
                 </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                {children}
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-50"></div>
        </div>
    );
};

const ColorCell = ({ color, onChange, label }: { color: string, onChange: (c: string) => void, label: string }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => { audioService.playClick('tick'); inputRef.current?.click(); }}>
            <div className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-full border-2 border-[#111] shadow-[0_0_10px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundColor: color, boxShadow: `inset 0 0 10px rgba(0,0,0,0.5), 0 0 15px ${color}80` }}></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
                <input ref={inputRef} type="color" value={color} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
            <span className="font-mono text-[8px] uppercase tracking-widest text-gray-400 font-bold">{label}</span>
        </div>
    );
};

export default function App() {
  const [state, setState] = useState<SynthsState>(DEFAULT_STATE);
  const [audioData, setAudioData] = useState<AudioData>({ bass: 0, mid: 0, high: 0, vol: 0 });
  const [micActive, setMicActive] = useState(false);
  const [uiMuted, setUiMuted] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [userImage, setUserImage] = useState<HTMLImageElement | null>(null);
  
  const visualizerResetRef = useRef<(() => void) | null>(null);
  const exportRef = useRef<((format: ExportFormat) => void) | null>(null);

  useEffect(() => {
    let rAF: number;
    const loop = () => {
      if (micActive) setAudioData(audioService.getAudioData());
      else setAudioData({ bass: 0, mid: 0, high: 0, vol: 0 });
      rAF = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rAF);
  }, [micActive]);

  const toggleMic = async () => {
    if (!micActive) {
        try { await audioService.startMicrophone(); setMicActive(true); } 
        catch (e) { alert("Microphone access is required."); }
    } else {
        audioService.stopMicrophone(); setMicActive(false);
    }
  };

  const randomizeState = () => {
    // Clear buffer history
    visualizerResetRef.current?.();

    const newState: SynthsState = {
      turbulence: Math.random(),
      flow: Math.random(),
      colorShift: Math.random(),
      grain: Math.random() * 0.4,
      sharpness: Math.random(),
      feedback: Math.random() * 0.5 + 0.3, 
      mode: Math.floor(Math.random() * 24) as VisualMode,
      colorA: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      colorB: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      motion: false // Static capture as requested
    };
    setState(newState);
    audioService.playClick('snap');
  };

  const executeExport = (format: ExportFormat) => {
      audioService.playClick('snap');
      exportRef.current?.(format);
      setShowExportMenu(false);
  };

  return (
    <div className="bg-black min-h-screen text-white flex flex-col selection:bg-orange-500/30">
      <LandingHero />
      <InfoSections />

      <section id="synth" className="min-h-screen flex flex-col w-full bg-rack-dark font-sans overflow-hidden border-t-[20px] border-[#18181a] shadow-[inset_0_20px_40px_rgba(0,0,0,0.8)] relative z-30">
        
        <header className="flex-none h-16 bg-[#18181a] border-b border-black flex items-center justify-between px-4 lg:px-6 z-20 shadow-lg relative">
           <div className="absolute inset-x-0 bottom-0 h-px bg-white/10"></div>
           <div className="flex items-center gap-2 lg:gap-4">
               <div className="bg-orange-700/90 text-black px-2 lg:px-3 py-1 rounded-sm border-l-2 border-orange-500 shadow-[0_0_15px_rgba(255,100,0,0.3)]">
                   <span className="font-mono font-black tracking-tighter text-base lg:text-lg">CHROMA</span>
                   <span className="font-mono font-normal opacity-70 text-xs lg:text-sm">-SYS</span>
               </div>
           </div>
           
           <div className="flex items-center gap-2 lg:gap-3">
               <button onClick={randomizeState} className="w-8 h-8 rounded bg-[#222] border border-[#444] flex items-center justify-center hover:border-orange-500 text-gray-400 transition-all" title="Randomize (Static Capture)">
                   <Shuffle size={14} />
               </button>
               <button onClick={() => setUiMuted(audioService.toggleMute())} className={`w-8 h-8 rounded bg-[#222] border border-[#444] flex items-center justify-center transition-all ${uiMuted ? 'text-red-500 border-red-900/50' : 'text-gray-400'}`} title="Mute UI Sounds">
                   {uiMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
               </button>
               <label className="cursor-pointer group" title="Upload Reference Image">
                   <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                           const r = new FileReader();
                           r.onload = (ev) => { const img = new Image(); img.onload = () => setUserImage(img); img.src = ev.target?.result as string; };
                           r.readAsDataURL(file);
                           audioService.playClick('thock');
                       }
                   }} />
                   <div className="w-8 h-8 rounded bg-[#222] border border-[#444] flex items-center justify-center hover:border-orange-500 text-gray-400 transition-all">
                       <Upload size={14} />
                   </div>
               </label>
               <div className="relative">
                   <button onClick={() => setShowExportMenu(!showExportMenu)} className={`h-8 px-2 gap-1 rounded bg-[#222] border flex items-center justify-center transition-all ${showExportMenu ? 'border-orange-500 text-orange-500' : 'border-[#444] text-gray-400'}`} title="Export Capture">
                       <Download size={14} />
                       <ChevronDown size={10} />
                   </button>
                   {showExportMenu && (
                      <div className="absolute top-full right-0 mt-2 w-40 bg-[#151515] border border-gray-600 rounded shadow-xl z-50 flex flex-col p-1">
                          {Object.values(ExportFormat).map(f => (
                              <button key={f} onClick={() => executeExport(f)} className="px-2 py-2 text-left text-[10px] font-mono text-gray-300 hover:bg-orange-600 hover:text-black rounded-sm transition-colors uppercase">{f} EXPORT</button>
                          ))}
                      </div>
                   )}
               </div>
               <button onClick={() => setShowJson(!showJson)} className="w-8 h-8 rounded bg-[#222] border border-[#444] flex items-center justify-center hover:border-orange-500 text-gray-400 transition-all" title="Configuration Dump">
                   <Code size={14} />
               </button>
           </div>
        </header>

        <main className="flex-1 min-h-[40vh] relative bg-[#080808] flex items-center justify-center p-2 lg:p-12 z-10">
           <div className="relative w-full h-full lg:h-auto max-w-5xl aspect-video bg-[#111] rounded-lg border-t-[8px] lg:border-t-[16px] border-b-[12px] lg:border-b-[24px] border-x-[8px] lg:border-x-[16px] border-[#1a1a1a] shadow-[0_0_80px_rgba(0,0,0,1)]">
               <div className="absolute top-[-8px] lg:top-[-12px] left-1/2 -translate-x-1/2 w-16 lg:w-20 h-1 bg-[#333] rounded-full"></div>
               <Visualizer 
                  state={state} 
                  audio={audioData} 
                  userImage={userImage} 
                  onExportRef={(fn) => exportRef.current = fn} 
                  onResetRef={(fn) => visualizerResetRef.current = fn}
                />
               <div className="absolute inset-0 scanlines opacity-20 pointer-events-none mix-blend-overlay"></div>
               {showJson && (
                   <div className="absolute inset-0 bg-black/95 p-6 lg:p-8 font-mono text-[10px] lg:text-xs text-green-400 overflow-auto z-20 backdrop-blur-md">
                       <button onClick={() => setShowJson(false)} className="mb-4 text-red-500 flex items-center gap-2 uppercase tracking-widest"><X size={14} /> Close Terminal</button>
                       <pre className="whitespace-pre-wrap">{JSON.stringify(state, null, 2)}</pre>
                   </div>
               )}
           </div>
        </main>

        <div className="flex-none bg-rack-dark border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.9)] z-30">
          <div className="lg:h-[280px] lg:px-12 bg-[#050505] overflow-y-auto lg:overflow-y-hidden lg:overflow-x-auto rack-scroll">
              <div className="flex flex-col lg:flex-row h-full p-2 lg:p-0 gap-1 lg:items-stretch lg:justify-start">
                  
                  <Module title="SIGNAL I/O" variant="black" width="w-full lg:w-64">
                      <div className="flex flex-col items-center gap-4 w-full">
                          <div className="flex items-center gap-4 justify-center w-full">
                               <Switch label="MIC" active={micActive} onToggle={toggleMic} />
                               <div className="h-10 w-px bg-[#333]"></div>
                               <Display label="ANALYSIS" audioData={audioData} />
                          </div>
                          <div className="w-full h-1 bg-[#222] mt-1 rounded-full overflow-hidden max-w-[180px]">
                              <div className="h-full bg-green-500 transition-all duration-75 shadow-[0_0_8px_rgba(34,197,94,0.6)]" style={{ width: `${audioData.vol * 100}%` }}></div>
                          </div>
                      </div>
                  </Module>

                  <Module title="PROCESSOR" variant="silver" width="w-full lg:w-72">
                      <div className="flex items-center justify-center gap-6 lg:gap-8">
                          <RotarySwitch 
                            label="ALGO" 
                            options={["VAPOR", "MELT", "LIQFY", "SMDGE", "RIPPLE", "LATICE", "SPIRAL", "TURBO", "SHARD", "PLASMA", "ECHO", "VORTEX", "CYBER", "NOISE", "FLOW", "KALDO", "DMOSH", "MBRNE", "REACT", "MTRX", "NEON", "CIRC", "JITTR", "VOID"]} 
                            value={state.mode} 
                            onChange={(m) => setState(s => ({...s, mode: m}))} 
                          />
                          <div className="h-12 w-px bg-black/10"></div>
                          <Knob label="FLOW" value={state.flow} onChange={(v) => setState(s => ({...s, flow: v}))} variant="silver" size="md" />
                      </div>
                  </Module>

                  <Module title="DYNAMICS" variant="silver" width="w-full lg:w-48">
                      <div className="flex items-center gap-6">
                        <Knob label="TURB" value={state.turbulence} onChange={(v) => setState(s => ({...s, turbulence: v}))} variant="silver" size="md" />
                        <div className="h-12 w-px bg-black/10"></div>
                        <Switch label="MOTION" active={state.motion} onToggle={() => setState(s => ({...s, motion: !s.motion}))} />
                      </div>
                  </Module>

                  <Module title="CHROMATICS" variant="titanium" width="w-full lg:w-[480px]">
                      <div className="flex flex-col sm:flex-row items-center gap-6 lg:gap-10">
                          <div className="flex items-center gap-6">
                              <ColorCell label="SIG A" color={state.colorA} onChange={(c) => setState(s => ({...s, colorA: c}))} />
                              <ColorCell label="SIG B" color={state.colorB} onChange={(c) => setState(s => ({...s, colorB: c}))} />
                          </div>
                          <div className="hidden sm:block h-12 w-px bg-white/10"></div>
                          <div className="flex items-center gap-4 lg:gap-6">
                            <Knob label="HUE" value={state.colorShift} onChange={(v) => setState(s => ({...s, colorShift: v}))} variant="dark" />
                            <Knob label="GRAIN" value={state.grain} onChange={(v) => setState(s => ({...s, grain: v}))} variant="dark" />
                            <Knob label="SHARP" value={state.sharpness} onChange={(v) => setState(s => ({...s, sharpness: v}))} variant="dark" />
                          </div>
                      </div>
                  </Module>

                  <Module title="FEEDBACK" variant="black" width="w-full lg:w-44">
                       <Knob label="DRIVE" value={state.feedback} onChange={(v) => setState(s => ({...s, feedback: v}))} variant="dark" size="lg" />
                  </Module>

              </div>
          </div>
        </div>
      </section>
      <div className="noise-overlay" />
    </div>
  );
}