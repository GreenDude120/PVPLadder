var strptime = require('micro-strptime').strptime;
var TF="%Y-%m-%dT%H:%M:%S%Z";
var time="2014-11-19T12:00:00Z";
var d = strptime(time, TF);
console.log(d.getTime())

