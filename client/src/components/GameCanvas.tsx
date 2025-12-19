import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import { useCreateScore, useScores } from "@/hooks/use-scores";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import treePng from "@assets/tree_1766176137201.png";
import reindeerSpritePng from "@assets/DeerSprite_Run_1766180458247.png";
import reindeerSlidePng from "@assets/DeerSprite_Slide_1766183137995.png";
import presentPng from "@assets/present_1766182451587.png";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [gameOver, setGameOver] = useState(false);
  
  const createScore = useCreateScore();
  const { data: scores } = useScores();
  
  // Check if score beats top 3
  const isTopThree = (() => {
    if (!scores || scores.length < 3) return true; // If less than 3 scores, they're in top 3
    const top3Scores = scores.slice(0, 3).map(s => s.score);
    const lowestTop3 = Math.min(...top3Scores);
    return score > lowestTop3;
  })();

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
    const BASE_GROUND_SPEED = 5;        // Starting speed (pixels per frame)
    const MAX_GROUND_SPEED = 12;        // Maximum speed cap
    const SPEED_INCREASE_RATE = 0.001;  // Speed increase per frame (smooth scaling)
    
    // --- JUMP PHYSICS CONFIGURATION ---
    // These values are tuned for responsive, non-floaty jumping:
    // - GRAVITY: Acceleration pulling the reindeer down each frame (higher = faster fall)
    // - JUMP_VELOCITY: Initial upward velocity when jumping (negative = up in canvas coords)
    // - The ratio of JUMP_VELOCITY to GRAVITY determines jump height and feel
    const GRAVITY = 0.8;                // Pixels per frame squared (acceleration)
    const JUMP_VELOCITY = -15;          // Initial upward velocity (negative = up)
    const GROUND_LEVEL = CANVAS_HEIGHT - REINDEER_SIZE - GROUND_HEIGHT; // Y position when on ground
    
    // --- SLIDE CONFIGURATION ---
    // Sliding reduces reindeer height to pass under low obstacles
    // Slide is active as long as the key is held down (no cooldown)
    const SLIDE_HEIGHT = 20;            // Height when sliding (half normal)
    
    // Game state (refs for loop performance)
    let frameCount = 0;
    let reindeerY = GROUND_LEVEL;       // Current Y position of reindeer
    let velocityY = 0;                  // Current vertical velocity (positive = falling, negative = rising)
    let isOnGround = true;              // Track if reindeer can jump (only when grounded)
    
    // Slide state - now based on key being held down
    let isSliding = false;              // Currently sliding (key held down)
    
    // --- DIFFICULTY PROGRESSION ---
    // Speed increases smoothly over time for progressive difficulty
    let currentSpeed = BASE_GROUND_SPEED;  // Current world speed (increases over time)
    let internalScore = 0;                 // Internal score tracker for real-time updates
    
    // --- GROUND SCROLL POSITION ---
    // This tracks how far the ground has scrolled.
    // When it exceeds the canvas width, we reset it to create seamless looping.
    let groundScrollX = 0;
    
    // --- OBSTACLE CONFIGURATION ---
    // Obstacles spawn from the right and move left toward the player
    const OBSTACLE_WIDTH = 60;          // Width of tree obstacle
    const OBSTACLE_HEIGHT = 70;         // Height of tree obstacle
    const MIN_SPAWN_DELAY = 60;         // Minimum frames between obstacle spawns
    const MAX_SPAWN_DELAY = 150;        // Maximum frames between obstacle spawns
    
    // --- LOAD TREE IMAGE ---
    const treeImage = new Image();
    treeImage.src = treePng;
    let treeImageLoaded = false;
    treeImage.onload = () => {
      treeImageLoaded = true;
    };
    
    // --- LOAD REINDEER SPRITE SHEET ---
    const reindeerSprite = new Image();
    reindeerSprite.src = reindeerSpritePng;
    let reindeerSpriteLoaded = false;
    reindeerSprite.onload = () => {
      reindeerSpriteLoaded = true;
    };
    
    // --- LOAD SLIDE SPRITE ---
    const reindeerSlideSprite = new Image();
    reindeerSlideSprite.src = reindeerSlidePng;
    let reindeerSlideSpriteLoaded = false;
    reindeerSlideSprite.onload = () => {
      reindeerSlideSpriteLoaded = true;
    };
    
    // --- LOAD PRESENT IMAGE ---
    const presentImage = new Image();
    presentImage.src = presentPng;
    let presentImageLoaded = false;
    presentImage.onload = () => {
      presentImageLoaded = true;
    };
    
    // Sprite animation configuration
    const SPRITE_FRAME_WIDTH = 128;   // Each frame is 128x128
    const SPRITE_FRAME_HEIGHT = 128;
    const SPRITE_TOTAL_FRAMES = 5;    // 5 frames in the run cycle
    const SPRITE_FPS = 12;            // 12 FPS animation
    let spriteFrameIndex = 0;
    let spriteFrameTimer = 0;
    const SPRITE_FRAME_DURATION = 1000 / SPRITE_FPS; // ms per frame
    
    // Obstacle type definition
    interface Obstacle {
      x: number;      // X position (left edge of obstacle)
      y: number;      // Y position (top edge of obstacle)
      width: number;  // Width of this obstacle
      height: number; // Height of this obstacle
      type: 'ground' | 'low'; // 'ground' = jump over, 'low' = slide under
    }
    
    // Low obstacle configuration (must slide under)
    // Positioned so standing reindeer WILL hit it - must slide to pass
    const LOW_OBSTACLE_WIDTH = 60;      // Wider than ground obstacles
    const LOW_OBSTACLE_HEIGHT = 25;     // Low height, floats above ground
    const LOW_OBSTACLE_Y_OFFSET = 5;    // Very close to ground - forces sliding to avoid
    
    // --- OBSTACLE ARRAY ---
    // Stores all active obstacles on screen
    // Obstacles are added when spawned and removed when off-screen
    const obstacles: Obstacle[] = [];
    
    // --- PRESENT (COLLECTIBLE) CONFIGURATION ---
    // Presents spawn randomly and give bonus points when collected
    interface Present {
      x: number;
      y: number;
      width: number;
      height: number;
      collected: boolean;
    }
    
    const PRESENT_WIDTH = 30;
    const PRESENT_HEIGHT = 30;
    const PRESENT_SCORE_BONUS = 10;      // Points for collecting a present
    const PRESENT_SPAWN_CHANCE = 0.02;   // 2% chance per frame to spawn
    const presents: Present[] = [];
    
    // --- SNOW PARTICLES ---
    // Lightweight particle system for background snow effect
    interface Snowflake {
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
    }
    
    const SNOWFLAKE_COUNT = 50;         // Number of snowflakes
    const snowflakes: Snowflake[] = [];
    
    // Initialize snowflakes
    for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
      snowflakes.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.5 + 0.3
      });
    }
    
    // --- PARALLAX BACKGROUND ---
    // Multiple layers moving at different speeds for depth effect
    interface Mountain {
      x: number;
      width: number;
      height: number;
      color: string;
    }
    
    // Far mountains (slow movement)
    const farMountains: Mountain[] = [];
    for (let i = 0; i < 5; i++) {
      farMountains.push({
        x: i * 200 - 50,
        width: 250,
        height: 80 + Math.random() * 40,
        color: "#334155"
      });
    }
    
    // Near mountains (faster movement)
    const nearMountains: Mountain[] = [];
    for (let i = 0; i < 4; i++) {
      nearMountains.push({
        x: i * 250 - 30,
        width: 300,
        height: 60 + Math.random() * 30,
        color: "#475569"
      });
    }
    
    let farMountainOffset = 0;
    let nearMountainOffset = 0;
    
    // --- SCREEN SHAKE ---
    // Brief shake effect on collision for impact feedback
    let shakeIntensity = 0;
    let shakeDuration = 0;
    
    // --- RUNNING ANIMATION ---
    // Subtle bobbing motion when on ground
    let runBobOffset = 0;
    
    // Track when to spawn the next obstacle
    // Using random delay creates varied spacing between obstacles
    let framesSinceLastSpawn = 0;
    let nextSpawnDelay = MIN_SPAWN_DELAY + Math.random() * (MAX_SPAWN_DELAY - MIN_SPAWN_DELAY);
    
    // Reindeer position (X is constant, Y changes with jumping)
    const REINDEER_X = 100;
    
    // --- COLLISION DETECTION ---
    // Simple AABB (Axis-Aligned Bounding Box) rectangle collision detection
    // Returns true if two rectangles overlap
    // This is efficient and works well for rectangular hitboxes
    const checkCollision = (
      rect1: { x: number; y: number; width: number; height: number },
      rect2: { x: number; y: number; width: number; height: number }
    ): boolean => {
      // Two rectangles collide if they overlap on BOTH axes
      // No collision if: one is completely left, right, above, or below the other
      return (
        // rect1's bottom edge is below rect2's top edge
        (// rect1's top edge is above rect2's bottom edge
        rect1.x < rect2.x + rect2.width &&   // rect1's left edge is left of rect2's right edge
        rect1.x + rect1.width > rect2.x &&   // rect1's right edge is right of rect2's left edge
        rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y)
      );
    };
    
    // --- TRIGGER GAME OVER ---
    // Called when collision is detected
    const triggerGameOver = () => {
      // Trigger screen shake
      shakeIntensity = 8;
      shakeDuration = 15;
      setIsPlaying(false);
      setGameOver(true);
    };
    
    // --- JUMP INPUT HANDLER ---
    // Triggered by spacebar or canvas click
    // Only allows jumping when the reindeer is on the ground
    const handleJump = () => {
      if (isOnGround && isPlaying && !gameOver && !isSliding) {
        // Apply initial jump velocity (negative = upward in canvas coordinates)
        velocityY = JUMP_VELOCITY;
        // Mark as airborne to prevent double-jumping
        isOnGround = false;
      }
    };
    
    // --- EVENT LISTENERS FOR INPUT ---
    // Spacebar for jump, Down/S for slide (hold to slide), R for restart
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Prevent page scrolling
        handleJump();
      }
      // Down arrow or S key - start sliding (hold to continue)
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        if (isOnGround && isPlaying && !gameOver) {
          isSliding = true;
        }
      }
    };
    
    // Key up handler - stop sliding when key is released
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        isSliding = false;
      }
    };
    
    // Click/tap handler for canvas (desktop)
    const handleCanvasClick = () => {
      handleJump();
    };
    
    // --- TOUCH CONTROLS FOR MOBILE ---
    // Touch upper half = jump, touch lower half = slide
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (!isPlaying || gameOver) return;
      
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const touchY = touch.clientY - rect.top;
      const canvasMiddle = rect.height / 2;
      
      touchStartY = touchY;
      
      // Touch upper half = jump, lower half = slide
      if (touchY < canvasMiddle) {
        handleJump();
      } else {
        // Slide when touching lower half
        if (isOnGround) {
          isSliding = true;
        }
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      isSliding = false;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      // Detect swipe down for slide
      if (!isPlaying || gameOver) return;
      
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const touchY = touch.clientY - rect.top;
      
      // If swiping down (moved down more than 30px), start sliding
      if (touchY - touchStartY > 30 && isOnGround) {
        isSliding = true;
      }
    };
    
    // Attach event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    const animate = () => {
      if (!isPlaying || gameOver) return;

      frameCount++;
      
      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // --- SCREEN SHAKE ---
      // Apply shake offset if active
      let shakeX = 0;
      let shakeY = 0;
      if (shakeDuration > 0) {
        shakeX = (Math.random() - 0.5) * shakeIntensity;
        shakeY = (Math.random() - 0.5) * shakeIntensity;
        shakeDuration--;
        shakeIntensity *= 0.9; // Decay shake
      }
      
      ctx.save();
      ctx.translate(shakeX, shakeY);
      
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

      // --- PARALLAX MOUNTAINS ---
      // Update mountain offsets based on current speed
      farMountainOffset += currentSpeed * 0.2;  // Slow - far away
      nearMountainOffset += currentSpeed * 0.5; // Medium - closer
      
      // Wrap mountain offsets
      if (farMountainOffset >= 200) farMountainOffset = 0;
      if (nearMountainOffset >= 250) nearMountainOffset = 0;
      
      // Draw far mountains (darker, slower)
      for (const mountain of farMountains) {
        const drawX = mountain.x - farMountainOffset;
        const wrappedX = drawX < -mountain.width ? drawX + 1000 : drawX;
        
        ctx.fillStyle = mountain.color;
        ctx.beginPath();
        ctx.moveTo(wrappedX, GROUND_Y);
        ctx.lineTo(wrappedX + mountain.width / 2, GROUND_Y - mountain.height);
        ctx.lineTo(wrappedX + mountain.width, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      }
      
      // Draw near mountains (lighter, faster)
      for (const mountain of nearMountains) {
        const drawX = mountain.x - nearMountainOffset;
        const wrappedX = drawX < -mountain.width ? drawX + 1000 : drawX;
        
        ctx.fillStyle = mountain.color;
        ctx.beginPath();
        ctx.moveTo(wrappedX, GROUND_Y);
        ctx.lineTo(wrappedX + mountain.width / 2, GROUND_Y - mountain.height);
        ctx.lineTo(wrappedX + mountain.width, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      }
      
      // --- SNOW PARTICLES ---
      // Update and draw snowflakes
      ctx.fillStyle = "white";
      for (const flake of snowflakes) {
        // Move snowflake down and slightly sideways
        flake.y += flake.speed;
        flake.x -= currentSpeed * 0.3; // Drift with world movement
        
        // Wrap around when off screen
        if (flake.y > CANVAS_HEIGHT) {
          flake.y = -5;
          flake.x = Math.random() * CANVAS_WIDTH;
        }
        if (flake.x < 0) {
          flake.x = CANVAS_WIDTH;
        }
        
        // Draw snowflake
        ctx.globalAlpha = flake.opacity;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // --- DIFFICULTY PROGRESSION ---
      // Smoothly increase speed over time (capped at MAX_GROUND_SPEED)
      currentSpeed = Math.min(MAX_GROUND_SPEED, BASE_GROUND_SPEED + frameCount * SPEED_INCREASE_RATE);
      
      // Increase internal score over time (1 point per 30 frames = ~2 per second)
      if (frameCount % 30 === 0) {
        internalScore += 1;
        setScore(internalScore);
      }
      
      // --- SCROLLING GROUND ---
      // Update ground scroll position (moves left each frame)
      groundScrollX += currentSpeed;
      
      // Reset scroll position when it exceeds canvas width for seamless loop
      if (groundScrollX >= CANVAS_WIDTH) {
        groundScrollX = 0;
      }
      
      // Draw ground - we draw two segments to create seamless scrolling
      ctx.fillStyle = "#f1f5f9"; // Snow white color
      
      // First ground segment (scrolling off to the left)
      ctx.fillRect(-groundScrollX, GROUND_Y, CANVAS_WIDTH, GROUND_HEIGHT);
      
      // Second ground segment (coming in from the right to fill the gap)
      ctx.fillRect(CANVAS_WIDTH - groundScrollX, GROUND_Y, CANVAS_WIDTH, GROUND_HEIGHT);

      // --- SLIDE STATE UPDATE ---
      // Sliding is now controlled by holding the key - no timer needed
      // If not on ground, cancel slide (can't slide in air)
      if (!isOnGround) {
        isSliding = false;
      }
      
      // --- OBSTACLE SPAWNING ---
      // Check if it's time to spawn a new obstacle
      framesSinceLastSpawn++;
      
      if (framesSinceLastSpawn >= nextSpawnDelay) {
        // Randomly choose obstacle type (30% chance for low obstacle)
        const isLowObstacle = Math.random() < 0.3;
        
        let newObstacle: Obstacle;
        
        if (isLowObstacle) {
          // Low obstacle - floats above ground, must slide under
          newObstacle = {
            x: CANVAS_WIDTH,
            y: GROUND_Y - REINDEER_SIZE - LOW_OBSTACLE_Y_OFFSET, // Positioned so standing reindeer hits it
            width: LOW_OBSTACLE_WIDTH,
            height: LOW_OBSTACLE_HEIGHT,
            type: 'low'
          };
        } else {
          // Ground obstacle - sits on ground, must jump over
          newObstacle = {
            x: CANVAS_WIDTH,
            y: GROUND_Y - OBSTACLE_HEIGHT,
            width: OBSTACLE_WIDTH,
            height: OBSTACLE_HEIGHT,
            type: 'ground'
          };
        }
        
        obstacles.push(newObstacle);
        
        // Reset spawn timer with new random delay
        framesSinceLastSpawn = 0;
        nextSpawnDelay = MIN_SPAWN_DELAY + Math.random() * (MAX_SPAWN_DELAY - MIN_SPAWN_DELAY);
      }
      
      // --- OBSTACLE UPDATE AND DRAW ---
      // Loop through obstacles backwards so we can safely remove items
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        
        // Move obstacle left (toward the player) at current speed
        obstacle.x -= currentSpeed;
        
        // Remove obstacle if it's completely off-screen (left edge)
        if (obstacle.x + obstacle.width < 0) {
          obstacles.splice(i, 1);
          continue;
        }
        
        // Draw obstacle based on type
        if (obstacle.type === 'low') {
          // Low obstacle (branch/barrier) - brown color, must slide under
          ctx.fillStyle = "#78350f"; // Dark brown
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          
          // Add texture lines
          ctx.fillStyle = "#92400e"; // Lighter brown
          ctx.fillRect(obstacle.x + 10, obstacle.y + 5, obstacle.width - 20, 5);
          ctx.fillRect(obstacle.x + 5, obstacle.y + 15, obstacle.width - 10, 5);
        } else {
          // Ground obstacle (tree) - use tree PNG image
          if (treeImageLoaded) {
            ctx.drawImage(treeImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          } else {
            // Fallback if image not loaded yet
            ctx.fillStyle = "#166534";
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          }
        }
        
        // --- CHECK COLLISION WITH REINDEER ---
        // Define reindeer hitbox based on current state (sliding or standing)
        // When sliding, height is reduced to pass under low obstacles
        const currentHeight = isSliding ? SLIDE_HEIGHT : REINDEER_SIZE;
        const currentY = isSliding ? (GROUND_Y - SLIDE_HEIGHT) : reindeerY;
        
        const reindeerHitbox = {
          x: REINDEER_X + 5,           // Slight padding for forgiving hitbox
          y: currentY + 3,
          width: REINDEER_SIZE - 10,
          height: currentHeight - 6
        };
        
        // Check if reindeer collides with this obstacle
        if (checkCollision(reindeerHitbox, obstacle)) {
          triggerGameOver();
          return; // Stop the game loop immediately
        }
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

      // --- RUNNING ANIMATION ---
      // Subtle bobbing when running on ground (not jumping or sliding)
      if (isOnGround && !isSliding) {
        runBobOffset = Math.sin(frameCount * 0.3) * 2; // Gentle bob
      } else {
        runBobOffset = 0;
      }
      
      // --- UPDATE SPRITE ANIMATION ---
      // Advance sprite frame based on time (using frameCount as proxy for ~16.67ms per frame at 60fps)
      if (isOnGround && !isSliding) {
        spriteFrameTimer += 16.67; // Approximate ms per game frame at 60fps
        if (spriteFrameTimer >= SPRITE_FRAME_DURATION) {
          spriteFrameTimer -= SPRITE_FRAME_DURATION;
          spriteFrameIndex = (spriteFrameIndex + 1) % SPRITE_TOTAL_FRAMES;
        }
      }
      
      // --- DRAW REINDEER ---
      // Calculate reindeer dimensions based on slide state
      const drawHeight = isSliding ? SLIDE_HEIGHT : REINDEER_SIZE;
      const baseDrawY = isSliding ? (GROUND_Y - SLIDE_HEIGHT) : reindeerY;
      const drawY = baseDrawY + runBobOffset; // Apply bobbing
      const drawWidth = isSliding ? REINDEER_SIZE + 10 : REINDEER_SIZE;
      
      // Draw sprite or fallback
      if (isSliding && reindeerSlideSpriteLoaded) {
        // Draw sliding sprite
        const slideRenderSize = 60;
        ctx.drawImage(
          reindeerSlideSprite,
          REINDEER_X - 10, drawY - 35, slideRenderSize, slideRenderSize
        );
      } else if (reindeerSpriteLoaded && !isSliding) {
        // Calculate source rectangle from sprite sheet
        const srcX = spriteFrameIndex * SPRITE_FRAME_WIDTH;
        const srcY = 0;
        
        // Draw the current frame of the sprite
        // Render at 60x60 to fit game scale (original is 128x128)
        const renderSize = 60;
        ctx.drawImage(
          reindeerSprite,
          srcX, srcY, SPRITE_FRAME_WIDTH, SPRITE_FRAME_HEIGHT, // Source
          REINDEER_X - 10, drawY - 20, renderSize, renderSize   // Destination (offset to align with hitbox)
        );
      } else {
        // Fallback rectangle if sprites not loaded
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;
        ctx.fillRect(REINDEER_X, drawY, drawWidth, drawHeight);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }
      
      // --- PRESENT SPAWNING ---
      // Random chance to spawn a present each frame
      if (Math.random() < PRESENT_SPAWN_CHANCE) {
        // Spawn present at random height (reachable by jumping)
        const presentY = GROUND_Y - PRESENT_HEIGHT - Math.random() * 80;
        presents.push({
          x: CANVAS_WIDTH,
          y: presentY,
          width: PRESENT_WIDTH,
          height: PRESENT_HEIGHT,
          collected: false
        });
      }
      
      // --- PRESENT UPDATE AND DRAW ---
      // Get reindeer hitbox for collection detection
      const collectHeight = isSliding ? SLIDE_HEIGHT : REINDEER_SIZE;
      const collectY = isSliding ? (GROUND_Y - SLIDE_HEIGHT) : reindeerY;
      const reindeerCollectBox = {
        x: REINDEER_X,
        y: collectY,
        width: isSliding ? REINDEER_SIZE + 10 : REINDEER_SIZE,
        height: collectHeight
      };
      
      for (let i = presents.length - 1; i >= 0; i--) {
        const present = presents[i];
        
        // Move present left at current speed
        present.x -= currentSpeed;
        
        // Remove if off-screen
        if (present.x + present.width < 0) {
          presents.splice(i, 1);
          continue;
        }
        
        // Check for collection
        if (!present.collected && checkCollision(reindeerCollectBox, present)) {
          present.collected = true;
          internalScore += PRESENT_SCORE_BONUS;
          setScore(internalScore);
          presents.splice(i, 1);
          continue;
        }
        
        // Draw present image
        if (presentImageLoaded) {
          ctx.drawImage(presentImage, present.x, present.y, present.width, present.height);
        } else {
          // Fallback rectangle if image not loaded
          ctx.fillStyle = "#ec4899";
          ctx.fillRect(present.x, present.y, present.width, present.height);
        }
      }
      
      // Restore canvas state (end screen shake transform)
      ctx.restore();

      requestRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else if (gameOver) {
      // --- GAME OVER SCREEN ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw dark background
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw static ground at the bottom
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
      
      // Semi-transparent overlay for game over effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // "Game Over" text
      ctx.fillStyle = "#ef4444"; // Red color
      ctx.font = "bold 60px 'Mountains of Christmas'";
      ctx.textAlign = "center";
      ctx.fillText("Game Over!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
      
      // Final score
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "30px 'Mountains of Christmas'";
      ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      
      // Restart instruction
      ctx.fillStyle = "#94a3b8";
      ctx.font = "20px 'Mountains of Christmas'";
      ctx.fillText("Press R to restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
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
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isPlaying, gameOver]);

  const handleStart = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setPlayerName(""); // Reset name for new game
  };

  const handleGameOver = () => {
    setIsPlaying(false);
    setGameOver(true);
    // Don't auto-submit score - let player choose to add to leaderboard
  };
  
  const handleSubmitScore = () => {
    if (!playerName.trim()) return;
    createScore.mutate({ playerName, score });
  };

  // Mock game over for testing UI
  const handleStop = () => {
    handleGameOver();
  };

  return (
    <div className="flex flex-col items-center gap-4 md:gap-8 w-full max-w-4xl mx-auto px-2 md:px-4">
      <div className="relative group rounded-xl md:rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border-2 md:border-4 border-white/10 bg-black w-full">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="block w-full h-auto bg-slate-900"
        />
        
        {/* Overlay for score display - only show while playing */}
        {isPlaying && !gameOver && (
          <div className="absolute top-4 right-4 backdrop-blur-md bg-black/50 px-4 py-2 rounded-full border border-white/10">
            <span className="text-white font-display text-xl font-bold">Score: </span>
            <span className="font-display text-xl font-bold" style={{ color: '#0de79b' }}>{score}</span>
          </div>
        )}
        
        {/* Start Overlay - shows before game starts */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col gap-6 items-center backdrop-blur-md bg-transparent border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 
                className="font-display text-3xl font-bold tracking-wider"
                style={{ 
                  background: 'linear-gradient(180deg, #fff 0%, #dbeafe 50%, #93c5fd 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '2.4px'
                }}
              >Press Start to play!</h2>
              <Button 
                onClick={handleStart} 
                size="lg"
                data-testid="button-start"
                className="font-bold text-lg border-0 pt-[7px] pb-[7px] pl-[22px] pr-[22px]"
                style={{ 
                  backgroundColor: '#ef486f',
                  boxShadow: '0 10px 15px -3px rgba(239, 72, 111, 0.2), 0 4px 6px -4px rgba(239, 72, 111, 0.2)'
                }}
              >
                <Play className="mr-2 h-4 w-4" /> Start
              </Button>
            </div>
          </div>
        )}
        
        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col gap-4 items-center backdrop-blur-md bg-white/5 p-4 md:p-6 rounded-2xl border border-white/15 shadow-xl mx-4">
              <h2 
                className="font-display text-2xl md:text-3xl font-bold tracking-wider"
                style={{ 
                  background: 'linear-gradient(180deg, #fff 0%, #dbeafe 50%, #93c5fd 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {isTopThree ? "Congrats!" : "Nice Try!"}
              </h2>
              <p className="text-white text-lg font-body">
                Your Score: <span className="font-bold text-xl" style={{ color: '#0de79b' }}>{score}</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end w-full">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="player" className="text-white/80 text-xs sm:text-sm font-body">Add to Leaderboard</Label>
                  <Input
                    type="text"
                    id="player"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    data-testid="input-player-name"
                    className="bg-black/30 border-white/10 text-white placeholder:text-white/30 font-body"
                  />
                </div>
                <Button 
                  onClick={handleSubmitScore} 
                  disabled={!playerName.trim() || createScore.isPending}
                  data-testid="button-submit-score"
                  className="border-0 bg-[#f8fafc] text-[#ef486f] disabled:opacity-100"
                  style={{ 
                    boxShadow: '0 10px 15px -3px rgba(239, 72, 111, 0.2)'
                  }}
                >
                  {createScore.isPending ? "..." : "Submit"}
                </Button>
              </div>
              
              <Button 
                onClick={handleStart} 
                size="lg"
                data-testid="button-play-again"
                className="text-white font-bold mt-2 border-0"
                style={{ 
                  backgroundColor: '#ef486f',
                  boxShadow: '0 10px 15px -3px rgba(239, 72, 111, 0.2)'
                }}
              >
                <RotateCcw className="mr-2 h-5 w-5" /> Play Again
              </Button>
            </div>
          </div>
        )}
      </div>
      <p className="text-slate-500 text-sm text-center max-w-lg font-body hidden md:block">
        SPACEBAR to jump over stumps, DOWN ARROW or S to slide under branches!
      </p>
      <p className="text-slate-500 text-sm text-center max-w-lg font-body md:hidden">
        TAP TOP HALF to jump, TAP BOTTOM HALF or swipe down to slide!
      </p>
    </div>
  );
}
