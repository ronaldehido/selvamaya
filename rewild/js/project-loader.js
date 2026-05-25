async function loadProjectCard() {
  const response = await fetch("./content/proyecto.json");
  const data = await response.json();

  const container = document.getElementById("project-content");
  if (!container) return;

  const groupsHTML = data.logoGroups.map(group => {
    const logosHTML = group.logos.map(item => `
      <a href="${item.link}" target="_blank" rel="noopener noreferrer" title="${item.name}">
        <img src="${item.image}" alt="${item.name}">
      </a>
    `).join("");

    return `
      <div class="logo-group">
        <p class="logo-group-title">${group.title}</p>
        <div class="logo-row">${logosHTML}</div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="project-info">
      <p class="project-text">${data.projectText}</p>
      ${groupsHTML}
    </div>
  `;
}

loadProjectCard();