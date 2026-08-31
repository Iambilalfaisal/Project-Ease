import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stage, OrbitControls, useGLTF } from "@react-three/drei";

interface Model3DPreviewProps {
    modelUrl: string;
    posterUrl?: string;
}

function GltfModel({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

/** Groundwork per the architecture guide's §11 — proves the react-three-fiber +
 * drei pattern (Stage lighting, OrbitControls, useGLTF with suspense) but isn't
 * attached to any screen yet. Import this with React.lazy() at the call site so
 * the ~3D bundle only loads on the page that actually uses it. Ship a poster
 * image via posterUrl until the model loads — never a blank canvas. */
export default function Model3DPreview({ modelUrl, posterUrl }: Model3DPreviewProps) {
    return (
        <Canvas camera={{ position: [3, 3, 3], fov: 45 }}>
            <Suspense
                fallback={
                    posterUrl ? (
                        <mesh>
                            <planeGeometry args={[1, 1]} />
                        </mesh>
                    ) : null
                }
            >
                <Stage environment="city">
                    <GltfModel url={modelUrl} />
                </Stage>
                <OrbitControls enablePan={false} />
            </Suspense>
        </Canvas>
    );
}
