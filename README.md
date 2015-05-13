# mqtt-proxy

This project aims to solve the problem of matching individual clients to specific brokers via a single public facing host/port combination.

Usage

node mqtt-proxy &lt;port&gt; &lt;map&gt;

i.e.

node mqtt-proxy 1883 map.json

Map format

Edit map.json to create an array of maps.  Example file below:
<code>
[{"username": "*",  "clientId": "*", "host": "localhost", "port": "1883"}]
</code>

Matching:
<ul>
<li>1. A simple RegEx is performed between the client supplied parameters and those in the map.</li>
<li>2. The corresponding host and port are used with existing connection parameters proxied.</li>
</ul>

This is a relatively green project with debugging enabled; without a set of test scripts; and with no support yet for ssl/tls certificates

Please feel free to fork and improve.

<i>
Andrew McClure, Director AgSense -  Bringing I.o.T to NZ Agriculture
</i>