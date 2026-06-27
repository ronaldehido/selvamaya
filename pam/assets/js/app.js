const DATA = {
  activity: 'data/activity_daily.csv',
  top: 'data/top_species.csv',
  detections: 'data/example_detections.csv'
};

const fallbackImg = 'assets/img/species-placeholder.svg';

async function loadCSV(url){
  const txt = await fetch(url).then(r => {
    if(!r.ok) throw new Error(`No se pudo cargar ${url}`);
    return r.text();
  });
  return PapaParse(txt);
}

function PapaParse(text){
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g,'').trim()) || [];
    return Object.fromEntries(headers.map((h,i)=>[h, values[i] ?? '']));
  });
}

async function getINatPhoto(scientificName){
  if(!scientificName) return fallbackImg;
  const key = `inat_${scientificName}`;
  const cached = localStorage.getItem(key);
  if(cached) return cached;
  try{
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=1`;
    const data = await fetch(url).then(r=>r.json());
    const photo = data.results?.[0]?.default_photo?.medium_url || fallbackImg;
    localStorage.setItem(key, photo);
    return photo;
  }catch(e){ return fallbackImg; }
}

async function renderActivity(){
  const rows = await loadCSV(DATA.activity);
  const target = document.querySelector('#activityCards');
  const groups = [
    {
      type: 'mammal',
      label: 'Primates',
      defaultSpecies: 'Ateles geoffroyi'
    },
    {
      type: 'bird',
      label: 'Aves',
      defaultSpecies: 'Trogon caligatus'
    }
  ];
  target.innerHTML = '';
  for(const group of groups){
    const species = [...new Set(
      rows
        .filter(r => r.type === group.type)
        .map(r => r.species_scientific)
    )];
    const cardId = `activity-${group.type}`;
    target.insertAdjacentHTML('beforeend', `
      <article class="activity-card">
        <p class="eyebrow">${group.label}</p>
        <select id="${cardId}-select">
          ${species.map(sp => `
            <option value="${sp}" ${sp === group.defaultSpecies ? 'selected' : ''}>
              ${sp}
            </option>
          `).join('')}
        </select>
        <div id="${cardId}-chart" class="circular-chart"></div>
        <div id="${cardId}-tooltip" class="chart-tooltip"></div>
      </article>
    `);
    const select = document.querySelector(`#${cardId}-select`);
    async function updateChart(){
      const selectedSpecies = select.value;
      const speciesRows = rows.filter(r =>
        r.type === group.type &&
        r.species_scientific === selectedSpecies
      );
      const commonName = speciesRows[0]?.species_common || selectedSpecies;
      const photo = await getINatPhoto(selectedSpecies);
      drawCircularActivityChart({
        container: `#${cardId}-chart`,
        tooltip: `#${cardId}-tooltip`,
        rows: speciesRows,
        commonName,
        scientificName: selectedSpecies,
        imageUrl: photo
      });
    }
    select.addEventListener('change', updateChart);
    updateChart();
  }
}

async function renderTopSpecies(){
  const rows = (await loadCSV(DATA.top)).sort((a,b)=>Number(b.detections)-Number(a.detections)).slice(0,12);
  const max = Math.max(...rows.map(r=>Number(r.detections)));
  const target = document.querySelector('#topSpecies');
  for(const r of rows){
    const img = r.photo_url || await getINatPhoto(r.species_scientific);
    const width = (Number(r.detections)/max)*100;
    target.insertAdjacentHTML('beforeend', `
      <article class="species-row">
        <img src="${img}" alt="${r.species_common}" loading="lazy" onerror="this.src='${fallbackImg}'">
        <div><strong>${r.species_common}</strong><br><span class="meta"><em>${r.species_scientific}</em></span></div>
        <div class="bar" aria-label="${r.detections} detecciones"><span style="width:${width}%"></span></div>
        <strong class="count">${r.detections}</strong>
      </article>`);
  }
}

async function renderDetections(){
  const rows = (await loadCSV(DATA.detections)).slice(0,6);
  const target = document.querySelector('#detectionCards');
  for(const r of rows){
    const img = r.photo_url || await getINatPhoto(r.species_scientific);
    target.insertAdjacentHTML('beforeend', `
      <article class="detection-card">
        <img src="${img}" alt="${r.species_common}" loading="lazy" onerror="this.src='${fallbackImg}'">
        <div class="body">
          <h3>${r.species_common}</h3>
          <p class="meta"><em>${r.species_scientific}</em></p>
          <p class="meta">${r.date} · ${r.time}<br>${r.site_name}</p>
          <span class="score">BirdNET: ${r.score}</span>
          <audio controls preload="none" src="${r.audio_url}"></audio>
        </div>
      </article>`);
  }
}




function drawCircularActivityChart({container, tooltip, rows, commonName, scientificName, imageUrl}){
  const width = 520;
  const height = 560;
  const cx = width / 2;
  const cy = 245;
  const outerRadius = 170;
  const innerRadius = 118;
  const photoRadius = 80;
  const intervalHours = 1;
  const intervalsPerDay = 24;
  d3.select(container).html('');
  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%');
  const tooltipBox = d3.select(tooltip);
  const grouped = Array.from({length: intervalsPerDay}, (_, hour) => ({
    hour,
    detections: 0
  }));
  rows.forEach(r => {
    const hour = Number(r.hour);
    const detections = Number(r.detections);
    if(!isNaN(hour) && hour >= 0 && hour <= 23){
      grouped[hour].detections += isNaN(detections) ? 0 : detections;
    }
  });
  const maxValue = d3.max(grouped, d => d.detections) || 1;
  const pie = d3
    .pie()
    .value(1)
    .sort(null);
  const baseArc = d3
    .arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);
  const activeArc = d3
    .arc()
    .innerRadius(innerRadius)
    .outerRadius(d => {
      const value = d.data.detections / maxValue;
      return outerRadius + value * 34;
    });
  const g = svg
    .append('g')
    .attr('transform', `translate(${cx}, ${cy})`);
  g.selectAll('.base')
    .data(pie(grouped))
    .join('path')
    .attr('d', baseArc)
    .attr('fill', '#d6dde2')
    .attr('stroke', '#aeb7bd')
    .attr('stroke-width', 0.8);
  g.selectAll('.segment')
    .data(pie(grouped))
    .join('path')
    .attr('d', activeArc)
    .attr('fill', d => d.data.detections > 0 ? '#8b6cff' : 'transparent')
    .attr('stroke', d => d.data.detections > 0 ? '#ffffff' : 'transparent')
    .attr('stroke-width', 1)
    .attr('opacity', d => d.data.detections > 0 ? 0.85 : 0)
    .on('mousemove', function(event, d){
      d3.select(this)
        .attr('fill', '#5b3df5')
        .attr('opacity', 1);
      tooltipBox
        .style('opacity', 1)
        .style('left', `${event.offsetX + 12}px`)
        .style('top', `${event.offsetY + 12}px`)
        .html(`
          <strong>Hora:</strong> ${String(d.data.hour).padStart(2,'0')}:00 - ${String((d.data.hour + 1) % 24).padStart(2,'0')}:00<br>
          <strong>Detecciones:</strong> ${d.data.detections}
        `);
    })
    .on('mouseleave', function(event, d){
      d3.select(this)
        .attr('fill', d.data.detections > 0 ? '#8b6cff' : 'transparent')
        .attr('opacity', d.data.detections > 0 ? 0.85 : 0);
      tooltipBox.style('opacity', 0);
    });
  g.append('circle')
    .attr('r', photoRadius + 14)
    .attr('fill', 'none')
    .attr('stroke', '#8b6cff')
    .attr('stroke-width', 10);
  g.append('circle')
    .attr('r', photoRadius + 25)
    .attr('fill', 'none')
    .attr('stroke', '#eef7fa')
    .attr('stroke-width', 12);
  const clipId = `photoClip-${scientificName.replace(/\s+/g,'-').replace(/[^\w-]/g,'')}`;
  const defs = svg.append('defs');
  defs.append('clipPath')
    .attr('id', clipId)
    .append('circle')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', photoRadius);
  svg.append('image')
    .attr('href', imageUrl || fallbackImg)
    .attr('x', cx - photoRadius)
    .attr('y', cy - photoRadius)
    .attr('width', photoRadius * 2)
    .attr('height', photoRadius * 2)
    .attr('clip-path', `url(#${clipId})`)
    .attr('preserveAspectRatio', 'xMidYMid slice');
  svg.append('text')
    .attr('x', cx)
    .attr('y', cy - outerRadius - 25)
    .attr('text-anchor', 'middle')
    .attr('font-size', 16)
    .attr('fill', '#5f6b73')
    .text('00:00');
  svg.append('text')
    .attr('x', cx + outerRadius + 30)
    .attr('y', cy + 5)
    .attr('font-size', 16)
    .attr('fill', '#5f6b73')
    .text('06:00');
  svg.append('text')
    .attr('x', cx)
    .attr('y', cy + outerRadius + 42)
    .attr('text-anchor', 'middle')
    .attr('font-size', 16)
    .attr('fill', '#5f6b73')
    .text('12:00');
  svg.append('text')
    .attr('x', cx - outerRadius - 72)
    .attr('y', cy + 5)
    .attr('font-size', 16)
    .attr('fill', '#5f6b73')
    .text('18:00');
  svg.append('text')
    .attr('x', cx)
    .attr('y', height - 50)
    .attr('text-anchor', 'middle')
    .attr('font-size', 19)
    .attr('font-weight', 800)
    .attr('fill', '#213529')
    .text(commonName);
  svg.append('text')
    .attr('x', cx)
    .attr('y', height - 25)
    .attr('text-anchor', 'middle')
    .attr('font-size', 14)
    .attr('font-style', 'italic')
    .attr('fill', '#6b7280')
    .text(scientificName);
}

renderActivity(); renderTopSpecies(); renderDetections();