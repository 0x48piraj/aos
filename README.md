# Aroma of the Songs

<p align="center">
<b>What would music look like if it grew in nature?</b><br><br>
  <img alt="Aroma of the Songs" src="src/assets/images/aos.gif" width="400"><br>
  Visit <a href="https://0x48piraj.com/projects/aos/lab">Playground &mdash; Project AOS</a> to fiddle around with your favourite songs.<br>
  Visit <a href="https://0x48piraj.com/projects/aos/">Home &mdash; Project AOS</a> to explore the project.<br><br>
</p>

# Background

I love music &mdash; and frankly, who doesn't. But for me, it's always been more than listening. To me, music has always felt spatial: an interplay of motion, symmetry and emotion. Since childhood, I've had this innate tendency to tinker with music: writing a protocol to transmit songs wirelessly using light, visually encoding melodies, crafting synthetic soundscapes from scratch. Somehow, music has always been the centerpiece of my creative experiments.

Aroma of the Songs is a natural evolution of that journey &mdash; a generative art project that transforms musical input into ephemeral, intricate rose petals creating exploration space of a unique kind. It's where signal processing meets aesthetics, where mathematical beauty shapes emotion.

This project grew out of a desire to turn that perception into form, to make music feel tangible &mdash; into something we can see, feel and almost smell.

You can visit [About &mdash; Project AOS](https://0x48piraj.com/projects/aos/about/) to read more about the project origin.

# The Playground

The playground was created to experiment with the numbers, to let users generate roses and play with the project. It helps one to understand the know-how of this project. To know more, you can head over to [Aroma of songs A.K.A. Project A.O.S. In The Making](https://blog.0x48piraj.com/aroma-of-songs-aka-project-aos-in-the-making/). The blog mostly revolves around the overall design process.

# Beneath the petals

Unlike many music visualizers that map volume or beat to flashy visuals, _Aroma of the Songs_ focuses on **emergent organic behavior**. Using musically-biased spline-generated paths and dynamically modulated color palettes, it captures not just loudness or tempo, but emotional contours of a track.

Behind the beauty lies a system grounded in FFT spectrum analysis, energy mapping and spline-driven motion.

Each rose generated is unique, shaped by the song's energy profile with a blend of instantaneous and long-term amplitude signal analysis, while color intensity reacts to treble energy spikes, giving the visuals a sense of rhythm and breath.

The result is a something that "grows" with the song, petal by petal, each shaped by rhythm, emotion and frequency.

### Signal analysis

Using `p5.FFT`, the audio input is decomposed into frequency bands in real-time, allowing the system to interpret the treble, mid and bass characteristics of the track.

This allows the system to "listen" to the song's internal dynamics, detecting not just beats, but capturing nuances like vocal clarity or percussion _crispness_.

To ensure temporal context, we built a sliding-window energy system that calculates long-term amplitude averages, giving the visuals a memory of how the track evolves over time. This gives the petals their "breath" &mdash; expanding, shrinking and shifting based on both the current pulse and the long-term flow of the song.

### Form generation

Each rose bloom is generated from a [centripetal Catmull–Rom spline](https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline), rebuilt for every cycle of the petal's growth. These paths are subtly biased by the song's mid-frequency energy, ensuring that busier sections produce richer, more complex motion.

We inject Perlin noise into the control point generation and cube rotations, lending each bloom an imperfect, organic quality, like petals swaying in wind rather than spinning on mechanical pivots.

##### Highlights

- Dynamic spline paths influenced by energy level
- Perlin noise-driven randomness for lifelike variations
- Modified rose equations for petal symmetry and layering

### Color mapping

The color palette is not fixed. It adapts dynamically based on the song's energy and frequency characteristics. Every stroke is selected from a four-tone palette, shifting shades as the long-term energy rises. Brightness is then boosted by real-time treble spikes, giving cymbals, vocals, or sharp highs a momentary shimmer.

This gives visual weight to cymbals, vocals, or high synths: lighting up petals with musical clarity while preserving a consistent, emotionally timed aesthetic.

##### Highlights

- Energy-aware color selection
- Treble-driven brightness modulation for percussive detail
- Smooth morphing transitions in play/pause controls via SVG path interpolation

### Rendering pipeline

All petals are rendered in real time using Processing (`p5.js`) in a `P2D` context, allowing smooth interactive control. Users can upload songs, tweak rotation axes (X/Y/Z) and speeds, control shrink rates, stroke weights and even pause or resume playback mid-visualization.

Export options include robust gallery snapshots, high-res PNG frames and auto-generated posters with embedded metadata turning **every song into a collectible rose**.

## TL;DR: A System of Systems

**Aroma of the Songs** is a delicate ecosystem where sound is heard through FFT, felt through energy memory, shaped by splines, colored by emotion and rendered in real-time.

# Contributing

A few ways in which you can contribute to Project AOS,

- Suggesting new features, creative suggestions to make this project more fun and useful
- Getting down to the business i.e. building features, solving issues, etc.
- Minor corrections like pointing out outdated snippets, typos, formatting errors, etc.
- Identifying gaps, things like inadequate mathematical explanation, etc.

PS: Look into the issues. Feel free to create a new issue to discuss things.

# Beyond the garden

Like any living system, this project is meant to evolve. The current implementation focuses on form, but its future lies in weaving a closer harmony between music and intent.

Some of the directions I'm exploring:

* **Multisensory extensions**: Coupling visuals with haptic feedback, making sound physically perceptible.
* **Color selection**: Using mathematical models to generate harmonious palettes from analysing lyrical sentiment letting colors respond to **emotion** as much as to energy.
* **One-shot composition**: Extend the roses beyond individual cycles to create a single, evolving visual that encapsulates an entire song in one continuous cycle.
* **Collaborative garden**: Letting people collaborate songs in real-time to grow communal roses, forming a digital garden of shared emotion that evolves through collective listening.
  - [ ] Multi-track mode to load two songs and visualize them as interwoven roses, where FFT differentials form a sort of "duo-toned petals" for example, using bass / treble as inner / outer layers
  - [ ] Real-time sharing via WebRTC
  - [ ] WebMIDI support letting MIDI controllers adjust parameters
* **Machine-perception feedback loops**: Using computer vision to analyze the generated roses.
* **Bio-inspired dynamics**: Exploring growth behaviors drawn from phyllotaxis, branching systems and cellular automata.
  - [ ] Morph petal edges with Perlin noise synced to amplitude which letting us further get away from machine-like motion
  - [ ] Mapping FFT bins into distortions at different angles, making petals breathe with the music
  - [ ] Generative seed mode (no audio, but generates roses from random seeds)

Each of these ideas tries to build upon the project's core philosophy.

### Acknowledgements

This project builds on concepts from music visualizers and floral art traditions, inspired in part by experiments like [Roses in Resonance](https://github.com/iashris/Roses-in-Resonance-Music-Visualization) by [Ashris Choudhury](https://www.media.mit.edu/people/ashris/overview/) and the [spectrographic](https://github.com/LeviBorodenko/spectrographic/) project by [LeviBorodenko](https://github.com/LeviBorodenko), which converts images into sound whose spectrograms resemble the original image.

While these works planted the seed of inspiration, **Aroma of the Songs** reinterprets music visualization through my own mathematical, generative and algorithmic frameworks. All code, interaction logic and data mappings were developed from scratch.

#### Surprise your friends

If you like the project, you can use these quick links to share it with your music aficionado friends,

[![Facebook](src/assets/images/socials/facebook-logo.svg)](https://www.facebook.com/dialog/share?app_id=536779657179021&display=page&href=https%3A%2F%2F0x48piraj.com/projects/aos&quote=Ever%20wondered%20what%20music%20would%20look%20like%20if%20it%20grew%20in%20nature%3F%20A%20generative%20art%20project%20that%20transforms%20musical%20input%20into%20ephemeral%2C%20intricate%20rose%20petals%20exploring%20a%20whole%20new%20sensory%20dimension.)  [![Twitter](src/assets/images/socials/twitter-logo.svg)](https://twitter.com/intent/tweet?text=Ever%20wondered%20what%20music%20would%20look%20like%20if%20it%20grew%20in%20nature%3F%20%0A%0AA%20generative%20art%20project%20that%20transforms%20musical%20input%20into%20ephemeral%2C%20intricate%20rose%20petals%20exploring%20a%20whole%20new%20sensory%20dimension.%0A%0AExplore%20%E2%9E%9A%20https%3A%2F%2F0x48piraj.com%2Fprojects%2Faos%0A%0A%23Art%20%23CreativeCoding%20%23MusicVisualization)  [![LinkedIn](src/assets/images/socials/linkedin-logo.svg)](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2F0x48piraj.com/projects/aos)

# License

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
