async function loadContent() {
  try {
    const response = await fetch("content/inicio.md");
    const text = await response.text();

    const frontmatterRegex = /---([\s\S]*?)---/;
    const match = text.match(frontmatterRegex);

    let metadata = {};
    let markdownBody = text;

    if (match) {
      const frontMatter = match[1];

      markdownBody = text.replace(frontmatterRegex, "").trim();

      frontMatter.split("\n").forEach(line => {
        const parts = line.split(":");

        if (parts.length >= 2) {
          const key = parts[0].trim();

          const value = parts
            .slice(1)
            .join(":")
            .trim()
            .replace(/^["']|["']$/g, "");

          metadata[key] = value;
        }
      });
    }

    document.getElementById("hero-title").textContent =
      metadata.title || "";

    document.getElementById("hero-description").textContent =
      metadata.description || "";

  } catch (error) {
    console.error("Error cargando contenido:", error);
  }
}

loadContent();