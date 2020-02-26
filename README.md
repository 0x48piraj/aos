# Tumbara

<p align="center">
<b>Aroma of the Songs — Visualizing music in the form of intricate rose petals using moving cube traces</b><br><br>
  <img alt="SmellTheSongs Logo" src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Tumbara.jpg/330px-Tumbara.jpg" width="400"><br>
<b>
  Visit the <a href="https://lab.aroma.ofthesongs.com/">Playground</a> to fiddle around with your favourite songs.<br>
  Visit Project's <a href="https://aroma.ofthesongs.com/">Home</a> for exploring this project.<br><br>
</b>
</p>

# Brief History

> In Hindu mythology, Tumburu, also known as Tumbaru and Tumbara is the best among Gandharvas or celestial musician and is sometimes described as the best of singers. He is described to perform in the courts of gods Kubera and Indra as well as sing praises of god Vishnu. He leads the Gandharvas in their singing. — [Wikipedia](https://en.wikipedia.org/wiki/Tumburu)

I love Music and frankly, who doesn't. From my childhood days, I have this innate tendency of tinkering things for example, from sending songs wirelessly using Light, trying encoding songs visually to making machine generated synthetic songs, somehow Music has always been a center piece to all of it. “Aroma of the Songs” follows this progression and transforms Music into Roses creating exploration space of a unique kind—the one that helps you in connecting with Music and impacts you on many levels. Initially it was given the Project Codename S.O.S. meaning Smell of the Songs which then changed (because of the word 'Smell' being a little onto negative side) to Aroma of the Songs or Project A.O.S.

You can visit [About &mdash; Project AOS](https://aroma.ofthesongs.com/about/) to read more about the project origin.

# The Playground

To experiment with the numbers and to customise the output rose, the playground was created. It helps one to understand the know-how of this project.

# Internal Workings

Algorithm behind this project manoeuvres the cube using a modified Rose mathematical equation and FFT Spectrum Analysis.

The proto equations which control the movement of the cube and create intricate realistic looking rose petals are,

```
rotateXorYorZ(cos(A * B)) and
rotateXorYorZ(sin(A * B))
```

The cube traces controlled by algorithm's core logic leave behind intricate & beautiful rose petals. The output by the algorithm is integrated with rendering engine called Processing which handles the movement of the cube.

The source code can be found inside the `src/` directory. It is packaged as a Flask application. You can run it by installing Flask and then running the web app by calling,

```
$ python app.py
```