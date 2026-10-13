// js/bars.js  (Page 1: artist count per genre, year slider, ghost bars)
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawBars(selector, data) {
  const container = d3.select(selector);
  const node = container.node();
  if (!node) {
    console.error("[bars] container not found:", selector);
    return;
  }

  const width = node.clientWidth;
  const height = node.clientHeight;
  if (!width || !height) {
    console.error("[bars] container has zero size. Check .story-chart height in CSS.");
    return;
  }

  container.style("position", "relative");

  // Keep identical to barsRecolored.js so the two charts line up.
  const margin = { top: 20, right: 130, bottom: 70, left: 100 };
  const W = width - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("width", "100%")
    .style("height", "100%");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Genre order: biggest overall first. Page 4 uses the same rule, so the bars line up.
  const genres = Array.from(
    d3.rollup(data, v => d3.sum(v, d => d.artistCount), d => d.genre)
  )
    .sort((a, b) => b[1] - a[1])
    .map(d => d[0]);

  const [yearMin, yearMax] = d3.extent(data, d => d.year);
  const startYear = Math.min(Math.max(1995, yearMin), yearMax);

  const lookup = new Map(data.map(d => [`${d.genre}|${d.year}`, d]));

  const rowsFor = yr => genres.map(genre => ({
    genre,
    year: yr,
    count: lookup.get(`${genre}|${yr}`)?.artistCount ?? 0,
    prevCount: lookup.get(`${genre}|${yr - 1}`)?.artistCount ?? 0
  }));

  const y = d3.scaleBand().domain(genres).range([0, H]).padding(0.15);

  // Fixed x-domain across all years so growth is visible when scrubbing
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.artistCount) || 1])
    .nice()
    .range([0, W]);

  g.append("g").call(d3.axisLeft(y));
  g.append("g").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x));

  g.append("text")
    .attr("x", W / 2).attr("y", H + 40)
    .attr("text-anchor", "middle").attr("font-size", 12)
    .text("Number of artists");

  const initial = rowsFor(startYear);

  const ghosts = g.selectAll(".ghost").data(initial, d => d.genre).join("rect")
    .attr("class", "ghost")
    .attr("y", d => y(d.genre))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("fill", "#cfd8dc")
    .attr("width", d => x(d.prevCount));

  const bars = g.selectAll(".bar").data(initial, d => d.genre).join("rect")
    .attr("class", "bar")
    .attr("y", d => y(d.genre))
    .attr("height", y.bandwidth() * 0.7)
    .attr("transform", `translate(0,${y.bandwidth() * 0.15})`)
    .attr("x", 0)
    .attr("fill", "steelblue")
    .attr("width", d => x(d.count));

  const labels = g.selectAll(".val").data(initial, d => d.genre).join("text")
    .attr("class", "val")
    .attr("y", d => y(d.genre) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("font-size", 11)
    .attr("fill", "#333")
    .attr("x", d => x(d.count) + 6)
    .text(d => d.count);

  // Slider
  const controls = container.append("div")
    .attr("class", "controls")
    .style("position", "absolute")
    .style("left", `${margin.left}px`)
    .style("bottom", "0")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "12px");

  const yearLabel = controls.append("strong").text(startYear);

  const slider = controls.append("input")
    .attr("type", "range")
    .attr("min", yearMin)
    .attr("max", yearMax)
    .attr("step", 1)
    .attr("value", startYear)
    .style("width", "260px");

  function update(yr) {
    const rows = rowsFor(yr);
    yearLabel.text(yr);

    ghosts.data(rows, d => d.genre)
      .transition().duration(400)
      .attr("width", d => x(d.prevCount));

    bars.data(rows, d => d.genre)
      .transition().duration(400)
      .attr("width", d => x(d.count));

    labels.data(rows, d => d.genre)
      .transition().duration(400)
      .attr("x", d => x(d.count) + 6)
      .text(d => d.count);
  }

  slider.on("input", event => update(+event.target.value));

  return { update };
}