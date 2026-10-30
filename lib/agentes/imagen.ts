// Convierte una foto de la demo (un SVG dibujado en pantalla) en un PNG, para mandársela a Claude como imagen.
// La foto desenfocada se desenfoca también en el PNG: Claude ve lo mismo que la persona. Solo corre en el navegador.

export async function svgAPNG(svg: SVGSVGElement, borrosa: boolean, escala = 3): Promise<string> {
  const { width, height } = svg.viewBox.baseVal
  const [w, h] = [width * escala, height * escala]
  const copia = svg.cloneNode(true) as SVGSVGElement
  copia.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  copia.setAttribute("width", String(w))
  copia.setAttribute("height", String(h))
  copia.removeAttribute("class")
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: "image/svg+xml" }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const lienzo = document.createElement("canvas")
    lienzo.width = w
    lienzo.height = h
    const ctx = lienzo.getContext("2d")!
    ctx.fillStyle = "#aaa59a"
    ctx.fillRect(0, 0, w, h)
    if (borrosa) ctx.filter = `blur(${3 * escala}px)`
    ctx.drawImage(img, 0, 0, w, h)
    return lienzo.toDataURL("image/png").split(",")[1]
  } finally {
    URL.revokeObjectURL(url)
  }
}
