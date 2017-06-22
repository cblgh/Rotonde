var express = require("express");
var http = require("http");
var path = require("path");
var logger = require("morgan");
var static = require("serve-static");
var bodyparser = require("body-parser");
var methodOverride = require("method-override");
var app = express();
var fs = require("fs");
var request = require("request");

var public = path.join(__dirname, "/public");
// var cblgh = require("./cblgh-utils.js");
const url = require("url");

app.use(logger("dev"));
app.use(static(public));
app.set("port", "8077");
app.set("view engine", "html");
app.use(bodyparser.json());
app.set("json spaces", 4);
app.use(bodyparser.urlencoded({ extended: true}));
app.use(methodOverride());

// enable CORS to allow the server to respond to ajax requests
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(function(req, res, next) {
   if(req.url.substr(-1) == "/" && req.url.length > 1)
       res.redirect(301, req.url.slice(0, -1));
   else
       next();
});

app.get("/", function(req, res) {
    res.sendFile(public + "/rotonde.json");
});

app.get("/feed", function(req, res) {
    res.sendFile(public + "/rotonde.json");
});

app.get("/show", function(req, res) {
    var rotondeInfo = JSON.parse(fs.readFileSync(public + "/rotonde.json"));
    var posts = {};
    var counter = 0;

    function handleRequest(counter, name, data) {
        posts[name] = JSON.parse(data);
        // we've processed all of the portals, send the response
        if (counter == rotondeInfo["portal"].length - 1) {
            res.json(posts);
        }
    }

    rotondeInfo["portal"].forEach(function(portal) {
        request(portal, function(err, resp, body) {
            handleRequest(counter++, portal, body);
        });
    });
});

// app.get("*", function(req, res) {
//     res.redirect("/");
// });

var server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
