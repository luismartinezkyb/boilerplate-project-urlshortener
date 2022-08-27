require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const dns = require('dns');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const mySecret = process.env.MONGODB_URI

//bd connection and schemas
mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true});

//schema 
const urlSchema = mongoose.Schema({
  original_url:           {type: String, required: true},
  short_url:              {type: Number, required: true},
});
const Url= mongoose.model ('Url', urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;
//middlewares
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}))
app.use('/public', express.static(`${process.cwd()}/public`));


//Routes
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


app.get('/api/shorturl/:short_url', (req, res)=>{
  const {short_url} = req.params;
  
  if(isNaN(short_url)){
    res.send({"error": "Wrong format"})
  }else{
    Url.findOne({short_url: short_url}, (err, data)=>{
      if(err){
        return console.error(err)
      }
      if(data && data.length !== 0){
        console.log(data)
        res.redirect(data.original_url);
      }
      else{
        res.send({"error": "No short URL found for the given input"});
      }
      
    })
  }
  
});

app.post('/api/shorturl',(req, res)=>{
  const {url} = req.body;
  let newURI = "";
  
  var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  var regURL = new RegExp(urlRegex, 'i');
  var urlVerified = url.length < 2083 && regURL.test(url);
  if (validUrl.isUri(url) && urlVerified){
      let regex = /([A-Za-z]+\.)?(\w+)\.(\w+)/g;
      if(url.match(regex)){
        newURI = url.match(regex).toString();  
      }
      else{
        newURI = url;
      }
      //check the DNS
      dns.lookup(newURI,(err, addresses) =>{
        if(err){
          res.send({"error": "Invalid Hostname"});
        }
        else{

          Url.findOne({original_url: url}, (err, data)=>{
            if(data){
              res.send({"original_url": data.original_url,"short_url": data.short_url});
            }
            else{
              Url.countDocuments().then((count_documents) => {
                const newShortURI = new Url ({
                  original_url: url,
                  short_url: count_documents+1,
                })
                
                newShortURI.save((err, data)=>{
                  if(err){
                    return res.status(400).send(err)
                  } 
                  console.log("newData",data)
                  res.send({"original_url": data.original_url,"short_url": data.short_url});
                })
              }).catch((err) => {
                return res.status(400).send(err)
              })
            }
          })
        } 
      });
      //res.send({"correct":newURI});
      
  } 
  else {
      res.send({"error": "Invalid URL"});
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

