import React, { useState, useRef } from 'react';
import { audioService } from '../services/audioService';

interface KnobProps {
  label: string;
  value: number; // 0 to 1
  onChange: (val: number) => void;
  variant?: 'dark' | 'silver';
  size?: 'md' | 'lg';
}

export const Knob: React.FC<KnobProps> = ({ label, value, onChange, variant = 'dark', size = 'md' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  // Styling Config
  const isSilver = variant === 'silver';
  const sizePx = size === 'lg' ? 80 : 64;
  const knobSizePx = size === 'lg' ? 60 : 48;
  
  // Rotation Calc
  const minRot = -135;
  const maxRot = 135;
  const rotation = minRot + value * (maxRot - minRot);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // Prevent default touch actions
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaY = startYRef.current - e.clientY;
    const deltaVal = deltaY / 200; 
    let newValue = Math.max(0, Math.min(1, startValueRef.current + deltaVal));

    if (newValue !== value) {
        // Haptics
        const oldStep = Math.floor(value * 20);
        const newStep = Math.floor(newValue * 20);
        if (oldStep !== newStep) audioService.playClick('tick');
        onChange(newValue);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 relative group select-none touch-none">
      
      {/* Container with Ticks */}
      <div 
        className="relative flex items-center justify-center"
        style={{ width: sizePx, height: sizePx }}
      >
        {/* Dial Scale (SVG) */}
        <svg className="absolute w-full h-full pointer-events-none" viewBox="0 0 100 100">
           {/* Ticks */}
           {Array.from({ length: 11 }).map((_, i) => {
             const angle = -135 + (i * 270) / 10;
             const rad = (angle - 90) * (Math.PI / 180);
             const x1 = 50 + 38 * Math.cos(rad);
             const y1 = 50 + 38 * Math.sin(rad);
             const x2 = 50 + 46 * Math.cos(rad);
             const y2 = 50 + 46 * Math.sin(rad);
             return (
               <line 
                 key={i} x1={x1} y1={y1} x2={x2} y2={y2} 
                 stroke={isSilver ? "#555" : "#888"} 
                 strokeWidth={i % 5 === 0 ? 2 : 1} 
                 strokeLinecap="round" 
               />
             );
           })}
        </svg>

        {/* The Knob Itself */}
        <div 
            className={`
                relative rounded-full z-10 cursor-ns-resize touch-none
                ${isSilver ? 'bg-[#d0d0d5]' : 'bg-[#1a1a1a]'}
                ${isDragging ? 'shadow-knob-pressed' : (isSilver ? 'shadow-knob-light' : 'shadow-knob-dark')}
            `}
            style={{ width: knobSizePx, height: knobSizePx, transform: `rotate(${rotation}deg)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => setIsDragging(false)}
            onPointerCancel={() => setIsDragging(false)}
        >
             {/* Side Texture */}
             <div className="absolute inset-0 rounded-full bg-knurl opacity-30 mix-blend-overlay"></div>
             
             {/* Top Face */}
             <div className={`absolute inset-1 rounded-full ${isSilver ? 'bg-gradient-to-b from-white to-[#aaa]' : 'bg-gradient-to-b from-[#333] to-black'} shadow-inner`}>
                 {/* Indicator */}
                 <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[2px] h-[30%] bg-black/50 rounded overflow-hidden">
                    <div className={`w-full h-full ${value > 0 ? 'bg-orange-500 shadow-[0_0_4px_orange]' : 'bg-gray-600'} transition-colors`}></div>
                 </div>
             </div>
        </div>
      </div>

      {/* Label & Value */}
      <div className="flex flex-col items-center -mt-1">
          <span className={`font-mono text-[9px] uppercase tracking-widest ${isSilver ? 'text-gray-700 font-bold' : 'text-gray-400'}`}>
            {label}
          </span>
          {/* Digital Readout */}
          <span className={`font-mono text-[8px] ${isSilver ? 'text-gray-500' : 'text-gray-600'}`}>
            {(value * 100).toFixed(0)}
          </span>
      </div>
    </div>
  );
};