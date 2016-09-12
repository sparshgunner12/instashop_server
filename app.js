var express = require('express')
  , fs = require('fs')
  , util = require('util')
  , session = require('express-session')
  , bodyParser = require("body-parser")
 // , cookieParser = require("cookie-parser")
 // , methodOverride = require('method-override')
  , mc = require('mongodb').MongoClient
  , ObjectId = require('mongodb').ObjectID
  , fs = require('fs')
 // , io = require("socket.io")
  ;

var mongoStore = require('connect-mongo')(session);

var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var inventory = JSON.parse(fs.readFileSync('inventory.json', 'utf8'));
var shops = JSON.parse(fs.readFileSync('shops.json', 'utf8'));
console.log(inventory);
console.log(shops);

var MONGO_URL = 'mongodb://localhost:27017/test';
var mdb = null;

mc.connect(MONGO_URL, function(err, db){
  mdb = db;
  mdb.collection('inventory').deleteMany( {}, function(err, results) {
      if (err) {
        console.log(err);
        return;
      }
      console.log("collection inventory deleted successfully");
   });

  mdb.collection('shops').deleteMany( {}, function(err, results) {
      if (err) {
        console.log(err);
        return;
      }
      console.log("collection shops deleted successfully");
   });

  mdb.createCollection("inventory", {strict: true}, function(err, collection) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("collection inventory created successfully");
  });

  mdb.createCollection("shops", {strict: true}, function(err, collection) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("collection shops created successfully");
  });

  mdb.collection("inventory").insertMany(inventory, function(err, results) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("inserted inventory row count: " + results.insertedCount);
  });

  mdb.collection("shops").insertMany(shops, function(err, results) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("inserted shops row count: " + results.insertedCount);
  });
});

var app = express();

//app.use(logger());
//app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
//app.use(methodOverride());
app.use(session({ store: new mongoStore({ url: MONGO_URL }), secret: 'keyboard cat' }));

var sendShopLocations = function(index, list_of_beacons, list_of_shops, cb) {
  console.log(list_of_beacons.length);
  if (index == list_of_beacons.length) {
    cb(list_of_shops);
    return;
  } else if (index < list_of_beacons.length) {
    mdb.collection('shops').find({beaconIds: list_of_beacons[index].id}).toArray(function(err, data) {
      if (!err) {
        if (data.length != 0) {
          data[0].signalStrength = list_of_beacons[index].signalStrength;
          //console.log(data[0]);
          list_of_shops.push(data[0]);
        }
      }
      sendShopLocations(index + 1, list_of_beacons, list_of_shops, cb);
    });
  }
};

app.post('/getstores',function(req, res) {
  console.log(req.body.shop_identifiers);
  shop_identifiers = JSON.parse(req.body.shop_identifiers);
  list_of_beacons = shop_identifiers['beacons'];
  console.log(list_of_beacons);
  gps_location = shop_identifiers['location'];
  console.log(gps_location);
  sendShopLocations(0, list_of_beacons, [], function(list_of_shops) {
    res.setHeader('Content-Type', 'application/json');
    var new_list_above = [], new_list_below = [];
    var min_val = {};
    for (var i = 0; i < list_of_shops.length; ++i) {
      if (list_of_shops[i].signalStrength >= -65) {
        new_list_above.push(list_of_shops[i]);
      } else {
        new_list_below.push(list_of_shops[i]);
      }
    }
    if (new_list_above.length == 0) {
      console.log(new_list_below);
      res.send(new_list_below);
    } else {
      console.log(new_list_above);
      res.send(new_list_above);
    } 
  });
});

app.post('/getproduct',function(req, res) {
  barcode = req.body.barcode;
  shopId = parseInt(req.body.shopId);
  console.log(barcode);
  console.log(shopId);
  mdb.collection('inventory').find({barcode: barcode, shopId: shopId}).toArray(function(err, data) {
      res.setHeader('Content-Type', 'application/json');
      if (!err) {
        if (data.length != 0) {
          mdb.collection('inventory').deleteOne({product_barcode: barcode}, function(err, results) {
            if (err) {
              res.send("");
            } else {
              console.log(data[0]);
              res.send(data[0]);
            }
          });
        } else {
          res.statusCode = 404;
          res.send("");
        }
      } else {
        res.statusCode = 404;
        res.send(null);
      }
    });
});

//sendShopLocations(0, ["abcd"], [], function(list_of_shops) { console.log(list_of_shops); });
app.listen(config.port);
