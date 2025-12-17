import React from 'react';
import { audioService } from '../services/audioService';

interface SwitchProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  type?: 'toggle' | 'push';
}

export const Switch: React.FC<SwitchProps> = ({ label, active, onToggle }) => {
  
  const handleClick = () => {
    audioService.playClick(active ? 'thock' : 'snap');
    onToggle();
  };

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Toggle Housing */}
      <div 
        className="relative w-10 h-16 cursor-pointer group"
        onClick={handleClick}
      >
        {/* Mounting Plate */}
        <div className="absolute inset-0 bg-[#151515] rounded-md border border-white/10 shadow-[inset_0_2px_5px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.1)]"></div>
        
        {/* Screw holes */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-black/50 shadow-[inset_0_1px_1px_rgba(0,0,0,1)]"></div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-black/50 shadow-[inset_0_1px_1px_rgba(0,0,0,1)]"></div>

        {/* The Toggle Lever */}
        <div className="absolute inset-x-1 top-2 bottom-2 bg-[#0a0a0a] rounded shadow-inner">
             {/* The moving part */}
             <div 
                className={`absolute left-0 right-0 h-8 rounded-sm shadow-md transition-all duration-100 cubic-bezier(0.4, 2, 0.6, 1) border-t border-white/20
                ${active 
                    ? 'top-0 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500' 
                    : 'bottom-0 bg-gradient-to-b from-gray-500 via-gray-600 to-gray-700'
                }`}
            >
                {/* Grip Lines */}
                <div className="absolute inset-x-1 top-1 bottom-1 flex flex-col justify-between opacity-30">
                    <div className="h-px bg-black"></div>
                    <div className="h-px bg-black"></div>
                    <div className="h-px bg-black"></div>
                </div>
            </div>
        </div>
      </div>

      {/* LED Indicator */}
      <div className="flex flex-col items-center gap-1.5">
        <div 
            className={`w-3 h-3 rounded-full border border-black/50 transition-all duration-200
            ${active 
                ? 'bg-led-green-on shadow-led-glow' 
                : 'bg-led-green-off shadow-inner'
            }`}
        >
            {/* Highlight */}
            <div className="w-1 h-1 bg-white opacity-40 rounded-full ml-0.5 mt-0.5"></div>
        </div>
        <span className="font-[Share_Tech_Mono] text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center leading-tight">
            {label}
        </span>
      </div>
    </div>
  );
};
