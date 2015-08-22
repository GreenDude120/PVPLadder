var request = require("request")
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('pvp.db');
var ladderURL = "http://api.pathofexile.com/ladders/";
db.serialize();

var finalhandler = require('finalhandler')
var http = require('http')
var serveStatic = require('serve-static')
var express = require('express');

var rankingTable=[];
calculateRanking();


var eventsToFetch = [];

setInterval(function(){
    db.each("SELECT * FROM events WHERE ((eventid LIKE '%Fixed Seed Famine%') OR (enddate != 0 and enddate < ?)) and fetched = 0", new Date().getTime(), function(err, row) {
        if(eventsToFetch.indexOf(row.eventid)===-1){
            console.log("DETECTED FINISHED EVENT: " + row.eventid + "! DEMANDING ALPHA ACCESS NOW! (also fetching results)");
            eventsToFetch.push(row.eventid);
        }
        
    });
},10*1000);


var ival = setInterval(function(){
    if(!eventsToFetch.length){
        console.log("Apparently no ladders to fetch, waiting more...");
        return;
    }
    var fetchEvent = eventsToFetch.pop();
    console.log("Start grabbing " + fetchEvent);
    calculateRanking();
    processFullLadderForEvent(fetchEvent);
},75*1000);

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");
    db.close();
    process.exit();
});


function processFullLadderForEvent(eventId){
    var resultsPerRequest=200;
    var rankings=[];
    fetchJSON(ladderURL+escape(eventId), function(error, resp){
        if(error) {
            //TODO?
            return;
        }
        var amountOfFetches=Math.ceil(resp['total']/resultsPerRequest);
        for(var i=0;i<amountOfFetches;i++) { // 75*200=15000
            setTimeout(function(i){
                var offsetString="?offset="+(i*resultsPerRequest)+"&limit="+resultsPerRequest; // GGG API limits us to 200 per request
                var requestUrl=ladderURL+escape(eventId)+offsetString;
                console.log(requestUrl);
                fetchJSON(requestUrl, function(error, resp){
                    writeRankings(resp['entries'], eventId);
                    if(i>=amountOfFetches-1) {
                        db.run("UPDATE events set fetched=1 where eventid = ?", eventId);
                    }
                });
            },1000*i,i);
        }
    });
}


function fetchJSON(url, cb){
    request({
        url: url,
        json: true
    }, function (error, response, body) {
            cb(error || response.statusCode !== 200, body);
    });
}


function writeRankings(rankings, event){
        db.run("BEGIN TRANSACTION");
        rankings.forEach(function(r){
            db.run("INSERT INTO eventranking (accountname, charactername, class, points, event) VALUES (?, ?, ?, ?, ?)",
                r['account']['name'], r['character']['name'], r['character']['class'], r['character']['experience'], event);
        });
        db.run("END");
}

function calculateRanking() {
    var ranking = {};
    
    db.all("SELECT accountname, points from eventranking", function(err, rows) {
        for(var i=0;i<rows.length;i++){
            var r = rows[i];
            if(typeof(ranking[r['accountname']]) === 'undefined'){
                ranking[r['accountname']]=[];
            }
            ranking[r['accountname']].push(r['points']);
        }
        for(names in ranking){
            ranking[names].sort(function(a,b){return b-a;});
            ranking[names] = ranking[names].slice(0,3);
            if(ranking[names].length < 3) {
                delete ranking[names];
            }
        }
        rankingTable=[];
        for(names in ranking){
            rankingTable.push({name: names, score: stupidSum(ranking[names]).toFixed(2)});
        }
        rankingTable.sort(function(a,b){return b['score']-a['score'];});
        for(var i=0;i<rankingTable.length;i++){
            rankingTable[i]['rank']=i+1;
        }
    });
}


function stupidSum(a) {
    return (a[0] + a[1] + a[2]) / 3; //yes seriously!
}




var app = express();


app.get('/api/top/50', function(req, res) {
  res.json(rankingTable.slice(0,50));
});

app.get('/api/top/250', function(req, res) {
  res.json(rankingTable.slice(0,250));
});

app.get('/api', function(req, res) {
  res.json(rankingTable);
});

app.use('/', express.static(__dirname + '/'));

app.listen(process.env.PORT || 3412);

