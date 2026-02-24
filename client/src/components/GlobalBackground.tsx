import { MeshGradient } from "@paper-design/shaders-react"
import { useEffect, useState } from "react"

export function GlobalBackground() {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const colors = ["hsl(216, 90%, 27%)", "hsl(243, 68%, 36%)", "hsl(205, 91%, 64%)", "hsl(211, 61%, 57%)"]

  useEffect(() => {
    setMounted(true)
    
    // Détecter si on est sur mobile pour désactiver MeshGradient
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    
    let timeoutId: NodeJS.Timeout
    const update = () => {
      clearTimeout(timeoutId)
      // Debounce de 300ms pour réduire les recalculs fréquents (augmenté de 150ms)
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        })
        checkMobile()
      }, 300)
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
      {mounted && !isMobile && (
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
      {mounted && isMobile && (
        <div className="w-full h-full bg-gradient-to-br from-[hsl(216,90%,27%)] via-[hsl(243,68%,36%)] to-[hsl(205,91%,64%)]" />
      )}
    </div>
  )
}

