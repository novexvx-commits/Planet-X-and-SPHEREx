import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Kicker, SplitText, dv } from "../components/ui";
import { useScrollProgress } from "../hooks/useScrollProgress";

export default function Spacewalk() {
  const sectionRef = useRef<HTMLElement>(null);
  const starfieldCanvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const nebula1Ref = useRef<HTMLDivElement>(null);
  const nebula2Ref = useRef<HTMLDivElement>(null);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Scaler ref target: Starts far away & small (0.22), approaches and magnifies up-close (1.42)
  const targetScale = useRef(0.22);
  const currentScale = useRef(0.22);

  // Lighting intensity targets for dynamic illumination as astronaut approaches
  const targetSunIntensity = useRef(1.8);
  const targetFillIntensity = useRef(0.8);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const frontFillRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Starfield warp speed acceleration boost (driven by scroll velocity)
  const warpBoost = useRef(0);

  // 1. 3D Hyperspace Warp Starfield Canvas (Stars rush towards camera as user scrolls)
  useEffect(() => {
    const canvas = starfieldCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const numStars = 460;
    const maxDepth = 1500;

    // Generate 3D coordinates for true depth projection
    const stars = Array.from({ length: numStars }, () => ({
      x: (Math.random() - 0.5) * width * 2.2,
      y: (Math.random() - 0.5) * height * 2.2,
      z: Math.random() * maxDepth + 1,
      size: Math.random() * 1.5 + 0.8,
      twinkle: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const render = () => {
      t += 0.02;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Base cosmic forward flight speed + dynamic warp boost from scrolling
      const baseSpeed = 1.2;
      warpBoost.current *= 0.92; // smooth decay
      const speed = baseSpeed + warpBoost.current;

      for (const s of stars) {
        // Old Z for streak tail calculation
        const prevZ = s.z;

        // Move star forward towards camera
        s.z -= speed;
        if (s.z <= 2) {
          s.z = maxDepth;
          s.x = (Math.random() - 0.5) * width * 2.2;
          s.y = (Math.random() - 0.5) * height * 2.2;
          continue;
        }

        // 3D Perspective Projection
        const fov = 420;
        const k = fov / s.z;
        const px = cx + s.x * k;
        const py = cy + s.y * k;

        // Clip offscreen
        if (px < -40 || px > width + 40 || py < -40 || py > height + 40) {
          s.z = maxDepth;
          s.x = (Math.random() - 0.5) * width * 2.2;
          s.y = (Math.random() - 0.5) * height * 2.2;
          continue;
        }

        // Tail projection for warp streak effect
        const prevK = fov / Math.min(maxDepth, prevZ + speed * 1.8);
        const prevPx = cx + s.x * prevK;
        const prevPy = cy + s.y * prevK;

        // Proximity brightness: stars glow brighter as they get closer
        const depthFraction = 1 - s.z / maxDepth;
        const alpha = Math.min(1, Math.max(0.15, depthFraction * 1.2 + Math.sin(t + s.twinkle) * 0.25));

        // Draw dynamic warp streak or star disc
        if (speed > 3) {
          // Hyperspace light streak
          ctx.strokeStyle = `rgba(220, 240, 255, ${alpha.toFixed(3)})`;
          ctx.lineWidth = Math.max(1, s.size * k * 0.7);
          ctx.beginPath();
          ctx.moveTo(prevPx, prevPy);
          ctx.lineTo(px, py);
          ctx.stroke();
        } else {
          // Ambient twinkling star point
          const r = Math.max(0.6, s.size * (1 + depthFraction * 1.2));
          ctx.fillStyle = `rgba(235, 245, 255, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();

          // Soft coronal glow for foreground stars
          if (depthFraction > 0.65 && s.size > 1.2) {
            ctx.fillStyle = `rgba(0, 229, 255, ${(alpha * 0.35).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(px, py, r * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // 2. Native Three.js WebGL 3D Astronaut Scene
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // Disable wheel zoom so page scroll works naturally
    controls.enablePan = false;
    controls.rotateSpeed = 0.8;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.minPolarAngle = Math.PI * 0.12;

    // Dynamic Space Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(5, 8, 6);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const frontFill = new THREE.DirectionalLight(0xffffff, 0.8);
    frontFill.position.set(0, 1, 5);
    scene.add(frontFill);
    frontFillRef.current = frontFill;

    const cyanRim = new THREE.DirectionalLight(0x00e5ff, 1.6);
    cyanRim.position.set(-6, -2, -4);
    scene.add(cyanRim);

    const violetFill = new THREE.DirectionalLight(0x9b7bff, 1.2);
    violetFill.position.set(2, -6, -2);
    scene.add(violetFill);

    // Groups hierarchy
    const scalerGroup = new THREE.Group();
    scalerGroup.scale.setScalar(currentScale.current);
    scene.add(scalerGroup);

    const driftGroup = new THREE.Group();
    driftGroup.position.y = 0.06;
    scalerGroup.add(driftGroup);

    let mixer: THREE.AnimationMixer | null = null;
    const clock = new THREE.Clock();

    // Load Local 3D Model with PBR materials
    const loader = new GLTFLoader();
    loader.load(
      "/walking-astronaut.glb?v=pbr2",
      (gltf) => {
        const model = gltf.scene;

        // Center and normalize pivot
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const normFactor = 2.1 / (maxDim || 1);

        model.position.sub(center.clone().multiplyScalar(normFactor));
        model.scale.setScalar(normFactor);

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.needsUpdate = true;
            }
          }
        });

        driftGroup.add(model);

        // Permanent Space Idle animation (calm, lifelike space breathing)
        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          const idleClip =
            gltf.animations.find((a) => a.name.toLowerCase() === "idle") ||
            gltf.animations[0];
          const action = mixer.clipAction(idleClip);
          action.play();
        }

        setIsLoaded(true);
      },
      (xhr) => {
        if (xhr.total > 0) {
          setLoadingProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (error) => {
        console.error("Error loading astronaut model:", error);
      }
    );

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    // Continuous Render Loop
    let animFrameId = 0;
    let time = 0;

    const tick = () => {
      const delta = clock.getDelta();
      time += delta;

      if (mixer) mixer.update(delta);

      // Smooth scroll scale interpolation: zooms from distant dot to close-up
      currentScale.current += (targetScale.current - currentScale.current) * 0.08;
      scalerGroup.scale.setScalar(currentScale.current);

      // Smooth dynamic light brightening as astronaut approaches
      if (sunLightRef.current) {
        sunLightRef.current.intensity +=
          (targetSunIntensity.current - sunLightRef.current.intensity) * 0.08;
      }
      if (frontFillRef.current) {
        frontFillRef.current.intensity +=
          (targetFillIntensity.current - frontFillRef.current.intensity) * 0.08;
      }

      // Organic zero-G Floating Drift
      driftGroup.position.x = Math.sin(time * 0.45) * 0.05 + Math.cos(time * 0.2) * 0.025;
      driftGroup.position.y = 0.06 + (Math.sin(time * 0.35) * 0.04 + Math.sin(time * 0.15) * 0.02);
      driftGroup.rotation.z = Math.sin(time * 0.25) * 0.025;
      driftGroup.rotation.y = Math.sin(time * 0.18) * 0.06;

      controls.update();
      renderer.render(scene, camera);

      animFrameId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // 3. Scroll-linked Emergence & Approach Effect (Distant speck -> Magnificent Close-Up)
  useScrollProgress(
    sectionRef,
    (p) => {
      // p: 0.0 (top of section) -> 1.0 (bottom of section)
      const header = headerRef.current;
      const range = rangeRef.current;
      const status = statusRef.current;
      const nebula1 = nebula1Ref.current;
      const nebula2 = nebula2Ref.current;

      // Accelerate hyperspace warp starfield with scroll movement
      warpBoost.current = Math.min(28, warpBoost.current + 4.5);

      // Approach phase: p from 0 to 0.80
      const t = Math.min(1, Math.max(0, p / 0.80));
      // Smooth cubic-out curve for majestic deceleration as he reaches close-up
      const ease = 1 - Math.pow(1 - t, 2.4);

      // Scale: starts tiny and far away in deep space (0.22), approaches and looms large up-close (1.42)
      targetScale.current = 0.22 + (1.42 - 0.22) * ease;

      // Lights intensify as the astronaut approaches: details become crystal clear
      targetSunIntensity.current = 1.8 + ease * 1.6; // from 1.8 to 3.4
      targetFillIntensity.current = 0.8 + ease * 1.0; // from 0.8 to 1.8
      if (ambientLightRef.current) {
        ambientLightRef.current.intensity = 0.9 + ease * 0.5;
      }

      // Background Nebulae expand and brighten as you dive into space
      if (nebula1) {
        nebula1.style.transform = `scale(${(0.85 + ease * 0.45).toFixed(3)}) translate3d(${(ease * 30).toFixed(1)}px, ${(ease * -20).toFixed(1)}px, 0)`;
        nebula1.style.opacity = `${(0.6 + ease * 0.4).toFixed(2)}`;
      }
      if (nebula2) {
        nebula2.style.transform = `scale(${(0.85 + ease * 0.45).toFixed(3)}) translate3d(${(ease * -30).toFixed(1)}px, ${(ease * 20).toFixed(1)}px, 0)`;
        nebula2.style.opacity = `${(0.6 + ease * 0.4).toFixed(2)}`;
      }

      // Atmospheric header fade as the astronaut commands the center of attention
      if (header) {
        const headerOpacity = Math.max(0, 1 - p / 0.42);
        const headerY = -p * 60;
        header.style.opacity = headerOpacity.toFixed(3);
        header.style.transform = `translateY(${headerY.toFixed(1)}px)`;
      }

      // Telemetry Countdown: Distance counts DOWN as you approach the astronaut
      if (range) {
        const meters = (85.0 - ease * 83.5).toFixed(1);
        range.textContent = `${meters}m`;
      }
      if (status) {
        if (ease < 0.3) {
          status.textContent = "Deep Void";
          status.className = "text-[#FF8A3D]";
        } else if (ease < 0.75) {
          status.textContent = "Approach Vector";
          status.className = "text-[#9B7BFF]";
        } else {
          status.textContent = "Proximity Lock";
          status.className = "text-[#00E5FF]";
        }
      }
    },
    "pin"
  );

  return (
    <section id="spacewalk" ref={sectionRef} className="relative h-[250vh] bg-black">
      {/* Sticky Fullscreen Pinned Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-center bg-black">
        {/* 3D Hyperspace Warp Starfield Canvas (Stars rush towards camera as user scrolls) */}
        <canvas
          ref={starfieldCanvasRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        />

        {/* Dynamic Expanding Cosmic Nebula Glows */}
        <div
          ref={nebula1Ref}
          aria-hidden="true"
          className="pointer-events-none absolute -left-[15vw] top-[20%] h-[60vw] w-[60vw] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.12),transparent_65%)] blur-3xl will-change-transform"
        />
        <div
          ref={nebula2Ref}
          aria-hidden="true"
          className="pointer-events-none absolute -right-[15vw] bottom-[15%] h-[65vw] w-[65vw] rounded-full bg-[radial-gradient(circle,rgba(155,123,255,0.10),transparent_65%)] blur-3xl will-change-transform"
        />

        {/* Native 3D WebGL Canvas (100% Transparent — Zero Iframe / No borders) */}
        <canvas
          ref={threeCanvasRef}
          className="absolute inset-0 z-15 h-full w-full cursor-grab active:cursor-grabbing outline-none"
        />

        {/* Loading Indicator while GLB buffer stream mounts */}
        {!isLoaded && (
          <div className="pointer-events-none absolute z-25 flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-[#00E5FF]" />
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-bone/60">
              Locating Astronaut in Void · {loadingProgress}%
            </p>
          </div>
        )}

        {/* Cinematic Header Overlay (Fades out smoothly as astronaut approaches) */}
        <div
          ref={headerRef}
          className="pointer-events-none absolute top-12 md:top-16 inset-x-0 z-20 will-change-transform"
        >
          <div className="shell text-center">
            <Kicker center>Chapter II.5 · Extravehicular Mobility</Kicker>
            <SplitText
              text="Suspended in the | *Infinite Quiet.*"
              emClass="em-ion"
              className="mt-4 md:mt-5 font-serif text-[clamp(2.4rem,6.5vw,6rem)] leading-[0.94] tracking-[-0.015em]"
            />
            <p
              data-reveal="up"
              style={dv({ "--d": "200ms" })}
              className="mx-auto mt-4 max-w-xl text-[14px] md:text-[16px] leading-[1.7] text-bone/60"
            >
              Far across the cosmic dark, a lone figure drifts in eternal silence.
              Scroll to bridge the distance and bring the voyager into view.
            </p>
          </div>
        </div>

        {/* 360 Hint & Dynamic Distance Approach HUD Badge */}
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bone/80 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] animate-pulse" />
          <span>Drag to rotate 360°</span>
          <span className="text-white/30">•</span>
          <span ref={statusRef} className="text-[#FF8A3D] transition-colors duration-300">
            Deep Void
          </span>
          <span className="text-white/30">•</span>
          <span ref={rangeRef} className="text-bone/70 tabular-nums">
            85.0m
          </span>
        </div>
      </div>
    </section>
  );
}
