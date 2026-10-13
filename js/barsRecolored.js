// js/barsRecolored.js  (Page 4: same bars as Page 1, filled by artist hotness)
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawRecoloredBars(selector, data) {
  const container = d3.select(selector);
  const node = container.node();
  if (!node) {
    console.error("[barsRecolored] container not found:", selector);
    return;
  }

  const width = node.clientWidth;
  const height = node.clientHeight;
  if (!width || !height) {
    console.error("[barsRecolored] container has zero size. Check .story-chart height in CSS.");
    return;
  }

  container.style("position", "relative");

  // Keep these margins identical to bars.js so the two charts line up.
  const margin = { top: 20, right: 130, bottom: 70, left: 100 };
  const W = width - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("width", "100%")
    .style("height", "100%");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Same order rule as bars.js
  const genres = Array.from(
    d3.rollup(data, v => d3.sum(v, d => d.artistCount), d => d.genre)
  )
    .sort((a, b) => b[1] - a[1])
    .map(d => d[0]);

  const [yearMin, yearMax] = d3.extent(data, d => d.year);
  const startYear = Math.min(Math.max(1995, yearMin), yearMax);

  const lookup = new Map(data.map(d => [`${d.genre}|${d.year}`, d]));

  const rowsFor = yr => genres.map(genre => {
    const row = lookup.get(`${genre}|${yr}`);
    return {
      genre,
      year: yr,
      count: row?.artistCount ?? 0,
      hotness: row?.avgArtistHotness ?? null
    };
  });

  const y = d3.scaleBand().domain(genres).range([0, H]).padding(0.15);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.artistCount) || 1])
    .nice()
    .range([0, W]);

  // Domain is [hi, lo] so that hot = red, cold = blue.
  const [lo, hi] = d3.extent(data, d => d.avgArtistHotness);
  const colorScale = d3.scaleSequential()
    .domain([hi, lo])
    .interpolator(d3.interpolateRdBu);

  const fillFor = d => (d.hotness == null ? "#ddd" : colorScale(d.hotness));

  g.append("g").call(d3.axisLeft(y));
  g.append("g").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x));

  g.append("text")
    .attr("x", W / 2).attr("y", H + 40)
    .attr("text-anchor", "middle").attr("font-size", 12)
    .text("Number of artists (color = avg artist hotness)");

  const initial = rowsFor(startYear);

  const bars = g.selectAll(".bar").data(initial, d => d.genre).join("rect")
    .attr("class", "bar")
    .attr("y", d => y(d.genre))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("fill", fillFor)
    .attr("width", d => x(d.count));

  const labels = g.selectAll(".val").data(initial, d => d.genre).join("text")
    .attr("class", "val")
    .attr("y", d => y(d.genre) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("font-size", 11)
    .attr("fill", "#333")
    .attr("x", d => x(d.count) + 6)
    .text(d => d.count);

  /* ---------- Legend: vertical, HOT (red) on top, COLD (blue) at the bottom ---------- */
  const legendH = Math.min(190, H - 30);
  const legendX = width - margin.right + 50;
  const legendY = margin.top + 30;

  const gradId = "recolor-gradient-" + selector.replace(/\W/g, "");
  const grad = svg.append("defs").append("linearGradient")
    .attr("id", gradId)
    .attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);

  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(hi - t * (hi - lo)));   // top = hi (red)
  });

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${legendX},${legendY})`);

  legend.append("text")
    .attr("y", -14).attr("font-size", 12).attr("font-weight", 700).attr("fill", "#222")
    .text("Artist hotness");

  legend.append("rect")
    .attr("width", 16).attr("height", legendH)
    .attr("rx", 3)
    .attr("fill", `url(#${gradId})`);

  // Top label: HOT, red
  legend.append("text")
    .attr("x", 24).attr("y", 10)
    .attr("font-size", 12).attr("font-weight", 700).attr("fill", "#b2182b")
    .text("Hot");
  legend.append("text")
    .attr("x", 24).attr("y", 24)
    .attr("font-size", 10).attr("fill", "#666")
    .text(hi.toFixed(2));

  // Bottom label: COLD, blue
  legend.append("text")
    .attr("x", 24).attr("y", legendH - 14)
    .attr("font-size", 10).attr("fill", "#666")
    .text(lo.toFixed(2));
  legend.append("text")
    .attr("x", 24).attr("y", legendH)
    .attr("font-size", 12).attr("font-weight", 700).attr("fill", "#2166ac")
    .text("Cold");

  /* ---------- Slider ---------- */
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
    .attr("aria-label", "Year")
    .style("width", "260px");

  function update(yr) {
    const rows = rowsFor(yr);
    yearLabel.text(yr);

    bars.data(rows, d => d.genre)
      .transition().duration(400)
      .attr("width", d => x(d.count))
      .attr("fill", fillFor);

    labels.data(rows, d => d.genre)
      .transition().duration(400)
      .attr("x", d => x(d.count) + 6)
      .text(d => d.count);
  }

  slider.on("input", event => update(+event.target.value));

  return { update };
}