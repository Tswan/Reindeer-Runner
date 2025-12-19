import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import { useCreateScore } from "@/hooks/use-scores";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [gameOver, setGameOver] = useState(false);
  
  const createScore = useCreateScore();

  // Animation frame ID for cleanup
  const requestRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Game constants
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 400;
    const REINDEER_SIZE = 40;
    
    // Game state (refs for loop performance)
    let frameCount = 0;
    let reindeerY = CANVAS_HEIGHT - REINDEER_SIZE - 20; // Starting ground position

    const animate = () => {
      if (!isPlaying || gameOver) return;

      frameCount++;
      
      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // --- DRAW BACKGROUND ---
      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#0f172a"); // Dark blue top
      gradient.addColorStop(1, "#1e293b"); // Slightly lighter bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Moon
      ctx.fillStyle = "#fefce8";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#fefce8";
      ctx.beginPath();
      ctx.arc(700, 60, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Stars (static for now, could be an array)
      ctx.fillStyle = "white";
      if (Math.random() > 0.95) {
        ctx.fillRect(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT / 2, 2, 2);
      }

      // Ground (snow)
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);

      // --- DRAW ENTITIES ---
      // Reindeer (placeholder box)
      ctx.fillStyle = "#ef4444"; // Holiday Red
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      
      // Simple jump logic simulation (bobbing)
      const bobOffset = Math.sin(frameCount * 0.1) * 5;
      
      ctx.fillRect(100, reindeerY + bobOffset, REINDEER_SIZE, REINDEER_SIZE);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      // Eyes
      ctx.fillStyle = "white";
      ctx.fillRect(100 + 25, reindeerY + bobOffset + 5, 5, 5);
      
      // Nose
      ctx.fillStyle = "#fbbf24"; // Glowing nose
      ctx.beginPath();
      ctx.arc(100 + 35, reindeerY + bobOffset + 20, 5, 0, Math.PI * 2);
      ctx.fill();

      // Score
      if (frameCount % 60 === 0) { // Every ~1 second
         setScore(prev => prev + 1);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      // Initial render when not playing
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "30px 'Mountains of Christmas'";
      ctx.textAlign = "center";
      ctx.fillText("Press Start to Play!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, gameOver]);

  const handleStart = () => {
    if (!playerName.trim()) return;
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
  };

  const handleGameOver = () => {
    setIsPlaying(false);
    setGameOver(true);
    createScore.mutate({ playerName, score });
  };

  // Mock game over for testing UI
  const handleStop = () => {
    handleGameOver();
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto p-4">
      <div className="relative group rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border-4 border-white/10 bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="block w-full h-auto max-w-[800px] bg-slate-900"
        />
        
        {/* Overlay for controls if needed */}
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white font-bold font-display text-xl">
          Score: {score}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center">
        {!isPlaying ? (
          <div className="flex gap-4 items-end bg-card p-6 rounded-2xl border border-white/5 shadow-xl">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="player" className="text-white/80">Reindeer Name</Label>
              <Input
                type="text"
                id="player"
                placeholder="Rudolph"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <Button 
              onClick={handleStart} 
              disabled={!playerName}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-white font-bold text-lg px-8 shadow-lg shadow-accent/20 transition-all hover:-translate-y-1"
            >
              <Play className="mr-2 h-5 w-5" /> Start Run
            </Button>
          </div>
        ) : (
          <Button 
            onClick={handleStop} 
            variant="destructive"
            size="lg"
            className="font-bold shadow-lg shadow-destructive/20"
          >
            <RotateCcw className="mr-2 h-5 w-5" /> End Run (Test)
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-sm text-center max-w-lg">
        Control your reindeer with the spacebar to jump over obstacles and collect presents! (Controls coming soon)
      </p>
    </div>
  );
}
