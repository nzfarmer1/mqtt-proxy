var mqtt = require('mqtt')
  , util = require('util');
  


function refreshMap(){
    // Replace with an on HUP signal and rebuild with reg ex?
    return  require(__dirname + '/' + process.argv[3] ||  'map.json');
}

function getMap(client){
 var maps = refreshMap();
 var map;

 test = function(a,b){
    b = (b === 'undefined') ? "":b;
    s = new RegExp(a.replace('*','\.*') + '$')
    return s.test(b);
 }

 for (i in maps){
    if (this.test(maps[i].username,client.username) &&
        this.test(maps[i].clientId,client.clientId)){
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

  client.now = function(){
    return (new Date()).valueOf();
  };
  
  client.on('connect', function(packet) {
    
    client.timestamp = client.now();
    client.id = packet.clientId +'-' + client.timestamp;
    console.log("CONNECT: client id: " + client.id);
    client.subscriptions = [];

    var options ={}
    options.clientId = client.id;
    if ('username' in packet){
        options.username = packet.username;
        options.password = packet.password;
    }

    var map = getMap(packet)
    if (!map){
        client.connack({returnCode:3});
        return;
    }

    options.port = map.port;
    options.host = map.host;
    options.clean = packet.clean;
    options.keepalive = packet.keepalive;
    client.keepalive = packet.keepalive;
    options.dup = packet.dup;
    options.qos = packet.qos;
    options.protocolVersion = packet.protocolVersion;
    options.protocolId = packet.protocolId;
    
  
    self.proxies[client.id] = mqtt.connect(options);
    self.clients[client.id] = client;

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
        var delta  = Math.round(1/1000*(client.now() - client.timestamp));
        //console.log("Proxy on message (%s) ",client.keepalive - delta); 
        // ping requests are not proxied
        // so if client has gone away, close connections
        if (client.keepalive - delta < 0 ){
            console.log('Keep alive timeout on client');
            client.emit('close');
            return;
        } else {
            client.timestamp = client.now();
	}
            
            
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
      client.end();
      this.end();
      delete self.proxies[client.id];
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
       client.timestamp = (new Date()).valueOf();
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
    client.end();
    delete self.proxies[client.id];
    delete self.clients[client.id];
  });


  client.on('error', function(e) {
    client.stream.end();
    delete self.proxies[client.id];
    delete self.clients[client.id];
    console.log('Client error ' + (e === 'undefined') ? '':e);
  });
  
  
}).listen(process.argv[2] || 1883);

