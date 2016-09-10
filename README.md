Start using node app.js

Starts at port 3000. Configurable in config.json

/getstores
Params :
list_of_beacons : [list of shops]
gps_location : {lat : lat_value, lon: lon_value}

Return :
list of shops in decreasing order of confidence

/getproduct
Params:
barcode : The scanned barcode

Return:
matching product