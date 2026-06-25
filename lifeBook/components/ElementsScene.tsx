
import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Environment, 
  Lightformer,
  Float, 
  MeshTransmissionMaterial, 
  MeshDistortMaterial, 
  SpotLight,
  ContactShadows,
  Html,
  PointMaterial,
  Preload
} from '@react-three/drei';
import * as THREE from 'three';
import { ElementData, ElementType } from '../types';

// --- Utils ---
const damp = (target: number, current: number, speed: number, delta: number) => {
  return current + (target - current) * (1 - Math.exp(-speed * delta));
};

const getElementName = (type: ElementType) => {
  switch (type) {
    case ElementType.Metal: return '真金';
    case ElementType.Wood: return '苍木';
    case ElementType.Water: return '玄水';
    case ElementType.Fire: return '烈火';
    case ElementType.Earth: return '厚土';
    default: return '';
  }
};

const getElementColorClass = (type: ElementType) => {
  switch (type) {
    case ElementType.Metal: return 'from-amber-200 via-yellow-101 to-amber-500';
    case ElementType.Wood: return 'from-emerald-300 via-teal-101 to-emerald-500';
    case ElementType.Water: return 'from-cyan-300 via-blue-101 to-cyan-500';
    case ElementType.Fire: return 'from-orange-300 via-red-101 to-orange-500';
    case ElementType.Earth: return 'from-stone-300 via-yellow-101 to-amber-700';
    default: return 'from-white to-gray-500';
  }
};

const getElementColorHex = (type: ElementType) => {
  switch (type) {
    case ElementType.Metal: return '#f59e0b';
    case ElementType.Wood: return '#10b981';
    case ElementType.Water: return '#3b82f6';
    case ElementType.Fire: return '#ef4444';
    case ElementType.Earth: return '#78716c';
    default: return '#ffffff';
  }
};

// --- Particles & Details ---

// Solar Sparks (Fire) - Dynamic & Chaotic
const SparkParticles = ({ count = 60, color = "#FFB74D" }) => {
  const { geometry, data } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const d = new Float32Array(count * 4); // [speed, driftFreq, driftAmp, offset]
    
    for (let i = 0; i < count; i++) {
      // Position
      const r = Math.random() * 0.4;
      const theta = Math.random() * Math.PI * 2;
      p[i * 3] = r * Math.cos(theta);     // X
      p[i * 3 + 1] = (Math.random() - 0.5) * 0.8; // Y
      p[i * 3 + 2] = r * Math.sin(theta); // Z
      
      // Physics Data
      d[i * 4] = 0.3 + Math.random() * 0.7;     // Upward Speed
      d[i * 4 + 1] = 2 + Math.random() * 4;     // Drift Frequency
      d[i * 4 + 2] = 0.05 + Math.random() * 0.1; // Drift Amplitude
      d[i * 4 + 3] = Math.random() * 100;       // Random Offset
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return { geometry: geo, data: d };
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  
  useFrame((state, delta) => {
    if (ref.current && ref.current.geometry) {
      const positionsAttribute = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      
      if (positionsAttribute) {
        const t = state.clock.elapsedTime;
        const array = positionsAttribute.array as Float32Array;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const i4 = i * 4;
          
          const speed = data[i4];
          const freq = data[i4 + 1];
          const amp = data[i4 + 2];
          const offset = data[i4 + 3];

          // Vertical Rise
          array[i3 + 1] += speed * delta;

          // Turbulent Drift
          array[i3] += Math.sin(t * freq + offset) * amp * delta * 4;
          array[i3 + 2] += Math.cos(t * freq * 0.8 + offset) * amp * delta * 4;

          // Reset Logic: If too high or too far out
          if (array[i3 + 1] > 0.6 || Math.abs(array[i3]) > 0.5) {
            array[i3 + 1] = -0.5; // Reset to bottom
            const r = Math.random() * 0.2;
            const theta = Math.random() * Math.PI * 2;
            array[i3] = r * Math.cos(theta);
            array[i3 + 2] = r * Math.sin(theta);
          }
        }
        
        positionsAttribute.needsUpdate = true;
      }
    }
  });

  return (
    <points ref={ref} geometry={geometry}>
      <PointMaterial
        transparent
        color={color}
        size={0.03}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Gold Dust (Metal)
const GoldDust = ({ count = 120 }) => {
  const geometry = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.55 + Math.random() * 0.3; 
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return geo;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((state, delta) => {
    if (ref.current) {
       ref.current.rotation.y -= delta * 0.05;
       ref.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <points ref={ref} geometry={geometry}>
      <PointMaterial 
        transparent 
        color="#FFD700" 
        size={0.008} 
        sizeAttenuation 
        opacity={0.8} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

// Micro Bubbles (Water)
const MicroBubbles = ({ count = 250 }) => {
    const geometry = useMemo(() => {
      const p = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.pow(Math.random(), 1/3) * 0.42; // Keep inside sphere
        p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        p[i * 3 + 2] = r * Math.cos(phi);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
      return geo;
    }, [count]);
  
    return (
      <points geometry={geometry}>
        <PointMaterial color="#FFFFFF" size={0.005} sizeAttenuation opacity={0.4} transparent blending={THREE.AdditiveBlending} depthWrite={false}/>
      </points>
    );
};

// Plasma Loops (Fire)
const PlasmaLoops = () => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if(ref.current) {
            ref.current.rotation.z += delta * 0.2;
            ref.current.rotation.x += delta * 0.1;
        }
    });
    return (
        <group ref={ref}>
            <mesh rotation={[Math.PI/2.2, 0, 0]}>
                <torusGeometry args={[0.55, 0.004, 16, 64]} />
                <meshBasicMaterial color="#FFCCBC" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh rotation={[0, Math.PI/3, 0]}>
                <torusGeometry args={[0.6, 0.003, 16, 64]} />
                <meshBasicMaterial color="#FFAB91" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
    )
}

// Earth Dust Ring
const DustRing = () => {
  const geometry = useMemo(() => {
    const p = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.6 + Math.random() * 0.4;
      p[i * 3] = Math.cos(angle) * radius;
      p[i * 3 + 1] = (Math.random() - 0.5) * 0.15; 
      p[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return geo;
  }, []);
  
  const ref = useRef<THREE.Points>(null);
  useFrame((state, delta) => {
    if(ref.current) {
        ref.current.rotation.y += delta * 0.04;
    }
  });

  return (
     <points ref={ref} geometry={geometry}>
      <PointMaterial transparent color="#D7CCC8" size={0.006} sizeAttenuation opacity={0.3} />
    </points>
  )
}

// --- Real Physical Elements (Hyper-Realism) ---
// Note: Wrapped in React.memo to prevent unnecessary re-renders of heavy shader setups during carousel switching

// 1. Metal: Liquid Gold (Iridescent PBR + Flux)
const RealMetal = React.memo(({ active }: { active: boolean }) => {
  return (
    <group>
      <GoldDust />
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
        {/* Core Mass with Iridescence */}
        <mesh>
          <sphereGeometry args={[0.45, 128, 128]} />
          <meshPhysicalMaterial 
            color="#FFD700"
            metalness={1.0}
            roughness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.0}
            reflectivity={1.0}
            envMapIntensity={2.5}
            iridescence={1.0}
            iridescenceIOR={1.5}
            iridescenceThicknessRange={[100, 400]}
            emissive="#B8860B"
            emissiveIntensity={0.1}
          />
        </mesh>
        
        {/* Distorted Flux Shell - Simulating movement */}
        <mesh scale={1.02}>
          <sphereGeometry args={[0.45, 64, 64]} />
          <MeshDistortMaterial
             color="#FFC107"
             metalness={1.0}
             roughness={0.05}
             transparent
             opacity={0.2}
             distort={0.4}
             speed={1.5}
             side={THREE.DoubleSide}
          />
        </mesh>
      </Float>
    </group>
  );
});

// 2. Wood: Ancient Roots (Waxy SSS + Organic)
const RealWood = React.memo(({ active }: { active: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
      if (groupRef.current) {
          groupRef.current.rotation.y += 0.002;
          const s = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.015;
          groupRef.current.scale.set(s, s, s);
      }
  });

  return (
    <group ref={groupRef}>
      <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.2}>
        {/* Main Root Bundle - Textured Bark */}
        <mesh rotation={[0.2, 0.2, 0]}>
           <torusKnotGeometry args={[0.2, 0.08, 150, 32, 2, 3]} />
           <MeshDistortMaterial 
              color="#1A1008" 
              roughness={1.0} 
              metalness={0.0}
              distort={0.15} 
              speed={0.2} 
              radius={1}
           />
        </mesh>
        
        {/* Lighter Bark Accents */}
        <mesh rotation={[0, 1.2, 1]} scale={1.02}>
           <torusKnotGeometry args={[0.21, 0.03, 100, 16, 3, 5]} />
           <meshStandardMaterial color="#3E2723" roughness={1.0} />
        </mesh>

        {/* Fine Root Hairs - SSS simulation */}
        <mesh rotation={[1.5, 0, 0.5]} scale={1.08}>
           <torusKnotGeometry args={[0.22, 0.01, 80, 16, 5, 4]} />
           <meshPhysicalMaterial 
             color="#5D4037" 
             roughness={0.5}
             transmission={0.2} // Slight light passing through tip
             thickness={0.5}
           />
        </mesh>
      </Float>
    </group>
  );
});

// 3. Water: Hydro-Lens (High Dispersion)
const RealWater = React.memo(({ active }: { active: boolean }) => {
  const config = {
    transmission: 1.0,
    thickness: 4.0, 
    roughness: 0.0,
    ior: 1.33,
    chromaticAberration: 0.15, 
    anisotropy: 0.2,
    distortion: 0.25, 
    distortionScale: 0.5,
    temporalDistortion: 0.2, 
    color: '#E3F2FD',
    attenuationDistance: 1.0,
    attenuationColor: '#FFFFFF',
    resolution: 256, // Optimized from 512 for mobile performance
    samples: 4 // Optimized from 6
  };

  const internalBubbles = useMemo(() => [...Array(4)].map(() => ({
      pos: [(Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3] as [number, number, number],
      scale: 0.03 + Math.random() * 0.06
  })), []);

  return (
    <group>
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
        <group>
            {/* Main Fluid Body */}
            <mesh>
              <sphereGeometry args={[0.48, 64, 64]} />
              <MeshTransmissionMaterial {...config} />
            </mesh>
            
            <MicroBubbles />

            {/* Trapped Air */}
            {internalBubbles.map((b, i) => (
                <mesh key={i} position={b.pos} scale={b.scale}>
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshPhysicalMaterial 
                        color="#FFFFFF" 
                        roughness={0.0} 
                        metalness={0.1} 
                        transmission={0.99} 
                        thickness={0.1}
                        transparent 
                    />
                </mesh>
            ))}
        </group>
      </Float>
    </group>
  );
});

// 4. Fire: Stellar Engine (Blackbody HDR)
const RealFire = React.memo(({ active }: { active: boolean }) => {
  return (
    <group position={[0, -0.05, 0]}>
      <SparkParticles count={60} color="#FFB74D" />
      <PlasmaLoops />
      
      {/* Corona / Haze (Cooler, Redder) */}
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <MeshDistortMaterial
          color="#D84315" 
          emissive="#BF360C"
          emissiveIntensity={0.5}
          roughness={0.9}
          distort={0.6} 
          speed={2.0}   
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Mantle (Active Plasma) */}
      <mesh scale={0.88}>
        <sphereGeometry args={[0.48, 64, 64]} />
        <MeshDistortMaterial
          color="#FF6F00"
          emissive="#FF3D00"
          emissiveIntensity={2.5} 
          distort={0.5}
          speed={4.0}
        />
      </mesh>

      {/* Core (White Hot HDR) */}
      <mesh scale={0.42}>
        <sphereGeometry args={[0.48, 32, 32]} />
        <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
      </mesh>
    </group>
  );
});

// 5. Earth: Fractured Geode (Sheen + Mineral PBR)
const RealEarth = React.memo(({ active }: { active: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if(groupRef.current) {
        // Use properties or setters, do not reassign the Euler object itself
        groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.04;
        groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime()*0.15) * 0.05;
    }
  });

  const chunks = useMemo(() => {
    return [...Array(12)].map(() => ({
      // Store position as array to prevent ReadOnly Vector3 errors in R3F
      pos: [(Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)].map(v => v * (0.55 + Math.random()*0.15)) as [number, number, number],
      rot: [Math.random()*Math.PI, Math.random()*Math.PI, 0] as [number, number, number],
      scale: 0.06 + Math.random() * 0.1,
      color: Math.random() > 0.7 ? "#3E2723" : "#4E342E"
    }));
  }, []);

  return (
    <group ref={groupRef}>
      <DustRing />
      <pointLight distance={0.8} intensity={3.0} color="#FF7043" decay={2} />

      <Float speed={0.4} rotationIntensity={0.3} floatIntensity={0.15}>
          <group>
            {/* Main Rock */}
            <mesh>
              <dodecahedronGeometry args={[0.4, 0]} />
              <meshPhysicalMaterial
                  color="#2D2D2D"
                  roughness={0.9} 
                  metalness={0.1}
                  flatShading 
                  sheen={1.0}
                  sheenColor="#D7CCC8"
                  sheenRoughness={0.5}
              />
            </mesh>
            
            {/* Inner Magma Cracks */}
            <mesh scale={0.92}>
                <dodecahedronGeometry args={[0.4, 0]} />
                <meshBasicMaterial color="#FF5722" toneMapped={false} />
            </mesh>
          </group>
      </Float>

      {/* Orbiting Debris */}
      {chunks.map((c, i) => (
         <mesh key={i} position={c.pos} rotation={c.rot} scale={c.scale}>
            <icosahedronGeometry args={[1, 0]} />
             <meshStandardMaterial color={c.color} roughness={1.0} flatShading />
         </mesh>
      ))}
    </group>
  );
});

// --- Carousel Item ---
interface CarouselItemProps {
  data: ElementData;
  index: number;
  activeIndex: number;
  dragOffset: React.MutableRefObject<number>;
  onSelect: (idx: number) => void;
}

const CarouselItem: React.FC<CarouselItemProps> = React.memo(({ 
  data, 
  index, 
  activeIndex,
  dragOffset,
  onSelect 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const isActive = index === activeIndex;

  useFrame((state, delta) => {
    if (!groupRef.current || !visualRef.current) return;

    // Movement Physics
    const x = groupRef.current.position.x;
    const z = groupRef.current.position.z;
    
    // Use .current from the ref for 60fps instant access
    const offset = index - activeIndex + dragOffset.current;
    
    // Spacing logic
    const targetX = offset * 0.55; 
    const targetZ = Math.abs(offset) * -0.2; 
    // Scale logic - INCREASED SCALE
    const targetScale = isActive ? 0.70 : 0.35; 
    
    // PHYSICS TUNING: Optimized for Extreme Silkiness & Speed
    // High speeds for responsiveness, differentiated for fluid feel
    const posSpeed = 28.0;   // Extreme snap for position
    const scaleSpeed = 20.0; // Fast scale transition
    const rotSpeed = 16.0;   // Slightly softer rotation for 'fluidity'

    // Movement Physics - Use set() to avoid read-only assignment
    // Explicitly using the previous frame values as source
    const newX = damp(targetX, x, posSpeed, delta);
    const newZ = damp(targetZ, z, posSpeed, delta);
    
    // Important: .set() is a method on Vector3, avoiding property assignment error
    groupRef.current.position.set(newX, groupRef.current.position.y, newZ);
    
    // Scale Physics
    const currentScale = visualRef.current.scale.x;
    const newScale = damp(targetScale, currentScale, scaleSpeed, delta);
    visualRef.current.scale.set(newScale, newScale, newScale);
    
    // Rotation
    visualRef.current.rotation.y = damp(-offset * 0.25, visualRef.current.rotation.y, rotSpeed, delta);
  });

  return (
    <group ref={groupRef}>
      {/* Hitbox - Expanded for better touch target */}
      <mesh 
        visible={false} 
        onClick={(e) => { 
            e.stopPropagation(); 
            // Important: Immediate callback triggering transition
            onSelect(index); 
        }}
      >
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshBasicMaterial color="red" wireframe />
      </mesh>

      <group ref={visualRef}>
        {data.type === ElementType.Metal && <RealMetal active={isActive} />}
        {data.type === ElementType.Wood && <RealWood active={isActive} />}
        {data.type === ElementType.Water && <RealWater active={isActive} />}
        {data.type === ElementType.Fire && <RealFire active={isActive} />}
        {data.type === ElementType.Earth && <RealEarth active={isActive} />}
      </group>


    </group>
  );
});

interface SceneProps {
  elements: ElementData[];
  activeIndex: number;
  dragOffset: React.MutableRefObject<number>;
  onSelect: (index: number) => void;
}

const ElementsScene: React.FC<SceneProps> = ({ elements, activeIndex, dragOffset, onSelect }) => {
  const activeEl = elements[activeIndex];

  const getElementDesc = (type: ElementType) => {
    switch (type) {
      case ElementType.Metal: return '锋芒内敛，淬炼成钢。坚毅而纯粹，主掌决断与精度力量。';
      case ElementType.Wood: return '春风化雨，拔节生长。生生不熄的有机元能与原动力。';
      case ElementType.Water: return '随物赋形，百川归海。在低谷中蓄能，在无形中通达一切。';
      case ElementType.Fire: return '星火燎原，炽热燃烧。释放纯粹的热忱、变革力与上升生命力。';
      case ElementType.Earth: return '载物厚德，万物长青。承载引力万物、构筑秩序的能量核心。';
      default: return '';
    }
  };

  return (
    <div className="absolute inset-0 z-0 select-none">
      <Canvas 
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 10], fov: 25 }}
        style={{ touchAction: 'pan-y' }}
        gl={{ 
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping,
          powerPreference: "high-performance"
        }}
      >
        <Preload all />
        <color attach="background" args={['#050505']} />
        
        <ambientLight intensity={0.4} />
        <SpotLight position={[0, 10, 5]} angle={0.4} penumbra={1} intensity={2.5} color="#ffffff" />
        
        {/* Warm & Cool Rims for physical definition */}
        <pointLight position={[-4, 2, -2]} intensity={2.0} color="#FFF8E1" distance={15} /> 
        <pointLight position={[4, -2, -2]} intensity={1.5} color="#E0F2F1" distance={15} /> 
        
        {/* REPLACED NETWORK HDRI WITH PROCEDURAL ENVIRONMENT FOR RELIABILITY */}
        <Environment resolution={512} blur={1}>
          {/* Ceiling Lights Array */}
          <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -9]} scale={[10, 1, 1]} />
          <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -6]} scale={[10, 1, 1]} />
          <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -3]} scale={[10, 1, 1]} />
          <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, 0]} scale={[10, 1, 1]} />
          <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, 3]} scale={[10, 1, 1]} />
          <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, 6]} scale={[10, 1, 1]} />
          <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, 9]} scale={[10, 1, 1]} />
          
          {/* Side Reflections */}
          <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-50, 2, 0]} scale={[100, 2, 1]} />
          <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[50, 2, 0]} scale={[100, 2, 1]} />
          
          {/* Main Key Reflection */}
          <Lightformer form="ring" color="white" intensity={10} scale={2} position={[10, 5, 10]} onUpdate={(self) => self.lookAt(0, 0, 0)} />
        </Environment>

        {/* Removed vertical shift to center the group perfectly */}
        <group position={[0, 0, 0]}>
          {elements.map((el, i) => (
            <CarouselItem 
              key={el.type} 
              data={el} 
              index={i} 
              activeIndex={activeIndex} 
              dragOffset={dragOffset}
              onSelect={onSelect} 
            />
          ))}
        </group>

        <ContactShadows opacity={0.4} scale={18} blur={3.0} far={3.0} color="#000000" />
      </Canvas>

      {/* Exquisite HUD Overlay Panel - Positioned at the TOP, above the 3D elements, Perfect on Mobile */}
      {activeEl && (
        <div className="absolute inset-x-0 top-12 sm:top-16 z-30 pointer-events-none select-none flex flex-col items-center justify-center text-center px-4 animate-scale-in">
           {/* Glow Accent line */}
           <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent mb-2" />
           
           <h3 className={`text-[30px] sm:text-[36px] font-bold font-serif tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r ${getElementColorClass(activeEl.type)} drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]`}>
              {getElementName(activeEl.type)}
           </h3>
           
           <div className="mt-2 text-xs bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
               <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]" />
               <span className="text-[10px] font-mono font-bold text-white/95 tracking-widest leading-none">
                  能量占比 {activeEl.percentage}%
               </span>
           </div>

           <p className="mt-3 text-[11px] sm:text-[12px] text-white/50 leading-relaxed max-w-[280px] sm:max-w-[320px] font-light drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
              {getElementDesc(activeEl.type)}
           </p>
        </div>
      )}
    </div>
  );
};

export default ElementsScene;
