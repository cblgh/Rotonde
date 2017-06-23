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

app.get("/portal/:portal", function(req, res) {
    function resolve(err, resp) {
        if (err) {
            res.status(400).json({"error": err});
        } else {
            res.json(resp);
        }
    }

    request("http://" + req.params.portal, function(err, resp, body) {
        if (err) {
            var errorType = err.code + ": invalid domain";
            resolve(errorType, null)
            return
        }
        try {
            var jason = JSON.parse(body);
            resolve(null, jason);
        } catch (err) {
            resolve("unable to parse json", null);
        }
    });
});

app.get("/crawl", function(req, res) {
    crawl("rotonde.cblgh.org", req, res);
})

app.get("/crawl/:start", function(req, res) {
    crawl(req.params.start, req, res);
})

function crawl(start, req, res) {
    var visited = [];
    visit(start) // visit first node
        .then(() => { // after everything has been crawled, return the network mapping
            res.json({"network size": visited.length, "network": visited});
        });

    function visit(portal) {
        return new Promise((resolve, reject) => {
            // replace http(s) at start, and trailing slashes
            portal = portal.replace(/^https?:\/\//, "").replace(/\/?$/, "");

            // we've already visited this portal
            if (visited.indexOf(portal) >= 0) {
                resolve();
                return;
            }

            console.log("going to visit", portal);
            visited.push(portal);
            request("http://" + portal, (err, resp, body) => {
                try {
                    var portal = JSON.parse(body);
                    Promise.all(portal.portal.map(visit)).then(resolve);
                } catch (err) {
                    resolve();
                }
            });
        });
    }
}

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
