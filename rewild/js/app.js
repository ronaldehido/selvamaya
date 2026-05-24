const csvPath = "data/detections_spimon.csv";
const imagePath = "img/mono-arana.jpg";

const width = 520;
const height = 620;
const cx = width / 2;
const cy = 230;

const outerRadius = 170;
const innerRadius = 118;
const photoRadius = 80;

const intervalMinutes = 30;
const intervalsPerDay = 24 * 60 / intervalMinutes;

const svg = d3
  .select("#circular-chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("width", "100%");

const tooltip = d3.select("#tooltip");

d3.csv(csvPath).then(data => {
  const clean = data
    .map(d => ({
      site: d.Site,
      confidence: +d.Confidence,
      date: d.Date,
      year: +d.Year,
      month: +d.Month,
      day: +d.Day,
      hour: +d.HH,
      minute: +d.MM
    }))
    .filter(d =>
      !isNaN(d.hour) &&
      !isNaN(d.minute) &&
      d.hour >= 0 &&
      d.hour <= 23 &&
      d.minute >= 0 &&
      d.minute <= 59
    );

  drawCircularChart(clean);
  drawTimeline(clean);
  drawHeatmap(clean);
});

function getMaxDetectionsByInterval(data) {
  const grouped = Array.from({ length: intervalsPerDay }, (_, i) => ({
    index: i,
    startMinute: i * intervalMinutes,
    maxDailyCount: 0
  }));

  const countsByDayAndInterval = {};

  data.forEach(d => {
    const dateKey = d.date || `${d.year}-${d.month}-${d.day}`;
    const totalMinutes = d.hour * 60 + d.minute;
    const intervalIndex = Math.floor(totalMinutes / intervalMinutes);

    const key = `${dateKey}_${intervalIndex}`;

    if (!countsByDayAndInterval[key]) {
      countsByDayAndInterval[key] = 0;
    }

    countsByDayAndInterval[key] += 1;
  });

  Object.entries(countsByDayAndInterval).forEach(([key, count]) => {
    const intervalIndex = Number(key.split("_").pop());

    if (count > grouped[intervalIndex].maxDailyCount) {
      grouped[intervalIndex].maxDailyCount = count;
    }
  });

  return grouped;
}

function drawCircularChart(data) {
  const grouped = getMaxDetectionsByInterval(data);
  const maxValue = d3.max(grouped, d => d.maxDailyCount) || 1;

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
      const value = d.data.maxDailyCount / maxValue;
      return outerRadius + value * 28;
    });

  const g = svg
    .append("g")
    .attr("transform", `translate(${cx}, ${cy})`);

  g.selectAll(".base")
    .data(pie(grouped))
    .join("path")
    .attr("class", "base")
    .attr("d", baseArc)
    .attr("fill", "#d6dde2")
    .attr("stroke", "#aeb7bd")
    .attr("stroke-width", 0.8);

  g.selectAll(".segment")
    .data(pie(grouped))
    .join("path")
    .attr("class", "segment")
    .attr("d", activeArc)
    .attr("fill", d => d.data.maxDailyCount > 0 ? "#8b6cff" : "transparent")
    .attr("stroke", d => d.data.maxDailyCount > 0 ? "#ffffff" : "transparent")
    .attr("stroke-width", 1)
    .attr("opacity", d => d.data.maxDailyCount > 0 ? 0.85 : 0)
    .on("mousemove", function(event, d) {
      d3.select(this)
        .attr("fill", "#5b3df5")
        .attr("opacity", 1);

      const start = minutesToTime(d.data.startMinute);
      const end = minutesToTime(d.data.startMinute + intervalMinutes);

      tooltip
        .style("opacity", 1)
        .style("left", `${event.offsetX}px`)
        .style("top", `${event.offsetY}px`)
        .html(`
          <strong>Horario:</strong> ${start} - ${end}<br>
          <strong>Detecciones máximas por día:</strong> ${d.data.maxDailyCount}
        `);
    })
    .on("mouseleave", function(event, d) {
      d3.select(this)
        .attr("fill", d.data.maxDailyCount > 0 ? "#8b6cff" : "transparent")
        .attr("opacity", d.data.maxDailyCount > 0 ? 0.85 : 0);

      tooltip.style("opacity", 0);
    });

  g.append("circle")
    .attr("r", photoRadius + 14)
    .attr("fill", "none")
    .attr("stroke", "#8b6cff")
    .attr("stroke-width", 10);

  g.append("circle")
    .attr("r", photoRadius + 25)
    .attr("fill", "none")
    .attr("stroke", "#eef7fa")
    .attr("stroke-width", 12);

  const defs = svg.append("defs");

  defs.append("clipPath")
    .attr("id", "photoClip")
    .append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", photoRadius);

  svg.append("image")
    .attr("href", imagePath)
    .attr("x", cx - photoRadius)
    .attr("y", cy - photoRadius)
    .attr("width", photoRadius * 2)
    .attr("height", photoRadius * 2)
    .attr("clip-path", "url(#photoClip)")
    .attr("preserveAspectRatio", "xMidYMid slice");

  svg.append("text")
    .attr("x", cx)
    .attr("y", cy - outerRadius - 20)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .attr("fill", "#6b7280")
    .text("00:00");

  svg.append("text")
    .attr("x", cx + outerRadius + 28)
    .attr("y", cy + 5)
    .attr("font-size", 14)
    .attr("fill", "#6b7280")
    .text("06:00");

  svg.append("text")
    .attr("x", cx)
    .attr("y", cy + outerRadius + 34)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .attr("fill", "#6b7280")
    .text("12:00");

  svg.append("text")
    .attr("x", cx - outerRadius - 65)
    .attr("y", cy + 5)
    .attr("font-size", 14)
    .attr("fill", "#6b7280")
    .text("18:00");
}

function drawTimeline(data) {
  const grouped = getMaxDetectionsByInterval(data);

  const timelineY = 520;
  const marginX = 55;
  const chartWidth = width - marginX * 2;

  const x = d3
    .scaleLinear()
    .domain([0, 1440])
    .range([marginX, marginX + chartWidth]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(grouped, d => d.maxDailyCount) || 1])
    .range([timelineY, timelineY - 90]);

  const line = d3
    .line()
    .x(d => x(d.startMinute))
    .y(d => y(d.maxDailyCount))
    .curve(d3.curveMonotoneX);

  svg.append("text")
    .attr("x", marginX)
    .attr("y", timelineY - 112)
    .attr("font-size", 13)
    .attr("fill", "#6b7280")
    .text("Detecciones máximas por día");

  svg.append("path")
    .datum(grouped)
    .attr("class", "timeline-line")
    .attr("d", line);

  svg.selectAll(".timeline-dot")
    .data(grouped)
    .join("circle")
    .attr("class", "timeline-dot")
    .attr("cx", d => x(d.startMinute))
    .attr("cy", d => y(d.maxDailyCount))
    .attr("r", 2.5);

  svg.append("line")
    .attr("x1", marginX)
    .attr("x2", marginX + chartWidth)
    .attr("y1", timelineY)
    .attr("y2", timelineY)
    .attr("stroke", "#d1d5db");

  [0, 360, 720, 1080, 1440].forEach(m => {
    svg.append("text")
      .attr("x", x(m))
      .attr("y", timelineY + 24)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "#6b7280")
      .text(minutesToTime(m));
  });
}

function minutesToTime(minutes) {
  const m = minutes % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;

  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function drawHeatmap(data) {
  const heatmapWidth = 760;
  const heatmapHeight = 520;

  const margin = {
    top: 30,
    right: 90,
    bottom: 70,
    left: 90
  };

  const chartWidth = heatmapWidth - margin.left - margin.right;
  const chartHeight = heatmapHeight - margin.top - margin.bottom;

  const svgHeatmap = d3
    .select("#heatmap-chart")
    .append("svg")
    .attr("viewBox", `0 0 ${heatmapWidth} ${heatmapHeight}`)
    .attr("width", "100%");

  const hourlyCounts = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0
  }));

  data.forEach(d => {
    hourlyCounts[d.hour].count += 1;
  });

  const maxCount = d3.max(hourlyCounts, d => d.count) || 1;

  const heatmapData = [];

  hourlyCounts.forEach(d => {
    for (let x = 0; x <= maxCount; x++) {
      heatmapData.push({
        hour: d.hour,
        countBin: x,
        probability: x <= d.count ? d.count / d3.sum(hourlyCounts, h => h.count) : 0
      });
    }
  });

  const x = d3
    .scaleLinear()
    .domain([0, maxCount])
    .range([0, chartWidth]);

  const y = d3
    .scaleBand()
    .domain(d3.range(24))
    .range([0, chartHeight])
    .padding(0.08);

  const color = d3
    .scaleSequential()
    .domain([0, d3.max(heatmapData, d => d.probability) || 1])
    .interpolator(d3.interpolateYlOrRd);

  const g = svgHeatmap
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  g.selectAll("rect")
    .data(heatmapData)
    .join("rect")
    .attr("x", d => x(d.countBin))
    .attr("y", d => y(d.hour))
    .attr("width", chartWidth / (maxCount + 1))
    .attr("height", y.bandwidth())
    .attr("fill", d => d.probability > 0 ? color(d.probability) : "#f8fafc");

  g.append("g")
    .call(d3.axisLeft(y).tickFormat(d => `${String(d).padStart(2, "0")}:00`));

  g.append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(x).ticks(8));

  svgHeatmap.append("text")
    .attr("x", heatmapWidth / 2)
    .attr("y", heatmapHeight - 20)
    .attr("text-anchor", "middle")
    .attr("font-size", 16)
    .attr("font-weight", "700")
    .text("Detecciones por hora");

  svgHeatmap.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -heatmapHeight / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("font-size", 16)
    .attr("font-weight", "700")
    .text("Hora del día");
}
