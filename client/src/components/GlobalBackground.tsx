import { MeshGradient } from "@paper-design/shaders-react"
import { useEffect, useState } from "react"

export function GlobalBackground() {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [mounted, setMounted] = useState(false)

  const colors = ["hsl(216, 90%, 27%)", "hsl(243, 68%, 36%)", "hsl(205, 91%, 64%)", "hsl(211, 61%, 57%)"]

  useEffect(() => {
    setMounted(true)
    
    let timeoutId: NodeJS.Timeout
    const update = () => {
      clearTimeout(timeoutId)
      // Debounce de 150ms pour réduire les recalculs fréquents
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }, 150)
    }
    
    update()
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("resize", update)
      clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="fixed inset-0 w-screen h-screen z-0 pointer-events-none">
      {mounted && (
        <MeshGradient
          width={dimensions.width}
          height={dimensions.height}
          colors={colors}
          distortion={0.5}
          swirl={0.05}
          grainMixer={0}
          grainOverlay={0}
          speed={0.5}
          offsetX={0}
          offsetY={0}
          scale={1}
          rotation={0}
        />
      )}
    </div>
  )
}

