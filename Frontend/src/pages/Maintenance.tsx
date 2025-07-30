import React, { useEffect, useRef } from 'react';

// Easing functions (simplified version of easing-utils)
const easingUtils = {
  linear: (t: number) => t,
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if ((t /= 1/2) < 1) return 1/2 * Math.pow(2, 10 * (t - 1));
    return 1/2 * (-Math.pow(2, -10 * --t) + 2);
  }
};

interface Disc {
  x: number;
  y: number;
  w: number;
  h: number;
  p: number;
}

interface Particle {
  x: number;
  y: number;
  sx: number;
  dx: number;
  vy: number;
  p: number;
  r: number;
  c: string;
}

const Maintenance: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const wormholeRef = useRef<any>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const wormhole = {
      canvas,
      ctx,
      rect: canvas.getBoundingClientRect(),
      render: { width: 0, height: 0, dpi: window.devicePixelRatio },
      discs: [] as Disc[],
      lines: [] as number[][][],
      particles: [] as Particle[],
      startDisc: { x: 0, y: 0, w: 0, h: 0 },
      endDisc: { x: 0, y: 0, w: 0, h: 0 },
      clip: {},
      particleArea: {}
    };
    wormholeRef.current = wormhole;
    const setSize = () => {
      wormhole.rect = canvas.getBoundingClientRect();
      wormhole.render = {
        width: wormhole.rect.width,
        height: wormhole.rect.height,
        dpi: window.devicePixelRatio
      };
      canvas.width = wormhole.render.width * wormhole.render.dpi;
      canvas.height = wormhole.render.height * wormhole.render.dpi;
    };
    const tweenValue = (start: number, end: number, p: number, ease = false) => {
      const delta = end - start;
      const easeFn = ease ? easingUtils.easeInExpo : easingUtils.linear;
      return start + delta * easeFn(p);
    };
    const tweenDisc = (disc: Disc) => {
      disc.x = tweenValue(wormhole.startDisc.x, wormhole.endDisc.x, disc.p);
      disc.y = tweenValue(wormhole.startDisc.y, wormhole.endDisc.y, disc.p, true);
      disc.w = tweenValue(wormhole.startDisc.w, wormhole.endDisc.w, disc.p);
      disc.h = tweenValue(wormhole.startDisc.h, wormhole.endDisc.h, disc.p);
      return disc;
    };
    const setDiscs = () => {
      const { width, height } = wormhole.rect;
      wormhole.discs = [];
      wormhole.startDisc = {
        x: width * 0.5,
        y: height * 0.45,
        w: width * 0.75,
        h: height * 0.7
      };
      wormhole.endDisc = {
        x: width * 0.5,
        y: height * 0.95,
        w: 0,
        h: 0
      };
      const totalDiscs = 100;
      let prevBottom = height;
      wormhole.clip = {};
      for (let i = 0; i < totalDiscs; i++) {
        const p = i / totalDiscs;
        const disc = tweenDisc({ x: 0, y: 0, w: 0, h: 0, p });
        const bottom = disc.y + disc.h;
        if (bottom <= prevBottom) {
          wormhole.clip = {
            disc: { ...disc },
            i
          };
        }
        prevBottom = bottom;
        wormhole.discs.push(disc);
      }
      wormhole.clip.path = new Path2D();
      wormhole.clip.path.ellipse(
        wormhole.clip.disc.x,
        wormhole.clip.disc.y,
        wormhole.clip.disc.w,
        wormhole.clip.disc.h,
        0,
        0,
        Math.PI * 2
      );
      wormhole.clip.path.rect(
        wormhole.clip.disc.x - wormhole.clip.disc.w,
        0,
        wormhole.clip.disc.w * 2,
        wormhole.clip.disc.y
      );
    };
    const setLines = () => {
      const { width, height } = wormhole.rect;
      wormhole.lines = [];
      const totalLines = 100;
      const linesAngle = (Math.PI * 2) / totalLines;
      for (let i = 0; i < totalLines; i++) {
        wormhole.lines.push([]);
      }
      wormhole.discs.forEach((disc) => {
        for (let i = 0; i < totalLines; i++) {
          const angle = i * linesAngle;
          const p = [
            disc.x + Math.cos(angle) * disc.w,
            disc.y + Math.sin(angle) * disc.h
          ];
          wormhole.lines[i].push(p);
        }
      });
      wormhole.linesCanvas = new OffscreenCanvas(width, height);
      const ctx = wormhole.linesCanvas.getContext('2d');
      if (!ctx) return;
      wormhole.lines.forEach((line) => {
        ctx.save();
        let lineIsIn = false;
        line.forEach((p1, j) => {
          if (j === 0) return;
          const p0 = line[j - 1];
          if (!lineIsIn && ctx.isPointInPath(wormhole.clip.path, p1[0], p1[1])) {
            lineIsIn = true;
          } else if (lineIsIn) {
            ctx.clip(wormhole.clip.path);
          }
          ctx.beginPath();
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
          ctx.strokeStyle = "#444";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.closePath();
        });
        ctx.restore();
      });
    };
    const initParticle = (start = false): Particle => {
      const sx = wormhole.particleArea.sx + wormhole.particleArea.sw * Math.random();
      const ex = wormhole.particleArea.ex + wormhole.particleArea.ew * Math.random();
      const dx = ex - sx;
      const y = start ? wormhole.particleArea.h * Math.random() : wormhole.particleArea.h;
      const r = 0.5 + Math.random() * 4;
      const vy = 0.5 + Math.random();
      return {
        x: sx,
        sx,
        dx,
        y,
        vy,
        p: 0,
        r,
        c: `rgba(255, 255, 255, ${Math.random()})`
      };
    };
    const setParticles = () => {
      const { width, height } = wormhole.rect;
      wormhole.particles = [];
      wormhole.particleArea = {
        sw: wormhole.clip.disc.w * 0.5,
        ew: wormhole.clip.disc.w * 2,
        h: height * 0.85
      };
      wormhole.particleArea.sx = (width - wormhole.particleArea.sw) / 2;
      wormhole.particleArea.ex = (width - wormhole.particleArea.ew) / 2;
      const totalParticles = 100;
      for (let i = 0; i < totalParticles; i++) {
        const particle = initParticle(true);
        wormhole.particles.push(particle);
      }
    };
    const drawDiscs = () => {
      const { ctx } = wormhole;
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 2;
      // Outer disc
      const outerDisc = wormhole.startDisc;
      ctx.beginPath();
      ctx.ellipse(outerDisc.x, outerDisc.y, outerDisc.w, outerDisc.h, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.closePath();
      // Inner discs
      wormhole.discs.forEach((disc, i) => {
        if (i % 5 !== 0) return;
        if (disc.w < wormhole.clip.disc.w - 5) {
          ctx.save();
          ctx.clip(wormhole.clip.path);
        }
        ctx.beginPath();
        ctx.ellipse(disc.x, disc.y, disc.w, disc.h, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.closePath();
        if (disc.w < wormhole.clip.disc.w - 5) {
          ctx.restore();
        }
      });
    };
    const drawLines = () => {
      const { ctx, linesCanvas } = wormhole;
      if (linesCanvas) {
        ctx.drawImage(linesCanvas, 0, 0);
      }
    };
    const drawParticles = () => {
      const { ctx } = wormhole;
      ctx.save();
      ctx.clip(wormhole.clip.path);
      wormhole.particles.forEach((particle) => {
        ctx.fillStyle = particle.c;
        ctx.beginPath();
        ctx.rect(particle.x, particle.y, particle.r, particle.r);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    };
    const moveDiscs = () => {
      wormhole.discs.forEach((disc) => {
        disc.p = (disc.p + 0.001) % 1;
        tweenDisc(disc);
      });
    };
    const moveParticles = () => {
      wormhole.particles.forEach((particle) => {
        particle.p = 1 - particle.y / wormhole.particleArea.h;
        particle.x = particle.sx + particle.dx * particle.p;
        particle.y -= particle.vy;
        if (particle.y < 0) {
          particle.y = initParticle().y;
        }
      });
    };
    const tick = () => {
      const { ctx } = wormhole;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(wormhole.render.dpi, wormhole.render.dpi);
      moveDiscs();
      moveParticles();
      drawDiscs();
      drawLines();
      drawParticles();
      ctx.restore();
      animationRef.current = requestAnimationFrame(tick);
    };
    setSize();
    setDiscs();
    setLines();
    setParticles();
    tick();
    const handleResize = () => {
      setSize();
      setDiscs();
      setLines();
      setParticles();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative w-full min-h-screen h-screen bg-gray-900 overflow-hidden">
      {/* Canvas for wormhole effect */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />
      {/* Radial gradient overlays */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 55%, transparent 10%, black 50%)',
          zIndex: 2
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          background: 'radial-gradient(ellipse at 50% 75%, #a900ff 20%, transparent 75%)',
          zIndex: 5
        }}
      />
      {/* Animated aura */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: '-71.5%',
          left: '50%',
          zIndex: 3,
          width: '30%',
          height: '140%',
          background: `linear-gradient(
            20deg,
            #00f8f1,
            #ffbd1e20 16.5%,
            #fe848f 33%,
            #fe848f20 49.5%,
            #00f8f1 66%,
            #00f8f160 85.5%,
            #ffbd1e 100%
          ) 0 100% / 100% 200%`,
          borderRadius: '0 0 100% 100%',
          filter: 'blur(50px)',
          mixBlendMode: 'plus-lighter',
          opacity: 0.75,
          transform: 'translate3d(-50%, 0, 0)',
          animation: 'aura-glow 5s infinite linear'
        }}
      />
      {/* Scan line overlay */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-50"
        style={{
          zIndex: 10,
          background: `repeating-linear-gradient(
            transparent,
            transparent 1px,
            white 1px,
            white 2px
          )`
        }}
      />
      {/* Maintenance text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-cyan-400 font-mono px-4 py-8 sm:px-8">
        <h1 
          className="text-2xl xs:text-3xl sm:text-4xl md:text-6xl font-bold mb-4 tracking-wider text-center leading-tight"
          style={{
            fontFamily: "'Martian Mono', monospace",
            textShadow: '0 0 20px #00f8f1, 0 0 40px #00f8f1',
            animation: 'pulse-glow 2s ease-in-out infinite'
          }}
        >
          SITE UNDER MAINTENANCE
        </h1>
        <p 
          className="text-base xs:text-lg sm:text-xl font-light tracking-widest opacity-80 text-center max-w-xs sm:max-w-md md:max-w-xl"
          style={{
            fontFamily: "'Martian Mono', monospace",
            animation: 'fade-in-out 3s ease-in-out infinite'
          }}
        >
          We'll be back soon. Thank you for your patience!
        </p>
      </div>
      <style jsx>{`
        @keyframes aura-glow {
          0% { background-position: 0 100%; }
          100% { background-position: 0 300%; }
        }
        @keyframes pulse-glow {
          0%, 100% {
            text-shadow: 0 0 20px #00f8f1, 0 0 40px #00f8f1;
            opacity: 1;
          }
          50% {
            text-shadow: 0 0 30px #00f8f1, 0 0 60px #00f8f1, 0 0 80px #00f8f1;
            opacity: 0.8;
          }
        }
        @keyframes fade-in-out {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Maintenance; 