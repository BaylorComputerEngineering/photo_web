#!/usr/bin/env node

// include bonescript library
var b = require('bonescript');

// include the file system library to allow access to system files
var fs = require('fs');

// create a web server and set the callback to serverHandler
// the callback will be called when you connect to the web
// page from the browser
var app = require('http').createServer(serverHandler);

// use the socket.io library to listen for updates for updates from the browser
var io = require('./node_modules/socket.io').listen(app);

// listen for updates from the web browser on port 8085
app.listen(8085);

// turn websockets on and call the onConnect callback when a connection
// from the web browser is initiated
io.sockets.on('connection', onConnect);

// declare htmlPage variable to tell the server which web page to serve
var htmlPage = 'photo_web.html';

// declare variables
var ADC_PIN = "P9_39";
var soc;
var monitorRequested = false;
var pin1 = 0;
var adc_val = 0;
var units = 0;
var led_brightness = 0;

// print to console that the program is starting
console.log("Starting photosensor web server")

// check the ADC pin every 100ms
setInterval(check_adc, 100);

// this is the callback from the createServer call above that is called when a 
// browser tries to connect to the webpage.  You can ignore the details of this function.
function serverHandler(req, res) 
{
    fs.readFile(htmlPage, function(err, data) 
    {
        if (err) 
        {
            res.writeHead(500);
            return res.end('Error loading file: ' + htmlPage);
        }
        res.writeHead(200);
        res.end(data);
    }
    );
}

// this is the callback that is called when a connection is made with the web browser
// it is used to set up callbacks based on messages that could be received from the 
// web page.  For instance, if this js program receives a websocket message called 'monitor'
// at any point while the program is running, it will automatically call handleMonitorRequest
function onConnect(socket) 
{
    // set up callback for monitor message
    socket.on('monitor', handleMonitorRequest);

    // set up callback for switchUnits message
    socket.on('switchUnits', handleSwitchUnits);
    
    // set up callback for loadValues message
    socket.on('loadValues', handleLoadValues);

    // save the socket identifier in a variable
    soc = socket;
}

// this is the callback for the switchUnits message
// if the switchUnits message is received from the web page,
// this function will change the units variable
function handleSwitchUnits()
{
    if(units == 0)
        units = 1;
    else
        units = 0;
}

// this is the callback for the loadValues message
// if the loadValues message is received from the web page,
// this function is called and the values from that loadValues
// message are containted in the data argument
function handleLoadValues(data)
{
    // print the min and max to the console
    console.log('min = ' + data.minValue);
    console.log('max = ' + data.maxValue);
    
    // put the min and max into a string, separated by a space
    var min_max_values = data.minValue + " " + data.maxValue;
    
    // write the string to a file in this directory called min_max_values_file
    // this file will be read by your C program
    fs.writeFile("./min_max_values_file", min_max_values , function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
    
}

// this is the callback from the monitor message
// it allows the webpage to tell the server that it wants a pin monitored and
// specifies the name of the pin as an argument
function handleMonitorRequest(pin) 
{
    // save the argument value pin into a variable pin1
    pin1 = pin;
    
    // save state variable that indicates that a pin monitor is requested
    monitorRequested = true;
}

// this function is called by the setInterval function
function check_adc()
{
    // call analog read to get the ADC value using BoneScript
    // the value is not returned by the function.  Rather, the second 
    // argument is the name of a callback that receives and argument 
    // that contains the value
    b.analogRead(ADC_PIN, processADC);
}

// this is the callback from the analogRead in check_adc
// the argument x is a structure that contains the value read
// by the analogRead function
function processADC(x) 
{
    // store the ADC value by accessing x.value
    adc_value = x.value;
    
    // if the units variable is 1, then change the units to 0-4095
    // else, leave the value in 0-1.0 format (default for analogRead function)
    if(units == 1)
        adc_value = adc_value*4095;

    // if the web page has requested that we monitor the pin, then send the pin data to the web page
    if(monitorRequested)
    {
        // emit (send) the update to the webpage with a message name of pinUpdate
        // the data in the message is in JSON format, which has a form of tag1:value1, tag2:value2, etc
        // for instance, for an ADC value of 2145, the message sent to the webpage would be:
        // pin:photo_pin,adc_value:2145
        soc.emit("pinUpdate", '{"pin":"' + pin1 + '", "adc_value":' + adc_value + '}');
    }        
}


