async function loadContent() {
  const response = await fetch("./content/inicio.json");
  const data = await response.json();

  document.getElementById("hero-title").textContent = data.title || "";
  document.getElementById("hero-description").textContent = data.description || "";
}

loadContent();