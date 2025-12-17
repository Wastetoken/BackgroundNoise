import React from 'react';
import { audioService } from '../services/audioService';

interface RotarySwitchProps {
  label: string;
  options: string[];
  value: number;
  onChange: (index: number) => void;
}

export const RotarySwitch: React.FC<RotarySwitchProps> = ({ label, options, value, onChange }) => {
  // Calculate rotation: start at -45deg, spread over 90deg
  const step = 90 / (options.length - 1);
  const rotation = -45 + (value * step);

  const handleClick = () => {
    const next = (value + 1) % options.length;
    audioService.playClick('thock');
    onChange(next);
  };

  return (
    <div className="flex flex-col items-center gap-2 group select-none touch-none">
      <div 
        className="relative w-16 h-16 flex items-center justify-center cursor-pointer"
        onClick={handleClick}
      >
        {/* Tick Marks */}
        <div className="absolute inset-0 pointer-events-none">
            {options.map((_, i) => {
                const r = -45 + (i * step);
                const isSelected = i === value;
                return (
                    <div 
                        key={i}
                        className="absolute top-0 left-1/2 w-0.5 h-2 -ml-px origin-bottom translate-y-[0px] transition-colors"
                        style={{ 
                            transform: `rotate(${r}deg) translateY(-28px)`,
                            backgroundColor: isSelected ? '#ffaa00' : '#333'
                        }}
                    />
                );
            })}
        </div>

        {/* Knob Body */}
        <div 
            className="w-10 h-10 rounded-full bg-[#151515] border-2 border-[#0a0a0a] shadow-[0_5px_10px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.1)] relative transition-transform duration-200 cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            style={{ transform: `rotate(${rotation}deg)` }}
        >
            {/* Pointer */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-white rounded-sm shadow-[0_0_5px_rgba(255,255,255,0.5)]"></div>
            {/* Grip Texture */}
            <div className="absolute inset-0 rounded-full border border-white/5 opacity-50 bg-knurl bg-[length:4px_4px]"></div>
        </div>
      </div>

      {/* Label Display */}
      <div className="flex flex-col items-center -mt-1">
        <span className="font-mono text-[9px] uppercase tracking-widest text-gray-400 font-bold">{label}</span>
        <div className="h-4 flex items-center mt-0.5">
             <span className="font-mono text-[10px] text-orange-500 bg-black/50 px-1 rounded border border-orange-500/20 shadow-[0_0_10px_rgba(255,165,0,0.2)]">
                {options[value]}
             </span>
        </div>
      </div>
    </div>
  );
};