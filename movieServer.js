const express = require('express');
const path = require('path');
const bodyParser = require("body-parser");

const app = express();
const port = 3000;

require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const mongoDBName = process.env.MONGO_DB_NAME;
const mongoDBCollection = process.env.MONGO_COLLECTION;
const apiKey = process.env.API_KEY;
const apiHost = process.env.API_HOST;

const { MongoClient, ServerApiVersion } = require('mongodb');
const databaseAndCollection = {db: mongoDBName, collection: mongoDBCollection};
const uri = `mongodb+srv://${userName}:${password}@cluster0.lclenen.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

let currentMovie = "";


app.get('/', (req, res) => {

    const params = {
        url: `https://moviestreaming.onrender.com`
    };

    res.render("index", params);
});

app.post('/', async (req, res) => {
  const fetch = await import('node-fetch').then(mod => mod.default);

  let term = req.body.movie;
  currentMovie = term;

  const url = `https://utelly-tv-shows-and-movies-availability-v1.p.rapidapi.com/lookup?term=${term}k&country=us`;
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost
    }
  };

  try {
    const response = await fetch(url, options);
    const json = await response.json();

    let links = "";

    if(json?.results[0]?.locations === undefined) {

      links = "No streaming services found!";

    } else {

      for(let x of json?.results[0]?.locations) {
        links += `<a href=${x.url}>${x.display_name}</a><br>`;
      }
    }

    const params = {
        name: term,
        services: links,
        url: `https://moviestreaming.onrender.com/result`
    };

    res.render("result", params);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error');
  }
});

app.post("/result", async (request, response) => {
  let newMovie = {name: currentMovie};

  try{
      await client.connect();
      await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newMovie);
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }

  const params = {
    url: `https://moviestreaming.onrender.com`
  };

  response.render("index", params);
});


app.get('/likedmovies', async (request, response) => {

  try {
    await client.connect();
    const cursor = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).find();
    const result = await cursor.toArray();

    let body = "";

    result.forEach((elem) => {body += `<tr> <td>${elem.name}</td></tr>`;})

    let table = `<table border='1'> 
                <thead> 
                    <tr> 
                        <th>Name</th> 
                    </tr> 
                </thead> 
                <tbody>
                    ${body}
                </tbody>`;



    const params = {movieTable: table,
                    url: `https://moviestreaming.onrender.com/likedmovies`};

    response.render("likedmovies", params);
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
});

app.post("/likedmovies", async (request, response) => {
  try {
    await client.connect();
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .deleteMany({});
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }

  const params = {
    url: `https://moviestreaming.onrender.com`
  };

  response.render("index", params);
});


app.listen(port);
console.log(`Web server started and running at https://moviestreaming.onrender.com`);
const prompt = "Type stop to shutdown the server: ";
process.stdin.setEncoding("utf8");
process.stdout.write(prompt);

process.stdin.on("readable", function() {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
            process.stdout.write("Shutting Down the Server\n");
            process.exit(0);
        } else {
            process.stdout.write(`Invalid command: ${command}\n`);
        }
            process.stdout.write(prompt);
            process.stdin.resume();
    }
});