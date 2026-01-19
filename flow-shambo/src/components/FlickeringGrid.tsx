'use client';

/**
 * FlickeringGrid Component
 * 
 * A canvas-based animated grid background with flickering squares.
 * Creates a "living" technological background effect suitable for the Cyberpunk theme.
 * 
 * Features:
 * - Performance optimized with requestAnimationFrame and IntersectionObserver
 * - Responsive to container size changes using ResizeObserver
 * - Configurable colors, opacity, and flicker rate
 * - devicePixelRatio support for crisp rendering on high-DPI screens
 * 
 * @module components/FlickeringGrid
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Props for the FlickeringGrid component
 */
export interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of each grid square in pixels */
  squareSize?: number;
  /** Gap between grid squares in pixels */
  gridGap?: number;
  /** Probability of a square flickering per second */
  flickerChance?: number;
  /** Color of the squares (hex or rgb) */
  color?: string;
  /** Fixed width (defaults to container width if undefined) */
  width?: number;
  /** Fixed height (defaults to container height if undefined) */
  height?: number;
  /** Maximum opacity of the squares (0-1) */
  maxOpacity?: number;
}

/**
 * Flow Green default color
 */
const DEFAULT_COLOR = '#00EF8B';

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = DEFAULT_COLOR,
  width,
  height,
  className = '',
  maxOpacity = 0.3,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Convert color to RGBA format for opacity control
  const memoizedColor = useMemo(() => {
    const toRGBA = (colorString: string) => {
      if (typeof window === 'undefined') {
        return 'rgba(0, 239, 139,';
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');

      if (!ctx) return 'rgba(0, 239, 139,';

      ctx.fillStyle = colorString;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
      return `rgba(${r}, ${g}, ${b},`;
    };

    return toRGBA(color);
  }, [color]);

  /**
   * Setup canvas buffer with correct dimensions and DPR
   */
  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, w: number, h: number) => {
      const dpr = window.devicePixelRatio || 1;
      // Set actual canvas size (resolution)
      canvas.width = w * dpr;
      canvas.height = h * dpr;

      // Calculate layout
      const cols = Math.floor(w / (squareSize + gridGap));
      const rows = Math.floor(h / (squareSize + gridGap));

      // Initialize squares with random opacity
      const squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }

      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, maxOpacity],
  );

  /**
   * Update square opacities based on time delta
   */
  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        // Randomly change opacity based on chance
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
    },
    [flickerChance, maxOpacity],
  );

  /**
   * Render the grid to the canvas
   */
  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number,
    ) => {
      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // We don't fill background to keep it transparent

      // Draw squares
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const opacity = squares[i * rows + j];
          ctx.fillStyle = `${memoizedColor}${opacity})`;
          ctx.fillRect(
            i * (squareSize + gridGap) * dpr,
            j * (squareSize + gridGap) * dpr,
            squareSize * dpr,
            squareSize * dpr,
          );
        }
      }
    },
    [memoizedColor, squareSize, gridGap],
  );

  // Main animation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let gridParams: ReturnType<typeof setupCanvas>;

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      gridParams = setupCanvas(canvas, newWidth, newHeight);
    };

    updateCanvasSize(); // Initial setup

    let lastTime = 0;
    const animate = (time: number) => {
      if (!isInView) return;

      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      // Limit delta time to avoid large jumps if tab was inactive
      const clampedDelta = Math.min(deltaTime, 0.1);

      if (gridParams) {
        updateSquares(gridParams.squares, clampedDelta);
        drawGrid(
          ctx,
          canvas.width,
          canvas.height,
          gridParams.cols,
          gridParams.rows,
          gridParams.squares,
          gridParams.dpr,
        );
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Observers
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        // Reset lastTime when coming back into view to avoid huge jump
        if (entry.isIntersecting) {
          lastTime = performance.now();
        }
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    if (isInView) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      {...props}
      data-testid="flickering-grid"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 block"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      />
    </div>
  );
};

export default FlickeringGrid;
