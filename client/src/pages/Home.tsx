import { GameCanvas } from "@/components/GameCanvas";
import { ScoreBoard } from "@/components/ScoreBoard";

export default function Home() {
  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-white">
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

      {/* Green blob background - edge to edge, top aligned */}
      <svg 
        className="absolute top-0 left-0 w-full h-[280px] pointer-events-none z-0"
        viewBox="0 0 1419 320" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path d="M709.505 -282C778.355 -282 841.375 -239.34 905.264 -233.859C974.494 -227.919 1052.28 -257.939 1113.27 -246.391C1181.95 -233.387 1222.56 -180.197 1277.4 -161.245C1343.1 -138.535 1433.58 -143.151 1473.74 -113.855C1523.41 -77.6148 1499 -23.6997 1499 19C1499 61.6997 1523.41 115.615 1473.74 151.855C1433.58 181.158 1343.11 176.535 1277.4 199.245C1222.56 218.197 1181.95 271.387 1113.27 284.391C1052.28 295.939 974.494 265.919 905.264 271.859C841.375 277.34 778.345 320 709.495 320C640.645 320 577.625 277.34 513.736 271.859C444.506 265.919 366.716 295.939 305.726 284.391C237.047 271.387 196.437 218.197 141.597 199.245C75.8971 176.535 -14.5826 181.151 -54.7425 151.855C-104.412 115.615 -80.0024 61.6997 -80.0024 19C-80.0024 -23.6997 -104.412 -77.6148 -54.7425 -113.855C-14.5826 -143.158 75.8871 -138.535 141.597 -161.245C196.437 -180.197 237.047 -233.387 305.726 -246.391C366.716 -257.939 444.506 -227.919 513.736 -233.859C577.625 -239.34 640.655 -282 709.505 -282Z" fill="url(#paint0_radial_10_406)"/>
        <defs>
          <radialGradient id="paint0_radial_10_406" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(711.77 20.1708) scale(835.887 286.671)">
            <stop stopColor="#1CB97B"/>
            <stop offset="0.94" stopColor="#0F6342"/>
          </radialGradient>
        </defs>
      </svg>

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

      </main>

      {/* Footer section with SVG background */}
      <div className="relative mt-[-98px]">
        {/* Footer background SVG */}
        <svg 
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          viewBox="0 0 1419 676" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path d="M1419 49.1015V675.371H0V17.8615C124.02 -35.4485 144.06 47.5615 283.79 47.5615C423.52 47.5615 425.69 19.1815 567.59 19.1815C709.49 19.1815 709.49 47.5615 851.39 47.5615C993.29 47.5615 993.29 19.1815 1135.19 19.1815C1277.09 19.1815 1283.86 -12.1885 1413.15 46.3015C1415.22 47.2415 1417.17 48.1715 1419 49.1015Z" fill="url(#paint0_linear_12_416)"/>
          <defs>
            <linearGradient id="paint0_linear_12_416" x1="709.5" y1="627.372" x2="709.5" y2="61.4069" gradientUnits="userSpaceOnUse">
              <stop stopColor="#084C30"/>
              <stop offset="0.944707" stopColor="#043B24"/>
            </linearGradient>
          </defs>
        </svg>
        
        {/* Leaderboard Section */}
        <section className="relative z-10 flex justify-center pt-[98px] pb-20 container mx-auto px-4">
          <ScoreBoard />
        </section>

        {/* Footer */}
        <footer className="relative z-10 pb-4 w-full text-center text-white/50 text-sm">
          <p>Built for the holidays</p>
        </footer>
      </div>
    </div>
  );
}
