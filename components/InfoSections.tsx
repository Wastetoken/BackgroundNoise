import React from 'react';

const Section: React.FC<{ id: string, title: string, children: React.ReactNode }> = ({ id, title, children }) => (
    <section id={id} className="min-h-screen bg-black flex flex-col justify-center px-8 md:px-24 py-24 border-b border-white/5">
        <div className="max-w-4xl">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4 block">Section // {id.toUpperCase()}</span>
            <h2 className="font-clash text-5xl md:text-8xl font-medium mb-12 tracking-tighter">{title}</h2>
            <div className="font-sans text-xl md:text-3xl text-white/60 leading-tight space-y-8">
                {children}
            </div>
        </div>
    </section>
);

export const InfoSections: React.FC = () => {
    return (
        <div className="relative z-10">
            <Section id="what" title="THE ENGINE">
                <p>CHROMA-SYS is an <span className="text-white italic">autonomous generative synthesizer</span> designed for the high-fidelity translation of audio energy into visual persistence.</p>
                <p>This is not a filter. It is a simulation of digital ink, reacting to frequency bands in real-time. Every stroke is permanent. Every frame is a raw record of the signal.</p>
            </Section>

            <Section id="why" title="THE PURPOSE">
                <p>In a world of ephemeral media, this tool <span className="text-white">remembers</span>.</p>
                <p>CHROMA-SYS captures the fleeting dynamics of a performance and freezes them into a complex, high-resolution texture. It is a void for creative exploration—a system that exists only to process and preserve.</p>
            </Section>

            <Section id="how" title="THE LOGIC">
                <p>The system utilizes <span className="text-white">Feedback Injection</span> to maintain infinite persistence on the canvas.</p>
                <p>By mapping Microphone Input to 24 distinct algorithms—ranging from Flow Fields to Cellular Automata—the engine creates a unique interaction between signal and canvas. No two exports are ever identical. No human oversight required.</p>
            </Section>
        </div>
    );
};