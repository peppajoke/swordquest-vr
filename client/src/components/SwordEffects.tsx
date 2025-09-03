import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRGame } from '../lib/stores/useVRGame';

interface ParticleEffect {
  id: string;
  position: THREE.Vector3;
  life: number;
  maxLife: number;
}

export default function SwordEffects() {
  const { hitEffects } = useVRGame();
  const particlesRef = useRef<THREE.Points>(null);
  const particleSystem = useRef<ParticleEffect[]>([]);

  const geometry = new THREE.BufferGeometry();
  const material = new THREE.PointsMaterial({
    color: 0xff6b35,
    size: 0.05,
    transparent: true,
    opacity: 0.8
  });

  useEffect(() => {
    // Initialize particle geometry
    const positions = new Float32Array(100 * 3); // Max 100 particles
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }, [geometry]);

  useFrame((state, delta) => {
    // Add new effects
    hitEffects.forEach(effect => {
      if (particleSystem.current.length < 100) {
        for (let i = 0; i < 10; i++) {
          particleSystem.current.push({
            id: `${effect.id}_${i}`,
            position: new THREE.Vector3(
              effect.position.x + (Math.random() - 0.5) * 0.2,
              effect.position.y + (Math.random() - 0.5) * 0.2,
              effect.position.z + (Math.random() - 0.5) * 0.2
            ),
            life: 1.0,
            maxLife: 1.0
          });
        }
      }
    });

    // Update particles
    particleSystem.current = particleSystem.current.filter(particle => {
      particle.life -= delta * 2;
      particle.position.y += delta * 0.5; // Rise up
      return particle.life > 0;
    });

    // Update geometry
    const positions = geometry.attributes.position.array as Float32Array;
    let index = 0;
    particleSystem.current.forEach(particle => {
      if (index < 100 * 3) {
        positions[index++] = particle.position.x;
        positions[index++] = particle.position.y;
        positions[index++] = particle.position.z;
      }
    });

    // Fill remaining positions with zeros
    while (index < 100 * 3) {
      positions[index++] = 0;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.setDrawRange(0, Math.min(particleSystem.current.length, 100));

    // Update material opacity based on particle life
    if (particleSystem.current.length > 0) {
      const avgLife = particleSystem.current.reduce((sum, p) => sum + p.life / p.maxLife, 0) / particleSystem.current.length;
      material.opacity = avgLife;
    }
  });

  return (
    <points ref={particlesRef} geometry={geometry} material={material} />
  );
}
