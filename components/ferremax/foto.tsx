import type { FotoDocumento, FotoProducto } from "@/lib/tipos"
import { cn } from "@/lib/utils"

// Las "fotos" de la demo. No son imágenes: se dibujan a partir de lo que dice cada foto en lib/tipos.ts,
// con colores fijos (una foto no cambia con el tema). La lectura de la IA sale de los mismos datos.

const POSICIONES = [
  [14, 120], [64, 120], [114, 120], [164, 120],
  [24, 84], [74, 84], [124, 84], [174, 84],
]

/** Cajas entregadas en el sitio. Si la foto no es nítida, sale desenfocada. */
export function FotoDelProducto({ foto, className }: { foto: FotoProducto; className?: string }) {
  const cajas = POSICIONES.slice(0, Math.max(1, Math.min(foto.bultos, POSICIONES.length)))
  return (
    <svg
      viewBox="0 0 240 180"
      role="img"
      aria-label={`Foto del producto entregado: ${foto.bultos} bultos${foto.nitida ? "" : ", desenfocada"}`}
      className={cn("block h-auto w-full bg-[#cfcac0]", !foto.nitida && "blur-[3px]", className)}
    >
      <rect width="240" height="110" fill="#cfcac0" />
      <rect y="110" width="240" height="70" fill="#8f897e" />
      <rect y="108" width="240" height="4" fill="#767066" />
      {cajas.map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="48" height="40" fill="#c79a5b" stroke="#8a6330" strokeWidth="1.5" />
          <rect x={x + 20} y={y} width="8" height="40" fill="#e3c590" />
          <rect x={x + 4} y={y + 26} width="14" height="9" fill="#f5f1e6" />
        </g>
      ))}
    </svg>
  )
}

/** Divide el texto escrito a mano en renglones cortos para que quepa en el papel. */
function renglones(texto: string, max = 26) {
  const palabras = texto.split(" ")
  const filas: string[] = []
  for (const p of palabras) {
    const ultima = filas[filas.length - 1]
    if (ultima && (ultima + " " + p).length <= max) filas[filas.length - 1] = ultima + " " + p
    else filas.push(p)
  }
  return filas.slice(0, 3)
}

const LETRA_A_MANO = '"Segoe Script", "Brush Script MT", "Bradley Hand", cursive'

/** La remisión que firma quien recibe. Lo que no se ve en la foto, no se dibuja. */
export function FotoDelDocumento({ foto, className }: { foto: FotoDocumento; className?: string }) {
  const resumen = [
    foto.remision ? `remisión ${foto.remision}` : "sin número de remisión a la vista",
    foto.nombre ? `nombre ${foto.nombre}` : "sin nombre",
    foto.firma ? "firmado" : "sin firma",
    foto.novedad ? "con novedad escrita" : null,
    foto.nitida ? null : "desenfocada",
  ]
    .filter(Boolean)
    .join(", ")
  return (
    <svg
      viewBox="0 0 240 300"
      role="img"
      aria-label={`Foto del documento de entrega: ${resumen}`}
      className={cn("block h-auto w-full bg-[#aaa59a]", !foto.nitida && "blur-[3px]", className)}
    >
      <rect width="240" height="300" fill="#aaa59a" />
      <polygon points="22,10 220,6 226,292 16,296" fill="#fdfcf8" stroke="#8f8a7f" strokeWidth="1" />
      <text x="34" y="32" fontSize="10" fontWeight="700" fill="#141413" fontFamily="Arial, sans-serif">
        FERREMAX S.A.S.
      </text>
      <text x="34" y="46" fontSize="8" fill="#5c5b55" fontFamily="Arial, sans-serif">
        Remisión de entrega
      </text>
      {foto.remision ? (
        <text x="130" y="40" fontSize="10" fontWeight="700" fill="#141413" fontFamily="Consolas, monospace">
          {foto.remision}
        </text>
      ) : (
        <rect x="128" y="30" width="80" height="12" fill="#e6e2d6" />
      )}
      <line x1="30" y1="54" x2="212" y2="54" stroke="#141413" strokeWidth="1.2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="34" y={68 + i * 22} width={90 - ((i * 13) % 30)} height="6" fill="#cfcabd" />
          <rect x="176" y={68 + i * 22} width="26" height="6" fill="#cfcabd" />
        </g>
      ))}
      <line x1="30" y1="182" x2="212" y2="182" stroke="#bdb8ac" strokeWidth="1" />

      <text x="34" y="200" fontSize="8" fill="#5c5b55" fontFamily="Arial, sans-serif">
        Recibe:
      </text>
      <line x1="72" y1="202" x2="208" y2="202" stroke="#8f8a7f" strokeWidth="0.8" />
      {foto.nombre && (
        <text x="76" y="198" fontSize="15" fill="#1d3a8a" fontFamily={LETRA_A_MANO} fontStyle="italic">
          {foto.nombre}
        </text>
      )}

      <text x="34" y="228" fontSize="8" fill="#5c5b55" fontFamily="Arial, sans-serif">
        Firma:
      </text>
      <line x1="72" y1="232" x2="208" y2="232" stroke="#8f8a7f" strokeWidth="0.8" />
      {foto.firma && (
        <path
          d="M80 226 C 90 206, 100 244, 112 220 S 130 212, 138 228 S 160 236, 170 214 L 196 226"
          fill="none"
          stroke="#1d3a8a"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}

      <text x="34" y="256" fontSize="8" fill="#5c5b55" fontFamily="Arial, sans-serif">
        Novedad:
      </text>
      {foto.novedad &&
        renglones(foto.novedad).map((fila, i) => (
          <text key={i} x="76" y={256 + i * 13} fontSize="11" fill="#9b1c1c" fontFamily={LETRA_A_MANO} fontStyle="italic">
            {fila}
          </text>
        ))}
    </svg>
  )
}
