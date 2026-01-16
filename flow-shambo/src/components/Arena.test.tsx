/**
 * Arena Component Tests
 * 
 * Tests for the Arena component covering:
 * - Canvas setup and rendering
 * - Arena boundaries drawing
 * - Object rendering with type-specific colors/shapes
 * - Object count display
 * - Responsive canvas sizing
 * - Collision visual feedback (flash effects)
 * - Transformation animations
 * 
 * Requirements: 7.3, 7.4, 7.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Arena, getObjectCounts, OBJECT_COLORS, OBJECT_EMOJIS, FLOW_GREEN, FLASH_DURATION_MS, TRANSFORMATION_DURATION_MS } from './Arena';
import type { GameObject, ObjectType, CollisionEvent } from '../types/game';

// Mock canvas context
const mockContext = {
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  })),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: '' as CanvasTextAlign,
  textBaseline: '' as CanvasTextBaseline,
  globalAlpha: 1,
};

// Store original getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock canvas getContext
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
  // Restore original getContext
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

/**
 * Helper to create test game objects
 */
function createTestObject(
  id: string,
  type: ObjectType,
  x: number = 100,
  y: number = 100
): GameObject {
  return {
    id,
    type,
    x,
    y,
    vx: 50,
    vy: 30,
    radius: 15,
  };
}

describe('Arena', () => {
  describe('Canvas Setup', () => {
    it('should render a canvas element', () => {
      render(<Arena objects={[]} />);
      
      const canvas = screen.getByTestId('arena-canvas');
      expect(canvas).toBeDefined();
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('should set default canvas dimensions (800x600)', () => {
      render(<Arena objects={[]} />);
      
      const canvas = screen.getByTestId('arena-canvas') as HTMLCanvasElement;
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });

    it('should use custom dimensions when provided', () => {
      render(<Arena objects={[]} width={1024} height={768} />);
      
      const canvas = screen.getByTestId('arena-canvas') as HTMLCanvasElement;
      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });

    it('should have accessible aria-label', () => {
      const objects = [createTestObject('1', 'rock')];
      render(<Arena objects={objects} />);
      
      const canvas = screen.getByTestId('arena-canvas');
      expect(canvas.getAttribute('aria-label')).toBe('Game arena with 1 objects');
    });

    it('should render container with arena-container class', () => {
      render(<Arena objects={[]} />);
      
      const container = screen.getByTestId('arena-container');
      expect(container.classList.contains('arena-container')).toBe(true);
    });

    it('should apply custom className to container', () => {
      render(<Arena objects={[]} className="custom-class" />);
      
      const container = screen.getByTestId('arena-container');
      expect(container.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('Arena Boundaries', () => {
    it('should draw arena background', () => {
      render(<Arena objects={[]} />);
      
      // Should call fillRect for background
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should draw arena border', () => {
      render(<Arena objects={[]} />);
      
      // Should call strokeRect for border
      expect(mockContext.strokeRect).toHaveBeenCalled();
    });
  });

  describe('Object Rendering', () => {
    it('should draw objects as circles', () => {
      const objects = [createTestObject('1', 'rock', 100, 100)];
      render(<Arena objects={objects} />);
      
      // Should call arc for circle
      expect(mockContext.arc).toHaveBeenCalledWith(100, 100, 15, 0, Math.PI * 2);
    });

    it('should draw multiple objects', () => {
      const objects = [
        createTestObject('1', 'rock', 100, 100),
        createTestObject('2', 'paper', 200, 200),
        createTestObject('3', 'scissors', 300, 300),
      ];
      render(<Arena objects={objects} />);
      
      // Should call arc for each object (may be called multiple times due to re-renders)
      // Verify that arc was called with correct coordinates for each object
      expect(mockContext.arc).toHaveBeenCalledWith(100, 100, 15, 0, Math.PI * 2);
      expect(mockContext.arc).toHaveBeenCalledWith(200, 200, 15, 0, Math.PI * 2);
      expect(mockContext.arc).toHaveBeenCalledWith(300, 300, 15, 0, Math.PI * 2);
    });

    it('should draw emojis on objects', () => {
      const objects = [createTestObject('1', 'rock', 100, 100)];
      render(<Arena objects={objects} />);
      
      // Should call fillText for emoji
      expect(mockContext.fillText).toHaveBeenCalledWith(OBJECT_EMOJIS.rock, 100, 100);
    });

    it('should draw correct emoji for each object type', () => {
      const objects = [
        createTestObject('1', 'rock', 100, 100),
        createTestObject('2', 'paper', 200, 200),
        createTestObject('3', 'scissors', 300, 300),
      ];
      render(<Arena objects={objects} />);
      
      expect(mockContext.fillText).toHaveBeenCalledWith(OBJECT_EMOJIS.rock, 100, 100);
      expect(mockContext.fillText).toHaveBeenCalledWith(OBJECT_EMOJIS.paper, 200, 200);
      expect(mockContext.fillText).toHaveBeenCalledWith(OBJECT_EMOJIS.scissors, 300, 300);
    });
  });

  describe('Object Count Display', () => {
    it('should not show counts by default', () => {
      const objects = [createTestObject('1', 'rock')];
      render(<Arena objects={objects} />);
      
      expect(screen.queryByTestId('arena-counts')).toBeNull();
    });

    it('should show counts when showCounts is true', () => {
      const objects = [createTestObject('1', 'rock')];
      render(<Arena objects={objects} showCounts={true} />);
      
      const counts = screen.getByTestId('arena-counts');
      expect(counts).toBeDefined();
    });

    it('should display correct counts for each type', () => {
      const objects = [
        createTestObject('1', 'rock'),
        createTestObject('2', 'rock'),
        createTestObject('3', 'paper'),
        createTestObject('4', 'scissors'),
        createTestObject('5', 'scissors'),
        createTestObject('6', 'scissors'),
      ];
      render(<Arena objects={objects} showCounts={true} />);
      
      const counts = screen.getByTestId('arena-counts');
      expect(counts.textContent).toContain('2'); // rocks
      expect(counts.textContent).toContain('1'); // papers
      expect(counts.textContent).toContain('3'); // scissors
    });

    it('should display emojis in count display', () => {
      const objects = [createTestObject('1', 'rock')];
      render(<Arena objects={objects} showCounts={true} />);
      
      const counts = screen.getByTestId('arena-counts');
      expect(counts.textContent).toContain(OBJECT_EMOJIS.rock);
      expect(counts.textContent).toContain(OBJECT_EMOJIS.paper);
      expect(counts.textContent).toContain(OBJECT_EMOJIS.scissors);
    });
  });

  describe('Responsive Sizing', () => {
    it('should update canvas dimensions when props change', () => {
      const { rerender } = render(<Arena objects={[]} width={800} height={600} />);
      
      let canvas = screen.getByTestId('arena-canvas') as HTMLCanvasElement;
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
      
      rerender(<Arena objects={[]} width={1024} height={768} />);
      
      canvas = screen.getByTestId('arena-canvas') as HTMLCanvasElement;
      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });

    it('should re-render when objects change', () => {
      const initialObjects = [createTestObject('1', 'rock', 100, 100)];
      const { rerender } = render(<Arena objects={initialObjects} />);
      
      const initialArcCalls = mockContext.arc.mock.calls.length;
      
      const newObjects = [
        createTestObject('1', 'rock', 100, 100),
        createTestObject('2', 'paper', 200, 200),
      ];
      rerender(<Arena objects={newObjects} />);
      
      // Should have more arc calls after re-render
      expect(mockContext.arc.mock.calls.length).toBeGreaterThan(initialArcCalls);
    });
  });

  describe('Styling', () => {
    it('should use Flow green for arena border', () => {
      expect(FLOW_GREEN).toBe('#00EF8B');
    });

    it('should have correct object colors defined', () => {
      expect(OBJECT_COLORS.rock).toBe('#8B7355');
      expect(OBJECT_COLORS.paper).toBe('#F5F5DC');
      expect(OBJECT_COLORS.scissors).toBe('#C0C0C0');
    });

    it('should have correct object emojis defined', () => {
      expect(OBJECT_EMOJIS.rock).toBe('🪨');
      expect(OBJECT_EMOJIS.paper).toBe('📄');
      expect(OBJECT_EMOJIS.scissors).toBe('✂️');
    });
  });
});

describe('getObjectCounts', () => {
  it('should return zero counts for empty array', () => {
    const counts = getObjectCounts([]);
    
    expect(counts.rock).toBe(0);
    expect(counts.paper).toBe(0);
    expect(counts.scissors).toBe(0);
  });

  it('should count single object correctly', () => {
    const objects = [createTestObject('1', 'rock')];
    const counts = getObjectCounts(objects);
    
    expect(counts.rock).toBe(1);
    expect(counts.paper).toBe(0);
    expect(counts.scissors).toBe(0);
  });

  it('should count multiple objects of same type', () => {
    const objects = [
      createTestObject('1', 'paper'),
      createTestObject('2', 'paper'),
      createTestObject('3', 'paper'),
    ];
    const counts = getObjectCounts(objects);
    
    expect(counts.rock).toBe(0);
    expect(counts.paper).toBe(3);
    expect(counts.scissors).toBe(0);
  });

  it('should count mixed object types correctly', () => {
    const objects = [
      createTestObject('1', 'rock'),
      createTestObject('2', 'rock'),
      createTestObject('3', 'paper'),
      createTestObject('4', 'scissors'),
      createTestObject('5', 'scissors'),
      createTestObject('6', 'scissors'),
    ];
    const counts = getObjectCounts(objects);
    
    expect(counts.rock).toBe(2);
    expect(counts.paper).toBe(1);
    expect(counts.scissors).toBe(3);
  });

  it('should handle all objects of one type', () => {
    const objects = [
      createTestObject('1', 'scissors'),
      createTestObject('2', 'scissors'),
      createTestObject('3', 'scissors'),
      createTestObject('4', 'scissors'),
      createTestObject('5', 'scissors'),
    ];
    const counts = getObjectCounts(objects);
    
    expect(counts.rock).toBe(0);
    expect(counts.paper).toBe(0);
    expect(counts.scissors).toBe(5);
  });
});

/**
 * Helper to create test collision events
 */
function createTestCollisionEvent(
  id: string,
  x: number,
  y: number,
  hasTransformation: boolean = false,
  transformedObjectId: string | null = null,
  newType: ObjectType | null = null
): CollisionEvent {
  return {
    id,
    objectAId: 'obj-1',
    objectBId: 'obj-2',
    x,
    y,
    timestamp: Date.now(),
    hasTransformation,
    transformedObjectId,
    newType
  };
}

describe('Collision Visual Feedback', () => {
  describe('Flash Effect Constants', () => {
    it('should have flash duration defined', () => {
      expect(FLASH_DURATION_MS).toBe(150);
    });

    it('should have transformation duration defined', () => {
      expect(TRANSFORMATION_DURATION_MS).toBe(300);
    });
  });

  describe('Collision Events Prop', () => {
    it('should accept collision events prop', () => {
      const objects = [createTestObject('1', 'rock', 100, 100)];
      const collisionEvents: CollisionEvent[] = [
        createTestCollisionEvent('collision-1', 150, 150, false)
      ];
      
      // Should render without errors
      render(<Arena objects={objects} collisionEvents={collisionEvents} />);
      
      const canvas = screen.getByTestId('arena-canvas');
      expect(canvas).toBeDefined();
    });

    it('should render with empty collision events', () => {
      const objects = [createTestObject('1', 'rock', 100, 100)];
      
      render(<Arena objects={objects} collisionEvents={[]} />);
      
      const canvas = screen.getByTestId('arena-canvas');
      expect(canvas).toBeDefined();
    });

    it('should render with transformation collision event', () => {
      const objects = [createTestObject('1', 'rock', 100, 100)];
      const collisionEvents: CollisionEvent[] = [
        createTestCollisionEvent('collision-1', 150, 150, true, 'obj-2', 'rock')
      ];
      
      render(<Arena objects={objects} collisionEvents={collisionEvents} />);
      
      const canvas = screen.getByTestId('arena-canvas');
      expect(canvas).toBeDefined();
    });
  });

  describe('Transforming Objects Prop', () => {
    it('should accept transformingObjectIds prop', () => {
      const objects = [createTestObject('1', 'rock', 100, 100)];
      const transformingIds = new Set(['1']);
      
      render(<Arena objects={objects} transformingObjectIds={transformingIds} />);
      
      const canvas = screen.getByTestId('arena-canvas');
      expect(canvas).toBeDefined();
    });

    it('should render with empty transforming set', () => {
      const objects = [createTestObject('1', 'rock', 100, 100)];
      
      render(<Arena objects={objects} transformingObjectIds={new Set()} />);
      
      const canvas = screen.getByTestId('arena-canvas');
      expect(canvas).toBeDefined();
    });

    it('should render objects with transformation animation', () => {
      const objects = [
        createTestObject('1', 'rock', 100, 100),
        createTestObject('2', 'paper', 200, 200),
      ];
      const transformingIds = new Set(['2']);
      
      render(<Arena objects={objects} transformingObjectIds={transformingIds} />);
      
      // Both objects should be drawn
      expect(mockContext.arc).toHaveBeenCalledWith(100, 100, 15, 0, Math.PI * 2);
      // The transforming object may have a different radius due to scale
      expect(mockContext.arc).toHaveBeenCalled();
    });
  });

  describe('Flash Effect Rendering', () => {
    it('should draw flash effects for collision events', () => {
      const objects = [createTestObject('1', 'rock', 100, 100)];
      const collisionEvents: CollisionEvent[] = [
        createTestCollisionEvent('collision-1', 150, 150, false)
      ];
      
      render(<Arena objects={objects} collisionEvents={collisionEvents} />);
      
      // Flash effect uses createRadialGradient
      // The canvas context should have been used for drawing
      expect(mockContext.fill).toHaveBeenCalled();
    });

    it('should handle multiple collision events', () => {
      const objects = [
        createTestObject('1', 'rock', 100, 100),
        createTestObject('2', 'paper', 200, 200),
        createTestObject('3', 'scissors', 300, 300),
      ];
      const collisionEvents: CollisionEvent[] = [
        createTestCollisionEvent('collision-1', 150, 150, false),
        createTestCollisionEvent('collision-2', 250, 250, true, 'obj-3', 'paper'),
      ];
      
      render(<Arena objects={objects} collisionEvents={collisionEvents} />);
      
      const canvas = screen.getByTestId('arena-canvas');
      expect(canvas).toBeDefined();
    });
  });
});
