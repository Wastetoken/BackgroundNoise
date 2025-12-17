import React, { useState, useEffect, useRef } from 'react';
import { Knob } from './components/Knob';
import { Switch } from './components/Switch';
import { RotarySwitch } from './components/RotarySwitch';
import { Visualizer } from './components/Visualizer';
import { Display } from './components/Display';
import { audioService } from './services/audioService';
import { SynthsState, AudioData, ExportFormat, VisualMode } from './types';
import { Download, Code, Upload, X, ChevronDown, Volume2, VolumeX } from 'lucide-react';

const DEFAULT_STATE: SynthsState = {
  turbulence: 0.0, flow: 0.1, colorShift: 0.5, grain: 0.15, sharpness: 0.5, 
  feedback: 1.0, // Default to MAX since max is now a safe 30% injection
  mode: VisualMode.DEFAULT,
  colorA: '#ff0055', 
  colorB: '#00ffff' 
};

// --- Structural Components ---

const Screw = ({ type = 'silver', className }: { type?: 'silver'|'black', className?: string }) => (
    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${type === 'silver' ? 'screw-head-silver' : 'screw-head-black'} ${className}`}>
        <div className="w-1.5 h-0.5 bg-[#111] opacity-80 transform rotate-[35deg]"></div>
    </div>
);

const Module = ({ children, title, variant = 'black', width = 'w-48' }: React.PropsWithChildren<{ title: string, variant?: 'black'|'silver'|'titanium', width?: string }>) => {
    const bgClass = {
        black: 'bg-module-black bg-texture-matte',
        silver: 'bg-module-silver bg-texture-brushed border-t border-white/50',
        titanium: 'bg-module-titanium bg-texture-brushed'
    }[variant];
    
    const textClass = variant === 'silver' ? 'text-black' : 'text-gray-400';
    const borderClass = variant === 'silver' ? 'border-gray-400' : 'border-gray-700';

    return (
        <div className={`relative ${width} h-64 lg:h-full flex-none flex flex-col ${bgClass} shadow-module-outset rounded-sm overflow-hidden group mb-2 lg:mb-0`}>
            <Screw type={variant === 'silver' ? 'black' : 'silver'} className="absolute top-2 left-2" />
            <Screw type={variant === 'silver' ? 'black' : 'silver'} className="absolute top-2 right-2" />
            <Screw type={variant === 'silver' ? 'black' : 'silver'} className="absolute bottom-2 left-2" />
            <Screw type={variant === 'silver' ? 'black' : 'silver'} className="absolute bottom-2 right-2" />
            
            <div className="mt-4 mb-2 px-6 text-center">
                 <div className={`inline-block px-2 py-0.5 border ${borderClass} rounded-sm`}>
                    <h3 className={`font-mono text-[9px] font-bold tracking-[0.2em] uppercase ${textClass}`}>{title}</h3>
                 </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-2 relative">
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
            <div className="relative w-12 h-12 rounded-full border-2 border-[#111] shadow-[0_0_10px_rgba(0,0,0,0.8)] overflow-hidden">
                <div 
                    className="absolute inset-0" 
                    style={{ backgroundColor: color, boxShadow: `inset 0 0 10px rgba(0,0,0,0.5), 0 0 15px ${color}80` }}
                ></div>
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
                <input 
                    ref={inputRef}
                    type="color" 
                    value={color} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
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
  
  const exportRef = useRef<((format: ExportFormat) => void) | null>(null);

  useEffect(() => {
    let rAF: number;
    const loop = () => {
      if (micActive) {
        setAudioData(audioService.getAudioData());
      } else {
        setAudioData({ bass: 0, mid: 0, high: 0, vol: 0 });
      }
      rAF = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rAF);
  }, [micActive]);

  useEffect(() => {
    try {
      if (window.location.hash) setState({ ...DEFAULT_STATE, ...JSON.parse(atob(window.location.hash.substring(1))) });
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
        if (window.location.protocol !== 'blob:') window.history.replaceState(null, '', `#${btoa(JSON.stringify(state))}`);
    } catch(e) {}
  }, [state]);

  const toggleMic = async () => {
    if (!micActive) {
        try { await audioService.startMicrophone(); setMicActive(true); } 
        catch (e) { alert("Microphone access is required."); }
    } else {
        audioService.stopMicrophone(); setMicActive(false);
    }
  };

  const toggleMute = () => {
      const muted = audioService.toggleMute();
      setUiMuted(muted);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => setUserImage(img);
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
      audioService.playClick('thock');
    }
  };

  const executeExport = (format: ExportFormat) => {
      audioService.playClick('snap');
      exportRef.current?.(format);
      setShowExportMenu(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-rack-dark font-sans overflow-hidden">
      
      {/* --- HEADER UNIT --- */}
      <header className="flex-none h-16 bg-[#18181a] border-b border-black flex items-center justify-between px-6 z-20 shadow-lg relative">
         <div className="absolute inset-x-0 bottom-0 h-px bg-white/10"></div>
         
         <div className="flex items-center gap-4">
             <div className="bg-orange-700/90 text-black px-3 py-1 rounded-sm border-l-2 border-orange-500 shadow-[0_0_15px_rgba(255,100,0,0.3)]">
                 <span className="font-mono font-black tracking-tighter text-lg">CHROMA</span>
                 <span className="font-mono font-normal opacity-70 text-sm">-SYS</span>
             </div>
         </div>

         <div className="flex items-center gap-3">
             <button 
                onClick={toggleMute}
                className={`w-8 h-8 rounded bg-[#222] border border-[#444] flex items-center justify-center transition-all shadow-inner ${uiMuted ? 'text-red-500 border-red-900/50' : 'text-gray-400 hover:text-white'}`}
                title="Toggle UI Sounds"
             >
                 {uiMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
             </button>

             <label className="cursor-pointer group">
                 <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                 <div className="w-8 h-8 rounded bg-[#222] border border-[#444] flex items-center justify-center hover:border-orange-500 hover:text-orange-500 text-gray-400 transition-all shadow-inner">
                     <Upload size={14} />
                 </div>
             </label>

             <div className="relative">
                 <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`h-8 px-2 gap-1 rounded bg-[#222] border flex items-center justify-center transition-all shadow-inner ${showExportMenu ? 'border-orange-500 text-orange-500' : 'border-[#444] text-gray-400 hover:border-orange-500 hover:text-orange-500'}`}
                 >
                     <Download size={14} />
                     <ChevronDown size={10} />
                 </button>

                 {showExportMenu && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-[#151515] border border-gray-600 rounded shadow-xl z-50 flex flex-col p-1">
                        <div className="px-2 py-1 text-[8px] font-mono text-gray-500 uppercase tracking-widest border-b border-gray-800 mb-1">Select Output</div>
                        <button onClick={() => executeExport(ExportFormat.PNG_4K)} className="px-2 py-2 text-left text-[10px] font-mono text-gray-300 hover:bg-orange-600 hover:text-black rounded-sm transition-colors flex justify-between">
                            <span>4K ULTRA</span>
                            <span className="opacity-50">16:9</span>
                        </button>
                        <button onClick={() => executeExport(ExportFormat.PNG_1080)} className="px-2 py-2 text-left text-[10px] font-mono text-gray-300 hover:bg-orange-600 hover:text-black rounded-sm transition-colors flex justify-between">
                            <span>1080p HD</span>
                            <span className="opacity-50">16:9</span>
                        </button>
                        <button onClick={() => executeExport(ExportFormat.SQUARE)} className="px-2 py-2 text-left text-[10px] font-mono text-gray-300 hover:bg-orange-600 hover:text-black rounded-sm transition-colors flex justify-between">
                            <span>SQUARE</span>
                            <span className="opacity-50">1:1</span>
                        </button>
                        <button onClick={() => executeExport(ExportFormat.MOBILE)} className="px-2 py-2 text-left text-[10px] font-mono text-gray-300 hover:bg-orange-600 hover:text-black rounded-sm transition-colors flex justify-between">
                            <span>MOBILE</span>
                            <span className="opacity-50">9:16</span>
                        </button>
                    </div>
                 )}
                 {showExportMenu && (
                     <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                 )}
             </div>

             <button onClick={() => setShowJson(!showJson)} className="w-8 h-8 rounded bg-[#222] border border-[#444] flex items-center justify-center hover:border-orange-500 hover:text-orange-500 text-gray-400 transition-all shadow-inner">
                 <Code size={14} />
             </button>
         </div>
      </header>

      {/* --- MONITOR SECTION --- */}
      {/* Resizes to 35vh on mobile, remaining flex space on desktop */}
      <main className="shrink-0 h-[35vh] lg:h-auto lg:flex-1 relative bg-[#080808] flex items-center justify-center p-4 lg:p-8 z-10">
         <div className="relative w-full h-full lg:h-auto max-w-5xl aspect-video bg-[#111] rounded-lg border-t-[16px] border-b-[24px] border-x-[16px] border-[#1a1a1a] shadow-[0_0_80px_rgba(0,0,0,1)]">
             <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 w-20 h-1 bg-[#333] rounded-full"></div>
             <Visualizer state={state} audio={audioData} userImage={userImage} onExportRef={(fn) => exportRef.current = fn} />
             
             <div className="absolute inset-0 scanlines opacity-30 pointer-events-none mix-blend-overlay"></div>
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/5 pointer-events-none rounded"></div>
             
             {showJson && (
                 <div className="absolute inset-0 bg-black/95 p-8 font-mono text-xs text-green-400 overflow-auto z-20 backdrop-blur-md">
                     <button onClick={() => setShowJson(false)} className="mb-4 text-red-500 hover:underline flex items-center gap-2">
                        <X size={14} /> CLOSE DUMP
                     </button>
                     <pre>{JSON.stringify(state, null, 2)}</pre>
                 </div>
             )}
         </div>
      </main>

      {/* --- CONTROL RACK --- */}
      {/* Scrolls vertically on mobile (flex-1), Fixed horizontal on desktop */}
      <div className="flex-1 lg:flex-none relative lg:h-[280px] bg-rack-dark border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.9)] z-30">
        
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#121212] border-r border-[#222] hidden lg:flex flex-col items-center justify-between py-6 shadow-xl z-10">
            <Screw type="black" className="w-4 h-4" />
            <div className="h-full w-px bg-[#222] my-4"></div>
            <Screw type="black" className="w-4 h-4" />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-[#121212] border-l border-[#222] hidden lg:flex flex-col items-center justify-between py-6 shadow-xl z-10">
            <Screw type="black" className="w-4 h-4" />
            <div className="h-full w-px bg-[#222] my-4"></div>
            <Screw type="black" className="w-4 h-4" />
        </div>

        {/* Scroll Container */}
        <div className="absolute inset-0 lg:left-12 lg:right-12 overflow-y-auto lg:overflow-y-hidden lg:overflow-x-auto rack-scroll bg-[#050505]">
            {/* Flex Wrap for Mobile, No Wrap for Desktop */}
            <div className="flex flex-wrap lg:flex-nowrap p-4 gap-4 lg:gap-1 lg:h-full min-w-0 lg:min-w-max items-start lg:items-stretch justify-center lg:justify-start">
                
                {/* 1. I/O MODULE */}
                <Module title="SIGNAL I/O" variant="black" width="w-full sm:w-[48%] lg:w-56">
                    <div className="flex flex-col items-center gap-5 w-full">
                        <div className="flex items-center gap-4 w-full justify-center">
                             <Switch label="MIC INPUT" active={micActive} onToggle={toggleMic} />
                             <div className="h-10 w-px bg-[#333]"></div>
                             <Display label="FREQ.ANALYSIS" audioData={audioData} />
                        </div>
                        <div className="w-full px-4">
                            <div className="flex justify-between text-[7px] font-mono text-gray-600 uppercase">
                                <span>Input Gain</span>
                                <span>{micActive ? '-6dB' : '-inf'}</span>
                            </div>
                            <div className="w-full h-1 bg-[#222] mt-1 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 transition-all duration-75" style={{ width: `${audioData.vol * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </Module>

                {/* 2. PROCESSOR MODULE */}
                <Module title="PROCESSOR" variant="silver" width="w-full sm:w-[48%] lg:w-64">
                    <div className="flex items-center justify-center gap-8">
                        <RotarySwitch 
                            label="ALGORITHM" 
                            options={[
                                "VAPOR", "MELT", "LIQFY", "SMDGE", 
                                "RIPPLE", "LATICE", "SPIRAL", "TURBO", 
                                "SHARD", "PLASMA", "ECHO", "VORTEX", "CYBER", "NOISE"
                            ]} 
                            value={state.mode} 
                            onChange={(m) => setState(s => ({...s, mode: m}))} 
                        />
                        <div className="h-16 w-px bg-gray-400/50"></div>
                        <Knob label="FLOW" value={state.flow} onChange={(v) => setState(s => ({...s, flow: v}))} variant="silver" size="md" />
                    </div>
                </Module>

                {/* 3. DYNAMICS MODULE */}
                <Module title="DYNAMICS" variant="silver" width="w-full sm:w-[48%] lg:w-48">
                    <div className="flex items-center justify-center gap-6">
                        <Knob label="TURBULENCE" value={state.turbulence} onChange={(v) => setState(s => ({...s, turbulence: v}))} variant="silver" size="md" />
                    </div>
                </Module>

                {/* 4. CHROMATICS MODULE - Responsive Grid Layout */}
                <Module title="CHROMATICS" variant="titanium" width="w-full lg:w-96">
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-6 p-2">
                        {/* Row 1 on Mobile: Colors */}
                        <div className="flex items-center gap-6">
                            <ColorCell 
                                label="SIGNAL A" 
                                color={state.colorA} 
                                onChange={(c) => setState(s => ({...s, colorA: c}))} 
                            />
                            
                            <ColorCell 
                                label="SIGNAL B" 
                                color={state.colorB} 
                                onChange={(c) => setState(s => ({...s, colorB: c}))} 
                            />
                        </div>
                        
                        <div className="hidden lg:block w-px h-12 bg-white/10 mx-2"></div>
                        
                        {/* Row 2 on Mobile: Knobs */}
                        <div className="flex items-center gap-5">
                            <Knob label="HUE LFO" value={state.colorShift} onChange={(v) => setState(s => ({...s, colorShift: v}))} variant="dark" />
                            <Knob label="GRAIN" value={state.grain} onChange={(v) => setState(s => ({...s, grain: v}))} variant="dark" />
                            <Knob label="SHARP" value={state.sharpness} onChange={(v) => setState(s => ({...s, sharpness: v}))} variant="dark" />
                        </div>
                    </div>
                </Module>

                {/* 5. FEEDBACK MODULE */}
                <Module title="FEEDBACK" variant="black" width="w-full sm:w-[48%] lg:w-40">
                    <div className="flex flex-col items-center justify-center h-full">
                         <Knob label="DRIVE" value={state.feedback} onChange={(v) => setState(s => ({...s, feedback: v}))} variant="dark" size="lg" />
                    </div>
                </Module>

            </div>
        </div>
      </div>

    </div>
  );
}