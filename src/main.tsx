import React from "react"
import { createRoot } from "react-dom/client"
import { Tiles } from "@/components/ui/tiles"
import "./tailwind.css"

function TilesBackground() {
  return (
    <Tiles
      rows={24}
      cols={14}
      tileSize="md"
      className="absolute inset-0 opacity-35 [--tile:#f7891d]"
      tileClassName="border-[#d8cec1]/50"
    />
  )
}

const target = document.getElementById("tiles-background")
if (target) {
  createRoot(target).render(
    <React.StrictMode>
      <TilesBackground />
    </React.StrictMode>,
  )
}
