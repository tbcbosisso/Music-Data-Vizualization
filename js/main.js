// js/main.js
import { loadData } from "./data.js";
import { drawBars } from "./bars.js";
import { drawBubbles } from "./bubbles.js";
import { drawHeatmap } from "./heatmap.js";
import { drawRecoloredBars } from "./barsRecolored.js";

(async function main() {
  try {
    const data = await loadData();
    console.log("rows:", data.length, data[0]);

    const barsChart    = drawBars("#chart-bars", data);
    console.log("bars ok");
    const bubblesChart = drawBubbles("#chart-bubbles", data);
    console.log("bubbles ok");
    const heatmapChart = drawHeatmap("#chart-heatmap", data);
    console.log("heatmap ok");
    const recolorChart = drawRecoloredBars("#chart-bars-recolor", data);
    console.log("recolor ok");

    setupScrollytelling({ bubblesChart });

    document.getElementById("exploreBtn")
      .addEventListener("click", unlockExplore);
  } catch (err) {
    console.error("Startup failed:", err);
  }
})();

/* ---------- Scrollama setup ---------- */
function setupScrollytelling({ bubblesChart }) {
  const scroller = scrollama();

  scroller
    .setup({
      step: ".story-section",   // each <section class="story-section">
      offset: 0.6               // trigger when section is 60% up the viewport
    })
    .onStepEnter(response => {
      const id = response.element.id;

      switch (id) {
        case "sec-1":
          // Optionally replay the bar chart intro
          break;

        case "sec-2":
          // Auto-play the bubble animation when the climax is reached
          if (bubblesChart && bubblesChart.play) bubblesChart.play();
          break;

        case "sec-3":
          // Could trigger the heatmap's row-by-row reveal
          break;

        case "sec-4":
          // Optional: fade in the closing text
          break;
      }
    })
    .onStepExit(response => {
      // Optional: pause any running animations when leaving a section
      if (response.element.id === "sec-2" && bubblesChart?.pause) {
        bubblesChart.pause();
      }
    });

  window.addEventListener("resize", scroller.resize);
}

/* ---------- Explore unlock ---------- */
function unlockExplore() {
  const link = document.getElementById("exploreLink");
  link.classList.remove("locked");
  link.textContent = "Explore";
  document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
}