

// WiFly server

var server = require('net'),
    fs = require('fs'),
    hbs = require('express-hbs'),
    redis = require('redis'),
    valid = require('validator');

var settings = JSON.parse(fs.readFileSync('/home/ubuntu/web_apps/CORE/apps.json'));
var port = settings['newsletter.com'].port

var SECRET =JSON.parse(fs.readFileSync(__dirname+'/secret.json'));
var sendgrid  = require('sendgrid')(SECRET.email.username, SECRET.email.password);
store = redis.createClient(settings.services.redis, 'localhost');

var express = require("express");

var app = express();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/public');          // looks for .html in /public
  app.set('view engine', 'hbs');             
  app.use(express.static(__dirname + '/public'));
  app.use('/static', express.static(__dirname +'/static'));
  app.use(express.cookieParser(SECRET.SECRET));   
  app.use(express.bodyParser());   
 // app.engine('.html', engines.handlebars);
});
app.engine('html', require('hbs').__express);   // hbs will load dynamic values

app.use(express.static(__dirname + "/public")); //use static files in ROOT/public folder

app.get("/", function(req, res){ //root dir
    if (!Serv.isAdmin(req)) {
        res.render('login')
        return;
    }
    store.get('emails', function(err,val){
        res.render('index', {emails:JSON.parse(val)});
    });
    
});

app.post("/auth", function(req, res){ //root dir
    if (!Serv.auth(req)) {
        res.render('login', {error:'you\'re credentials are wrong'})
        return;
    }
    res.cookie('admin', 'admin', { signed: true, maxAge:1000*60*60*24*5 });
    res.redirect('/');
});

app.post("/add", function(req, res){ //root dir
    if (!Serv.isAdmin(req)) 
        return;
    Serv.add(req.body.email, function(err, result){
        res.write(JSON.stringify({email: result, error:err}));
        res.end();
    });
});

app.post("/remove", function(req, res){ //root dir
    if (!Serv.isAdmin(req)) 
        return;
    Serv.remove(req.body.email, function(err, result){
        res.write(JSON.stringify({email: req.body.email, error:err}));
        res.end();
    });
});

app.get("/download", function(req, res){ //root dir
    if (!Serv.isAdmin(req)) {
        res.render('login')
        return;
    }
    res.download(Serv.emailPath);
});

var BODY,SUBJECT,NAV;
BODY = SUBJECT = NAV = '';
app.post("/setpreview", function(req, res){
    var c = 0;
    for (var i in req.body) {
        c++;
    }
    if (c){
        console.log('preview for ', req.body);
        BODY = req.body.body.split('\n').join('<br>').split('  ').join('&nbsp;');
        SUBJECT = req.body.subject;
        NAV = req.body.navbar.split('\n').join('<br>').split('  ').join('&nbsp;');
    }
    res.end();
});
app.get("/preview", function(req, res){
    var data = {tbody:BODY, subject:SUBJECT, navbar:NAV, layout:null, host:SECRET.host};
    res.render("preview",data);
});

app.post("/send", function(req, res){
    BODY = req.body.body.split('\n').join('<br>').split('  ').join('&nbsp;');
    SUBJECT = req.body.subject;
    NAV = req.body.navbar.split('\n').join('<br>').split('  ').join('&nbsp;');
    var data = {tbody:BODY, subject:SUBJECT, navbar:NAV, layout:null, host:SECRET.host};
    app.render('preview',data, function(err, html) {
        store.get('emails', function(err,d){
            if (req.body.testemail) {
                Serv.send([req.body.testemail],SUBJECT, html);
            }else{
                d = JSON.parse(d);
                Serv.send(d, SUBJECT,html);
            }
        });
        Serv.send([]);
    });
    res.render("preview",data);
});

app.get("/*", function(req, res){ 
    var page = req.url;//.replace('/','');
    console.log('requested '+page+' ');
    res.render("404",{page:page});
});




app.listen(port);
var Serv = {
    emailPath: __dirname + '/emails.txt',
    /*
        Check if authenticated
    */
    isAdmin: function(req){
        if (req.signedCookies.admin) 
            return true;
        else return false;
    },
    /*
        Check if you can be authenticated
    */
    auth: function(req){
        console.log(req.body);
        if (
            req.body.username == SECRET.admin.username
            &&
            req.body.password == SECRET.admin.password
            ) 
            return true;
        else return false;
    },
    /*
        initialize DB values or reset them if corrupted.
    */
    T:require('child_process').exec,
    init: function(){
        store.get('emails', function(e,val){
            if(!val||process.argv.indexOf('RESET') != -1) store.set('emails', JSON.stringify([]));
            if (!val) {
                store.set('backupemails', JSON.stringify([]));
            }
        });
        this.T('ls -1 | grep emails.txt | wc -l', function(e1,d,e2){
            var count = parseInt(d);
            
            if (!count) {
                fs.writeFileSync(Serv.emailPath, "EMAIL BACKUP\n");
                console.log('writing email file '+count, Serv.emailPath);
            }
        });
    },
    
    add: function(email, cb){
        if (!valid.isEmail(email)) {
            console.log('INVALID EMAIL');
            cb('INVALID EMAIL');
            return;
        }

        store.get('emails', function(err, val){
            val = JSON.parse(val);
            if (val.indexOf(email)!=-1) {
                cb("That email is already added.");
                return;
            }
            val.push(email);
            store.set('emails',JSON.stringify(val));
            fs.appendFile(Serv.emailPath, email+"\n");
            cb(null,email);
        });
    },
    remove: function(email, cb){

        store.get('emails', function(err, val){
            val = JSON.parse(val);
            var index = val.indexOf(email);
            if (index > -1) {
                val.splice(index, 1);
                store.set('emails',JSON.stringify(val));
                cb(null,email);
            }else cb('That email doesn\'t exist');
        });
    },
    
    send: function(emails, subject, body){
        var s = function(obj){
            sendgrid.send(obj, function(err, json) {
              if (err) { return console.error(err); }
              console.log(json);
            });
        };
        for (var i in emails)
            s({
              to:       emails[i],
              from:     'AMPLabnewsletter@gmail.com',
              subject: '[AMP Lab Newsletter] '+ subject,
              html:     body
            });
    }
};
Serv.init();
console.log('Listening on '+port);
 
