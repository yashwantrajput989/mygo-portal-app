import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function RotatingEarth() {
    const mountRef = useRef(null);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        const width = currentMount.clientWidth || window.innerWidth;
        const height = currentMount.clientHeight || window.innerHeight;

        // 1. Scene, Camera & WebGL Renderer
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
        renderer.toneMappingExposure = 1.05;
        currentMount.appendChild(renderer.domElement);

        // 2. Starfield in Deep Space
        const starsCount = 2200;
        const starsGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starsCount * 3);
        const starColors = new Float32Array(starsCount * 3);

        for (let i = 0; i < starsCount * 3; i += 3) {
            starPositions[i] = (Math.random() - 0.5) * 140;
            starPositions[i + 1] = (Math.random() - 0.5) * 140;
            starPositions[i + 2] = -30 + (Math.random() - 0.5) * 50;

            const brightness = 0.35 + Math.random() * 0.65;
            starColors[i] = brightness;
            starColors[i + 1] = brightness * (0.9 + Math.random() * 0.1);
            starColors[i + 2] = brightness * 1.15;
        }

        starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

        const starsMat = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.85
        });
        const stars = new THREE.Points(starsGeo, starsMat);
        scene.add(stars);

        // 3. Earth Root Tilt Group
        const earthGroup = new THREE.Group();
        earthGroup.position.set(-0.72, -0.1, 0);
        earthGroup.rotation.z = 23.4 * (Math.PI / 180); // Earth axial tilt
        scene.add(earthGroup);

        const textureLoader = new THREE.TextureLoader();

        // 4. Procedural Realistic Earth Canvas (True Geography & Continents)
        const createRealisticEarthCanvas = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 2048;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            // Deep Crystal Blue Ocean (Zero pink tint)
            const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
            oceanGrad.addColorStop(0, '#020d1e');
            oceanGrad.addColorStop(0.3, '#051833');
            oceanGrad.addColorStop(0.5, '#07244a');
            oceanGrad.addColorStop(0.7, '#051833');
            oceanGrad.addColorStop(1, '#020d1e');
            ctx.fillStyle = oceanGrad;
            ctx.fillRect(0, 0, 2048, 1024);

            // Natural Landmasses
            const drawLand = (pathFn, baseColor, lightsCount) => {
                ctx.fillStyle = baseColor;
                ctx.beginPath();
                pathFn();
                ctx.fill();

                for (let j = 0; j < lightsCount; j++) {
                    const lx = Math.random() * 2048;
                    const ly = Math.random() * 1024;
                    if (ctx.isPointInPath(lx, ly)) {
                        ctx.fillStyle = Math.random() > 0.4 ? '#fde047' : '#f59e0b';
                        ctx.beginPath();
                        ctx.arc(lx, ly, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            };

            // Eurasia
            drawLand(() => {
                ctx.ellipse(1120, 340, 460, 180, 0, 0, Math.PI * 2);
                ctx.ellipse(920, 290, 190, 130, 0.2, 0, Math.PI * 2);
            }, '#142c1e', 850);

            // India
            drawLand(() => {
                ctx.ellipse(1180, 470, 140, 130, 0.3, 0, Math.PI * 2);
            }, '#1a3d27', 750);

            // Middle East
            drawLand(() => {
                ctx.ellipse(1010, 420, 110, 90, 0.1, 0, Math.PI * 2);
            }, '#3a301e', 600);

            // Africa
            drawLand(() => {
                ctx.ellipse(880, 560, 170, 250, 0.1, 0, Math.PI * 2);
            }, '#20321c', 450);

            // North America (USA & Canada)
            drawLand(() => {
                ctx.ellipse(390, 320, 270, 190, -0.2, 0, Math.PI * 2);
            }, '#183424', 900);

            // Mexico & Central America
            drawLand(() => {
                ctx.ellipse(440, 460, 90, 110, 0.3, 0, Math.PI * 2);
            }, '#233d26', 500);

            // South America
            drawLand(() => {
                ctx.ellipse(540, 650, 140, 230, 0.2, 0, Math.PI * 2);
            }, '#163821', 400);

            // Australia
            drawLand(() => {
                ctx.ellipse(1560, 680, 130, 100, 0, 0, Math.PI * 2);
            }, '#2e2c20', 280);

            return new THREE.CanvasTexture(canvas);
        };

        const canvasTexture = createRealisticEarthCanvas();

        // 5. Earth Textures
        const earthMap = textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
            undefined,
            undefined,
            () => canvasTexture
        );
        earthMap.colorSpace = THREE.SRGBColorSpace;

        const earthSpecular = textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'
        );

        const earthNormal = textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'
        );

        // 6. Rotating Earth Globe Core (All country points attached as direct children)
        const earthGeometry = new THREE.SphereGeometry(1.5, 64, 64);
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: earthMap,
            normalMap: earthNormal,
            normalScale: new THREE.Vector2(0.65, 0.65),
            roughnessMap: earthSpecular,
            roughness: 0.45,
            metalness: 0.05
        });
        const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
        earthGroup.add(earthMesh);

        // 7. Rotating Cloud Sphere
        const cloudTexture = textureLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'
        );
        const cloudGeometry = new THREE.SphereGeometry(1.516, 64, 64);
        const cloudMaterial = new THREE.MeshStandardMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        earthGroup.add(cloudMesh);

        // 8. Accurate Lat/Lon Position Converter on Sphere
        const latLongToVector3 = (lat, lon, radius) => {
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180);
            return new THREE.Vector3(
                -(radius * Math.sin(phi) * Math.cos(theta)),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
            );
        };

        // 9. Mygo Consulting 6 Operational Countries
        const mygoCountries = [
            { name: 'United States', city: 'Chicago', lat: 41.8781, lon: -87.6298 },
            { name: 'Canada', city: 'Toronto', lat: 43.6532, lon: -79.3832 },
            { name: 'Mexico', city: 'Mexico City', lat: 19.4326, lon: -99.1332 },
            { name: 'Germany', city: 'Frankfurt', lat: 50.1109, lon: 8.6821 },
            { name: 'India', city: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
            { name: 'Middle East', city: 'Dubai', lat: 25.2048, lon: 55.2708 }
        ];

        // 10. Attach Beacon Pins directly to `earthMesh` so they rotate in perfect sync with the land!
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff682c });
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0xff9466, 
            transparent: true, 
            opacity: 0.65,
            side: THREE.DoubleSide
        });

        const pulseRings = [];

        mygoCountries.forEach(country => {
            const pos = latLongToVector3(country.lat, country.lon, 1.508);

            // Center Glowing Pin attached to earthMesh
            const markerGeo = new THREE.SphereGeometry(0.024, 16, 16);
            const markerMesh = new THREE.Mesh(markerGeo, beaconMat);
            markerMesh.position.copy(pos);
            earthMesh.add(markerMesh);

            // Pulsing Ring attached to earthMesh
            const ringGeo = new THREE.RingGeometry(0.03, 0.05, 24);
            const ringMesh = new THREE.Mesh(ringGeo, ringMat.clone());
            ringMesh.position.copy(pos);
            ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
            earthMesh.add(ringMesh);
            pulseRings.push(ringMesh);
        });

        // 11. Attach Connecting Arcs directly to `earthMesh`
        const animatedPulses = [];

        const createConnectionArc = (countryA, countryB) => {
            const start = latLongToVector3(countryA.lat, countryA.lon, 1.505);
            const end = latLongToVector3(countryB.lat, countryB.lon, 1.505);
            const distance = start.distanceTo(end);

            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            mid.setLength(1.5 + distance * 0.22);

            const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
            const curvePoints = curve.getPoints(60);
            const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
            const curveMat = new THREE.LineBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.55
            });
            const line = new THREE.Line(curveGeo, curveMat);
            earthMesh.add(line);

            // Pulse particle along arc
            const pulseGeo = new THREE.SphereGeometry(0.016, 12, 12);
            const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
            earthMesh.add(pulseMesh);

            animatedPulses.push({
                mesh: pulseMesh,
                curve,
                progress: Math.random(),
                speed: 0.0035 + Math.random() * 0.002
            });
        };

        // Interconnect the 6 Countries
        createConnectionArc(mygoCountries[0], mygoCountries[1]); // USA <-> Canada
        createConnectionArc(mygoCountries[0], mygoCountries[2]); // USA <-> Mexico
        createConnectionArc(mygoCountries[0], mygoCountries[3]); // USA <-> Germany
        createConnectionArc(mygoCountries[3], mygoCountries[5]); // Germany <-> Middle East
        createConnectionArc(mygoCountries[5], mygoCountries[4]); // Middle East <-> India
        createConnectionArc(mygoCountries[0], mygoCountries[4]); // USA <-> India

        // 12. Clean Solar Lighting (Natural Sunlight, No Red Tint)
        const ambientLight = new THREE.AmbientLight(0x0a1628, 1.5);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 2.6);
        sunLight.position.set(5, 3, 4);
        scene.add(sunLight);

        const softFillLight = new THREE.DirectionalLight(0x162c46, 0.8);
        softFillLight.position.set(-5, -2, -3);
        scene.add(softFillLight);

        // 13. Mouse Parallax
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const onMouseMove = (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 0.2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 0.2;
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

        // 14. Animation Loop
        let animationFrameId;
        let pulseTime = 0;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            pulseTime += 0.03;

            // Rotate Earth & all children (points + arcs rotate in 100% sync!)
            earthMesh.rotation.y += 0.001;
            cloudMesh.rotation.y += 0.0014;

            // Parallax smoothness
            targetX += (mouseX - targetX) * 0.04;
            targetY += (mouseY - targetY) * 0.04;

            earthGroup.rotation.y = targetX * 0.25;
            earthGroup.rotation.x = targetY * 0.25 + 23.4 * (Math.PI / 180);

            // Animate Beacon Rings
            pulseRings.forEach((ring, idx) => {
                const scale = 1 + Math.sin(pulseTime + idx * 1.2) * 0.35;
                ring.scale.set(scale, scale, 1);
                ring.material.opacity = 0.75 - (scale - 1) * 0.9;
            });

            // Animate Data Pulses along Arcs
            animatedPulses.forEach(p => {
                p.progress += p.speed;
                if (p.progress > 1) p.progress = 0;
                const point = p.curve.getPoint(p.progress);
                p.mesh.position.copy(point);
            });

            // Twinkle background stars
            stars.rotation.y -= 0.0001;

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
