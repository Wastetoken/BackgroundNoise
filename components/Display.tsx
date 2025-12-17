import React, { useEffect, useRef, useState } from 'react';
import { AudioData } from '../types';

interface DisplayProps {
  audioData: AudioData;
  label: string;
}

export const Display: React.FC<DisplayProps> = ({ audioData, label }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hexCode, setHexCode] = useState("0x00");

  useEffect(() => {
    const interval = setInterval(() => {
        // Generate random hex-like garbage for aesthetic
        const val = Math.floor(Math.random() * 255).toString(16).toUpperCase().padStart(2, '0');
        setHexCode(`0x${val}`);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#050a08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    ctx.strokeStyle = 'rgba(51, 255, 170, 0.05)';
    ctx.beginPath();
    for(let x=0; x<canvas.width; x+=4) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for(let y=0; y<canvas.height; y+=4) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();

    // Waveform
    ctx.strokeStyle = '#33ffaa';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#33ffaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    const midY = canvas.height / 2;
    ctx.moveTo(0, midY);

    const amp = Math.max(0.1, audioData.vol) * 15;
    
    for (let x = 0; x < canvas.width; x++) {
      const y = midY + Math.sin(x * 0.2 + Date.now() * 0.1) * amp * Math.random();
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

  }, [audioData]);

  return (
    <div className="relative bg-black rounded p-1 shadow-bezel border border-gray-800">
      {/* The LCD Screen */}
      <div className="relative overflow-hidden bg-lcd-bg rounded-sm border border-white/5">
          <div className="flex justify-between items-start px-1 pt-1 absolute inset-0 z-10">
               <span className="text-[8px] font-mono text-lcd-text opacity-80">{label}</span>
               <span className="text-[8px] font-mono text-lcd-text opacity-90">{hexCode}</span>
          </div>
          
          <canvas ref={canvasRef} width={120} height={40} className="w-full h-10 opacity-80" />
          
          {/* Artifacts */}
          <div className="absolute inset-0 scanlines opacity-50"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/10 pointer-events-none"></div>
      </div>
      
      {/* Glass Reflection */}
      <div className="absolute inset-0 rounded pointer-events-none shadow-screen-glass mix-blend-screen"></div>
    </div>
  );
};