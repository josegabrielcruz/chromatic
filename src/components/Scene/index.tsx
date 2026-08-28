import { useMemo, useEffect, useRef, useCallback } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { ArtworkPoint } from '../../types'
import './Scene.css'

// ── Point cloud mesh ──────────────────────────────────────────────────────────

interface PointCloudProps {
  artworks:      ArtworkPoint[]
  onHoverChange: (index: number | null) => void
}

function PointCloud({ artworks, onHoverChange }: PointCloudProps) {
  // Build geometry with ALL attributes in one pass so the VAO is fully
  // bound before the first render — no deferred setAttribute calls.
  const geometry = useMemo(() => {
    const n         = artworks.length
    const positions = new Float32Array(n * 3)
    const colors    = new Float32Array(n * 3)
    const sizes     = new Float32Array(n).fill(1.0)

    artworks.forEach((a, i) => {
      positions[i * 3]     = a.position[0]
      positions[i * 3 + 1] = a.position[1]
      positions[i * 3 + 2] = a.position[2]

      const c = new THREE.Color()
      c.setHSL(a.color.h / 360, a.color.s / 100, a.color.l / 100)
      colors[i * 3]     = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3))
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1))
    return geo
  }, [artworks])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexColors: true,
    transparent:  true,
    depthWrite:   false,
    uniforms: {
      uBaseSize:   { value: 5.0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float uBaseSize;
      uniform float uPixelRatio;

      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        float depth = max(1.0, -mvPos.z);
        float px    = uBaseSize * uPixelRatio * size * (10.0 / depth);
        gl_PointSize = clamp(px, 1.0, 32.0);
        gl_Position  = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - 0.5);
        if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
        gl_FragColor = vec4(vColor, alpha * 0.88);
      }
    `,
  }), [])

  // ── Hover highlight — bypasses React state entirely ───────────────────────
  //
  // Problem with useEffect([hoveredIndex]): every pointer move triggers
  // setHoveredIndex → React re-render → effect → needsUpdate = true →
  // Three.js deletes + recreates the GPU buffer. At 60 events/sec this
  // creates a GPU buffer alloc/free storm.
  //
  // Fix: track previous index in a ref, mutate only the two changed points
  // directly in the event handler, set needsUpdate once. React state is only
  // updated when the artwork identity actually changes (for the InfoPanel).

  const prevHoveredRef = useRef<number | null>(null)
  const geoRef         = useRef(geometry)
  geoRef.current = geometry   // always points to current geometry

  const updateSizeAttr = useCallback((prev: number | null, next: number | null) => {
    const attr = geoRef.current.attributes.size as THREE.BufferAttribute
    const arr  = attr.array as Float32Array
    if (prev !== null && prev < arr.length) arr[prev] = 1.0
    if (next !== null && next < arr.length) arr[next] = 3.0
    attr.needsUpdate = true   // one version bump → one GPU upload next frame
  }, [])

  // Dispose GPU resources on change / unmount
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  return (
    <points
      geometry={geometry}
      material={material}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        const idx = e.index
        if (idx !== undefined && idx !== prevHoveredRef.current) {
          updateSizeAttr(prevHoveredRef.current, idx)
          prevHoveredRef.current = idx
          onHoverChange(idx)   // React state only on artwork change
        }
      }}
      onPointerLeave={() => {
        if (prevHoveredRef.current !== null) {
          updateSizeAttr(prevHoveredRef.current, null)
          prevHoveredRef.current = null
          onHoverChange(null)
        }
      }}
    />
  )
}

// ── Scene ─────────────────────────────────────────────────────────────────────

interface SceneProps {
  artworks:      ArtworkPoint[]
  onHoverChange: (index: number | null) => void
}

export function Scene({ artworks, onHoverChange }: SceneProps) {
  return (
    <div className="scene">
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        raycaster={{ params: { Points: { threshold: 0.08 } } }}
        onCreated={({ camera }) => {
          camera.position.set(5, 3, 7)
          camera.lookAt(0, 0, 0)
        }}
      >
        <color attach="background" args={['#0b0a09']} />

        {artworks.length > 0 && (
          <PointCloud
            artworks={artworks}
            onHoverChange={onHoverChange}
          />
        )}

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          autoRotate
          autoRotateSpeed={0.25}
          enablePan={false}
          minDistance={3}
          maxDistance={18}
          minPolarAngle={Math.PI * 0.15}
          maxPolarAngle={Math.PI * 0.85}
        />
      </Canvas>
    </div>
  )
}
