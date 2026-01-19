'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { GameObject, ObjectType, CollisionEvent } from '../types/game';
import { audioSynth } from '../lib/audio/synth';

/**
 * Props for the Arena component
 */
export interface ArenaProps {
  /** Array of game objects to render */
  objects: GameObject[];
  /** Width of the arena in pixels */
  width?: number;
  /** Height of the arena in pixels */
  height?: number;
  /** Whether to show object count overlay */
  showCounts?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Collision events to display visual feedback for */
  collisionEvents?: CollisionEvent[];
  /** IDs of objects currently transforming (for animation) */
  transformingObjectIds?: Set<string>;
}

/**
 * Flow green color used for arena border
 */
const FLOW_GREEN = '#00EF8B';

/**
 * Arena background color (dark)
 */
const ARENA_BACKGROUND = '#050505';

/**
 * Arena border color
 */
const ARENA_BORDER = 'rgba(0, 239, 139, 0.3)';

/**
 * Flash effect color (bright white)
 */
const FLASH_COLOR = '#FFFFFF';

/**
 * Flash effect duration in milliseconds
 */
export const FLASH_DURATION_MS = 150;

/**
 * Transformation animation duration in milliseconds
 */
export const TRANSFORMATION_DURATION_MS = 300;

/**
 * Object colors by type
 */
const OBJECT_COLORS: Record<ObjectType, string> = {
  rock: '#FF6B6B',      // Red-ish for Rock (Aggressive)
  paper: '#4CC9F0',     // Bright Cyan/Blue for Paper (Calm)
  scissors: '#FCC719',  // Yellow/Gold for Scissors (Sharp)
};

/**
 * Object emojis by type for visual distinction
 */
const OBJECT_EMOJIS: Record<ObjectType, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

/**
 * Default arena dimensions from design spec
 */
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

function drawObject(
  //... (rest of function as before)
  ctx: CanvasRenderingContext2D,
  obj: GameObject,
  isTransforming: boolean = false,
  transformProgress: number = 0
): void {
  const { x, y, radius, type } = obj;
  const color = OBJECT_COLORS[type];
  const emoji = OBJECT_EMOJIS[type];

  // Calculate scale for transformation animation (pulse effect)
  let scale = 1.0;
  if (isTransforming) {
    scale = 1.0 + 0.4 * Math.sin(transformProgress * Math.PI);
  }

  const scaledRadius = radius * scale;

  ctx.save();

  // Draw circle background with specific styling
  ctx.beginPath();
  ctx.arc(x, y, scaledRadius, 0, Math.PI * 2);
  ctx.fillStyle = color;

  // Add shadow for depth
  ctx.shadowColor = isTransforming ? FLOW_GREEN : 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = isTransforming ? 20 : 10;

  ctx.fill();

  // Reset shadow for border
  ctx.shadowBlur = 0;

  // Draw border (thicker during transformation)
  ctx.strokeStyle = isTransforming ? FLOW_GREEN : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = isTransforming ? 4 : 2;
  ctx.stroke();

  // Draw glow effect during transformation
  if (isTransforming) {
    ctx.beginPath();
    ctx.arc(x, y, scaledRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = FLOW_GREEN;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 * (1 - transformProgress);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Draw hand emoji (Monochrome style)
  const fontSize = scaledRadius * 1.2; // Slightly larger for visibility
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Filter to make emoji look like a white/flat icon
  // grayscale(100%) removes color
  // brightness(500%) makes it white/very bright
  // drop-shadow gives it 3D pop
  ctx.filter = 'grayscale(100%) brightness(500%) drop-shadow(0 2px 2px rgba(0,0,0,0.5))';

  ctx.fillText(emoji, x, y + radius * 0.1); // Slight y offset for visual centering

  ctx.restore();
}

/**
 * Draws the arena boundaries
 * 
 * @param ctx - Canvas 2D rendering context
 * @param width - Arena width
 * @param height - Arena height
 */
function drawArenaBoundaries(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  // Fill background
  ctx.fillStyle = ARENA_BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  // Draw border
  ctx.strokeStyle = ARENA_BORDER;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);
}

/**
 * Active flash effect data for rendering
 */
interface ActiveFlash {
  /** Collision event that triggered the flash */
  event: CollisionEvent;
  /** Progress of the flash animation (0-1) */
  progress: number;
}

/**
 * Draws a collision flash effect at the specified position
 * 
 * @param ctx - Canvas 2D rendering context
 * @param x - X position of flash center
 * @param y - Y position of flash center
 * @param progress - Animation progress (0-1, where 0 is start and 1 is end)
 * @param hasTransformation - Whether this collision caused a transformation
 * 
 * **Validates: Requirements 7.4**
 */
function drawCollisionFlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  hasTransformation: boolean
): void {
  // Flash fades out as progress increases
  const alpha = 1.0 - progress;

  // Flash expands as it fades
  const baseRadius = 20;
  const maxExpansion = hasTransformation ? 40 : 25;
  const radius = baseRadius + (maxExpansion * progress);

  ctx.save();

  // Draw outer glow
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  const flashColor = hasTransformation ? FLOW_GREEN : FLASH_COLOR;
  gradient.addColorStop(0, flashColor);
  gradient.addColorStop(0.5, `${flashColor}80`); // 50% opacity
  gradient.addColorStop(1, `${flashColor}00`); // 0% opacity

  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw inner bright spot for transformation
  if (hasTransformation) {
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = FLASH_COLOR;
    ctx.globalAlpha = alpha * 0.8;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Calculates object counts by type
 * 
 * @param objects - Array of game objects
 * @returns Object counts by type
 */
export function getObjectCounts(objects: GameObject[]): Record<ObjectType, number> {
  const counts: Record<ObjectType, number> = {
    rock: 0,
    paper: 0,
    scissors: 0,
  };

  for (const obj of objects) {
    counts[obj.type]++;
  }

  return counts;
}

/**
 * Arena component for rendering the FlowShambo game
 * 
 * Uses HTML5 Canvas to render:
 * - Dark arena background with Flow green border
 * - Game objects as colored circles with emojis
 * - Optional object count overlay
 * - Collision flash effects
 * - Transformation animations
 * 
 * Features:
 * - Responsive canvas sizing
 * - Type-specific object colors and emojis
 * - Smooth rendering with requestAnimationFrame
 * - Visual feedback for collisions (flash effect)
 * - Transformation animation (scale/pulse effect)
 * 
 * @example
 * ```tsx
 * <Arena 
 *   objects={gameObjects}
 *   width={800}
 *   height={600}
 *   showCounts={true}
 *   collisionEvents={activeCollisions}
 *   transformingObjectIds={transformingIds}
 * />
 * ```
 * 
 * Requirements: 7.3, 7.4, 7.5
 */
export function Arena({
  objects,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  showCounts = false,
  className = '',
  collisionEvents = [],
  transformingObjectIds = new Set(),
}: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track active flash effects with their progress
  const [activeFlashes, setActiveFlashes] = useState<ActiveFlash[]>([]);

  // Track transformation progress for each transforming object
  const [transformProgress, setTransformProgress] = useState<Map<string, number>>(new Map());

  // Animation frame ref for flash effects
  const flashAnimationRef = useRef<number | null>(null);
  const lastFlashTimeRef = useRef<number>(0);

  // Responsive scaling
  const [scale, setScale] = useState(1);
  const [displayWidth, setDisplayWidth] = useState(width);
  const [displayHeight, setDisplayHeight] = useState(height);

  /**
   * Handle responsive scaling based on container width
   */
  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Calculate scale to fit container while maintaining aspect ratio
      const scaleX = containerWidth / width;
      const scaleY = containerHeight / height;
      const newScale = Math.min(scaleX, scaleY);

      setScale(newScale);
      setDisplayWidth(width * newScale);
      setDisplayHeight(height * newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, [width, height]);

  /**
   * Process new collision events: flash effects + audio
   */
  useEffect(() => {
    if (collisionEvents.length === 0) return;

    // Play "clink" sound for each collision frame (debounced per frame naturally)
    // Only play if there are actual collisions
    if (collisionEvents.length > 0) {
      audioSynth.resume().catch(() => { }); // Ensure context is running
      audioSynth.playClink();
    }

    // Add new collision events as active flashes
    const newFlashes: ActiveFlash[] = collisionEvents.map(event => ({
      event,
      progress: 0
    }));

    setActiveFlashes(prev => [...prev, ...newFlashes]);

    // Initialize transformation progress for transformed objects
    const newTransformProgress = new Map(transformProgress);
    for (const event of collisionEvents) {
      if (event.hasTransformation && event.transformedObjectId) {
        newTransformProgress.set(event.transformedObjectId, 0);
      }
    }
    setTransformProgress(newTransformProgress);
  }, [collisionEvents]);

  /**
   * Animate flash effects
   */
  useEffect(() => {
    if (activeFlashes.length === 0 && transformProgress.size === 0) {
      return;
    }

    const animateFlashes = (currentTime: number) => {
      const deltaTime = lastFlashTimeRef.current === 0
        ? 16
        : currentTime - lastFlashTimeRef.current;
      lastFlashTimeRef.current = currentTime;

      // Update flash progress
      setActiveFlashes(prev => {
        const updated = prev.map(flash => ({
          ...flash,
          progress: flash.progress + (deltaTime / FLASH_DURATION_MS)
        })).filter(flash => flash.progress < 1);
        return updated;
      });

      // Update transformation progress
      setTransformProgress(prev => {
        const updated = new Map(prev);
        for (const [id, progress] of updated) {
          const newProgress = progress + (deltaTime / TRANSFORMATION_DURATION_MS);
          if (newProgress >= 1) {
            updated.delete(id);
          } else {
            updated.set(id, newProgress);
          }
        }
        return updated;
      });

      flashAnimationRef.current = requestAnimationFrame(animateFlashes);
    };

    flashAnimationRef.current = requestAnimationFrame(animateFlashes);

    return () => {
      if (flashAnimationRef.current !== null) {
        cancelAnimationFrame(flashAnimationRef.current);
        flashAnimationRef.current = null;
      }
    };
  }, [activeFlashes.length > 0 || transformProgress.size > 0]);

  /**
   * Renders all objects on the canvas
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw arena boundaries
    drawArenaBoundaries(ctx, width, height);

    // Draw all objects
    for (const obj of objects) {
      const isTransforming = transformingObjectIds.has(obj.id) || transformProgress.has(obj.id);
      const progress = transformProgress.get(obj.id) ?? 0;
      drawObject(ctx, obj, isTransforming, progress);
    }

    // Draw collision flash effects on top
    for (const flash of activeFlashes) {
      drawCollisionFlash(
        ctx,
        flash.event.x,
        flash.event.y,
        flash.progress,
        flash.event.hasTransformation
      );
    }
  }, [objects, width, height, activeFlashes, transformProgress, transformingObjectIds]);

  // Render on mount and when objects/effects change
  useEffect(() => {
    render();
  }, [render]);

  // Handle canvas resize for responsiveness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Re-render after resize
    render();
  }, [width, height, render]);

  const counts = showCounts ? getObjectCounts(objects) : null;

  return (
    <div
      ref={containerRef}
      className={`glass-card relative flex flex-col w-full h-full bg-black/60 rounded-2xl overflow-hidden shadow-2xl ${className}`}
      data-testid="arena-container"
    >
      {/* Object Counts - Compact Top Bar */}
      {showCounts && counts && (
        <div
          className="flex justify-center items-center py-2 px-4 bg-black/80 border-b border-white/10 gap-5 text-sm font-bold backdrop-blur-sm z-10"
          data-testid="arena-counts"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: OBJECT_COLORS.rock }} />
            <span style={{ color: OBJECT_COLORS.rock }}>R</span>
            <span className="text-white min-w-[16px] text-center">{counts.rock}</span>
          </div>

          <div className="w-px h-4 bg-white/20" />

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: OBJECT_COLORS.paper }} />
            <span style={{ color: OBJECT_COLORS.paper }}>P</span>
            <span className="text-white min-w-[16px] text-center">{counts.paper}</span>
          </div>

          <div className="w-px h-4 bg-white/20" />

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: OBJECT_COLORS.scissors }} />
            <span style={{ color: OBJECT_COLORS.scissors }}>S</span>
            <span className="text-white min-w-[16px] text-center">{counts.scissors}</span>
          </div>
        </div>
      )}

      {/* Canvas - Fills remaining space */}
      <div className="flex-1 flex items-center justify-center min-h-0 relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            display: 'block',
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
          data-testid="arena-canvas"
          aria-label={`Game arena with ${objects.length} objects`}
        />
      </div>
    </div>
  );
}

export default Arena;

// Export constants for testing
export {
  OBJECT_COLORS,
  OBJECT_EMOJIS,
  FLOW_GREEN,
  ARENA_BACKGROUND,
  FLASH_COLOR
};
