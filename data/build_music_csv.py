"""
build_music_csv.py
Transforms the raw MusicBrainz-style sheet into the aggregated
genre-year dataset used by the scrollytelling visualization.
"""
import pandas as pd

# ---------------------------------------------------------------
# 1. Load raw data
# ---------------------------------------------------------------
df = pd.read_excel("music.xlsx", sheet_name="music")

# ---------------------------------------------------------------
# 2. Clean
# ---------------------------------------------------------------
# Drop year = 0 (missing)
df = df[df["song.year"] != 0]

# Drop sentinel hotness values (< 0 means missing)
df = df[(df["artist.hotttnesss"] >= 0) & (df["song.hotttnesss"] >= 0)]

# Keep 1960–2010
df = df[(df["song.year"] >= 1960) & (df["song.year"] <= 2010)]

# ---------------------------------------------------------------
# 3. Map messy genres to canonical buckets
# ---------------------------------------------------------------
genre_map = {
    "rock": "Rock", "pop rock": "Rock", "hard rock": "Rock",
    "classic rock": "Rock", "alternative rock": "Rock",
    "indie rock": "Rock", "punk": "Rock", "post-grunge": "Rock",
    "grunge": "Rock", "blues-rock": "Rock",
    "pop": "Pop", "teen pop": "Pop", "dance pop": "Pop",
    "british pop": "Pop", "europop": "Pop", "synthpop": "Pop",
    "hip hop": "Hip-Hop", "rap": "Hip-Hop", "gangster rap": "Hip-Hop",
    "dirty south rap": "Hip-Hop", "rap metal": "Hip-Hop",
    "electronic": "Electronic", "electronica": "Electronic",
    "techno": "Electronic", "trance": "Electronic",
    "progressive house": "Electronic", "dubstep": "Electronic",
    "breakbeat": "Electronic", "big beat": "Electronic",
    "heavy metal": "Metal", "death metal": "Metal",
    "black metal": "Metal", "alternative metal": "Metal",
    "speed metal": "Metal", "power metal": "Metal",
    "sympho black metal": "Metal", "folk metal": "Metal",
    "country": "Country", "country rock": "Country",
    "honky tonk": "Country", "bluegrass": "Country",
    "classic country": "Country", "country gospel": "Country",
    "jazz": "Jazz", "latin jazz": "Jazz", "vocal jazz": "Jazz",
    "smooth jazz": "Jazz", "free jazz": "Jazz", "hard bop": "Jazz",
    "cool jazz": "Jazz", "soul jazz": "Jazz",
    "folk": "Folk", "folk-pop": "Folk", "folk rock": "Folk",
    "irish folk": "Folk", "indie folk": "Folk",
    "soul": "Soul/R&B", "r&b": "Soul/R&B", "neo soul": "Soul/R&B",
    "motown": "Soul/R&B", "funk": "Soul/R&B",
    "blues": "Blues", "delta blues": "Blues", "texas blues": "Blues",
    "chicago blues": "Blues", "electric blues": "Blues",
    "country blues": "Blues",
}
df["genre"] = df["artist.terms"].str.lower().str.strip().map(genre_map)
df = df.dropna(subset=["genre"])

# ---------------------------------------------------------------
# 4. Aggregate to one row per genre-year
# ---------------------------------------------------------------
agg = (
    df.groupby(["genre", "song.year"])
      .agg(
          artist_count       = ("artist.id",         "nunique"),
          avg_artist_hotness = ("artist.hotttnesss", "mean"),
          avg_song_hotness   = ("song.hotttnesss",   "mean"),
          song_count         = ("song.id",           "count"),
      )
      .reset_index()
      .rename(columns={"song.year": "year"})
)

# Round for cleaner CSV
agg["avg_artist_hotness"] = agg["avg_artist_hotness"].round(4)
agg["avg_song_hotness"]   = agg["avg_song_hotness"].round(4)

# ---------------------------------------------------------------
# 5. Optional: keep only genres with enough data per year
#    (avoids noise from genres with 1-2 songs in a year)
# ---------------------------------------------------------------
agg = agg[agg["artist_count"] >= 3]

# Sort for readability
agg = agg.sort_values(["genre", "year"]).reset_index(drop=True)

# ---------------------------------------------------------------
# 6. Export
# ---------------------------------------------------------------
agg.to_csv("music.csv", index=False)
print(f"Wrote {len(agg)} rows to music.csv")
print(agg.head(10))