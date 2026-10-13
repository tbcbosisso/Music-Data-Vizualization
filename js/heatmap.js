// js/heatmap.js  (Page 3: genre x year heatmap)
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawHeatmap(selector, data) {
  const container = d3.select(selector);
  const node = container.node();
  if (!node) {
    console.error("[heatmap] container not found:", selector);
    return;
  }

  const width = node.clientWidth;
  const height = node.clientHeight;
  if (!width || !height) {
    console.error("[heatmap] container has zero size. Check .story-chart height in CSS.");
    return;
  }

  container.style("position", "relative");

  const margin = { top: 40, right: 120, bottom: 50, left: 100 };
  const W = width - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("width", "100%")
    .style("height", "100%");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Same genre order as the bar charts (biggest overall first)
  const genres = Array.from(
    d3.rollup(data, v => d3.sum(v, d => d.artistCount), d => d.genre)
  )
    .sort((a, b) => b[1] - a[1])
    .map(d => d[0]);

  const years = [...new Set(data.map(d => d.year))].sort(d3.ascending);

  const x = d3.scaleBand().domain(years).range([0, W]).padding(0.05);
  const y = d3.scaleBand().domain(genres).range([0, H]).padding(0.05);

  // Hotness is 0-1 and bunched together, so use the data's own range.
  // Domain is [hi, lo] so that hot = red, cold = blue.
  const [lo, hi] = d3.extent(data, d => d.avgSongHotness);
  const colorScale = d3.scaleSequential()
    .domain([hi, lo])
    .interpolator(d3.interpolateRdBu);

  // Tooltip
  let tip = d3.select("body").select(".tooltip");
  if (tip.empty()) {
    tip = d3.select("body").append("div").attr("class", "tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("background", "#111")
      .style("color", "#fff")
      .style("padding", "8px 10px")
      .style("border-radius", "4px")
      .style("font-size", "12px");
  }

  const tipHtml = d => `
    <strong>${d.genre}, ${d.year}</strong><br/>
    Avg song hotness: ${d.avgSongHotness.toFixed(3)}<br/>
    Songs: ${d.songCount}<br/>
    Artists: ${d.artistCount}
  `;

  g.selectAll(".cell").data(data).join("rect")
    .attr("class", "cell")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.genre))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => colorScale(d.avgSongHotness))
    .style("cursor", "pointer")
    .on("mouseover", (e, d) => tip.style("opacity", 1).html(tipHtml(d)))
    .on("mousemove", e => tip
      .style("left", e.pageX + 12 + "px")
      .style("top", e.pageY - 12 + "px"))
    .on("mouseout", () => tip.style("opacity", 0))
    .on("click", (e, d) => showDrilldown(d));

  // Axes (label every 5th year so they stay readable)
  g.append("g").call(d3.axisLeft(y));
  g.append("g")
    .attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x)
      .tickValues(years.filter(yr => yr % 5 === 0))
      .tickFormat(d3.format("d")));

  // Legend: vertical gradient, hot at the top
  const legendH = Math.min(160, H);
  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 30},${margin.top})`);

  const gradId = "heat-gradient-" + selector.replace(/\W/g, "");
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);

  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(hi - t * (hi - lo)));
  });

  legend.append("rect")
    .attr("width", 14).attr("height", legendH)
    .attr("fill", `url(#${gradId})`);

  // Top label: HOT, red
  legend.append("text")
    .attr("x", 22).attr("y", 10)
    .attr("font-size", 12).attr("font-weight", 700).attr("fill", "#b2182b")
    .text("Hot");
  legend.append("text")
    .attr("x", 22).attr("y", 24)
    .attr("font-size", 10).attr("fill", "#666")
    .text(hi.toFixed(2));

  // Bottom label: COLD, blue
  legend.append("text")
    .attr("x", 22).attr("y", legendH - 14)
    .attr("font-size", 10).attr("fill", "#666")
    .text(lo.toFixed(2));
  legend.append("text")
    .attr("x", 22).attr("y", legendH)
    .attr("font-size", 12).attr("font-weight", 700).attr("fill", "#2166ac")
    .text("Cold");

  legend.append("text")
    .attr("y", -10).attr("font-size", 11)
    .text("Song hotness");

  // Drill-down panel
  const panel = container.append("div")
    .attr("class", "drilldown")
    .style("position", "absolute")
    .style("top", "0")
    .style("right", "0")
    .style("max-width", "220px")
    .style("padding", "10px 12px")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("font-size", "12px")
    .style("display", "none");

  function showDrilldown(d) {
    // music.csv is aggregated, so it has no artist names.
    // To show real top-3 artists, add them to the CSV in build_music_csv.py.
    panel.style("display", "block").html(`
      <strong>${d.genre}, ${d.year}</strong><br/>
      Artists: ${d.artistCount}<br/>
      Songs: ${d.songCount}<br/>
      Avg artist hotness: ${d.avgArtistHotness.toFixed(3)}<br/>
      Avg song hotness: ${d.avgSongHotness.toFixed(3)}<br/>
      <a href="#" class="close-drill">close</a>
    `);
    panel.select(".close-drill").on("click", e => {
      e.preventDefault();
      panel.style("display", "none");
    });
  }

  return { showDrilldown };
}