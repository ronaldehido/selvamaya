async function loadContent() {
  try {

    const basePath =
      window.location.hostname.includes("github.io")
        ? "/selvamaya/rewild"
        : "";

    const response = await fetch(
      `${basePath}/content/inicio.md`
    );

    if (!response.ok) {
      throw new Error(
        `No se pudo cargar inicio.md (${response.status})`
      );
    }

    const text = await response.text();

    const match = text.match(/---([\s\S]*?)---/);

    if (!match) {
      throw new Error("Front matter no encontrado");
    }

    const metadata = jsyaml.load(match[1]);

    const titleEl = document.getElementById("hero-title");
    const descEl = document.getElementById("hero-description");

    if (titleEl) {
      titleEl.textContent = metadata.title || "";
    }

    if (descEl) {
      descEl.textContent =
        metadata.description || "";
    }

  } catch (error) {
    console.error(
      "Error cargando inicio.md:",
      error
    );
  }
}

loadContent();