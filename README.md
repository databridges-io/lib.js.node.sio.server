![](https://img.shields.io/badge/Licence-Apache%202.0-green.svg)![](https://shields.io/badge/node.js-%3E=10.0%20LTS-blue)

# Databridges Node.js server Library


DataBridges makes it easy for connected devices and applications to communicate with each other in realtime in an efficient, fast, reliable and trust-safe manner. Databridges Node.js client library allows you to easily add realtime capabilities to your applications in record time.

## Usage Overview

The following topics are covered:
- [Supported platforms](#supported-platforms)
- [Installation](#installation)
- [Initialization](#initialization)
- [Global Configuration](#global-configuration)
  - [Required](#required)
  - [Optional](#optional)
- [Connection](#connection)
- [Objects](#objects)
- [object:ConnectionState](#objectconnectionstate)
  - [Properties](#properties)
  - [Bind to connectionstate events](#bind-to-connectionstate-events)
  - [Functions](#functions)
- [object:Channel](#objectchannel)
  - [Subscribe to Channel](#subscribe-to-channel)
  - [Channel Information](#channel-information)
  - [Publish to Channel](#publish-to-channel)
  - [Send Message to Members / sessionID](#send-message-to-members--sessionid)
  - [Binding to events](#binding-to-events)
  - [System events for channel object](#system-events-for-channel-object)
- [object: rpc (Remote Procedure Call)](#object-rpc-remote-procedure-call)
  - [Initialize rpc Server](#initialize-rpc-server)
  - [Register rpc functions](#register-rpc-functions)
  - [Register Server](#register-server)
  - [Unregister Server](#unregister-server)
  - [resetqueue()](#resetqueue)
  - [System events for rpc server registration.](#system-events-for-rpc-server-registration)
  - [Server Information](#server-information)
  - [Connect to Server](#connect-to-server)
  - [Execute Remote Procedure Call](#execute-remote-procedure-call)
- [object:Cf (Client Function)](#objectcf-client-function)
  - [Execute Client Functions](#execute-client-functions)
  - [Properties](#properties)
- [Change Log](#change-log)
- [License](#license)

## Supported platforms

Node.js version 10 or newer. (The current Long Term Support (LTS) release is an ideal starting point).

## Installation

You can use NPM package manager to install the package.

```bash
npm install databridges-sio-server-lib --save
```

> Note : Databridges library uses socket.io for websocket protocol management.

## Initialization

```js
const dbridge = require('databridges-sio-server-lib');
const dbridge = new dBridges();
```

## Global Configuration

### Required

The following is the list of required connection properties before connecting to dataBridges network.

```javascript
dbridge.auth_url = 'URL';
dbridge.appkey = 'APP_KEY';
dbridge.appsecret = 'APP_SECRET';
```

You need to replace `URL` , `APP_KEY` and `APP_SECRET` with the actual URL ,Application Key and Application Secret.

| Properties  | Description                                                  | Exceptions                                               |
| ----------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| `auth_url`  | *(string)* Authentication url from  [dataBridges dashboard](https://dashboard.databridges.io/). | `source: DBLIB_CONNECT` <br />`code: INVALID_URL`        |
| `appkey`    | *(string)* Application Key from  [dataBridges dashboard](https://dashboard.databridges.io/). | `source: DBLIB_CONNECT` <br />`code: INVALID_AUTH_PARAM` |
| `appsecret` | *(string)* Application Secret from  [dataBridges dashboard](https://dashboard.databridges.io/). | `source: DBLIB_CONNECT` <br />`code: INVALID_AUTH_PARAM` |

### Optional

The following is the list of optional connection properties before connecting to dataBridges network.

```javascript
dbridge.maxReconnectionRetries = 10;
dbridge.maxReconnectionDelay = 120000; 
dbridge.minReconnectionDelay = 1000 + Math.random() * 4000;
dbridge.reconnectionDelayGrowFactor = 1.3;
dbridge.minUptime = 200 ; 
dbridge.connectionTimeout = 10000;
dbridge.autoReconnect = true; 
dbridge.cf.enable = false; 
```

| Properties                    | Default                       | Description                                                  |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `maxReconnectionDelay`        | `10`                          | *(integer)* The maximum delay between two reconnection attempts in seconds. |
| `minReconnectionDelay`        | `1000 + Math.random() * 4000` | *(integer)* The initial delay before reconnection in milliseconds (affected by the `reconnectionDelayGrowFactor` value). |
| `reconnectionDelayGrowFactor` | `1.3`                         | *(float)* The randomization factor used when reconnecting (so that the clients do not reconnect at the exact same time after a server crash). |
| `minUptime`                   | `200`                         | *(integer)* Uptime before `connected` event is triggered, value in milliseconds. |
| `connectionTimeout`           | `10000`                       | *(integer)* Number of milliseconds the library will wait for a connection to be established. If it fails it will emit a `connection_error` event. |
| `maxReconnectionRetries`      | `10`                          | *(integer)* The number of reconnection attempts before giving up. |
| `autoReconnect`               | `true`                        | *(boolean*) If false, library will not attempt reconnecting. |
| `cf.enable`                   | `false`                       | *(boolean)* Enable exposing *client function* for this connection. (Check *Client Function* section for details.) |

## Connection

Once the properties are set, use `connect()` function to connect to dataBridges Network.

```javascript
dbridge.connect().catch((err) => {
    console.log('dBridges Connection exception..', err.source, err.code, err.message);
});
```

#### Exceptions: 

| Source        | Code                   | Message                         | Description                                                  |
| ------------- | ---------------------- | ------------------------------- | ------------------------------------------------------------ |
| DBLIB_CONNECT | INVALID_URL            |                                 | Value of `dbridge.auth_url` is not a valid dataBridges authentication URL. |
| DBLIB_CONNECT | INVALID_AUTH_PARAM     |                                 | Value of `dbridge.appkey` **or** `dbridge.appsecret`  is not a valid dataBridges application key. |
| DBLIB_CONNECT | ACCESSTOKEN_FAILED     |                                 | `dbridge.appsecret` validation failed.                       |
| DBLIB_CONNECT | HTTP_                  | HTTP protocol reported message. | HTTP Errors returned during authentication process. ***HTTP Error code*** will be concatenated with `HTTP_` in the `err.code`. `eg. HTTP_501` |
| DBLIB_CONNECT | INVALID_CLIENTFUNCTION |                                 | If *"callback function"* is not declared for client function **or** `typeof()` variable defined is not a *"function"*. This is applicable only if clientFunction is enabled. *(Check Client Function section for details.)* |

#### sessionid *(string)*

```javascript
console.log(dbridge.sessionid);
```

Making a connection provides the application with a new `sessionid` that is assigned by the application. This can be used to distinguish the application's own events. A change of state might otherwise be duplicated in the application. It is also stored within the connection, and used as a token for generating signatures for private/presence/system channels/rpc functions.

#### disconnect *(function)*

To **close a connection** use disconnect function. When a connection has been closed explicitly, no automatic reconnection will happen.

```javascript
dbridge.disconnect();
```

## Objects

| Object            | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| `connectionstate` | connectionstate object expose properties, functions and events to monitor and manage the health of  dataBridges network connection. |
| `channel`         | channel object exposes **trust-safe** flexible Pub/Sub messaging properties, functions and events to build realtime event messaging / event driven applications at scale. |
| `rpc`             | rpc object exposes **trust-safe** properties, functions and events to provide reliable two-way messaging between multiple endpoints allowing you to build sophisticated asynchronous interactions. |
| `cf`              | CF (Client-function) object is a special purpose RPC implementation to build command and control applications. CF object exposes properties, functions and events for command and control applications to send messages to devices and application using dataBridges client library in **trust-safe manner **, build smart update configuration system and implement **trust-safe ** actions for remote and automated management. |



## object:ConnectionState

Connectionstate object expose properties, functions and events to monitor and manage the health of dataBridges network connection.

### Properties

The following is the list of connection state properties.

```javascript
console.log(dbridge.connectionstate.state);
console.log(dbridge.connectionstate.isconnected);
console.log(dbridge.connectionstate.rttms);
console.log(dbridge.connectionstate.reconnect_attempt);
```

| Property                            | Description                                                  |
| ----------------------------------- | ------------------------------------------------------------ |
| `connectionstate.state`             | *(String)* Current state of dataBridges network connection . List of Return Values are detailed below. |
| `connectionstate.isconnected`       | *(Boolean)* To verify if the application is still connected to the dataBridges network. |
| `connectionstate.rttms`             | *(integer)* Latency in milliseconds between your application and the dataBridges router where your application is connected. |
| `connectionstate.reconnect_attempt` | (integer) Number of reconnection attempted as of now.        |

##### connectionstate.state

| Return Values      | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| *connecting*       | Your application is now attempting to connect to dataBridges network. |
| *connected*        | The connection to dataBridges network is open and authenticated with your `appkey`. |
| *connection_break* | Indicates a network disconnection between application and dataBridges network. The library will initiate an automatic reconnection, if the reconnection property is set as true. |
| *connect_error*    | The dataBridges network connection was previously connected and has now errored and closed. |
| *disconnected*     | The application is now disconnected from the dataBridges network. The application will than need to initiate fresh connection attempt again. |
| *reconnecting*     | Your application is now attempting to reconnect to dataBridges network as per properties set for reconnection. |
| *reconnect_error*  | Reconnection attempt has errored.                            |
| *reconnect_failed* | The application will enter reconnect_failed state when all the reconnection attempts have been exhausted unsuccessfully. The application is now disconnected from the dataBridges network. The application will than need to initiate fresh connection attempt again |
| *reconnected*      | *The application has successfully re-connected to the dataBridges network,* This state will follow `connect_error` **or** `reconnect_error`. |

### Bind to connectionstate events

Apart from retrieveing state of a dBrige connection, application can bind to connectionstate events.

You can use the following methods on connectionstate object to bind to events.

```javascript
dbridge.connectionstate.bind(eventName, () => {});
dbridge.connectionstate.unbind(eventName);
dbridge.connectionstate.unbind();
```

`bind()` on `eventName` has callback functions to be defined where you can write your own code as per requirement.

To stop listening to events use `unbind(eventName)` function.

To stop listening to all events use `unbind()` *[without eventName]* function.

Below are library events which can be bind to receive information about dataBridges network.

#### System events for connectionstate object

```js
dbridge.connectionstate.bind("connecting", () => {
    console.log('connecting');
});
dbridge.connectionstate.bind("reconnecting", () => {
    console.log('reconnecting', "reconnect_attempt=", dbridge.connectionstate.reconnect_attempt);
});
dbridge.connectionstate.bind("disconnected", () => {
    console.log('disconnected');
});
dbridge.connectionstate.bind("reconnected", () => {
    console.log('reconnected');
}); 
dbridge.connectionstate.bind("connection_break", (payload) => {
    console.log('connection_break', payload.source, payload.code, payload.message);
});
dbridge.connectionstate.bind("state_change", (payload) => {
    console.log('state_change', dbridge.connectionstate.state, payload);
});
dbridge.connectionstate.bind("connect_error", (payload) => {
    console.log('connect_error', payload.source, payload.code, payload.message); 
});
dbridge.connectionstate.bind("reconnect_error", (payload) => {
    console.log('reconnect_error', payload.source, payload.code, payload.message);
}); 
dbridge.connectionstate.bind("reconnect_failed", (payload) => {
    console.log('reconnect_failed', payload.source, payload.code, payload.message); 
});
dbridge.connectionstate.bind("rttpong", (payload) => {
    console.log('rttpong', payload, dbridge.connectionstate.rttms);
}); 
dbridge.connectionstate.bind("connected", () => { 
    console.log('connected');
});
```
###### payload: `(dberror object)`

```javascript
{
    "source": "DBLIB_CONNECT" , 			// (string) Error source
    "code": "RECONNECT_ATTEMPT_EXCEEDED",	// (string) Error code 
    "message": "" 							// (string) Error message if applicable.
}
```

| Events             | Parameters                                         | Description                                                  |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| `connecting`       |                                                    | This event is triggered when your application is attempting to connect to dataBridges network. |
| `connected`        |                                                    | This event is triggered when connection to dataBridges network is open and authenticated with your `appkey.` |
| `connection_break` | *payload*                                          | *(dberror object)* Indicates a network disconnection between application and dataBridges network. The library will initiate an automatic reconnection, if the reconnection property is set as true. |
| `connect_error`    | *payload*                                          | *(dberror object)* This event is triggered when the dataBridges network connection was previously connected and has now errored and closed. |
| `disconnected`     |                                                    | The application is now disconnected from the dataBridges network. The application will than need to initiate fresh connection attempt again. |
| `reconnecting`     |                                                    | This event is triggered when  application is now attempting to reconnect to dataBridges network as per properties set for reconnection. |
| `reconnect_error`  | *payload*                                          | *(dberror object)* This event is triggered when reconnection attempt has errored. |
| `reconnect_failed` | *payload*                                          | *(dberror object)* reconnect_failed event is triggered when all the reconnection attempts have been exhaused unsuccessfully. The application is now disconnected from the dataBridges network. The application will than need to initiate fresh connection attempt again. |
| `reconnected`      |                                                    | This event is triggered when the connection to dataBridges network is open and reconnected after `connect_error` **or** `reconnect_error`. |
| `state_change`     | *payload* with `payload.previous, payload.current` | *(dict)* This event is triggered whenever there is any state changes in dataBridges network connection. Payload will have previous and current state of connection. |
| `rttpong`          | `payload`                                          | *(integer)* In Response to `rttping()` function call to dataBridges network, payload has latency in milliseconds between your application and the dataBridges router where your application is connected. |

#### dberror: 

| Source        | Code                       | Message                         | Description                                                  |
| ------------- | -------------------------- | ------------------------------- | ------------------------------------------------------------ |
| DBLIB_CONNECT | RECONNECT_ATTEMPT_EXCEEDED |                                 | Triggered when `reconnect_failed` event is raised.           |
| DBNET_CONNECT | DISCONNECT_REQUEST         |                                 | Triggered when `connect_error` event is raised.              |
| DBNET_CONNECT | RECONNECT_REQUEST          |                                 | Triggered when `connect_error`, `connection_break`  event is raised. |
| DBLIB_CONNECT | NETWORK_DISCONNECTED       |                                 | Triggered when `connect_error`, `reconnect_error`  event is raised. |
| DBLIB_CONNECT | INVALID_URL                |                                 | Value of `dbridge.auth_url` is not a valid dataBridges authentication URL. |
| DBLIB_CONNECT | INVALID_AUTH_PARAM         |                                 | Value of `dbridge.appkey` **or** `dbridge.appsecret`  is not a valid dataBridges application key. |
| DBLIB_CONNECT | ACCESSTOKEN_FAILED         |                                 | `dbridge.appsecret` validation failed.                       |
| DBLIB_CONNECT | HTTP_                      | HTTP protocol reported message. | HTTP Errors returned during authentication process. ***HTTP Error code*** will be concatenated with `HTTP_` in the `err.code`. `eg. HTTP_501` |
| DBLIB_CONNECT | INVALID_CLIENTFUNCTION     |                                 | If *"callback function"* is not declared for client function **or** `typeof()` variable defined is not a *"function"*. *(Check Client Function section for details.)* |

#### Exceptions: 

| Source             | Code              | Description                                                  |
| ------------------ | ----------------- | ------------------------------------------------------------ |
| DBLIB_CONNECT_BIND | INVALID_EVENTNAME | Invalid Event name. Not in defined events as above.          |
| DBLIB_CONNECT_BIND | INVALID_CALLBACK  | If *"callback function"* is not declared **or** `typeof()` variable defined is not a *"function"*. |

### Functions

#### rttping()

This method is to understand the latency in milliseconds between your application and the dataBridges router where your application is connected. Event `rttpong` is triggered once response  is received from dataBridges network. Bind to event:`rttpong` to retrieve the latency in ms. 

```js
// To get the last known Latency in milliseconds between your application and the dataBridges router where your application is connected.
// The dataBridges library exchanges rttms during the initial dataBridges network connection routine.
console.log(dbridge.connectionstate.rttms);

// To get the latest Latency in milliseconds between your application and the dataBridges router where your application is connected.
dbridge.connectionstate.rttping();

// Bind to rttpong, to get notified about the latest Latency in milliseconds between your application and the dataBridges router where your application is connected.
dbridge.connectionstate.bind("rttpong", (payload) => {
    console.log('rttpong', payload);
    //payload is an integer value is in millisecond which is same as dbridge.connectionstate.rttms.
});
```

#### Exceptions: 

| Source        | Code                 | Description                                      |
| ------------- | -------------------- | ------------------------------------------------ |
| DBLIB_RTTPING | NETWORK_DISCONNECTED | Connection to dataBridges network is not active. |



------



## object:Channel

channel object exposes **trust-safe** flexible Pub/Sub messaging properties, functions and events to build realtime event messaging / event driven applications at scale.

Concepts

- A message is attached to an event
- Group similar events into a channel
- Subscribe to a channel to receive all channel event messages. 
- Publish event message to the channel and it will be sent to all the channel subscribers who are connected to dataBridges network and online.
- if you need to have an access controlled channel, prefix the channel name with pvt: , prs: and sys: .
  - **Note** dataBridges have 2 seprate libraries (client lib, server lib).  You are reading the server library api document.
    - Server lib uses app.key along with secret to get  access to all channels including pvt: , prs: and sys: channels linked to the application.
    - Whereas application using client library (client application) will always need to pass a trust-token to access restricted channels (pvt: prs: sys: ) . A trust-token is a JWT document created using a combination of channelname + sessionid + app.secret. Trust token can be created by application having access to app.key's secret.
      - you can use your existing access control,  authorization and session identification rule-set, process and methods to create a trust-token instructing the dataBridges router to accept the pvt: prs: and sys: channel subscription, connection of from client application.
      - Trust-tokens allows you to enable secured, access controlled and compliance driven realtime event driven messaging in your existing and new initiative applications.


dataBridges library supports **4** types of channel. The *namespace is the  4 characters* preceding the channelName (`pvt:,prs:,sys:`), identifying which type of channel the application is connecting to.

| Channel Type | Channel Name Style | Description                                                  |
| ------------ | ------------------ | ------------------------------------------------------------ |
| Public       | channelName        | Public channel is used to send and receive messages that are to be publicly available. This channel type does not require any trust authorization token to subscribe. <br />*e.g  channelName =* `mychannel` |
| Private      | **pvt:**channeName | Private channels is restricted channel. *e.g  channelName =* `pvt:mychannel` |
| Presence     | **prs:**channeName | Presence channels is a specialized private channel with additional feature of presence awareness. Subscribing to presence channel allows application to be notified of members joining / leaving the channel. *e.g  channelName =* `prs:mychannel` |
| System       | **sys:**channeName | System channel is a specialized Presence channel to build command and control applications. Using System channel to create command and control server applications to send messages to devices and application using dataBridges library in **trust-safe manner **, build smart update configuration system and implement **trust-safe ** actions for remote and automated management. System channel allows application to send and receive messages with the server application (using dataBridges server library). <br />*e.g  channelName =* `sys:systeminfo` |

### Subscribe to Channel

Application that subscribes to a channel will receive messages and can send messages.

#### subscribe()

The default method for subscribing to a channel involves invoking the `channel.subscribe` function of your dataBridges object:

```js
try {
    const subscribed_channel = dbridge.channel.subscribe('mychannel');
} catch (err) {
    console.log(err.source, err.code, err.message);
}
```

| Parameter | Rules                                                        | Description                                     |
| --------- | ------------------------------------------------------------ | ----------------------------------------------- |
| `string`  | `channelName` **OR**<br />`pvt:channelName` **OR**<br />`prs:channelName` **OR**<br />`sys:channelName`**OR**<br />`sys:*` | *channelName* to which subscription to be done. |

| Return Type | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `object`    | *channel* object which events and related functions can be bound to. |

Application can directly work with dataBridges object without using Channel object. 

```js
try {
    dbridge.channel.subscribe('mychannel');
} catch (err) {
    console.log(err.source, err.code, err.message);
}
```

##### Exceptions: 

| Source                  | Code                       | Description                                                  |
| ----------------------- | -------------------------- | ------------------------------------------------------------ |
| DBLIB_CHANNEL_SUBSCRIBE | NETWORK_DISCONNECTED       | Connection to dataBridges network is not active.             |
| DBLIB_CHANNEL_SUBSCRIBE | INVALID_CHANNELNAME        | Applicable for below conditions <br />1. *channelName* is not defined.<br />2. *channelName* validation error, `typeof()`  *channelName*  is not type string<br />3. *channelName* validation error, *channelName* fails `a-zA-Z0-9\.:_-` validation. |
| DBLIB_CHANNEL_SUBSCRIBE | INVALID_CHANNELNAME_LENGTH | *channelName* validation error, length of *channelName*  greater than **64** |
| DBLIB_CHANNEL_SUBSCRIBE | CHANNEL_ALREADY_SUBSCRIBED | *channelName* is already subscribed.                         |

#### unsubscribe() 

To unsubscribe from a subscribed channel, invoke the `unsubscribe` function of your dataBridges object. `unsubscribe` cannot be done on channel object.

```javascript
try {
    dbridge.channel.unsubscribe('mychannel');
} catch (err) {
    console.log(err.source, err.code, err.message);
}
```

| Parameter | Rules                                                        | Description                                        |
| --------- | ------------------------------------------------------------ | -------------------------------------------------- |
| `string`  | *channelName **OR**<br />**pvt:**channelName **OR**<br />**prs:**channelName **OR**<br />**sys:**channelName* | *channel*Name to which un-subscription to be done. |

| Return Type | Description |
| ----------- | ----------- |
| `NA`        |             |

##### Exceptions: 

| Source                    | Code                          | Description                                                  |
| ------------------------- | ----------------------------- | ------------------------------------------------------------ |
| DBLIB_CHANNEL_UNSUBSCRIBE | NETWORK_DISCONNECTED          | Connection to dataBridges network is not active.             |
| DBLIB_CHANNEL_UNSUBSCRIBE | CHANNEL_NOT_SUBSCRIBED        | *channelName* is not subscribed.                             |
| DBLIB_CHANNEL_UNSUBSCRIBE | UNSUBSCRIBE_ALREADY_INITIATED | unsubscription to the channel is already initiated and hence the current unsubscribe command exited with exception. |

### Channel Information

#### isOnline()

*<u>dBridgeObject</u>* as well as *<u>channelObject</u>* provides a function to check if the channel is online. The best practice is to check the channel is online before publishing any message.

```js
const mychannel_isonline = dbridge.channel.isOnline('mychannel');
```

```js
const mychannel_isonline = subscribed_channel.isOnline(); 
```

| Parameter | Rules                                                        | Description   |
| --------- | ------------------------------------------------------------ | ------------- |
| `string`  | *channelName **OR**<br />**pvt:**channelName **OR**<br />**prs:**channelName **OR**<br />**sys:**channelName* | *channel*Name |

| Return Values | Description                                         |
| ------------- | --------------------------------------------------- |
| `boolean`     | Is the current status of channel online or offline. |

#### list()

<u>*dBridgeObject*</u>  provides a function to get list of successfully subscribed or connected channel. 

```javascript
const channels = dbridge.channel.list();
#=> [{"name":  "mychannel" , "type": "subscribed/connect" ,  "isonline": true/false }];
```

| Return Type     | Description                                |
| --------------- | ------------------------------------------ |
| `array of dict` | Array of channels subscribed or connected. |

Dictionary contains below information.

| Key        | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| `name`     | *(string)* *channelName* of subscribed or connected channel. |
| `type`     | *(string)* `subscribed`                                      |
| `isonline` | *(boolean)* Is the current status of channel online or offline. |

#### getChannelName() 

*<u>channelObject</u>* provides a function to get the *channelName*. 

```js
const chName = channelobject.getChannelName() 
```

| Return Type | Description                          |
| ----------- | ------------------------------------ |
| `string`    | *channelName* of subscribed channel. |

### Publish to Channel 

Publish event-message using the `publish` function on an instance of the `channel` object.

A message is linked to an event and hence event-message. dataBridges allows you to bind to various events to create rich event processing flows. 

#### publish()

The default method for publishing user-defined events to a channel involves invoking the `channel.publish` function of your *channelObject*  for which it has connected to **OR** using *dbridgeObject* giving the *channelName* as parameter. 

**Note:** `channel.publish` is not allowed using *channelObject* subscribed to `sys:*` channel.

```javascript
// Using dbridgeObject 
try {
    dbridge.channel.publish(channelName, event, payload, excludeSessionId, sourceId, seqno);
} catch (err) {
    console.log(err.source, err.code, err.message);
}
// Using channelObject 
try {
    channelObject.publish(event, payload, excludeSessionId, sourceId, seqno);
} catch (err) {
    console.log(err.source, err.code, err.message);
}
// Best practice is to check the channel is online before publishing any message.
if (channelObject.isOnline()) {
    try {
        channelObject.publish(event, payload, excludeSessionId, sourceId, seqno);
    } catch (err) {
        console.log(err.source, err.code, err.message);
    }
}
```

| Parameter          | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| `channelName`      | *(string)* Channel name for which details are required.      |
| `event`            | *(string)* *event* Name to which the message to be sent. *event* Name cannot start with `dbridges:` |
| `payload`          | *(string)* Payload to be sent with the event.                |
| `excludeSessionId` | *(string)* Excludes the event from being sent to a specific sessionid (connection).<br /><br />For example when a server application (example: chat server) sends event message on behalf of a specific session ( example: chat user) to a channel (example: chat group),  the sessionID (example: chat user) will be excluded to receive its own message. |
| `sourceId`         | *(string)* Required in case of *presence*(`prs:`) and *system* (`sys:`) channel. When sending a message to a *presence*(`prs:`) or *system* (`sys:`) channel, application need to specify a message source by using this sourceId.<br /><br />For example when a server application (example: chat server) sends event message on behalf of a specific session ( example: chat user) to a channel (example: chat group),  the sourceID (example: chat user information) can be attached usiing sourceID to the event message. This allows all message receipient to know who has sent the message. |
| `seqno`            | *(string) [optional]* Message sequence number. This is optional parameter. `seqno` can be used by applications to manage message queue processing by the subscribers. |

| Return Values | Description |
| ------------- | ----------- |
| `NA`          |             |

##### Exceptions: 

| Source                | Code                       | Description                                                  |
| --------------------- | -------------------------- | ------------------------------------------------------------ |
| DBLIB_CHANNEL_PUBLISH | NETWORK_DISCONNECTED       | Connection to dataBridges network is not active.             |
| DBLIB_CHANNEL_PUBLISH | INVALID_CHANNELNAME        | *Applicable for below conditions <br />1. channelName* validation error, `typeof()`  *channelName*  is not type string <br />2. *channelName* validation error, *channelName* fails `a-zA-Z0-9\.:_-` validation. <br />3. *channelName* is `sys:*`<br />4. *channelName* is not defined. |
| DBLIB_CHANNEL_PUBLISH | INVALID_CHANNELNAME_LENGTH | *channelName* validation error, length of *channelName*  greater than **64** |
| DBLIB_CHANNEL_PUBLISH | INVALID_SUBJECT            | Applicable for below conditions <br />1. *event* validation error,  *event*  is not defined<br />2. *event* validation error, `typeof()`  *event*  is not type string |

### Send Message to Members / sessionID

It's possible to send message to individual `sessionId` using the `channel.sendmsg` function on an instance of the *channelObject* or using *dbridgeObject*.

#### sendmsg()

The default method for send message user-defined events to a individual `sessionId` involves invoking the `channel.sendmsg` function of your *channelObject*  for which it has connected to **OR** using *dbridgeObject* giving the *channelName* as parameter. 

**Note:** `channel.sendmsg` is not allowed using *channelObject* subscribed to `sys:*` channel.

```javascript
// Using dbridgeObject 
try {
    dbridge.channel.sendmsg(channelName, event, payload, toSessionId, sourceId, seqno);
} catch (err) {
    console.log(err.source, err.code, err.message);
}
// Using channelObject 
try {
    channelObject.sendmsg(event, payload, toSessionId, sourceId, seqno);
} catch (err) {
    console.log(err.source, err.code, err.message);
}

// Best practice is to check the channel is online before publishing any message.
if (channelObject.isOnline()) {
    try {
        channelObject.sendmsg(event, payload, toSessionId, sourceId, seqno);
    } catch (err) {
        console.log(err.source, err.code, err.message);
    }
}
```

| Parameter     | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `channelName` | *(string)* Channel name for which details are required.      |
| `event`       | *(string)* *event* Name to which the message to be sent. *event* Name cannot start with `dbridges:` |
| `payload`     | *(string)* Payload to be sent with the event.                |
| `toSessionId` | *(string)* `sessionid` where the message  to be sent.        |
| `sourceId`    | *(string)* Required in case of *presence*(`prs:`) and *system* (`sys:`) channel. When sending a message to a *presence*(`prs:`) or *system* (`sys:`) channel, application need to specify a message source by using this sourceId. <br /><br />For example when a server application (example: chat server) sends event message on behalf of a specific session ( example: chat user) to a channel (example: chat group),  the sourceID (example: chat user information) can be attached usiing sourceID to the event message. This allows all message receipient to know who has sent the message. |
| `seqno`       | *(string) [optional]* Message sequence number. This is optional parameter. `seqno` can be used by applications to manage message queue processing by the subscribers. |

| Return Values | Description |
| ------------- | ----------- |
| `NA`          |             |

##### Exceptions: 

| Source                | Code                       | Description                                                  |
| --------------------- | -------------------------- | ------------------------------------------------------------ |
| DBLIB_CHANNEL_SENDMSG | NETWORK_DISCONNECTED       | Connection to dataBridges network is not active.             |
| DBLIB_CHANNEL_SENDMSG | INVALID_CHANNELNAME        | *Applicable for below conditions <br />1. channelName* validation error, `typeof()`  *channelName*  is not type string <br />2. *channelName* validation error, *channelName* fails `a-zA-Z0-9\.:_-` validation. <br />3. *channelName* is `sys:*`<br />4. *channelName* is not defined.<br />5. *channelType* is `prs:` and `sourceId` is not provided.<br />6. *channelName* contains `:` and first token is not `pvt,prs,sys` |
| DBLIB_CHANNEL_SENDMSG | INVALID_CHANNELNAME_LENGTH | *channelName* validation error, length of *channelName*  greater than **64** |

### Binding to events

A message is linked to an event and hence event-message. dataBridges allows you to bind to various events to create rich event processing flows. An application needs to bind to event to process the received message. 

You can use the following methods either on a *channelObject*, to bind to events on a particular channel; or on the *dbridgeObject*, to bind to events on all subscribed channels simultaneously.

#### `bind` and `unbind`

**Bind** to "event" on channel: payload and metadata is received.

```javascript
//  Binding to channel events on channelObject using Anonymous function.
try {
    channelObject.bind('eventName',  (payload, metadata) => {
        console.log(payload, metadata);
    });
} catch(err){
     console.log(err.source, err.code, err.message);
}

// Binding to channel events on dbridgeObject using Anonymous function.
try {
    dbridge.channel.bind('eventName', (payload, metadata) => {
    	console.log(payload, metadata);
	});
} catch(err){
     console.log(err.source, err.code, err.message);
}

// Binding to channel events on channelObject using user function.
const myEventHandler = (payload, metadata) =>{
	console.log(payload, metadata);
};

try {
    dbridge.channel.bind('eventName', myEventHandler);
} catch(err){
     console.log(err.source, err.code, err.message);
}
```

| Parameter | Description                                          |
| --------- | ---------------------------------------------------- |
| `event`   | *(string)* *event* Name to which binding to be done. |

##### Callback parameters

###### payload: 

`(string)` Payload data sent by the publisher.

###### metadata `(dict)`:

```json
{
    "channelname": "channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "event",				// (string) eventName 
    "sourcesysid": "", 					// (string) Sender system identity, applicable only for presence or system channel.
    "sqnum": "1",						// (string) user defined, sent during publish function.
    "sessionid": "", 					// (string) Sender sessionid, applicable only for presence or system channel.
    "intime": 1645554960732  			// (string) EPOC time of the sender at time of publish.
}
```

##### Exceptions:

| Source             | Code              | Description                                                  |
| ------------------ | ----------------- | ------------------------------------------------------------ |
| DBLIB_CONNECT_BIND | INVALID_EVENTNAME | Invalid Event name. Not in user-defined events or default events. |
| DBLIB_CONNECT_BIND | INVALID_CALLBACK  | If *"callback function"* is not declared **or** `typeof()` variable defined is not a *"function"*. |

**Unbind** behavior varies depending on which parameters you provide it with. For example:

```js
// Remove just `handler` of the `event` in the subscribed/connected channel 
channelObject.unbind('eventName',handler);

// Remove all `handler` of the `event` in the subscribed/connected channel
channelObject.unbind('eventName');

//Remove all handlers for the all event in the subscribed/connected channel
channelObject.unbind();

// Remove `handler` of the `event` for all events across all subscribed/connected channels
dbridge.channel.unbind('eventName',handler);

// Remove all handlers of the `event` for all events across all subscribed/connected channels
dbridge.channel.unbind('eventName');

// Remove all handlers for all events across all subscribed/connected channels
dbridge.channel.unbind();
```

#### `bind_all` and `unbind_all`

`bind_all` and `unbind_all` work much like `bind` and `unbind`, but instead of only firing callbacks on a specific event, they fire callbacks on any event, and provide that event in the metadata  to the handler along with the payload. 

```js
//  Binding to all channel events on channelObject  
try {
    channelObject.bind_all((payload, metadata) => {
        console.log(payload, metadata);
    });
} catch(err){
     console.log(err.source, err.code, err.message);
}

// Binding to all channel events on dbridgeObject 
try {
    dbridge.channel.bind_all((payload, metadata) => {
    	console.log(payload, metadata);
	});
} catch(err){
     console.log(err.source, err.code, err.message);
}
```

Callback out parameter `payload, metadata` details are explained with each event below in this document.

##### Exceptions: 

| Source             | Code             | Description                                                  |
| ------------------ | ---------------- | ------------------------------------------------------------ |
| DBLIB_CONNECT_BIND | INVALID_CALLBACK | If *"callback function"* is not declared **or** `typeof()` variable defined is not a *"function"*. |

`unbind_all` works similarly to `unbind`.

```js
// Remove just `handler` across the channel 
channelObject.unbind_all(handler);

//Remove all handlers for the all event in the subscribed/connected channel
channelObject.unbind_all();

// Remove `handler` across the subscribed/connected channels
dbridge.channel.unbind_all(handler);

// Remove all handlers for all events across all subscribed/connected channels
dbridge.channel.unbind_all();
```

### System events for channel object

There are a number of events which are triggered internally by the library, but can also be of use elsewhere. Below are the list of all events triggered by the library.

Below syntax is same for all system events.

```javascript
//  Binding to systemevent on channelObject  
try {
    channelObject.bind('dbridges:subscribe.success', (payload, metadata) => {
        console.log( payload, metadata);
    });
} catch(err) {
     console.log(err.source, err.code, err.message);
}
//  Binding to systemevent on dbridgeObject  
try {
    dbridge.channel.bind('dbridges:subscribe.success', (payload, metadata) => {
        console.log( payload, metadata);
    });
} catch(err) {
     console.log(err.source, err.code, err.message);
}
```

##### dbridges:subscribe.success 

###### Callback parameters

**payload:** 

`null` 

**metadata `(dict)`:**

```javascript
{
    "channelname": "channelName" , 			// (string) channelName to which subscription is done.
    "eventname": "dbridges:subscribe.success",// (string) eventName 
    "sourcesysid": "", 					// (string) Sender system identity, applicable only for presence or system channel.
    "sqnum": "1",						// (string) user defined, sent during publish function.
    "sessionid": "", 					// (string) Sender sessionid, applicable only for presence or system channel.
    "intime": 1645554960732  			// (string) EPOC time of the sender at time of publish.
}
```

##### dbridges:subscribe.fail

###### Callback parameters

**payload:  `(dberror object)`**

```javascript
{
    "source": "dberror.Source" , 		// (string) Error source, Refer dberror: for details
    "code": "dberror.Code",				// (string) Error code, Refer dberror: for details
    "message": "" 						// (string) Error message if applicable.
}
```

**metadata `(dict)`:**

```javascript
{
    "channelname": "channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:subscribe.fail",// (string) eventName 
    "sourcesysid": "", 					// (string) 
    "sqnum": "",						// (string) 
    "sessionid": "", 					// (string) 
    "intime": 	  						// (string) 
}
```

##### dbridges:channel.online

###### Callback parameters

**payload:** 

`null` 

**metadata `(dict)`:**

```javascript
{
    "channelname": "channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:channel.online",// (string) eventName 
    "sourcesysid": "", 					// (string) 
    "sqnum": "",						// (string) 
    "sessionid": "", 					// (string) 
    "intime": 	  						// (string) 
}
```

##### dbridges:channel.offline

###### Callback parameters

**payload:** 

`null` 

**metadata `(dict)`:**

```javascript
{
    "channelname": "channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:channel.offline",// (string) eventName 
    "sourcesysid": "", 					// (string) 
    "sqnum": "",						// (string) 
    "sessionid": "", 					// (string) 
    "intime": 	  						// (string) 
}
```

##### dbridges:channel.removed  

###### Callback parameters

**payload:** 

`null` 

**metadata `(dict)`:**

```javascript
{
    "channelname": "channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:channel.removed",// (string) eventName 
    "sourcesysid": "", 					// (string) 
    "sqnum": "",						// (string) 
    "sessionid": "", 					// (string) 
    "intime": 	  						// (string) 
}
```

##### dbridges:unsubscribe.success

###### Callback parameters

**payload:** 

`null` 

**metadata `(dict)`:**

```javascript
{
    "channelname": "channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:unsubscribe.success",// (string) eventName 
    "sourcesysid": "", 					// (string) 
    "sqnum": "",						// (string) 
    "sessionid": "", 					// (string) 
    "intime": 	  						// (string) 
}
```

##### dbridges:unsubscribe.fail

###### Callback parameters

**payload:  `(dberror object)`**

```javascript
{
    "source": "dberror.Source" , 		// (string) Error source, Refer dberror: for details
    "code": "dberror.Code",				// (string) Error code, Refer dberror: for details
    "message": "" 						// (string) Error message if applicable.
}
```

**metadata `(dict)`:**

```javascript
{
    "channelname": "channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:unsubscribe.fail",// (string) eventName 
    "sourcesysid": "", 					// (string) 
    "sqnum": "",						// (string) 
    "sessionid": "", 					// (string) 
    "intime": 	  						// (string) 
}
```

##### dbridges:resubscribe.success

###### Callback parameters

**payload:** 

`null` 

**metadata `(dict)`:**

```javascript
{
    "channelname": "channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:resubscribe.success",// (string) eventName 
    "sourcesysid": "", 					// (string) 
    "sqnum": "",						// (string) 
    "sessionid": "", 					// (string) 
    "intime": 	  						// (string) 
}
```

##### dbridges:resubscribe.fail

###### Callback parameters

**payload: `(dberror object)`**

```javascript
{
    "source": "dberror.Source" , 		// (string) Error source, Refer dberror: for details
    "code": "dberror.Code",				// (string) Error code, Refer dberror: for details
    "message": "" 						// (string) Error message if applicable.
}
```

**metadata `(dict)`:**

```javascript
{
    "channelname": "channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:resubscribe.fail",// (string) eventName 
    "sourcesysid": "", 					// (string) 
    "sqnum": "",						// (string) 
    "sessionid": "", 					// (string) 
    "intime": 	  						// (string) 
}
```

##### dbridges:participant.joined 

This will be triggered only for **presence** `(prs:)` and **system** `(sys:)` channel subscription.

###### Callback parameters

**payload: `(dict)`**

```javascript
{
  "sessionid": "ydR27s3Z92yQw7wjGY2lX", 	// (string) Session id of the member who has subscribed/connected to channel
  "libtype": "nodejs", 						// (string) Library Lang of the member who has subscribed/connected to channel
  "sourceipv4": "0.0.0.0", 					// (string) IPv4 of the member who has subscribed/connected to channel
  "sourceipv6": "::1", 						// (string) Not Applicable in this version
  "sysinfo": '{"sysid":"nameofcaller"}' 	// (string) System Info of the member who has subscribed/connected to channel
}
```

**metadata `(dict)`:**

```javascript
{
    "channelname": "prs:channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:participant.joined",// (string) eventName 
    "sourcesysid": "nameofcaller", 			// (string) Sys id of the member who has subscribed/connected to channel
    "sqnum": null,							// (string) 
    "sessionid": "ydR27s3Z92yQw7wjGY2lX", 	// (string) Session id of the member who has subscribed/connected to channel
    "intime": null	  						// (string) 
}
```

##### dbridges:participant.left

This will be triggered only for **presence** `(prs:)` and **system** `(sys:)` channel subscription.

###### Callback parameters

**payload: `(dict)`**

```javascript
{
  "sessionid": "ydR27s3Z92yQw7wjGY2lX", 	// (string) Session id of the member who has subscribed/connected to channel
  "libtype": "nodejs", 						// (string) Library Lang of the member who has subscribed/connected to channel
  "sourceipv4": "0.0.0.0", 					// (string) IPv4 of the member who has subscribed/connected to channel
  "sourceipv6": "::1", 						// (string) Not Applicable in this version
  "sysinfo": '{"sysid":"nameofcaller"}' 	// (string) System Info of the member who has subscribed/connected to channel
}
```

**metadata `(dict)`:**

```javascript
{
    "channelname": "prs:channelName" , 		// (string) channelName to which subscription is done.
    "eventname": "dbridges:participant.left",// (string) eventName 
    "sourcesysid": "nameofcaller", 			// (string) Sys id of the member who has subscribed/connected to channel
    "sqnum": null,							// (string) 
    "sessionid": "ydR27s3Z92yQw7wjGY2lX", 	// (string) Session id of the member who has subscribed/connected to channel
    "intime": null	  						// (string) 
}
```

##### System events - payload (dberror object) - details:

| Source                    | Code              | Description                                                  |
| ------------------------- | ----------------- | ------------------------------------------------------------ |
| DBNET_CHANNEL_SUBSCRIBE   | ERR_FAIL_ERROR    | dataBridges network encountered error when subscribing to the channel. |
| DBNET_CHANNEL_SUBSCRIBE   | ERR_ACCESS_DENIED | dBrdige network reported **access violation** with `access_token` function during subscription of this channel. |
| DBNET_CHANNEL_UNSUBSCRIBE | ERR_FAIL_ERROR    | dataBridges network encountered error when unsubscribing to the channel. |
| DBNET_CHANNEL_UNSUBSCRIBE | ERR_ACCESS_DENIED | dataBridges network reported **access violation** with `access_token` function during unsubscribing of this channel. |



------



## object: rpc (Remote Procedure Call)



rpc object exposes **trust-safe** properties, functions and events to provide reliable two-way messaging (request-response) between multiple endpoints allowing you to build sophisticated asynchronous interactions.

Concepts

- RPC endpoint / server (CALLEE)
  - Application using dataBridges server library can expose callback function(s) as a dataBridges rpc function.
  - Multiple callback function(s), can be exposed as rpc functions grouped together as an rpc endpoint / server.  
  - To deploy access-controlled, trust-safe rpc endpoint / server, prefix the rpc server namespace with pvt: or prs:
    - **Note** dataBridges have 2 seprate libraries (client lib, server lib). You are reading the server library api document.
      - Server lib uses app.key along with secret to get  access to rpc endpoint/server including pvt: , prs:  access controlled rpc endpoint/server.
      - Whereas application using client library (client application) will always need to pass a trust-token to access restricted rpc endpoint/server  (prefixed with pvt: prs:) . A trust-token is a JWT document created using a combination of channelname + sessionid + app.secret. Trust token can be created by application having access to app.key's secret.
        - you can use your existing access control,  authorization and session identification rule-set, process and methods to create a trust-token instructing the dataBridges router to accept the pvt: prs: rpc call() client application.
        - Trust-tokens allows you to enable secured, access controlled and compliance driven two-way messaging (request-response) between multiple endpoints allowing you to build sophisticated asynchronous interactions in your existing and new initiative applications.
- RPC clients (CALLER)
  - Both dataBridges client and server api's allow you to execute rpc function(s) exposed by rpc endpoint / server. 
  - Appication consuming rpc function(s) is called CALLEE and the rpc endpoint/server application is called CALLER.
  - CALLEE application will execute a remote function by passing IN.paramter, and a timeout
    - The CALLER application's corresponding function will be invoked with the IN.parameter and it will respond with response() or exception() which will be delivered back to the CALLEE application by dataBridges network completing the request-response communication.
  - CALLEE application need not be aware about RPC servers (CALLER) identity and will only interact with RPC server (CALLER) namespace. The dataBridges network will intelligently route and load balance RPC call() to the RPC server application. The dataBridges network will automatically load balance multiple instance of server application exposing the same RPC endpoints.

To expose rpc functions the  application needs to register an rpc server and register callback functions to rpc server as rpc functions.

- The steps involved are :
  - Initialize rpc endpoint/server using `init()`.
  - Register all rpc functions using `regfn()`.
  - Register rpc endpoint/server with dataBridges network using `register()`



### Initialize rpc Server

Initialize the server using `rpc.init` function of your dataBridges object. This will return an object to which all properties, functions and events are available.

**Note** : Application can have *multiple* rpc endpoint/server against a dataBridges object.

```js
//lets create an rpc endpoint/server named missionControl and expose 2 functions called nasa and isro.

try {
    const missionControl = dbridge.rpc.init('missionControl');
} catch (err) {
    console.log(err.source, err.code, err.message);
}
```

| Parameter | Rules                                                        | Description                                  |
| --------- | ------------------------------------------------------------ | -------------------------------------------- |
| `string`  | *serverName  **OR**<br />**pvt:**serverName **OR**<br />**prs:**serverName* | Initialize a *rpcServer* with *server*Name . |

| Return Type | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `object`    | *rpcObject* which events, properties and related functions can be bound to. |

##### Exceptions: 

| Source         | Code               | Description                                                  |
| -------------- | ------------------ | ------------------------------------------------------------ |
| DBLIB_RPC_INIT | INVALID_SERVERNAME | Applicable for below conditions <br />1. *serverName* is not defined.<br />2. *serverName* already exists<br />3. *serverName* is blank.<br />4. *serverName* validation error, length of *serverName* greater than **64**<br />5. *serverName* validation error, *serverName* fails `a-zA-Z0-9\.:_-` validation.<br />6. *serverName* contains `:` and first token is not `pvt,prs`. |

### Register rpc functions 

Application can expose callback function(s) as rpc functions. Application using dataBridges client/server library can remotely execute the rpc functions. Each function needs to be registered with the library as a rpc function, using `rpc.regfn()`where you can link the functionName to rpcFunctionName.

- The server application that exposes the rpc function is called a CALLEE.
- The client/server application that executes the rpc function is called a CALLER.

Functions can be defined either inside the property callback function or anywhere in the scope of application. Below code exhibits both ways of exposing the function.

```javascript
// function is exposed outside the property callback function, but in the scope of application.
function rpcFuncOustide (payload, response) {
    try {
        response.tracker = true;
        response.next('This is Houston');
        response.end('message received by Houston');
        response.exception('INVALID_PARAM', 'Wrong parameter'); 
    } catch(err) {
        console.log(err.source, err.code, err.message);
    }
}

missionControl.functions = function () {
    // function is exposed inside the property callback function.
    function rpcFuncInside (payload, response) {
        try {
            response.tracker = true;
            response.next('This is Hassan');
            response.end('message received by Hassan');
            response.exception('INVALID_PARAM', 'Wrong parameter'); 
            console.log(response.id);
        } catch(err) {
            console.log(err.source, err.code, err.message);
        }
    }
    // registering function to be exposed by rpcServer
    try {
    	missionControl.regfn("nasa", rpcFuncOustide);
    	missionControl.regfn("isro", rpcFuncInside);
    } catch(err) {
    	console.log(err.source, err.code, err.message);
    }
}

// unregistering of function exposed by rpcServer
missionControl.unregfn("nasa", rpcFuncOustide);
```

Below are <u>*parameters*</u> of the callback function which is exposed to *rpcServer*.

| Parameter  | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| `payload`  | *(object)*  Input payload from the caller.                   |
| `response` | *(object)* Response object having *properties* and *function* to return execution results of the function back to caller. |

##### payload: `(object)` 

| Properties/Function | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `inparam`           | *(string)* Input parameters received to execute the function. |
| `sessionid`         | *(string)* Session id of the member who has requested to execute the function. |
| `libtype`           | *(string)* Library Lang of the member who has requested to execute the function. |
| `sourceipv4`        | *(string)* IPv4 of the member who has who has requested to execute the function. |
| `sourceipv6`        | *(string)* IPv6 of the member who has who has requested to execute the function. |
| `info`              | *(string)* System Info of the member who has who has requested to execute the function. |

##### response: `(object)`

| Properties/Function | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `tracker`           | *(boolean)* This will enable  response tracker, and event `rpc.response.tracker` will be fired if any issue happens in sending back response to caller. Enable this property if your function needs a confirmation of response delivered to the caller. |
| `id`                | *(string)* *(readonly)* Each rpc function execution is assigned a unique ID by the library.  when the response tracker is enabled, the application can bind to an event `rpc.response.tracker` to get the delivery notification. The event will indicate the delivery notification linked to this ID. Caller application will need to maintain this ID to track the delivery notification. |
| `next`              | *(function)*  dataBridges rpc supports mult-part response. Application can use `response.next` to send multi-part response to the caller. |
| `end`               | *(function)*   `response.end` is to send the final response to the caller. Once `end` is called, the object is **closed** and no more response can be sent. |
| `exception`         | *(function)*  Two parameter, return `errorCode` *(string)* ,`errorMessage` *(string)* is sent to caller. This will raise an exception at the caller library. |

##### Exceptions:

Below exceptions are raised in the `rpc.regfn`.

| Source          | Code                  | Description                                   |
| --------------- | --------------------- | --------------------------------------------- |
| DBLIB_RPC_REGFN | INVALID_FUNCTION_NAME | Invalid Function name.                        |
| DBLIB_RPC_REGFN | INVALID_CALLBACK      | Callback is not a function or is not defined. |

Below exceptions are raised on `response` object inside the registered function.

| Source         | Code                   | Description                                                  |
| -------------- | ---------------------- | ------------------------------------------------------------ |
| DBNET_RPC_CALL | NETWORK_DISCONNECTED   | Connection to dataBridges network is not active.             |
| DBLIB_RPC_CALL | RESPONSE_OBJECT_CLOSED | Return response object is closed. Thus the function is unable to respond back to the call. |

### Register Server

Register rpc endpoint/server with dataBridges network using `register()`.

```javascript
try {
    missionControl.register();
} catch (err) {
    console.log(err.source, err.code, err.message);
}

// Best practice is to check the channel is online before publishing any message.
if (dbridge.connectionstate.isconnected()) {
    try {
        missionControl.register();
    } catch (err) {
        console.log(err.source, err.code, err.message);
    }
}
```

##### Exceptions: 

| Source             | Code                  | Description                                                  |
| ------------------ | --------------------- | ------------------------------------------------------------ |
| DBLIB_RPC_REGISTER | RPC_INVALID_FUNCTIONS | Applicable for below conditions <br />1. If *"callback function"* is not declared for rpc server<br />2. `typeof()` variable defined is not a *"function"*. |
| DBLIB_RPC_REGISTER | NETWORK_DISCONNECTED  | Connection to dataBridges network is not active.             |

### Unregister Server

rpcServer can be unregistered from dataBridges server library  using `unregister` function of your *rpcServerObject*. 

```javascript
missionControl.unregister();
```

### resetqueue() 

*<u>dbridgeObject</u>*  The dataBridges network maintains in-process rpc function execution status. resetqueue() informs the dataBridges network that all in-process rpc function execution will be dropped by the application and response to be invalidated. Resetqueue() use case is intended to be used by application in its self health status management. Sometime due to the application process flow, the application can identify situation where it would like to ease its load by resettiing the rpc function execution queue by sending resetqueue() message to dataBridges network and than closing all in-process rpc function execution. 

```javascript
try {
    missionControl.resetqueue();
} catch(err) {
	console.log(err.source, err.code, err.message);
}
```

##### Exceptions: 

| Source         | Code                 | Description                                      |
| -------------- | -------------------- | ------------------------------------------------ |
| DBLIB_RPC_CALL | NETWORK_DISCONNECTED | Connection to dataBridges network is not active. |

### System events for rpc server registration.

There are a number of events which are triggered internally by the library, but can also be of use elsewhere. Below are the list of all events triggered by the library.

Below syntax is same for all system events.

```javascript
//  Binding to systemevents on rpcObject  
try {
    missionControl.bind('eventName',  (payload, metadata) => {
        console.log(payload, metadata);
    });
} catch(err){
     console.log(err.source, err.code, err.message);
}

// Binding to systemevents on dbridgeObject 
try {
    dbridge.rpc.bind('eventName', (payload, metadata) => {
    	console.log(payload, metadata);
	});
} catch(err){
     console.log(err.source, err.code, err.message);
}
```

Callback out parameter `payload, metadata` details are explained with each event below in this document.

##### Exceptions: 

| Source         | Code              | Description                                   |
| -------------- | ----------------- | --------------------------------------------- |
| DBLIB_RPC_BIND | INVALID_EVENTNAME | Invalid Event name. Not in default events.    |
| DBLIB_RPC_BIND | INVALID_CALLBACK  | Callback is not a function or is not defined. |

#### `bind_all` and `unbind_all`

`bind_all` and `unbind_all` work much like `bind` and `unbind`, but instead of only firing callbacks on a specific event, they fire callbacks on any event, and provide that event in the metadata  to the handler along with the payload. 

```js
//  Binding to all rpc events on rpcObject  
try {
    rpcObject.bind_all((payload, metadata) => {
        console.log(payload, metadata);
    });
} catch(err){
     console.log(err.source, err.code, err.message);
}

// Binding to all rpc events on dbridgeObject 
try {
    dbridge.rpc.bind_all((payload, metadata) => {
    	console.log(payload, metadata);
	});
} catch(err){
     console.log(err.source, err.code, err.message);
}
```

Callback out parameter `payload, metadata` details are explained with each event below in this document.

##### Exceptions: 

| Source             | Code             | Description                                                  |
| ------------------ | ---------------- | ------------------------------------------------------------ |
| DBLIB_CONNECT_BIND | INVALID_CALLBACK | If *"callback function"* is not declared **or** `typeof()` variable defined is not a *"function"*. |

`unbind_all` works similarly to `unbind`.

```js
// Remove just `handler` across the connected rpc server 
rpcObject.unbind_all(handler);

//Remove all handlers for the all event in the connected rpc server
rpcObject.unbind_all();

// Remove `handler` across the connected rpc servers
dbridge.rpc.unbind_all(handler);

// Remove all handlers for all events across all connected rpc servers
dbridge.rpc.unbind_all();
```

#### dbridges:rpc.server.registration.success

##### Callback parameters

###### payload: 

`null` 

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 						// (string) serverName to which connection is done.
    "eventname": "dbridges:server.registration.success", // (string) eventName 
}
```

#### dbridges:rpc.server.registration.fail

##### Callback parameters

###### payload: `(dberror object)`

```javascript
{
    "source": "DBNET_RPC_REGISTER" , 		// (string) Error source
    "code": "ERR_ACCESS_DENIED",			// (string) Error code 
    "message": "" 							// (string) Error message if applicable.
}
```

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 					// (string) serverName to which connection is done.
    "eventname": "dbridges:server.unregistration.fail",// (string) eventName 
}
```

#### dbridges:rpc.server.unregistration.success

##### Callback parameters

###### payload: 

`null` 

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 						// (string) serverName to which connection is done.
    "eventname": "dbridges:rpc.server.unregistration.success", // (string) eventName 
}
```

#### dbridges:rpc.server.unregistration.fail

##### Callback parameters

###### payload: `(dberror object)`

```javascript
{
    "source": "DBNET_RPC_REGISTER" , 		// (string) Error source
    "code": "ERR_ACCESS_DENIED",			// (string) Error code 
    "message": "" 							// (string) Error message if applicable.
}
```

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 					// (string) serverName to which connection is done.
    "eventname": "dbridges:rpc.server.registration.fail",// (string) eventName 
}
```

#### dbridges:rpc.server.online

##### Callback parameters

###### payload: 

`null` 

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 		   // (string) serverName to which connection is done.
    "eventname": "dbridges:server.online", // (string) eventName 
}
```

#### dbridges:rpc.server.offline

##### Callback parameters

###### payload: 

`null` 

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 					// (string) serverName to which connection is done.
    "eventname": "dbridges:server.offline",// (string) eventName 
}
```

#### dbridges:rpc.response.tracker 

Only available with ***rpcObject***.

##### Callback parameters

| Return Values | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `payload`     | *(string)*  Tracker identifier. which is same as `response.id` |
| `metadata`    | *(string)*  Refer below table                                |

| Error Identifier | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| RE_18326         | rpc caller is disconnected from dataBridges network and hence cannot process response tracking. |
| RE_19219         | rpc caller is disconnected from dataBridges network and hence cannot process response tracking. |
| RE_22184         | rpc caller is disconnected from dataBridges network and hence cannot process response tracking. |
| RE_22454         | The cf callee is disconnected from dataBridges network       |
| RE_23101         | The cf callee is disconnected from dataBridges network       |
| RE_29623         | The cf callee is disconnected from dataBridges network       |
| RE_29753         | The cf callee is disconnected from dataBridges network       |

#### dbridges:rpc.callee.queue.exceeded 

Only available with ***rpcObject***.

##### Callback parameters

###### payload: `(dberror object)`

```javascript
{
    "source": "DBNET_RPC_CALL" , 			// (string) Error source
    "code": "ERR_CALLEE_QUEUE_EXCEEDED",	// (string) Error code 
    "message": "" 							// (string) Error message if applicable.
}
```

###### metadata:

`null`

#### dberror:  

| Source             | Code                      | Description                                                  |
| ------------------ | ------------------------- | ------------------------------------------------------------ |
| DBLIB_RPC_REGISTER | NETWORK_DISCONNECTED      | Connection to dataBridges network is not active.             |
| DBNET_RPC_REGISTER | ERR_ACCESS_DENIED         | dataBridges network reported **access violation** with `access_token` function during current operation. |
| DBNET_RPC_REGISTER | ERR_FAIL_ERROR            | dataBridges network encountered error during current operation. |
| DBNET_RPC_CALL     | ERR_CALLEE_QUEUE_EXCEEDED | No new rpc calls are being routed by the dataBridges network to the application because the application's current rpc processing queue has already exceeded. <br />Each application connection cannot exceed rpc.queue.maximum. Refer to management console documentation for rpc.queue.maximum details. |

### Server Information

#### isOnline()

*<u>rpcObject</u>* provides a function to check if the channel is online. 

```js
const rpcServer_isonline = rpcObject.isOnline(); 
```

| Parameter | Rules                                                        | Description                                    |
| --------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `string`  | *serverName  **OR**<br />**pvt:**serverName **OR**<br />**prs:**serverName* | *server*Name to which subscription to be done. |

| Return Values | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `boolean`     | Is the current status of server connection online or offline. |

#### getServerName() 

*<u>rpcObject</u>* provides a function to get the *serverName*. 

```js
const rpcServerName = rpcObject.getServerName() 
```

| Return Type | Description                          |
| ----------- | ------------------------------------ |
| `string`    | *serverName* of connected rpcServer. |

### Connect to Server

To use rpc functions, the application has to connect to the rpc endpoint/server. This is done using `connect()` function explained below.

#### connect()

The default method for connecting to a rpc endpoint/server involves invoking the `rpc.connect` function of your dataBridges object.

```js
try {
    const rpcSvrClient = dbridge.rpc.connect('rpcServer'); 
  	//name of the rpc endpoint/server that app wants to connect to. In our above example missionControl.
} catch (err) {
    console.log(err.source, err.code, err.message);
}
```

| Parameter | Rules                                                        | Description                                  |
| --------- | ------------------------------------------------------------ | -------------------------------------------- |
| `string`  | *serverName  **OR**<br />**pvt:**serverName **OR**<br />**prs:**serverName* | *server*Name to which connection to be done. |

| Return Type | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `object`    | *rpcObject* which events and related functions can be bound to. |

##### Exceptions: 

| Source            | Code                 | Message | Description                                                  |
| ----------------- | -------------------- | ------- | ------------------------------------------------------------ |
| DBLIB_RPC_CONNECT | INVALID_SERVERNAME   |         | Applicable for below conditions <br />1. *serverName* is not defined.<br />2. *serverName* validation error, length of *serverName* greater than **64**<br />3. *serverName* validation error, *serverName* fails `a-zA-Z0-9\.:_-` validation.<br />4. *serverName* contains `:` and first token is not `pvt,prs`. |
| DBLIB_RPC_CONNECT | NETWORK_DISCONNECTED |         | Connection to dataBridges network is not active.             |
| DBNET_RPC_CONNECT | ERR_FAIL_ERROR       |         | dataBridges network encountered error during current operation. |
| DBNET_RPC_CONNECT | ERR_ACCESS_DENIED    |         | dataBridges network reported **access violation** with `access_token` function during current operation. |

### Execute Remote Procedure Call

#### call() 

*<u>rpcObject</u>*  call() function allows you to execute a remote function hosted by RPC endpoint / server using dataBridges library

- passing function parameter as parameter
- while setting an time to live (TTL) for the response 

The RPC call() functions supports multipart response (where the RPC function can send back multiple responses to a single RPC function call) along with exception routine.

```javascript
rpcSvrClient.call(functionName, parameter, ttlms, (response) => {
    console.log('multipart response',response)
}).then((response) => {
    console.log('end response', response)
}).catch((err) => {
    console.log('exception',err.source, err.code, err.message);
});

//Below example how a application can connect to a RPC endpoint / Server called mathServer and use add, multiply functions.
try {
    const myMathServer = dbridge.rpc.connect('mathServer');
} catch (err) {
    console.log(err.source, err.code, err.message);
}

let obj = { "num1":44.5, "num2":30};
let inparam = JSON.stringify(obj);

myMathServer.call(add, inparam, ttlms, (response) => {
}).then((response) => {
    console.log('response: ', JSON.parse(response));
}).catch((err) => {
    console.log('exception',err.source, err.code, err.message);
});

myMathServer.call(multiply, inparam, ttlms, (response) => {
}).then((response) => {
    console.log('response: ', JSON.parse(response));
}).catch((err) => {
    console.log('exception',err.source, err.code, err.message);
});
```

| Parameter      | Expected Value       | Description                                                  |
| -------------- | -------------------- | ------------------------------------------------------------ |
| `functionName` | functionname         | *(string)* Function name as defined in *rpc endpoint/ Server* . <br />Note - RPC endpoint / server can expose multiple rpc functions. |
| parameter      | *function parameter* | *(string)* if multiple parameters to be passed, This can be done by putting it into array or json and stringify the object. |
| ttlms          | `1000`               | *(integer)* Time to live in millisecond, timeout value before the call() function throws error timeout. |

| Return Values | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `string`      | Multipart or final response. in case of error, dberror object is returned. |

##### Exceptions: 

| Source               | Code                 | Description                                                  |
| -------------------- | -------------------- | ------------------------------------------------------------ |
| DBNET_RPC_CALL       | NETWORK_DISCONNECTED | Connection to dataBridges network is not active.             |
| DBNET_RPC_CALL       | RESPONSE_TIMEOUT     | Response not received from dataBridges network within defined `ttlms`. This may be due to dataBridges network or late response from *rpcServer* |
| DBLIB_RPC_CALL       | ID_GENERATION_FAILED | Internal Library error.                                      |
| DBNET_RPC_CALL       | ERR_ACCESS_DENIED    | dataBridges network reported **access violation** during current operation. |
| DBRPCCALLEE_RPC_CALL | ERR_`error_message`  | This indicates an exception encountered by the remote RPC function. ERR_error_code will have the details. |
| DBNET_RPC_CALL       | CLE_NR_10865         | rpc endpoint / server disconnected from dataBridges network. Try again. |
| DBNET_RPC_CALL       | CLE_NR_30391         | rpc endpoint / server disconnected from dataBridges network. Try again. |
| DBNET_RPC_CALL       | CLE_QX_41074         | Cannot process the call() because the RPC server (in this case CALLEE) has exceeded outstanding pending rpc call() queue limit. |
| DBNET_RPC_CALL       | CLE_QX_49467         | Cannot process the call() because the RPC server (in this case CALLEE) has exceeded outstanding pending rpc call() queue limit. |
| DBNET_RPC_CALL       | CLR_QX_39305         | Cannot process the call() because the RPC server (in this case CALLEE) has exceeded outstanding pending rpc call() queue limit. |
| DBNET_RPC_CALL       | CLR_QX_39824         | Cannot process the call() because the RPC server (in this case CALLEE) has exceeded outstanding pending rpc call() queue limit. |
| DBNET_RPC_CALL       | RE_28710             | rpc endpoint / server disconnected from dataBridges network. Try again. |
| DBNET_RPC_CALL       | AD_48621             | Application does not have access to execute rpc functions.   |

#### System events for rpc call 

There are a number of events which are triggered internally by the library, but can also be of use elsewhere. Below are the list of all events triggered by the library.

Below syntax is same for all system events.

```javascript
//  Binding to systemevent on rpcObject  
try {
    rpcObject.bind('eventName', (payload, metadata) => {
        console.log( payload, metadata);
    });
} catch(err) {
     console.log(err.source, err.code, err.message);
}
//  Binding to systemevent on dbridgeObject  
try {
    dbridge.rpc.bind('eventName', (payload, metadata) => {
        console.log( payload, metadata);
    });
} catch(err) {
     console.log(err.source, err.code, err.message);
}
```

##### Exceptions: 

| Source           | Code              | Description                                   |
| ---------------- | ----------------- | --------------------------------------------- |
| DBLIB_RPC_CALLER | INVALID_EVENTNAME | Invalid Event name. Not in default events.    |
| DBLIB_RPC_CALLER | INVALID_CALLBACK  | Callback is not a function or is not defined. |

#### `bind_all` and `unbind_all`

`bind_all` and `unbind_all` work much like `bind` and `unbind`, but instead of only firing callbacks on a specific event, they fire callbacks on any event, and provide that event in the metadata  to the handler along with the payload. 

```js
//  Binding to all rpc events on rpcObject  
try {
    rpcObject.bind_all((payload, metadata) => {
        console.log(payload, metadata);
    });
} catch(err){
     console.log(err.source, err.code, err.message);
}

// Binding to all rpc events on dbridgeObject 
try {
    dbridge.rpc.bind_all((payload, metadata) => {
    	console.log(payload, metadata);
	});
} catch(err){
     console.log(err.source, err.code, err.message);
}
```

Callback out parameter `payload, metadata` details are explained with each event below in this document.

##### Exceptions: 

| Source             | Code             | Description                                                  |
| ------------------ | ---------------- | ------------------------------------------------------------ |
| DBLIB_CONNECT_BIND | INVALID_CALLBACK | If *"callback function"* is not declared **or** `typeof()` variable defined is not a *"function"*. |

`unbind_all` works similarly to `unbind`.

```js
// Remove just `handler` across the connected rpc server 
rpcObject.unbind_all(handler);

//Remove all handlers for the all event in the connected rpc server
rpcObject.unbind_all();

// Remove `handler` across the connected rpc servers
dbridge.rpc.unbind_all(handler);

// Remove all handlers for all events across all connected rpc servers
dbridge.rpc.unbind_all();
```

#### dridges:rpc.server.connect.success

##### Callback parameters

###### payload: 

`null` 

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 					// (string) serverName to which connection is done.
    "eventname": "dbridges:rpc.server.connect.success", // (string) eventName 
}
```

#### dbridges:rpc.server.connect.fail

##### Callback parameters

###### payload: `(dberror object)`

```javascript
{
    "source": "DBLIB_RPC_CONNECT" , 	// (string) Error source
    "code": "ACCESS_TOKEN_FAIL",			// (string) Error code 
    "message": "" 							// (string) Error message if applicable.
}
```

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 				// (string) serverName to which connection is done.
    "eventname": "dbridges:rpc.server.connect.fail",// (string) eventName 
}
```

#### dbridges:rpc.server.online

##### Callback parameters

###### payload: 

`null` 

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 		   // (string) serverName to which connection is done.
    "eventname": "dbridges:rpc.server.online", // (string) eventName 
}
```

#### dbridges:rpc.server.offline

##### Callback parameters

###### payload: 

`null` 

###### metadata `(dict)`:

```javascript
{
    "servername": "serverName" , 					// (string) serverName to which connection is done.
    "eventname": "dbridges:server.offline",// (string) eventName 
}
```

#### dberror:  

| Source            | Code              | Description                                                  |
| ----------------- | ----------------- | ------------------------------------------------------------ |
| DBNET_RPC_CONNECT | ERR_FAIL_ERROR    | dataBridges network encountered error during current operation. |
| DBNET_RPC_CONNECT | ERR_ACCESS_DENIED | dataBridges network reported **access violation** during current operation. |



------



## object:Cf (Client Function)

- CF (Client-function) object is a special purpose RPC | request-response implementation to build command and control applications. CF object exposes properties, functions and events for command and control server applications to send messages to devices and application using dataBridges library in **trust-safe manner **, build smart update configuration system and implement **trust-safe ** actions for remote and automated management.

  CF REDUCES HUGE ENGINEERING TIME EFFORT REQUIRED TO DESIGN, BUILD AND MAINTAIN A ROBUST COMMAND-CONTROL INFRASTRUCTURE.

  - A client function(s)  is a callback function exposed by the client library as a RPC (remote procedure call). 
  - Server application (using dataBridges server library), can execute the CF function remotely.

  Concepts

  - CF (client-function) simplifies the comand and control type application design and maintenance. 
  - iOT and large distributed system requires a standard, secured and compliant method to send reliable  request-response communication to the managed devices from authenticated and authorized Command-and-Control server applications. dataBridges CF allows you you to expose device functions and capabilities in a easy, secured manner allowing only authoirized dataBridges server applications to communicate with the devices, remote applications.
  - Only server application using dataBridges server library + application key secret can execute CF functions exposed by remote devices. 
    - The server application is called CALLER (the one executing cf.call() function)
    - The server application needs to know the sessionID of the device to which it needs to communicate.
    - The device application exposing command functions is called CALLEE. Only authenticated and authorized server application will be allowed to communicate with the device application for device / application management.

### Execute Client Functions

#### call() 

*<u>dbridgeObject</u>*  call() function allows you to execute client function(s) exposed by applications using dataBridges server/client library. **Note** - cf.call() is available only with server library and not with client library. 

- `sessionid`  where the function to be executed.
- clientFunction name.
- passing function parameter as parameter
- while setting an time to live (TTL) for the response 

The cf call() functions supports multipart response (where the cf function can send back multiple responses to a single cf function call) along with exception routine.

```javascript
dbridge.cf.call(sessionId, functionName, parameter, ttlms, (response) => {
    console.log('multipart response',response)
}).then((response) => {
    console.log('end response', response)
}).catch((err) => {
    console.log('exception',err.source, err.code, err.message);
});
```

| Parameter      | Expected Value       | Description                                                  |
| -------------- | -------------------- | ------------------------------------------------------------ |
| `sessionId`    | *sessionid*          | *(string)*  `sessionid`  where the function to be executed.  |
| `functionName` | *functionname*       | *(string)* cf Function name.                                 |
| `parameter`    | *functionparameters* | *(string)* if multiple parameters to be passed, This can be done by putting it into array or json and stringify the object. |
| `ttlms`        | `1000`               | *(integer)* Time to live in millisecond, timeout value before the library throws error timeout. |

| Return Values | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `string`      | Multipart or final response. in case of error, dberror object is returned. |

##### Exceptions: 

| Source             | Code                 | Description                                                  |
| ------------------ | -------------------- | ------------------------------------------------------------ |
| DBLIB_CF_CALL      | NETWORK_DISCONNECTED | Connection to dataBridges network is not active.             |
| DBLIB_CF_CALL      | RESPONSE_TIMEOUT     | Response not received from dataBridges network within defined `ttlms`. This may be due to dataBridges network or late response from *cfClient* |
| DBLIB_CF_CALL      | ID_GENERATION_FAILED | Internal Library error.                                      |
| DBCFCALLEE_CF_CALL | ERR_`error_code`     | Exception received from *cfClient* function execution. This is sent directly from *cfClient* function. |
| DBNET_CF_CALL      | CLR_QX_38361         | Cannot process the call() because the *cfClient* (in this case CALLEE) has exceeded outstanding pending cf call() queue limit. |
| DBNET_CF_CALL      | CLR_QX_39179         | Cannot process the call() because the *cfClient* (in this case CALLEE) has exceeded outstanding pending cf call() queue limit. |
| DBNET_CF_CALL      | CLE_NR_10464         | *cfClient*  disconnected from dataBridges network. Try again. |
| DBNET_CF_CALL      | CLE_NR_10558         | *cfClient* disconnected from dataBridges network. Try again. |
| DBNET_CF_CALL      | RE_26886             | *cfClient* disconnected from dataBridges network. Try again. |
| DBNET_CF_CALL      | RE_27968             | *cfClient* disconnected from dataBridges network. Try again. |
| DBNET_CF_CALL      | RE_28402             | *cfClient* disconnected from dataBridges network. Try again. |

### Properties

Server library can also expose client functions. 

The following is the list of *cf* properties. These properties has to be set before `dbridge.connect()`

| Property    | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `enable`    | *(boolean)* `(default:false)` If application wants to enable *clientFunction* functionality, this needs to be `true` else `false`. |
| `functions` | *(function)* A client function  is a callback function exposed by the library as a RPC (remote procedure call). |

#### enable:

You need to enable cf in the connection property.

```javascript
dbridge.cf.enable = true;
```

#### functions:

Application can expose callback function(s) as Client function (special case RPC | Request-Response). Server application using dataBridges server library can remotely execute the client functions. Each function needs to be registered with the library as a client function (CF), using `dbridge.cf.regfn()`where you can link the functionName to ClientFunctionName.

- The client application that exposes the client function is called a CALLEE.
- The server application that executes the client function is called a CALLER.

Functions can be defined either inside the property callback function or anywhere in the scope of application. Below code exhibits both ways of exposing the function.

```javascript
// function is exposed outside the property callback function, but in the scope of application.
function cfFunOutside (payload, response) {
    try {
      let upTime = {"uptime": "13:34:30 up 8 days,  3:10,  1 user,  load average: 0.03, 0.11, 0.21"};
        response.tracker = true;
        response.next('retrieving system uptime');
        response.end(JSON.stringify(upTime));
        response.exception('INVALID_PARAM', 'Wrong parameter'); 
    } catch(err) {
        console.log(err.source, err.code, err.message);
    }
}

dbridge.cf.functions = function () {
    // function is exposed inside the property callback function.
    function cfFunInside (payload, response) {
        try {
          	let uName = {"uname": "Linux analysis 2.6.32-696.30.1.el6.x86_64 #1 SMP Tue May 22 03:28:18 UTC 2018 x86_64 x86_64 x86_64 GNU/Linux"};
            response.tracker = true;
            response.next('retrieving uName');
            response.end(JSON.stringify(uName));
            response.exception('INVALID_PARAM', 'Wrong parameter'); 
        } catch(err) {
            console.log(err.source, err.code, err.message);
        }
    }
    // binding of functions to be exposed by clientfunctions
    try {
    	dbridge.cf.regfn("sysUpTime", cfFunOutside);
    	dbridge.cf.regfn("uName", cfFunInside);
    } catch(err) {
    	console.log(err.source, err.code, err.message);
    }
}

// unbinding of function exposed by clientfunctions
dbridge.cf.unregfn("sysUpTime", cfFunOutside);
```

Below are <u>*parameters*</u> of the callback function which is exposed to *clientfunctions*.

| Parameter  | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| `payload`  | *(string)*  The inParameter for the clientFunction.          |
| `response` | *(object)* The library creates a response object unique for each client function call. The Response object has *properties* and *function* to return execution results of the function back to caller. |

##### response: `(object)`

| Properties/Function | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `tracker`           | *(boolean)* This will enable  response tracker, and event `cf.response.tracker` will be fired if any issue happens in sending back response to caller. Enable this property if your function needs a confirmation of reponse delivered to the caller. |
| `id`                | *(string)* *(readonly)* Each client function execution is assigned a unique ID by the library.  when the response tracker is enabled, the application can bind to an event `cf.response.tracker` to get the delivery notification. The event will indicate the delivery notification linked to this ID. Application will need to maintain this ID to track the delivery notification. |
| `next`              | *(function)*  dataBridges CF (Special case RPC \|request-response) supports mult-part response. Application can use `response.next` to send multi-part response to the caller. |
| `end`               | *(function)*   `response.end` is to send the final response to the caller. Once `end` is called, the object is **closed** and no more response can be sent. |
| `exception`         | *(function)*  Two parameter, return `errorCode` *(string)* ,`errorMessage` *(string)* is sent to caller. This will raise an exception at the caller library. |

##### Exceptions:

Below exceptions are raised in the `cf.regfn`.

| Source         | Code                  | Description                                   |
| -------------- | --------------------- | --------------------------------------------- |
| DBLIB_CF_REGFN | INVALID_FUNCTION_NAME | Invalid Function name.                        |
| DBLIB_CF_REGFN | INVALID_CALLBACK      | Callback is not a function or is not defined. |

Below exceptions are raised on `response` object inside the registered function.

| Source        | Code                   | Description                                                  |
| ------------- | ---------------------- | ------------------------------------------------------------ |
| DBLIB_CF_CALL | NETWORK_DISCONNECTED   | Connection to dataBridges network is not active.             |
| DBLIB_CF_CALL | RESPONSE_OBJECT_CLOSED | Return response object is closed. Thus the function is unable to respond back to the call. |

#### resetqueue() 

*<u>dbridgeObject</u>*  resetqueue() . The dataBridges network maintains in-process CF function execution status. resetqueue() informs the dataBridges network that all in-process CF function execution will be dropped by the application and response to be invalidated. Resetqueue() use case is intended to be used by application in its self health status management. Sometime due to the application process flow, the application can identify situation where it would like to ease its load by resettiing the CF function execution queue by sending resetqueue() message to dataBridges network and than closing all in-process CF function execution. 

```javascript
try {
    dbridge.cf.resetqueue();
} catch(err) {
	console.log(err.source, err.code, err.message);
}
```

##### Exceptions: 

| Source        | Code                 | Description                                      |
| ------------- | -------------------- | ------------------------------------------------ |
| DBLIB_CF_CALL | NETWORK_DISCONNECTED | Connection to dataBridges network is not active. |

#### System events for cf object

There are a number of events which are triggered internally by the library, but can also be of use elsewhere. Below are the list of all events triggered by the library.

Below syntax is same for all system events.

```javascript
//  Binding to systemevent on dbridgeObject  
try {
    dbridge.cf.bind('eventName', (payload, metadata) => {
        console.log( payload, metadata);
    });
} catch(err) {
     console.log(err.source, err.code, err.message);
}
```

#### cf.response.tracker

##### Callback parameters

| Return Values | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `payload`     | *(string)*  Tracker identifier. which is same as `response.id` |
| `metadata`    | *(string)*  Refer below table.                               |

| Error Identifier | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| RE_12616         | cf caller is disconnected from dataBridges network and hence cannot process response tracking. |
| RE_13151         | cf caller is disconnected from dataBridges network and hence cannot process response tracking. |
| RE_30030         | The cf callee is disconnected from dataBridges network       |
| RE_33635         | The cf callee is disconnected from dataBridges network       |

#### cf.callee.queue.exceeded

###### payload: `(dberror object)`

```javascript
{
    "source": "DBNET_CF_CALL" , 			// (string) Error source
    "code": "ERR_CALLEE_QUEUE_EXCEEDED",	// (string) Error code 
    "message": "" 							// (string) Error message if applicable.
}
```

###### metadata:

`null`

#### dberror:

| Source        | Code                      | Description                                                  |
| ------------- | ------------------------- | ------------------------------------------------------------ |
| DBNET_CF_CALL | ERR_CALLEE_QUEUE_EXCEEDED | No new cf calls are being routed by the dataBridges network to the application because the application's current cf processing queue has already exceeded. <br />Each application connection cannot exceed cf.queue.maximum. Refer to management console documentation for cf.queue.maximum details. |



## Change Log
  * [Change log](CHANGELOG.md): Changes in the recent versions

## License

DataBridges Library is released under the [Apache 2.0 license](LICENSE).

```
Copyright 2022 Optomate Technologies Private Limited.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
