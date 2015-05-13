# mqtt-proxy

This project aims to solve the problem of matching individual clients to specific brokers via a single public facing host/port combination.

Usage:

node mqtt-proxy &lt;port&gt; &lt;map&gt;

i.e.

node mqtt-proxy 1883 map.json

Map format:

Edit map.json to create an array of maps.  Example file below:
</p>
<pre>
[{"username": "*",  "clientId": "*", "host": "localhost", "port": "1883"}]
</pre>

Matching:
<ol>
<li>A simple RegEx is performed between the client supplied parameters and those in the map.</li>
<li>The corresponding host and port are used with existing connection parameters proxied.</li>
</ol>

This is a relatively green project with debugging enabled; without a set of test scripts; and with no support yet for ssl/tls certificates

Please feel free to fork and improve.

<i>
Andrew McClure, Director <a href="http://agsense.co.nz">AgSense</a> -  Bringing I.o.T to NZ Agriculture
</i>

<b><a href="https://payment.swipehq.com/?product_id=EB82DA1340C7E">Koha (Donation)</a> - If you like our work and would like to make a small donation to help us continue</b>

