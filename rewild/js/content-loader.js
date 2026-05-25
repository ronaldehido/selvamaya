async function loadContent() {
  try {
    const response = await fetch("content/inicio.md");
    const text = await response.text();

    const match = text.match(/^---\s*([\s\S]*?)\s*---/);

    if (!match) return;

    const metadata = jsyaml.load(match[1]);

    document.getElementById("hero-title").textContent =
      metadata.title || "";

    document.getElementById("hero-description").textContent =
      metadata.description || "";

  } catch (error) {
    console.error("Error cargando contenido:", error);
  }
}

loadContent();