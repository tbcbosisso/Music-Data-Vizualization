// js/data.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// music.csv is already aggregated (one row per genre-year):
// genre,year,artist_count,avg_artist_hotness,avg_song_hotness,song_count
export async function loadData() {
  const raw = await d3.csv("data/music.csv");

  return raw.map(d => ({
    genre: d.genre,
    year: +d.year,
    artistCount: +d.artist_count,
    avgArtistHotness: +d.avg_artist_hotness,
    avgSongHotness: +d.avg_song_hotness,
    songCount: +d.song_count
  }));
}