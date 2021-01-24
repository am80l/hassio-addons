'use strict';

const ScreenLogic = require('./index');

var myArgs = process.argv.slice(2);

// use this to remote connect to a system by name (going through the Pentair servers)
const systemName = 'Foobar: '+ myArgs[1];
const password = myArgs[2];
var remote = new ScreenLogic.RemoteLogin(systemName);
remote.on('gatewayFound', function(unit) {
  remote.close();
  if (unit && unit.gatewayFound) {
    console.log('unit ' + remote.systemName + ' found at ' + unit.ipAddr + ':' + unit.port);
    connect(new ScreenLogic.UnitConnection(unit.port, unit.ipAddr, password));
  } else {
    console.log('no unit found by that name');
  }
});

remote.connect();

function connect(client) {
  var pumpID = 0;
  var numPumps = 0;
  client.on('loggedIn', function() {
    this.getVersion();
  }).on('version', function(version) {
    this.getPoolStatus();
  }).on('poolStatus', function(status) {
    this.getChemicalData();
    console.log('pentair/pooltemp/state,' + status.currentTemp[0]);
    try { console.log('pentair/spatemp/state,' + status.currentTemp[1]); } catch {}
    console.log('pentair/airtemp/state,' + status.airTemp);
    if(status.heatMode[0] == 3)
    {
      console.log('pentair/heater/pool/mode/state,heat');
    }
    else
    {
      console.log('pentair/heater/pool/mode/state,off');
    }
    try {
      if(status.heatMode[1] == 3)
      {
        console.log('pentair/heater/spa/mode/state,heat');
      }
      else
      {
        console.log('pentair/heater/spa/mode/state,off');
      }
    }
    catch {}
    console.log('pentair/heater/pool/setpoint/state,' + status.setPoint[0]);
    try { console.log('pentair/heater/spa/setpoint/state,' + status.setPoint[1]); } catch {}
    console.log('pentair/saltppm/state,' + status.saltPPM);
    console.log('pentair/ph/state,' + status.pH);
    console.log('pentair/orp/state,' + status.orp);
    console.log('pentair/saturation/state,' + status.saturation);
    var i;
    for(i = 0; i < status.circuitArray.length; i++)
    {
      console.log('pentair/circuit/' + status.circuitArray[i].id + '/state,' + (status.circuitArray[i].state ? 'ON' : 'OFF'));
    }
  }).on('chemicalData', function(chemData) {
    this.getControllerConfig();
    console.log('pentair/calcium/state,' + chemData.calcium);
    console.log('pentair/cyanuricacid/state,' + chemData.cyanuricAcid);
    console.log('pentair/alkalinity/state,' + chemData.alkalinity);
  }).on('controllerConfig', function(config) {
    var i;
    for(i = 0; i < config.pumpCircArray.length; i++)
    {
      if (config.pumpCircArray[i] != 0)
      {
        numPumps++;
      }
    }
    if (numPumps > 0)
    {
      this.getPumpStatus(pumpID);
    }
    else{
      this.getSaltCellConfig();
    }
  }).on('getPumpStatus', function(status) {
    console.log('pentair/pump/'+pumpID+'/watts/state,' + status.pumpWatts);
    console.log('pentair/pump/'+pumpID+'/rpm/state,' + status.pumpRPMs);
    console.log('pentair/pump/'+pumpID+'/gpm/state,' + status.pumpGPMs);
    if (pumpID < numPumps-1)
    {
      pumpID = pumpID + 1;
      this.getPumpStatus(pumpID);
    }
    else
    {
      this.getSaltCellConfig();
    }
  }).on('saltCellConfig', function(saltCellConfig) {
    console.log('pentair/saltcellstatus/state,' + saltCellConfig.status);
    console.log('pentair/saltcelllevel1/state,' + saltCellConfig.level1);
    console.log('pentair/saltcelllevel2/state,' + saltCellConfig.level2);
    client.close();
  });

  client.connect();
}
