async function loadProjectCard() {
  try {
    const response = await fetch("content/proyecto.md");

    if (!response.ok) {
      console.error("No se encontró content/proyecto.md");
      return;
    }

    const text = await response.text();
    const match = text.match(/---([\s\S]*?)---/);

    if (!match) {
      console.error("El archivo proyecto.md no tiene front matter válido.");
      return;
    }

    const parsed = jsyaml.load(match[1]);
    const container = document.getElementById("project-content");

    if (!container) {
      console.error("No existe #project-content en index.html");
      return;
    }

    const logoGroups = parsed.logoGroups || [];

    const groupsHTML = logoGroups.map(group => {
      const logosHTML = (group.logos || []).map(item => `
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" title="${item.name}">
          <img src="${item.image}" alt="${item.name}">
        </a>
      `).join("");

      return `
        <div class="logo-group">
          <p class="logo-group-title">${group.title}</p>
          <div class="logo-row">
            ${logosHTML}
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="project-info">
        <p class="project-text">${parsed.projectText || ""}</p>
        ${groupsHTML}
      </div>
    `;

  } catch (error) {
    console.error("Error cargando la tarjeta del proyecto:", error);
  }
}

loadProjectCard();