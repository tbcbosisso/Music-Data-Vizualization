// js/bubbles.js  (Page 2: animated bubble scatter)
// Adds: speed control, genre filter (default = all), legend moved out of the plot area.
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawBubbles(selector, data) {
  const container = d3.select(selector);
  const node = container.node();
  if (!node) {
    console.error("[bubbles] container not found:", selector);
    return;
  }

  const width = node.clientWidth;
  const height = node.clientHeight;
  if (!width || !height) {
    console.error("[bubbles] container has zero size. Check .story-chart height in CSS.");
    return;
  }

  container.style("position", "relative");

  // Wide right margin holds the legend, so it never touches an axis.
  const margin = { top: 30, right: 170, bottom: 90, left: 70 };
  const W = width - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("width", "100%")
    .style("height", "100%");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales are fixed to ALL data, so filtering genres never rescales the chart.
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.artistCount)])
    .nice()
    .range([0, W]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.avgArtistHotness))
    .nice()
    .range([H, 0]);

  const r = d3.scaleSqrt()
    .domain(d3.extent(data, d => d.avgSongHotness))
    .range([6, 26]);

  const color = d3.scaleOrdinal()
    .domain([...new Set(data.map(d => d.genre))])
    .range(d3.schemeTableau10);

  const allGenres = color.domain();
  let selected = new Set(allGenres);   // default: ALL

  // Quadrants
  const quads = [
    { x: 0,     y: 0,     w: W / 2, h: H / 2, label: "EMERGING",   fill: "#2a9d8f" },
    { x: W / 2, y: 0,     w: W / 2, h: H / 2, label: "BOUTIQUE",   fill: "#e9c46a" },
    { x: 0,     y: H / 2, w: W / 2, h: H / 2, label: "DECLINING",  fill: "#264653" },
    { x: W / 2, y: H / 2, w: W / 2, h: H / 2, label: "MAINSTREAM", fill: "#e76f51" }
  ];

  g.selectAll(".quad").data(quads).join("rect")
    .attr("class", "quad")
    .attr("x", d => d.x).attr("y", d => d.y)
    .attr("width", d => d.w).attr("height", d => d.h)
    .attr("fill", d => d.fill).attr("opacity", 0.08);

  g.selectAll(".quad-label").data(quads).join("text")
    .attr("class", "quad-label")
    .attr("x", d => d.x + 12).attr("y", d => d.y + 20)
    .attr("font-size", 11).attr("fill", "#666")
    .text(d => d.label);

  // Axes
  g.append("g").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".2f")));

  g.append("text")
    .attr("x", W / 2).attr("y", H + 38)
    .attr("text-anchor", "middle").attr("font-size", 12)
    .text("Number of artists");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -H / 2).attr("y", -50)
    .attr("text-anchor", "middle").attr("font-size", 12)
    .text("Avg artist hotness");

  const trailLayer = g.append("g").attr("class", "trails");
  const bubbleLayer = g.append("g").attr("class", "bubbles");

  const byYear = d3.group(data, d => d.year);
  const years = [...byYear.keys()].sort(d3.ascending);

  // Tooltip, created once
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
      .style("font-size", "12px")
      .style("z-index", 20);
  }

  function showTip(e, d) {
    const rows = byYear.get(d.year) || [];
    const rankCount = [...rows].sort((a, b) => b.artistCount - a.artistCount)
      .findIndex(row => row.genre === d.genre) + 1;
    const rankHot = [...rows].sort((a, b) => b.avgArtistHotness - a.avgArtistHotness)
      .findIndex(row => row.genre === d.genre) + 1;

    tip.style("opacity", 1)
      .style("left", e.pageX + 12 + "px")
      .style("top", e.pageY - 12 + "px")
      .html(`
        <strong>${d.genre}, ${d.year}</strong><br/>
        Artists: ${d.artistCount}<br/>
        Avg artist hotness: ${d.avgArtistHotness.toFixed(3)}<br/>
        Rank by count: #${rankCount} of ${rows.length}<br/>
        Rank by hotness: #${rankHot} of ${rows.length}
      `);
  }
  function hideTip() { tip.style("opacity", 0); }

  /* ---------- Speed ---------- */
  let speed = 0.5;  // 1x = 1600ms per year, 0.5x = 3200ms, 2x = 800ms
  const BASE_STEP_MS = 1600;               // time per year at 1x (was 800)
  const stepMs = () => BASE_STEP_MS / speed;

  /* ---------- Drawing ---------- */
  let currentYear = years[0];
  const visible = rows => rows.filter(d => selected.has(d.genre));

  function drawYear(yr, animate = true) {
    currentYear = yr;
    const rows = visible(byYear.get(yr) || []);
    const prevRows = visible(byYear.get(yr - 1) || []);
    const dur = animate ? stepMs() * 0.75 : 0;

    if (animate && prevRows.length) {
      trailLayer.selectAll(null)
        .data(prevRows)
        .join("circle")
        .attr("cx", d => x(d.artistCount))
        .attr("cy", d => y(d.avgArtistHotness))
        .attr("r", d => r(d.avgSongHotness))
        .attr("fill", d => color(d.genre))
        .attr("opacity", 0.2)
        .transition().duration(stepMs() * 1.5)
        .attr("opacity", 0)
        .remove();
    }

    const bubbles = bubbleLayer.selectAll("circle")
      .data(rows, d => d.genre)
      .join(
        enter => enter.append("circle")
          .attr("cx", d => x(d.artistCount))
          .attr("cy", d => y(d.avgArtistHotness))
          .attr("r", 0)
          .attr("fill", d => color(d.genre))
          .attr("fill-opacity", 0.75)
          .attr("stroke", "#fff"),
        update => update,
        exit => exit.transition().duration(300).attr("r", 0).remove()
      );

    bubbles
      .transition().duration(dur)
      .ease(d3.easeCubicInOut)
      .attr("cx", d => x(d.artistCount))
      .attr("cy", d => y(d.avgArtistHotness))
      .attr("r", d => r(d.avgSongHotness));

    bubbles
      .on("mouseover", (event, d) => showTip(event, d))
      .on("mousemove", (event, d) => showTip(event, d))
      .on("mouseout", hideTip);
  }

  /* ---------- Legend = genre filter (right margin) ----------
     One click toggles a genre on/off. "only" isolates it.
     "All" / "None" set everything at once. The whole row is clickable. */
  const ROW_H = 24;
  const ROW_W = 146;

  const legend = g.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${W + 24},0)`);

  legend.append("text")
    .attr("font-size", 12).attr("font-weight", 700).attr("fill", "#222")
    .text("Genres");

  const quick = legend.append("g").attr("transform", "translate(0,14)");
  [["All", () => setSelection(allGenres)], ["None", () => setSelection([])]]
    .forEach(([label, fn], i) => {
      const b = quick.append("g")
        .attr("transform", `translate(${i * 52},0)`)
        .attr("role", "button")
        .attr("tabindex", 0)
        .style("cursor", "pointer")
        .on("click", fn)
        .on("keydown", e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
        });
      b.append("rect")
        .attr("width", 44).attr("height", 22).attr("rx", 6)
        .attr("fill", "#eef2f8").attr("stroke", "#c9d3e1");
      b.append("text")
        .attr("x", 22).attr("y", 15).attr("text-anchor", "middle")
        .attr("font-size", 11).attr("fill", "#222").style("pointer-events", "none")
        .text(label);
    });

  const legendItems = legend.selectAll(".legend-item")
    .data(allGenres)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0,${48 + i * ROW_H})`)
    .attr("role", "checkbox")
    .attr("tabindex", 0)
    .style("cursor", "pointer")
    .on("click", (e, d) => toggle(d))
    .on("keydown", (e, d) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(d); }
    });

  // Full-row hit area, so clicks between the dot and the text still count
  legendItems.append("rect")
    .attr("class", "hit")
    .attr("width", ROW_W).attr("height", ROW_H - 2).attr("rx", 5)
    .attr("fill", "transparent")
    .on("mouseover", function () { d3.select(this).attr("fill", "#eef2f8"); })
    .on("mouseout", function () { d3.select(this).attr("fill", "transparent"); });

  legendItems.append("circle")
    .attr("cx", 13).attr("cy", (ROW_H - 2) / 2).attr("r", 6).attr("stroke-width", 2)
    .attr("stroke", d => color(d))
    .style("pointer-events", "none");

  legendItems.append("text")
    .attr("class", "label")
    .attr("x", 27).attr("y", (ROW_H - 2) / 2).attr("dy", "0.35em")
    .attr("font-size", 12).attr("fill", "#222")
    .style("pointer-events", "none")
    .text(d => d);

  legendItems.append("text")
    .attr("class", "only")
    .attr("x", ROW_W - 8).attr("y", (ROW_H - 2) / 2).attr("dy", "0.35em")
    .attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#2d2f7a")
    .attr("text-decoration", "underline")
    .text("only")
    .on("click", (e, d) => { e.stopPropagation(); setSelection([d]); });

  const emptyMsg = g.append("text")
    .attr("x", W / 2).attr("y", H / 2)
    .attr("text-anchor", "middle").attr("font-size", 13).attr("fill", "#777")
    .attr("opacity", 0)
    .text("No genres selected. Click a genre or press All.");

  function styleLegend() {
    const partial = selected.size < allGenres.length;
    legendItems.style("opacity", d => (selected.has(d) ? 1 : 0.4))
      .attr("aria-checked", d => selected.has(d));
    legendItems.select("circle")
      .attr("fill", d => (selected.has(d) ? color(d) : "#fff"));
    legendItems.select(".label")
      .attr("font-weight", d => (partial && selected.has(d) ? 700 : 400));
    emptyMsg.attr("opacity", selected.size ? 0 : 1);
  }

  function refresh() {
    styleLegend();
    drawYear(currentYear, false);
  }

  function setSelection(list) {
    selected = new Set(list);
    refresh();
  }

  function toggle(genre) {
    if (selected.has(genre)) selected.delete(genre);
    else selected.add(genre);
    refresh();
  }

  /* ---------- Controls: play, reset, speed, year ---------- */
  const controls = container.append("div")
    .attr("class", "controls")
    .style("position", "absolute")
    .style("left", `${margin.left}px`)
    .style("bottom", "0")
    .style("display", "flex")
    .style("align-items", "center")
    .style("flex-wrap", "wrap")
    .style("gap", "10px");

  const playBtn = controls.append("button").text("▶ Play");
  const resetBtn = controls.append("button").text("⟲ Reset");

  const speedWrap = controls.append("label")
    .style("display", "flex").style("align-items", "center").style("gap", "6px")
    .text("Speed");
  const speedSel = speedWrap.append("select").attr("aria-label", "Animation speed");
  [
    [0.25, "0.25× slow motion"],
    [0.5, "0.5×"],
    [1, "1×"],
    [2, "2×"],
    [4, "4× fast"]
  ].forEach(([v, t]) => {
    speedSel.append("option").attr("value", v).property("selected", v === 1).text(t);
  });
  speedSel.on("change", e => { speed = +e.target.value; });

  const yearLabel = controls.append("strong").text(years[0]);

  let playing = false;
  let timer = null;
  let idx = 0;

  function step() {
    if (idx >= years.length) {
      playing = false;
      playBtn.text("▶ Play");
      return;
    }
    drawYear(years[idx]);
    yearLabel.text(years[idx]);
    idx++;
    if (playing) timer = setTimeout(step, stepMs());
  }

  playBtn.on("click", () => {
    playing = !playing;
    playBtn.text(playing ? "⏸ Pause" : "▶ Play");
    if (playing) {
      if (idx >= years.length) idx = 0;   // restart after finish
      step();
    } else {
      clearTimeout(timer);
    }
  });

  resetBtn.on("click", () => {
    playing = false;
    clearTimeout(timer);
    idx = 0;
    playBtn.text("▶ Play");
    bubbleLayer.selectAll("circle").remove();
    trailLayer.selectAll("circle").remove();
    yearLabel.text(years[0]);
    drawYear(years[0], false);
  });

  styleLegend();
  drawYear(years[0], false);

  return {
    play:  () => { if (!playing) playBtn.node().click(); },
    pause: () => { if (playing)  playBtn.node().click(); },
    reset: () => resetBtn.node().click()
  };
}