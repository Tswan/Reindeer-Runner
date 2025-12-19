import { GameCanvas } from "@/components/GameCanvas";
import { ScoreBoard } from "@/components/ScoreBoard";

export default function Home() {
  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1e] to-black">
      {/* Ambient background effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
      
      {/* Snowflakes (CSS Animation) */}
      {[...Array(20)].map((_, i) => (
        <div 
          key={i}
          className="snowflake text-white/20"
          style={{ 
            left: `${Math.random() * 100}vw`, 
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 5}s`,
            fontSize: `${10 + Math.random() * 20}px`
          }}
        >
          ❄
        </div>
      ))}

      <main className="relative z-10 container mx-auto px-4 py-12 flex flex-col gap-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl md:text-8xl font-display text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-100 to-blue-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Reindeer Runner
          </h1>
          <p className="text-lg md:text-xl text-blue-200/80 font-light max-w-2xl mx-auto">
            Dash through the snow, jump over obstacles, and help Santa deliver presents in this endless winter adventure!
          </p>
        </div>

        {/* Game Area */}
        <section className="w-full">
          <GameCanvas />
        </section>

        {/* Leaderboard Section */}
        <section className="flex justify-center pb-20">
          <ScoreBoard />
        </section>
      </main>
      
      {/* Footer */}
      <footer className="absolute bottom-4 w-full text-center text-white/20 text-sm">
        <p>Built for the holidays 🎄</p>
      </footer>
    </div>
  );
}
