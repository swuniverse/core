import { useEffect, useRef } from 'react';

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) {
      return;
    }

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      // jsdom has no canvas implementation; keep tests and non-canvas clients safe.
      return;
    }
    if (!ctx) return;

    let animId: number;
    let stars: { x: number; y: number; z: number; o: number }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    function initStars() {
      stars = Array.from({ length: 400 }, () => ({
        x: Math.random() * canvas!.width - canvas!.width / 2,
        y: Math.random() * canvas!.height - canvas!.height / 2,
        z: Math.random() * 1000,
        o: Math.random(),
      }));
    }

    function draw() {
      ctx!.fillStyle = 'rgba(10, 14, 39, 0.15)';
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      const cx = canvas!.width / 2;
      const cy = canvas!.height / 2;

      for (const star of stars) {
        star.z -= 0.3;
        if (star.z <= 0) {
          star.z = 1000;
          star.x = Math.random() * canvas!.width - cx;
          star.y = Math.random() * canvas!.height - cy;
          star.o = Math.random();
        }

        const sx = (star.x / star.z) * 300 + cx;
        const sy = (star.y / star.z) * 300 + cy;
        const r = Math.max(0, (1 - star.z / 1000) * 2);
        const alpha = (1 - star.z / 1000) * star.o;

        ctx!.beginPath();
        ctx!.arc(sx, sy, r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(200, 210, 255, ${alpha})`;
        ctx!.fill();
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
