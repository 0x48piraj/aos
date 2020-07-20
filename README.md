# Aroma of the Songs

<p align="center">
<b>Aroma of the Songs — Visualizing music in the form of intricate rose petals using moving cube traces</b><br><br>
  <img alt="AromaOfTheSongs Logo" src="static/img/logo.png" width="400"><br>
  Visit <a href="https://lab.aroma.ofthesongs.com/">Playground &mdash; Project AOS</a> to fiddle around with your favourite songs.<br>
  Visit <a href="https://aroma.ofthesongs.com/">Home &mdash; Project AOS</a> to explore the project.<br><br>
</p>

# Brief History

I love Music and frankly, who doesn't. From my childhood days, I have this innate tendency of tinkering things for example, from sending songs wirelessly using Light, trying encoding songs visually to making machine generated synthetic songs, somehow Music has always been a center piece to all of it. “Aroma of the Songs” follows this progression and transforms Music into Roses creating exploration space of a unique kind—the one that helps you in connecting with Music and impacts you on many levels. Initially it was given the Project Codename S.O.S. meaning Smell of the Songs which then changed (because of the word 'Smell' being a little onto negative side) to Aroma of the Songs or Project A.O.S.

You can visit [About &mdash; Project AOS](https://aroma.ofthesongs.com/about/) to read more about the project origin.

# The Playground

The playground was created to experiment with the numbers, to let users generate roses and play with the project. It helps one to understand the know-how of this project. To know more, you can head over to [Aroma of songs A.K.A. Project A.O.S. In The Making](https://blog.0x48piraj.com/aroma-of-songs-aka-project-aos-in-the-making/). The blog mostly revolves around the overall design process.

# Internal Workings

Algorithm behind this project manoeuvres the cube using a [modified Rose equation](https://en.wikipedia.org/wiki/Rose_(mathematics)) and [FFT Spectrum Analysis](https://en.wikipedia.org/wiki/Spectrum_analyzer#FFT-based).

The proto equations which control the movement of the cube and create intricate realistic looking rose petals are,

```
rotateXorYorZ(cos(A * B)),
rotateXorYorZ(sin(A * B))
```

The cube traces controlled by algorithm's core logic leave behind intricate & beautiful rose petals. The output by the algorithm is integrated with rendering engine called [Processing](https://en.wikipedia.org/wiki/Processing_(programming_language)) which handles the movement of the cube.

The source code is in the `/` directory. It is packaged as a Flask application. You can run it by installing Flask and then running the web app by calling,

```
$ python app.py
```

# Contributing

A few ways in which you can contribute to Project AOS,

- Suggesting new features, creative suggestions to make this project more fun and useful
- Getting down to the business i.e. building features, solving issues, etc.
- Minor corrections like pointing out outdated snippets, typos, formatting errors, etc.
- Identifying gaps, things like inadequate mathematical explanation, etc.

PS: Look into the issues. Feel free to create a new issue to discuss things.

# Acknowledgements

The idea for this project was initially inspired by [Ashris's](https://iashris.com/) awesome project [Roses in Resonance](https://vimeo.com/150315138). The overwhelming support by [Mary Lou](https://github.com/crnacura) gave project's homepage the shape it is in right now.

## Surprise your friends

If you like the project, you can use these quick links to share it with your music aficionado friends,

[![Facebook](static/img/socials/facebook-logo.svg)](https://www.facebook.com/dialog/share?app_id=536779657179021&display=page&href=https%3A%2F%2Faroma.ofthesongs.com&quote=Aroma%20of%20the%20Songs%20visualizes%20songs%20in%20the%20form%20of%20intricate%20rose%20petals%20using%20moving%20cube%20traces%20using%20fancy%20mathematical%20equations!)  [![Twitter](static/img/socials/twitter-logo.svg)](https://twitter.com/intent/tweet?url=https://aroma.ofthesongs.com&text=Aroma%20of%20the%20Songs%20visualizes%20songs%20in%20the%20form%20of%20intricate%20rose%20petals%20using%20moving%20cube%20traces%20using%20fancy%20mathematical%20equations!%20Check%20out%20Project%20AOS!&hashtags=generativeArt,CreativeCoding,Art)  [![LinkedIn](static/img/socials/linkedin-logo.svg)](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Faroma.ofthesongs.com)

# 🎓 License

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

&copy; [Piyush Raj](https://0x48piraj.com)
