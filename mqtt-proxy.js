var mqtt = require('mqtt')
  , util = require('util');


function refreshMap(){
    // Replace with an on HUP signal and rebuild with reg ex?
    return  require(__dirname + '/' + process.argv[3] ||  'map.json');
}

function getMap(packet){
 var maps = refreshMap();
 var map;

 test = function(a,b){
    b = (b === 'undefined') ? "":b;
    s = new RegExp(a.replace('*','\.*') + '$')
    return s.test(b);
 }

 for (i in maps){
    if (this.test(maps[i].username,packet.username) &&
        this.test(maps[i].clientId,packet.clientId)){
        map = i; // find first match
        break;
    }
 }
 return (map === 'undefined') ? null: maps[map]; 
}


new mqtt.Server(function(client) {
  var self = this;

  if (!self.proxies) self.proxies = {};
  if (!self.clients) self.clients = {};

  process.on('SIGINT', function() {
    console.log('Received interrupt');
    for (c in self.clients){
      self.clients[c].emit('close');
    }
    process.exit();
});


  
  client.on('connect', function(packet) {
    client.id = packet.clientId;
    console.log("CONNECT: client id: " + client.id);
    client.subscriptions = [];

    var options ={}
    var map = getMap(packet)
    if (!map){
        client.connack({returnCode:3});
        return;
    }
    options.port = map.port;
    options.host = map.host;
    if ('username' in packet){
        options.username = packet.username;
        options.password = packet.password;
    }
    options.clientId = packet.clientId;
    options.clean = packet.clientId;
    options.keepalive = packet.keepalive;
    options.dup = packet.dup;
    options.qos = packet.qos;
    options.protocolVersion = packet.protocolVersion;
    options.protocolId = packet.protocolId;
    self.proxies[client.id] = mqtt.connect(options);
    self.clients[packet.clientId] = client;

    var proxy = self.proxies[client.id]

    proxy.on('connect',function(){
        console.log('Proxy connect')
        client.connack({returnCode:0});
     });

    proxy.on('suback',function(_packet){
        console.log('Proxy suback');
        client.suback({messageId: _packet.messageId, granted: _packet.qos});
    });

    proxy.on('message',function(topic,payload,qos){
 
    var c = client;
    for (var i = 0; i < c.subscriptions.length; i++) {
        var s = c.subscriptions[i];
        if (s.test(topic)) {
            c.publish({topic: topic, payload: payload});
            break;
        }
      }
    });

    // Not sure if we need these ... 
    proxy.on('puback',function(_packet){
        client.puback(_packet) 
    });

    proxy.on('pubrel', function (_packet) {
        client.pubrel(_packet);
    });

    proxy.on('pubrec', function (_packet) {
      	client.pubrel(_packet);
    });

    proxy.on('suback',function(_packet){
      client.suback({
        messageId: _packet.messageId,
        granted: _packet.subscriptions.map(function (e) {
          return e.qos;
        })
      });
    });
    
    
    proxy.on('disconnect',function(rc){
      console.log('Proxy disconnect');
     });

    proxy.on('close',function(e){
      console.log('Proxy close ' + (e != 'undefined') ? e:"");
      client.connack({returnCode:1}); // Todo: Add error codes - i.e. convert ECONNREFUSED to 1 )
      client.stream.end();
      delete self.clients[packet.clientId];
      delete self.clients[client.id];
    })

    proxy.on('error', function(e) {
      console.log('Proxy error ' + (e === 'undefined')?'':e);
      client.error(e);
    });
  });

  client.on('subscribe', function(packet) {
    var granted = [];

    console.log("SUBSCRIBE(%s): %j", client.id, packet);

    for (var i = 0; i < packet.subscriptions.length; i++) {
      var qos = packet.subscriptions[i].qos
        , topic = packet.subscriptions[i].topic
        , reg = new RegExp(topic.replace(new RegExp('\/',"g"),'\\/').replace('\$','\\$').replace('+', '[^\/]+').replace('#', '.+','g') + '$');

      granted.push(qos);
      client.subscriptions.push(reg);
      if (client.id in self.proxies)
          self.proxies[client.id].subscribe(topic,qos);
    }
  });

  client.on('publish', function(packet) {
    console.log("PUBLISH(%s): %j", client.id, packet);
    if (client.id in self.proxies)
        self.proxies[client.id].publish(packet.topic, packet.payload,packet.qos)
  });

  client.on('pingreq', function(packet) {
    console.log('PINGREQ(%s)', client.id);
    if (client.id in self.proxies && self.proxies[client.id].connected)
       client.pingresp();
  });

  client.on('disconnect', function(packet) {
    console.log("Got disconnect")
    if (client.id in self.proxies)
        self.proxies[client.id].end();
  });

  client.on('close', function(packet) {
    console.log("Close event")
    if (client.id in self.proxies)
        self.proxies[client.id].end();
  });

  client.on('error', function(e) {
    client.stream.end();
    console.log((e == 'undefined') ? 'error':e);
  });
}).listen(process.argv[2] || 1883);

