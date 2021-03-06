var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var app = express();


// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/unit18Populater";

// mongoose.connect("mongodb://localhost/unit18Populater", { useNewUrlParser: true });
mongoose.connect(MONGODB_URI), { useNewUrlParser: true };


// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.newsobserver.com/sports/college/acc/duke/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("#story-list article .title").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");
      result.summary = $(this)
        .siblings(".summary")
        .text()

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.redirect("/");
  });
});

app.get("/", function (req, res) {
  db.Article.find({})
    .then(function (dbArticles) {
      // If we were able to successfully find Articles, send them back to the client
      var dbArticles = {
        dbArticles: dbArticles
      }
      res.render("index", dbArticles)

      // res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/articles-notes/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })   // ..and populate all of the notes associated with it
    .then(function (selectedArticleNotes) {
      var selectedNotes = {
        selectedArticleNotes: selectedArticleNotes.note,
        id: req.params.id
      }
      // res.json(selectedNotes)
      res.render("viewnotes", selectedNotes)
      // console.log("Selected for hbs  " + selectedNotes)
      // console.log("selected   " + selectedArticleNotes.note[0].dbNote.title)

    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  db.Article.find({})
    .then(function (data) {
      res.json(data)
    })
  // Grab every document in the Articles collection
});


// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })   // ..and populate all of the notes associated with it
    .then(function (selectedArticle) {
      var selectedArticle = {
        selectedArticle: selectedArticle
      }
      console.log(selectedArticle)
      // If we were able to successfully find an Article with the given id, send it back to the client
      // res.render("notes", selectedArticle);
      res.render("notes", selectedArticle)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  articleId = req.params.id
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function (dbNote) {
      console.log(dbNote)
      return db.Article.update({ _id: articleId }, { $push: { "note": { dbNote } } })
        .then(function () {
          res.status(200)
        })
        .catch(function (err) {
          // If an error occurred, send it to the client
          res.json(err);
        });
    });
})

app.post("/read/:id", function (req, res) {
  articleId = req.params.id
  db.Article.findOneAndUpdate(
    { _id: articleId },
    { $set: { read: true } })
    .then(function () {
      res.status(200)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.post("/unread/:id", function (req, res) {
  articleId = req.params.id
  db.Article.findOneAndUpdate(
    { _id: articleId },
    { $set: { read: false } })
    .then(function () {
      res.status(200)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.post("/delete/", function (req, res) {  
  db.Article.remove({})
    .then(function () {
      res.status(200)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
