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
        camera.position.set(0, 0, 3.8);

        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true, 
            powerPreference: 'high-performance' 
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        currentMount.appendChild(renderer.domElement);

        // Starfield background with twinkling stars
        const starsCount = 2400;
        const starsGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starsCount * 3);
        const starColors = new Float32Array(starsCount * 3);

        for (let i = 0; i < starsCount * 3; i += 3) {
            starPositions[i] = (Math.random() - 0.5) * 120;
            starPositions[i + 1] = (Math.random() - 0.5) * 120;
            starPositions[i + 2] = -30 + (Math.random() - 0.5) * 60;

            const brightness = 0.4 + Math.random() * 0.6;
            starColors[i] = brightness;
            starColors[i + 1] = brightness * (0.85 + Math.random() * 0.15);
            starColors[i + 2] = brightness * 1.2;
        }

        starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

        const starsMat = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });
        const stars = new THREE.Points(starsGeo, starsMat);
        scene.add(stars);

        // Earth Group positioned on the left side
        const earthGroup = new THREE.Group();
        earthGroup.position.set(-0.72, -0.1, 0);
        earthGroup.rotation.z = 23.4 * (Math.PI / 180); // True Earth axial tilt 23.4 degrees
        scene.add(earthGroup);

        const textureLoader = new THREE.TextureLoader();

        // 1. High-Detail Procedural Fallback Earth Canvas (Realistic Continents & City Lights)
        const createRealisticEarthCanvas = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 2048;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            // Deep ocean gradient
            const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
            oceanGrad.addColorStop(0, '#020617');
            oceanGrad.addColorStop(0.3, '#04152d');
            oceanGrad.addColorStop(0.5, '#062044');
            oceanGrad.addColorStop(0.7, '#04152d');
            oceanGrad.addColorStop(1, '#020617');
            ctx.fillStyle = oceanGrad;
            ctx.fillRect(0, 0, 2048, 1024);

            // Detailed Landmass Drawing
            const drawLand = (pathData, color, lightsCount, lightColor) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                pathData();
                ctx.fill();

                // Night City Lights
                for (let j = 0; j < lightsCount; j++) {
                    const lx = Math.random() * 2048;
                    const ly = Math.random() * 1024;
                    if (ctx.isPointInPath(lx, ly)) {
                        ctx.fillStyle = Math.random() > 0.3 ? lightColor : '#ff9922';
                        ctx.beginPath();
                        ctx.arc(lx, ly, Math.random() * 1.8 + 0.6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            };

            // Europe & Asia
            drawLand(() => {
                ctx.ellipse(1100, 340, 480, 180, 0, 0, Math.PI * 2);
                ctx.ellipse(920, 280, 180, 120, 0.2, 0, Math.PI * 2);
            }, '#0d2238', 900, '#ffbb44');

            // India & South Asia
            drawLand(() => {
                ctx.ellipse(1180, 460, 160, 140, 0.3, 0, Math.PI * 2);
            }, '#0f2942', 750, '#ff9900');

            // Africa
            drawLand(() => {
                ctx.ellipse(880, 540, 180, 260, 0.1, 0, Math.PI * 2);
            }, '#0a1d30', 400, '#ff8833');

            // North America
            drawLand(() => {
                ctx.ellipse(380, 320, 260, 180, -0.2, 0, Math.PI * 2);
            }, '#0d243a', 850, '#ffcc55');

            // South America
            drawLand(() => {
                ctx.ellipse(540, 640, 150, 240, 0.2, 0, Math.PI * 2);
            }, '#091c2e', 450, '#ffaa33');

            // Australia
            drawLand(() => {
                ctx.ellipse(1560, 680, 140, 110, 0, 0, Math.PI * 2);
            }, '#0c2236', 300, '#ffaa44');

            return new THREE.CanvasTexture(canvas);
        };

        const realisticCanvasTexture = createRealisticEarthCanvas();

        // 2. High-Res Satellite Earth Texture with Fallback
        const earthMap = textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
            undefined,
            undefined,
            () => realisticCanvasTexture
        );
        earthMap.colorSpace = THREE.SRGBColorSpace;

        const earthSpecular = textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'
        );

        const earthNormal = textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'
        );

        const earthLights = textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png'
        );

        // 3. Earth Base Mesh
        const earthGeometry = new THREE.SphereGeometry(1.5, 64, 64);
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: earthMap,
            normalMap: earthNormal,
            normalScale: new THREE.Vector2(0.85, 0.85),
            roughnessMap: earthSpecular,
            roughness: 0.55,
            metalness: 0.1,
            emissive: new THREE.Color(0xff8833),
            emissiveMap: earthLights,
            emissiveIntensity: 1.4
        });
        const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
        earthGroup.add(earthMesh);

        // 4. Cloud Sphere Layer (Semi-transparent with independent rotation)
        const cloudTexture = textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'
        );
        const cloudGeometry = new THREE.SphereGeometry(1.525, 64, 64);
        const cloudMaterial = new THREE.MeshStandardMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.38,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        earthGroup.add(cloudMesh);

        // 5. Cinematic Rayleigh Atmospheric Glow (Fresnel Shader)
        const atmosphereGeo = new THREE.SphereGeometry(1.58, 64, 64);
        const atmosphereMat = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * vec4(vPosition, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vec3 viewDir = normalize(-vPosition);
                    float fresnel = dot(viewDir, vNormal);
                    fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
                    float intensity = pow(fresnel, 3.2);
                    
                    // Sapphire blue into soft cyan atmospheric Rayleigh scattering
                    vec3 atmosphereColor = mix(vec3(0.08, 0.45, 0.95), vec3(0.38, 0.82, 1.0), intensity);
                    gl_FragColor = vec4(atmosphereColor, 1.0) * intensity * 1.8;
                }
            `,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false
        });
        const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        earthGroup.add(atmosphereMesh);

        // 6. Global Enterprise Flight & Data Arcs (Connecting Global Hubs)
        const latLongToVector3 = (lat, lon, radius) => {
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180);
            return new THREE.Vector3(
                -(radius * Math.sin(phi) * Math.cos(theta)),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
            );
        };

        const globalHubs = [
            { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
            { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
            { name: 'London', lat: 51.5074, lon: -0.1278 },
            { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
            { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
            { name: 'Frankfurt', lat: 50.1109, lon: 8.6821 }
        ];

        // Draw glowing hub markers
        const hubMat = new THREE.MeshBasicMaterial({ color: 0xff682c });
        globalHubs.forEach(hub => {
            const pos = latLongToVector3(hub.lat, hub.lon, 1.51);
            const markerGeo = new THREE.SphereGeometry(0.02, 16, 16);
            const markerMesh = new THREE.Mesh(markerGeo, hubMat);
            markerMesh.position.copy(pos);
            earthGroup.add(markerMesh);
        });

        // Draw Arcs between hubs
        const createArc = (hubA, hubB) => {
            const start = latLongToVector3(hubA.lat, hubA.lon, 1.5);
            const end = latLongToVector3(hubB.lat, hubB.lon, 1.5);
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            const distance = start.distanceTo(end);
            mid.setLength(1.5 + distance * 0.28); // Arch height

            const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
            const points = curve.getPoints(50);
            const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
            const curveMat = new THREE.LineBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.65
            });
            const line = new THREE.Line(curveGeo, curveMat);
            earthGroup.add(line);
        };

        createArc(globalHubs[0], globalHubs[2]); // Hyderabad -> London
        createArc(globalHubs[0], globalHubs[3]); // Hyderabad -> Dubai
        createArc(globalHubs[0], globalHubs[4]); // Hyderabad -> Singapore
        createArc(globalHubs[1], globalHubs[2]); // Chicago -> London
        createArc(globalHubs[2], globalHubs[5]); // London -> Frankfurt

        // 7. Dynamic Lighting (Sunlight + Soft Rim Lighting)
        const ambientLight = new THREE.AmbientLight(0x040814, 1.8);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfff5ea, 3.2);
        sunLight.position.set(5, 3, 4);
        scene.add(sunLight);

        const cyanFillLight = new THREE.DirectionalLight(0x0284c7, 1.5);
        cyanFillLight.position.set(-5, -2, -2);
        scene.add(cyanFillLight);

        // Mouse Parallax Effect
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const onMouseMove = (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 0.25;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 0.25;
        };
        window.addEventListener('mousemove', onMouseMove);

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

            // Realistic rotation: Earth rotates eastward
            earthMesh.rotation.y += 0.0012;
            // Cloud layer drifts slightly faster
            cloudMesh.rotation.y += 0.0016;

            // Parallax smoothness
            targetX += (mouseX - targetX) * 0.04;
            targetY += (mouseY - targetY) * 0.04;

            earthGroup.rotation.y = targetX * 0.35;
            earthGroup.rotation.x = targetY * 0.35 + 23.4 * (Math.PI / 180);

            // Gentle starry drift
            stars.rotation.y -= 0.00015;

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
