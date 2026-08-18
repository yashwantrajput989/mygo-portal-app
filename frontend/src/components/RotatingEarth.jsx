import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function RotatingEarth() {
    const mountRef = useRef(null);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        const width = currentMount.clientWidth || window.innerWidth;
        const height = currentMount.clientHeight || window.innerHeight;

        // Scene, Camera, Renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 3.2);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        currentMount.appendChild(renderer.domElement);

        // Starfield background
        const starsCount = 1800;
        const starsGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starsCount * 3);
        const starColors = new Float32Array(starsCount * 3);

        for (let i = 0; i < starsCount * 3; i += 3) {
            starPositions[i] = (Math.random() - 0.5) * 80;
            starPositions[i + 1] = (Math.random() - 0.5) * 80;
            starPositions[i + 2] = (Math.random() - 0.5) * 80;

            const brightness = 0.5 + Math.random() * 0.5;
            starColors[i] = brightness;
            starColors[i + 1] = brightness * (0.9 + Math.random() * 0.1);
            starColors[i + 2] = brightness * 1.1; // subtle blue-white stars
        }

        starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

        const starsMat = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.85
        });
        const stars = new THREE.Points(starsGeo, starsMat);
        scene.add(stars);

        // Earth Group positioned to the left like the reference screenshot
        const earthGroup = new THREE.Group();
        // Position earth slightly to the left (-0.5) and down (-0.1) for cinematic framing
        earthGroup.position.set(-0.65, -0.15, 0);
        scene.add(earthGroup);

        // High resolution procedural textures via Canvas
        const createEarthCanvas = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 2048;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            // Deep ocean base
            const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
            oceanGrad.addColorStop(0, '#040914');
            oceanGrad.addColorStop(0.5, '#071326');
            oceanGrad.addColorStop(1, '#030813');
            ctx.fillStyle = oceanGrad;
            ctx.fillRect(0, 0, 2048, 1024);

            // Continents with night lights & terrain
            const drawContinentCluster = (cx, cy, rx, ry, density, color, lightColor) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, Math.PI / 8, 0, Math.PI * 2);
                ctx.fill();

                // Night city lights
                for (let j = 0; j < density; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = Math.random() * (rx * 0.85);
                    const lx = cx + Math.cos(angle) * r;
                    const ly = cy + Math.sin(angle) * (r * (ry / rx));

                    const brightness = Math.random();
                    ctx.fillStyle = brightness > 0.4 ? lightColor : '#ff9933';
                    ctx.beginPath();
                    ctx.arc(lx, ly, Math.random() * 2.2 + 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            };

            // Europe & Mediterranean (Center-left)
            drawContinentCluster(600, 380, 220, 140, 280, '#0f1f2e', '#ffaa44');
            drawContinentCluster(720, 320, 180, 100, 220, '#102233', '#ffbb55');
            // Middle East & India
            drawContinentCluster(960, 460, 240, 150, 320, '#0d1a29', '#ff9922');
            drawContinentCluster(1180, 480, 180, 130, 290, '#122438', '#ffaa33');
            // Africa
            drawContinentCluster(650, 620, 210, 260, 180, '#091522', '#ff8822');
            // Americas (Backside)
            drawContinentCluster(1600, 360, 240, 150, 260, '#0c1b2c', '#ffaa44');
            drawContinentCluster(1720, 640, 180, 220, 160, '#0a1726', '#ff8833');
            // East Asia
            drawContinentCluster(1380, 400, 220, 160, 300, '#0e1e30', '#ffbb44');

            return new THREE.CanvasTexture(canvas);
        };

        const earthTexture = createEarthCanvas();
        earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        // Earth Sphere (Radius: 1.55 for prominent presence)
        const earthGeometry = new THREE.SphereGeometry(1.55, 64, 64);
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: earthTexture,
            roughness: 0.65,
            metalness: 0.15,
            emissive: new THREE.Color(0xffaa55),
            emissiveMap: earthTexture,
            emissiveIntensity: 0.8
        });

        const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
        earthGroup.add(earthMesh);

        // Atmospheric Halo Glow Shader
        const atmosphereGeo = new THREE.SphereGeometry(1.62, 64, 64);
        const atmosphereMat = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.8);
                    gl_FragColor = vec4(0.2, 0.55, 1.0, 1.0) * intensity * 1.6;
                }
            `,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true
        });

        const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        earthGroup.add(atmosphere);

        // Ambient and Directional Lights (Sun casting light from the top right)
        const ambientLight = new THREE.AmbientLight(0x0a1222, 1.2);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
        sunLight.position.set(4, 2, 3);
        scene.add(sunLight);

        const blueRimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
        blueRimLight.position.set(-4, -1, -2);
        scene.add(blueRimLight);

        // Mouse Parallax Effect
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const onMouseMove = (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 0.3;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 0.3;
        };
        window.addEventListener('mousemove', onMouseMove);

        // Resize handler
        const onResize = () => {
            if (!currentMount) return;
            const w = currentMount.clientWidth || window.innerWidth;
            const h = currentMount.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        // Animation Loop
        let animationFrameId;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            // Constant gentle rotation of the Earth
            earthMesh.rotation.y += 0.0018;

            // Parallax interpolation
            targetX += (mouseX - targetX) * 0.05;
            targetY += (mouseY - targetY) * 0.05;

            earthGroup.rotation.y = targetX * 0.4;
            earthGroup.rotation.x = targetY * 0.4;

            // Twinkle stars slowly
            stars.rotation.y -= 0.0002;

            renderer.render(scene, camera);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onResize);
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return (
        <div 
            ref={mountRef} 
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
                pointerEvents: 'none',
                overflow: 'hidden'
            }} 
        />
    );
}
