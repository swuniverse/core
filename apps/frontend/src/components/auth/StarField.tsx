import { useEffect, useRef } from 'react';

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (
      typeof navigator !== 'undefined' &&
      navigator.userAgent.includes('jsdom')
    ) {
      return;
    }

    const canvasElement = canvas;
    let renderingContext: CanvasRenderingContext2D | null = null;
    try {
      renderingContext = canvasElement.getContext('2d');
    } catch {
      // jsdom has no canvas implementation; keep tests and non-canvas clients safe.
      return;
    }
    if (!renderingContext) return;

    const ctx = renderingContext;
    let animId: number;
    let stars: { x: number; y: number; z: number; o: number }[] = [];

    function resize() {
      canvasElement.width = window.innerWidth;
      canvasElement.height = window.innerHeight;
    }

    function initStars() {
      stars = Array.from({ length: 400 }, () => ({
        x: Math.random() * canvasElement.width - canvasElement.width / 2,
        y: Math.random() * canvasElement.height - canvasElement.height / 2,
        z: Math.random() * 1000,
        o: Math.random(),
      }));
    }

    function draw() {
      ctx.fillStyle = 'rgba(10, 14, 39, 0.15)';
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

      const centerX = canvasElement.width / 2;
      const centerY = canvasElement.height / 2;

      for (const star of stars) {
        star.z -= 0.3;
        if (star.z <= 0) {
          star.z = 1000;
          star.x = Math.random() * canvasElement.width - centerX;
          star.y = Math.random() * canvasElement.height - centerY;
          star.o = Math.random();
        }

        const screenX = (star.x / star.z) * 300 + centerX;
        const screenY = (star.y / star.z) * 300 + centerY;
        const radius = Math.max(0, (1 - star.z / 1000) * 2);
        const alpha = (1 - star.z / 1000) * star.o;

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    initStars();
    draw();
    const handleResize = () => {
      resize();
      initStars();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
