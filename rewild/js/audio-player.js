const wavesurfer = WaveSurfer.create({
  container: "#waveform",
  url: "audio/spimon-1.mp3",
  waveColor: "#111827",
  progressColor: "#8b6cff",
  cursorColor: "#111827",
  height: 90,
  barWidth: 3,
  barGap: 2,
  barRadius: 4,
  normalize: true
});

const playButton = document.getElementById("play-audio");

playButton.addEventListener("click", () => {
  wavesurfer.playPause();
});

wavesurfer.on("play", () => {
  playButton.textContent = "⏸";
});

wavesurfer.on("pause", () => {
  playButton.textContent = "▶";
});

wavesurfer.on("finish", () => {
  playButton.textContent = "▶";
});