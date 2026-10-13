// data.js
export async function loadData() {
  const raw = await d3.csv("data/music.csv");

  // Cast types
  raw.forEach(d => {
    d.artist_hotness = +d.artist_hotness;
    d.song_hotness   = +d.song_hotness;
    d.song_year      = +d.song_year;
  });

  // Aggregate to { genre, year, artistCount, avgArtistHotness, avgSongHotness, uniqueSongs }
  const nested = d3.rollups(
    raw,
    rows => ({
      artistCount:      new Set(rows.map(r => r.artist_name)).size,
      avgArtistHotness: d3.mean(rows, r => r.artist_hotness),
      avgSongHotness:   d3.mean(rows, r => r.song_hotness),
      uniqueSongs:      rows.length
    }),
    d => d.genre,
    d => d.song_year
  );

  // Flatten to array of objects: one per genre-year
  const flat = [];
  nested.forEach(([genre, yearMap]) => {
    yearMap.forEach(([year, stats]) => {
      flat.push({
        genre,
        year: +year,
        artistCount:      stats.artistCount,
        avgArtistHotness: stats.avgArtistHotness,
        avgSongHotness:   stats.avgSongHotness,
        uniqueSongs:      stats.uniqueSongs
      });
    });
  });

  return flat;
}
