# mqtt-proxy

This project aims to solve the problem of exposing matching individual clients to specific brokers via a single public facing host/port combination.

Configuration:

Edit map.json to create an array of maps.  Example file below.
[{"username": "*",  "clientId": "*", "host": "localhost", "port": "1883"}]

Matching:
1. A simple RegEx is performed between the client supplied parameters and those in the map.
2. The corresponding host and port are used with existing connection parameters proxied.

This is a relatively green project with debugging enabled; without a set of test scripts; and with no support yet for ssl/tls certificates

Please feel free to fork and improve.