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
    
    // --- GROUND SCROLLING CONFIGURATION ---
    const GROUND_HEIGHT = 20;           // Height of the ground rectangle
    const GROUND_Y = CANVAS_HEIGHT - GROUND_HEIGHT; // Y position of ground
    const GROUND_SPEED = 5;             // Pixels to scroll per frame (adjust for faster/slower movement)
    
    // --- JUMP PHYSICS CONFIGURATION ---
    // These values are tuned for responsive, non-floaty jumping:
    // - GRAVITY: Acceleration pulling the reindeer down each frame (higher = faster fall)
    // - JUMP_VELOCITY: Initial upward velocity when jumping (negative = up in canvas coords)
    // - The ratio of JUMP_VELOCITY to GRAVITY determines jump height and feel
    const GRAVITY = 0.8;                // Pixels per frame squared (acceleration)
    const JUMP_VELOCITY = -15;          // Initial upward velocity (negative = up)
    const GROUND_LEVEL = CANVAS_HEIGHT - REINDEER_SIZE - GROUND_HEIGHT; // Y position when on ground
    
    // Game state (refs for loop performance)
    let frameCount = 0;
    let reindeerY = GROUND_LEVEL;       // Current Y position of reindeer
    let velocityY = 0;                  // Current vertical velocity (positive = falling, negative = rising)
    let isOnGround = true;              // Track if reindeer can jump (only when grounded)
    
    // --- GROUND SCROLL POSITION ---
    // This tracks how far the ground has scrolled.
    // When it exceeds the canvas width, we reset it to create seamless looping.
    let groundScrollX = 0;
    
    // --- OBSTACLE CONFIGURATION ---
    // Obstacles spawn from the right and move left toward the player
    const OBSTACLE_WIDTH = 30;          // Width of obstacle rectangles
    const OBSTACLE_HEIGHT = 50;         // Height of obstacle rectangles
    const OBSTACLE_SPEED = GROUND_SPEED; // Match ground speed for consistent movement
    const MIN_SPAWN_DELAY = 60;         // Minimum frames between obstacle spawns
    const MAX_SPAWN_DELAY = 150;        // Maximum frames between obstacle spawns
    
    // Obstacle type definition
    interface Obstacle {
      x: number;      // X position (left edge of obstacle)
      y: number;      // Y position (top edge of obstacle)
      width: number;  // Width of this obstacle
      height: number; // Height of this obstacle
    }
    
    // --- OBSTACLE ARRAY ---
    // Stores all active obstacles on screen
    // Obstacles are added when spawned and removed when off-screen
    const obstacles: Obstacle[] = [];
    
    // Track when to spawn the next obstacle
    // Using random delay creates varied spacing between obstacles
    let framesSinceLastSpawn = 0;
    let nextSpawnDelay = MIN_SPAWN_DELAY + Math.random() * (MAX_SPAWN_DELAY - MIN_SPAWN_DELAY);
    
    // --- JUMP INPUT HANDLER ---
    // Triggered by spacebar or canvas click
    // Only allows jumping when the reindeer is on the ground
    const handleJump = () => {
      if (isOnGround && isPlaying && !gameOver) {
        // Apply initial jump velocity (negative = upward in canvas coordinates)
        velocityY = JUMP_VELOCITY;
        // Mark as airborne to prevent double-jumping
        isOnGround = false;
      }
    };
    
    // --- EVENT LISTENERS FOR JUMP INPUT ---
    // Spacebar handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Prevent page scrolling
        handleJump();
      }
    };
    
    // Click/tap handler for canvas
    const handleCanvasClick = () => {
      handleJump();
    };
    
    // Attach event listeners
    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("click", handleCanvasClick);

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

      // --- SCROLLING GROUND ---
      // Update ground scroll position (moves left each frame)
      groundScrollX += GROUND_SPEED;
      
      // Reset scroll position when it exceeds canvas width for seamless loop
      // Using modulo ensures the ground tiles back to the start without a visible jump
      if (groundScrollX >= CANVAS_WIDTH) {
        groundScrollX = 0;
      }
      
      // Draw ground - we draw two segments to create seamless scrolling:
      // 1. First segment: starts at -groundScrollX (moving left off-screen)
      // 2. Second segment: starts at CANVAS_WIDTH - groundScrollX (fills the gap on the right)
      ctx.fillStyle = "#f1f5f9"; // Snow white color
      
      // First ground segment (scrolling off to the left)
      ctx.fillRect(-groundScrollX, GROUND_Y, CANVAS_WIDTH, GROUND_HEIGHT);
      
      // Second ground segment (coming in from the right to fill the gap)
      ctx.fillRect(CANVAS_WIDTH - groundScrollX, GROUND_Y, CANVAS_WIDTH, GROUND_HEIGHT);

      // --- OBSTACLE SPAWNING ---
      // Check if it's time to spawn a new obstacle
      framesSinceLastSpawn++;
      
      if (framesSinceLastSpawn >= nextSpawnDelay) {
        // Spawn a new obstacle at the right edge of the screen
        // Obstacle sits on top of the ground
        const newObstacle: Obstacle = {
          x: CANVAS_WIDTH,                                    // Start at right edge
          y: GROUND_Y - OBSTACLE_HEIGHT,                      // Sit on ground
          width: OBSTACLE_WIDTH,
          height: OBSTACLE_HEIGHT
        };
        
        obstacles.push(newObstacle);
        
        // Reset spawn timer with new random delay
        framesSinceLastSpawn = 0;
        nextSpawnDelay = MIN_SPAWN_DELAY + Math.random() * (MAX_SPAWN_DELAY - MIN_SPAWN_DELAY);
      }
      
      // --- OBSTACLE UPDATE AND DRAW ---
      // Loop through obstacles backwards so we can safely remove items
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        
        // Move obstacle left (toward the player)
        obstacle.x -= OBSTACLE_SPEED;
        
        // Remove obstacle if it's completely off-screen (left edge)
        if (obstacle.x + obstacle.width < 0) {
          obstacles.splice(i, 1);
          continue;
        }
        
        // Draw obstacle (tree/log placeholder - green rectangle)
        ctx.fillStyle = "#166534"; // Dark green for trees
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Add a lighter top to make it look more like a tree/stump
        ctx.fillStyle = "#22c55e"; // Lighter green
        ctx.fillRect(obstacle.x + 5, obstacle.y, obstacle.width - 10, 10);
      }

      // --- APPLY JUMP PHYSICS ---
      // Physics simulation using velocity-based movement:
      // 1. Add gravity to velocity each frame (accelerates downward)
      // 2. Add velocity to position (moves the reindeer)
      // 3. Check for ground collision to stop falling
      
      // Apply gravity: velocity increases each frame (pulls downward)
      velocityY += GRAVITY;
      
      // Apply velocity to position: move reindeer by current velocity
      reindeerY += velocityY;
      
      // Ground collision detection:
      // If reindeer has fallen to or below ground level, snap to ground and stop
      if (reindeerY >= GROUND_LEVEL) {
        reindeerY = GROUND_LEVEL;  // Snap to ground (prevent sinking)
        velocityY = 0;              // Stop vertical movement
        isOnGround = true;          // Allow jumping again
      }

      // --- DRAW ENTITIES ---
      // Reindeer (placeholder box)
      ctx.fillStyle = "#ef4444"; // Holiday Red
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      
      // Draw reindeer at current Y position (no bobbing - using physics position)
      ctx.fillRect(100, reindeerY, REINDEER_SIZE, REINDEER_SIZE);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      // Eyes
      ctx.fillStyle = "white";
      ctx.fillRect(100 + 25, reindeerY + 5, 5, 5);
      
      // Nose
      ctx.fillStyle = "#fbbf24"; // Glowing nose
      ctx.beginPath();
      ctx.arc(100 + 35, reindeerY + 20, 5, 0, Math.PI * 2);
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
      
      // Draw static background
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw static ground at the bottom
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
      
      // Draw "Press Start" message
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "30px 'Mountains of Christmas'";
      ctx.textAlign = "center";
      ctx.fillText("Press Start to Play!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    // Cleanup function: remove event listeners and cancel animation frame
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("click", handleCanvasClick);
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
        Press SPACEBAR or click the game to jump! Avoid obstacles and see how long you can run.
      </p>
    </div>
  );
}
