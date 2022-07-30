/*
	DataBridges Node.js server Library
	https://www.databridges.io/



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
*/

const IO =  require('socket.io-client');
const ConnectionState =  require("./connection/conectionstate")
const Channels = require("./channel/channels");
const states = require('./connection/states')
const MessageTypes = require('./msgtypes/dbmessagetypes');
const channelStatus = require('./channel/channelstatus');
const fetch = require("node-fetch");
const moment = require('moment')
const https = require('https');
const crypto = require('crypto');
const Crpcclient = require('./rpc/rpcclient');
const CRpc = require('./rpc/rpc');
const rpcStatus = require('./rpc/rpcstatus');
const dBError = require('./exception/errormessages');

class dBridges {
    
    #ClientSocket = undefined;
    #options = undefined;
    auth_url = undefined;
    connectionstate = undefined;
    channel = undefined;
    sessionid = undefined;
    #count = 0;
    maxReconnectionDelay = undefined;
    minReconnectionDelay = undefined;
    reconnectionDelayGrowFactor = undefined;
    minUptime = undefined;
    connectionTimeout = undefined;
    maxReconnectionRetries = undefined;
    #uptimeTimeout = undefined;
    #retryCount = 0;
    autoReconnect = true;
    #lifeCycle = 0;
    #isServerReconnect = false;
    appkey = undefined;
    appsecret = undefined;
    cf = undefined;
    rpc = undefined;
    #metadata =  {
                    "channelname": undefined , 
                    "eventname": undefined,
                    "sourcesysid": undefined, 
                    "sqnum": undefined,
                    "sessionid": undefined, 
                    "intime": undefined,
                };


    constructor() {
     
        this.#ClientSocket = undefined;
        this.sessionid = undefined;
        let cs = new ConnectionState(this);
        this.connectionstate = cs;
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        this.channel = new Channels(this);
        this.#options = {};

        this.maxReconnectionRetries = 10;
        this.maxReconnectionDelay = 120000;
        this.minReconnectionDelay = 1000 + Math.random() * 4000;
        this.reconnectionDelayGrowFactor = 1.3;
        this.minUptime = 500;
        this.connectionTimeout = 10000;
        this.autoReconnect = true;

        this.#uptimeTimeout = undefined;
        this.#retryCount = 0;
        this.#lifeCycle = 0;
        this.#isServerReconnect = false;
        this.appkey = undefined;
        this.appsecret = undefined;
        this.cf = new Crpcclient(this);
        this.rpc = new CRpc(this);
    }


    #acceptOpen() {
        this.#retryCount = 0;
        this.connectionstate.reconnect_attempt = this.#retryCount;
        if (this.#ClientSocket.connected) {
            if (this.#lifeCycle == 0) {
                this.connectionstate._handledispatcher(states.CONNECTED);
                this.#lifeCycle++;
            } else {
                this.connectionstate._handledispatcher(states.RECONNECTED);
            }
        }
    }

    #getNextDelay() {
        let delay = 0;
        if (this.#retryCount > 0) {
            delay =
                this.minReconnectionDelay * Math.pow(this.reconnectionDelayGrowFactor, this.#retryCount - 1);
            delay = (delay > this.maxReconnectionDelay) ? this.maxReconnectionDelay : delay;
            delay = (delay < this.minReconnectionDelay) ? this.minReconnectionDelay : delay;
        }
        
        return delay;
    }
    
    #wait() {
        return new Promise(resolve => {
            setTimeout(resolve, this.#getNextDelay());
        });
    }

    
    #reconnect = async () => {

        if (this.#retryCount >= this.maxReconnectionRetries) {
            this.connectionstate._handledispatcher(states.RECONNECT_FAILED, new dBError("E060")); 
            
            if (this.#ClientSocket) this.#ClientSocket.removeAllListeners();
            this.channel.cleanUp_All();
            this.rpc.cleanUp_All();
            //this.connectionstate.state = "";
            this.#lifeCycle =  0;
            this.#retryCount = 0;
            this.connectionstate.set_newLifeCycle(true);
            this.connectionstate._handledispatcher(states.DISCONNECTED);
            return;
        }
        this.#retryCount++;
        this.#wait()
            .then(() => {
                this.connectionstate.reconnect_attempt = this.#retryCount;
                this.connectionstate._handledispatcher(states.RECONNECTING, this.#retryCount);
                this.connect();
            });
    }


    shouldRestart(ekey) {
        if (this.autoReconnect) {
            if (!this.connectionstate.get_newLifeCycle()) {
                if(typeof ekey ===  'string'){
                    this.connectionstate._handledispatcher(states.RECONNECT_ERROR, new dBError(ekey));
                }else{
                    this.connectionstate._handledispatcher(states.RECONNECT_ERROR, ekey);
                }
                this.#reconnect();
                return;
            } else {
                if(typeof ekey ===  'string'){
                    this.connectionstate._handledispatcher(states.ERROR, new dBError(ekey));
                }else{
                    this.connectionstate._handledispatcher(states.ERROR, ekey);
                }
                return;
            }
        }
    }


    disconnect() {
        this.#ClientSocket.disconnect();
    }


    #encBase64(strToEnc) {
        return Buffer.from(strToEnc, 'utf8').toString('base64');
    };
    
    #getauth_sign() {
        try {
            const now = new Date()
            const utcgmtsec = Math.round(now.getTime() / 1000).toString();
            const hmacKey = crypto.createHmac('sha256', this.appsecret).update(this.appkey + '.' + utcgmtsec).digest('hex');
            const payloadString = this.#encBase64(this.appkey) + ':' + this.#encBase64(utcgmtsec) + ':' + this.#encBase64(hmacKey);
            return payloadString;
        } catch (error) {
            return "";
        }
    }


    connect = async () => {

        if(this.#retryCount == 0  && !this.connectionstate.get_newLifeCycle()){
            this.connectionstate.set_newLifeCycle(true);
          }
          
        if (!this.auth_url) {
            if (this.connectionstate.get_newLifeCycle()) {
                throw(new dBError("E001"));
            } else {
                this.shouldRestart("E001");
                return;
            }
        }


        if (!this.appkey) {
            if (this.connectionstate.get_newLifeCycle()) {
                throw (new dBError("E002"));
            } else {
                this.shouldRestart("E002");
                return;

            }
        }


        if (!this.appsecret) {
            if (this.connectionstate.get_newLifeCycle()) {
                throw (new dBError("E003"));
            } else {
                
                this.shouldRestart("E003");
                return;

            }
        }

        

        let appkey = undefined;
        
        appkey = this.#getauth_sign();
        if (!appkey) {
            if (this.connectionstate.get_newLifeCycle()) {
                throw (new dBError("E005"));
            } else {
                this.shouldRestart("EOO5");
            
                return;
            }
        }
        

        try {
            let flag = this.cf._verify_function();
        } catch (error) {
            if (this.connectionstate.get_newLifeCycle()) {
                throw (error);
            } else {
                this.shouldRestart(error);
                return;
            }
        }

        let jdata = undefined;
        try {
            jdata = await this.GetdBRInfo(this.auth_url, appkey);
        } catch (error) {
            if (this.connectionstate.get_newLifeCycle()) {
                throw(error)
            } else {
                this.shouldRestart(error);
                return;
                
            }
        }
        
        
        if (!jdata) {
            this.shouldRestart("E008", [this.auth_url]);
            return;
        }

        let secure = jdata.secured;

        let protocol = (secure) ? "https://" : "http://";
        let dbripport = protocol + jdata.wsip + ":" + jdata.wsport;

        this.#options['query'] = {
            'sessionkey': jdata.sessionkey,
            'version': '1.1',
            'libtype': 'nodejs',
            'cf': this.cf.enable
        };
    
        
        
        this.#options.secure = !("secure" in this.#options) ? true : true;
        this.#options.rejectUnauthorized = !("rejectUnauthorized" in this.#options) ? false : false;

        this.#options.retryInterval = !("retryInterval" in this.#options) ? 5 : 5;
        this.#options.retryAttempt = !("retryAttempt" in this.#options) ? 0 : 0;
        this.#options.reconnect = !("reconnect" in this.#options) ? false : false;

        this.#options['transports'] = ['websocket'];
        this.#options["timeout"] = (this.connectionTimeout <= 0) ? 20000 : this.connectionTimeout;
        if (this.#lifeCycle == 0) {
            this.connectionstate._handledispatcher(states.CONNECTING);
        }
        this.#isServerReconnect = false;

        this.connectionstate.set_newLifeCycle(true);
        this.#ClientSocket = IO.connect(dbripport, this.#options);
        this.#ClientSocket.addEventListener("disconnect", this.#IOEventReconnect);
        this.#ClientSocket.addEventListener("db", this.#IOMessage);
        this.#ClientSocket.addEventListener("connect", this.#IOConnect);
        this.#ClientSocket.addEventListener("connect_timeout", this.#IOConnectFailed);
        this.#ClientSocket.addEventListener("connect_error", this.#IOError);

    }

    
      
    GetdBRInfo = (url, api_key) => {
        return new Promise(async (resolve, reject) => {
        
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': api_key,
                        'lib-transport': 'sio',
                    },
                    agent: this.httpsAgent,
                    body: '{}'
                });
        
                if (response.status != 200) {
                    let db = new dBError("E006" , [response.status, response.statusText]);
                    db.updatecode(response.status, ""); 
                    reject(db); 
                }
                let jdata = await response.json();
                resolve(jdata);
                
            } catch (error) {
                let db = new dBError("E008" , [error.code ,  error.message]);
                db.updatecode(error.code, ""); 
                reject(db)
            }
        });
    }




    #IOEventReconnect = (reason) => {
        this.channel._send_OfflineEvents();
        this.rpc._send_OfflineEvents();
        switch (reason) {
            case "io server disconnect":
                this.connectionstate._handledispatcher(states.ERROR, new dBError("E061"));
                if (this.#ClientSocket) this.#ClientSocket.removeAllListeners();

                if (!this.autoReconnect) {
                    
                    this.channel.cleanUp_All();
                    this.rpc.cleanUp_All();
                    //this.connectionstate.state = "";
                    this.#lifeCycle =  0;
                    this.#retryCount = 0;
                    this.connectionstate.set_newLifeCycle(true);
                    this.connectionstate._handledispatcher(states.DISCONNECTED);
                }else{
                    this.#reconnect();
                }

                break;
            case "io client disconnect":

                if (this.#isServerReconnect) {
                    this.connectionstate._handledispatcher(states.CONNECTION_BREAK, new dBError("E062"));
                        
                    if (this.#ClientSocket) this.#ClientSocket.removeAllListeners();
                    if (!this.autoReconnect) {
                        
                        this.channel.cleanUp_All();
                        this.rpc.cleanUp_All();
                        //this.connectionstate.state = "";
                        this.#lifeCycle =  0;
                        this.#retryCount = 0;
                        this.connectionstate.set_newLifeCycle(true);
                        this.connectionstate._handledispatcher(states.DISCONNECTED);
                    }else{
                        this.#reconnect();
                    }

                } else {
                    
                    if (this.#ClientSocket) this.#ClientSocket.removeAllListeners();
                    this.channel.cleanUp_All();
                    this.rpc.cleanUp_All();
                    //this.connectionstate.state = "";
                    this.#lifeCycle =  0;
                    this.#retryCount = 0;
                    this.connectionstate.set_newLifeCycle(true);
                    this.connectionstate._handledispatcher(states.DISCONNECTED);
                }

                break;

            default:
                if (this.#uptimeTimeout) clearTimeout(this.#uptimeTimeout);

                this.connectionstate._handledispatcher(states.CONNECTION_BREAK, new dBError("E063"));

                if (this.#ClientSocket) this.#ClientSocket.removeAllListeners();
                if (!this.autoReconnect) {
                    
                    this.channel.cleanUp_All();
                    this.rpc.cleanUp_All();
                    //this.connectionstate.state = "";
                    this.#lifeCycle =  0;
                    this.#retryCount = 0;
                    this.connectionstate.set_newLifeCycle(true);
                    this.connectionstate._handledispatcher(states.DISCONNECTED);
                }else{
                    this.#reconnect();
                }
                break;

        }
        
    }


    #ReplyLatency=(recdlatency,oqueumonitorid)=>{
        if (this.#ClientSocket.connected) {
            this.#ClientSocket.emit('db', MessageTypes.LATENCY, null, null, null, null, null, null, null, null, null, recdlatency, null, null, null, true, oqueumonitorid);
        }
    }

    #Rttpong = (dbmsgtype, subject, rsub, sid, payload, fenceid,
        rspend, rtrack, rtrackstat, t1, latency, globmatch,
        sourceid, sourceip, replylatency, oqueumonitorid)=>{
        if (this.#ClientSocket.connected) {

            this.#ClientSocket.emit('db', dbmsgtype, subject, rsub, sid, payload, fenceid,
            rspend, rtrack, rtrackstat, t1, latency, globmatch,
            sourceid, sourceip, replylatency, oqueumonitorid);
        }
    }

    

    #IOMessage = (dbmsgtype, subject, rsub, sid, payload, fenceid,
        rspend, rtrack, rtrackstat, t1, latency, globmatch,
        sourceid, sourceip, replylatency, oqueumonitorid) => {
        let mpayload = undefined;
        let mchannelName = undefined;
        let metadata = undefined;
        let dberr = undefined;
        let rpccaller = undefined;
        let extradata = undefined;
        const recieved = moment().valueOf();
        let recdDate = (t1)? Number(t1) : 0;
        const lib_latency = recieved - recdDate;


        switch (dbmsgtype) {
            
            case MessageTypes.SYSTEM_MSG:
                switch (subject) {
                    case "connection:success":
                        this.sessionid = payload.toString();
                        
                        if (this.connectionstate.get_newLifeCycle()) {
                            if (this.cf.enable) {
                                this.cf.functions(); //executing 
                            }
                        }

                        this.connectionstate.set_newLifeCycle(false);
                        this.#uptimeTimeout = setTimeout(() => this.#acceptOpen(), (this.minUptime < 0) ? 200 : this.minUptime);
                        this.rpc._ReSubscribeAll();
                        this.channel._ReSubscribeAll();

                        if(t1){
                            setImmediate(()=>{
                                this.#Rttpong(dbmsgtype, "rttpong", rsub, sid, payload, fenceid,
                                    rspend, rtrack, rtrackstat, t1, lib_latency, globmatch,
                                    sourceid, sourceip, replylatency, oqueumonitorid)
                                });
                          }

                        break;

                    case "rttping":
                        if(t1){
                            this.connectionstate.rttms =  lib_latency;   
                            setImmediate(()=>{
                                 
                                this.#Rttpong(dbmsgtype, "rttpong", rsub, sid, payload, fenceid,
                                    rspend, rtrack, rtrackstat, t1, lib_latency, globmatch,
                                    sourceid, sourceip, replylatency, oqueumonitorid)
                                });
                          }
                        break;

                    case "rttpong":

                        if (t1) {
                            const now = new Date();
                            const eventData = now.getTime() - Number(t1);
                            this.connectionstate.rttms =  lib_latency;   
                            this.connectionstate._handledispatcher(states.RTTPONG, eventData);
                        }

                        break;
                    case "reconnect":

                        this.#isServerReconnect = true;
                        this.#ClientSocket.disconnect();
                        break;
                    
                    default: 
                        dberr =  new dBError("E082");
                        dberr.updatecode(subject , payload.toString());
                        this.connectionstate._handledispatcher(states.ERROR, dberr);
                        break;
                }
                    
                break;
            case MessageTypes.SERVER_SUBSCRIBE_TO_CHANNEL:
                switch (subject) {
                    case "success":
                        switch (this.channel._get_subscribeStatus(sid)) {
                            case channelStatus.SUBSCRIPTION_INITIATED:
                                this.channel._updateChannelsStatusAddChange(0, sid, channelStatus.SUBSCRIPTION_ACCEPTED, "");
                                break;
                            case channelStatus.SUBSCRIPTION_ACCEPTED:
                            case channelStatus.SUBSCRIPTION_PENDING:
                                this.channel._updateChannelsStatusAddChange(1, sid, channelStatus.SUBSCRIPTION_ACCEPTED, "");
                                break;
                        }
                        break;
                    default: 
                            dberr =  new dBError("E064");
                            dberr.updatecode(subject.toUpperCase() , payload.toString());

                        switch (this.channel._get_subscribeStatus(sid)) {
                            case channelStatus.SUBSCRIPTION_INITIATED:
                                this.channel._updateChannelsStatusAddChange(0, sid, channelStatus.SUBSCRIPTION_ERROR, dberr);
                                break;
                            case channelStatus.SUBSCRIPTION_ACCEPTED:
                            case channelStatus.SUBSCRIPTION_PENDING:
                                this.channel._updateChannelsStatusAddChange(1, sid, channelStatus.SUBSCRIPTION_PENDING, dberr);
                                break;
                        }
                        break;
                }
                    
                break;
            
            case MessageTypes.SERVER_UNSUBSCRIBE_DISCONNECT_FROM_CHANNEL:

                switch (subject) {
                    case "success":

                        switch (this.channel._get_channelType(sid)) {
                            case "s":
                                this.channel._updateChannelsStatusRemove(sid, channelStatus.UNSUBSCRIBE_ACCEPTED, "");
                                break;
                            case "c":
                                this.channel._updateChannelsStatusRemove(sid, channelStatus.DISCONNECT_ACCEPTED, "");
                                break;
                        }
                        break;
                    default: 
                        dberr =  new dBError("E065"); 
                        dberr.updatecode(subject.toUpperCase() , payload.toString());

                        switch (this.channel._get_channelType(sid)) {
                            case "s":
                                this.channel._updateChannelsStatusRemove(sid, channelStatus.UNSUBSCRIBE_ERROR, dberr);
                                break;
                            case "c":
                               this.channel._updateChannelsStatusRemove(sid, channelStatus.DISCONNECT_ERROR, dberr);
                                break;
                        }
                        break;
                }
                break;

            case MessageTypes.PUBLISH_TO_CHANNEL:
                
                mchannelName = this.channel._get_channelName(sid);
                metadata = Object.assign({}, this.#metadata);
                metadata.eventname = subject;
                metadata.sourcesysid = sourceid; 
                metadata.sessionid = sourceip;
                metadata.sqnum = oqueumonitorid;
                if(t1){metadata.intime = t1};

                if (mchannelName.toLowerCase().startsWith("sys:*")) {
                    metadata.channelname = fenceid;
                } else {
                    metadata.channelname = mchannelName;
                }

                 

                mpayload = undefined;
                try {
                    mpayload = (payload) ? payload.toString() : "";
                } catch (error) {
                    mpayload = "";
                }

                this.channel._handledispatcherEvents(subject, mpayload, mchannelName, metadata);

                break;
            case MessageTypes.PARTICIPANT_JOIN:
                 mchannelName = this.channel._get_channelName(sid);
                 metadata = Object.assign({}, this.#metadata);
                 metadata.eventname = 'dbridges:participant.joined';
                 metadata.sourcesysid = sourceid; 
                 metadata.sessionid = sourceip;
                 metadata.sqnum = oqueumonitorid;
                 metadata.channelname = mchannelName;
                if (t1) { metadata.intime = t1 };
                 
                if (mchannelName.toLowerCase().startsWith("sys") || mchannelName.toLowerCase().startsWith("prs")) {
                    extradata = this.#convertToObject(sourceip, sourceid, fenceid);
                    metadata.sessionid = extradata.s;
                    metadata.sourcesysid = extradata.sysid;

                    if (mchannelName.toLowerCase().startsWith("sys:*")) {    
                        
                        this.channel._handledispatcherEvents('dbridges:participant.joined', extradata.i, mchannelName, metadata);
                    }else {

                        this.channel._handledispatcherEvents('dbridges:participant.joined', extradata.i, mchannelName, metadata);
                    }

                } else {
                    this.channel._handledispatcherEvents('dbridges:participant.joined', {"sourcesysid":sourceid} , mchannelName, metadata);
                }
                break;

            case MessageTypes.PARTICIPANT_LEFT:
                mchannelName = this.channel._get_channelName(sid);

                metadata = Object.assign({}, this.#metadata);
                 metadata.eventname = 'dbridges:participant.left';
                 metadata.sourcesysid = sourceid; 
                 metadata.sessionid = sourceip;
                 metadata.sqnum = oqueumonitorid;
                metadata.channelname = mchannelName;
                if (t1) { metadata.intime = t1 };

                if (mchannelName.toLowerCase().startsWith("sys") || mchannelName.toLowerCase().startsWith("prs") ) {
                    extradata = this.#convertToObject(sourceip, sourceid, fenceid);
                    metadata.sessionid = extradata.s;
                    metadata.sourcesysid = extradata.sysid;
                    if (mchannelName.toLowerCase().startsWith("sys:*")) {
                        this.channel._handledispatcherEvents('dbridges:participant.left', extradata.i, mchannelName, metadata);
                    }else {
                        this.channel._handledispatcherEvents('dbridges:participant.left', extradata.i, mchannelName, metadata);
                    }
                } else {
                    this.channel._handledispatcherEvents('dbridges:participant.left', {"sourcesysid":sourceid}, mchannelName, metadata);
                }

                break;
            
            case MessageTypes.CF_CALL_RECEIVED:

                if (sid == 0) {
                    let mpayload = undefined;
                    try {
                        mpayload = (payload) ? payload.toString() : "";
                    } catch (error) {
                        mpayload = "";
                    }
                
                    this.cf._handle_dispatcher(subject, rsub, sid, mpayload)
                }
                
                break;
            case MessageTypes.CF_CALL_RESPONSE:

                mpayload = undefined;
                try {
                    mpayload = (payload) ? payload.toString() : "";
                } catch (error) {
                    mpayload = "";
                }

                this.cf._handle_callResponse(sid, mpayload, rspend, rsub);
                break;

                
            case MessageTypes.CF_RESPONSE_TRACKER:
                this.cf._handle_tracker_dispatcher(subject, rsub);
                break;
            case MessageTypes.CF_CALLEE_QUEUE_EXCEEDED:
                this.cf._handle_exceed_dispatcher();
                break;
            
            case MessageTypes.REGISTER_RPC_SERVER:
                switch (subject) {
                    case "success":
                        switch (this.rpc._get_rpcStatus(sid)) {
                            case rpcStatus.REGISTRATION_INITIATED:
                                this.rpc._updateRegistrationStatusAddChange(0, sid, rpcStatus.REGISTRATION_ACCEPTED, "");
                                break;
                            case rpcStatus.REGISTRATION_ACCEPTED:
                            case rpcStatus.REGISTRATION_PENDING:
                                this.rpc._updateRegistrationStatusAddChange(1, sid, rpcStatus.REGISTRATION_ACCEPTED, "");
                                break;
                        }
                        break;
                    default: //fail:access_denied fail:error
                        dberr =    new dBError("E081");
                        dberr.updatecode(subject.toUpperCase(), "");
                        switch (this.rpc._get_rpcStatus(sid)) {
                            case rpcStatus.REGISTRATION_INITIATED:
                                this.rpc._updateRegistrationStatusAddChange(0, sid, rpcStatus.UNREGISTRATION_ERROR, dberr);
                                break;
                            case rpcStatus.REGISTRATION_ACCEPTED:
                            case rpcStatus.REGISTRATION_PENDING:
                                this.rpc._updateRegistrationStatusAddChange(1, sid, rpcStatus.REGISTRATION_PENDING, dberr);
                                break;
                        }
                        break;
                }
                break;
            case MessageTypes.UNREGISTER_RPC_SERVER:
                switch (subject) {
                    case "success":
                        this.rpc._updateRegistrationStatusAddChange(0, sid, rpcStatus.UNREGISTRATION_ACCEPTED, "");
                        break;
                    default: //fail:access_denied fail:error
                        this.rpc._updateRegistrationStatusAddChange(0, sid, rpcStatus.UNREGISTRATION_ERROR, "");
                        break;
                }
                break;

            case MessageTypes.CONNECT_TO_RPC_SERVER:
                switch (subject) {
                    case "success":
                        switch (this.rpc._get_rpcStatus(sid)) {
                            case rpcStatus.RPC_CONNECTION_INITIATED:
                                this.rpc._updateRegistrationStatusAddChange(0, sid, rpcStatus.RPC_CONNECTION_ACCEPTED, "");
                                break;
                            case rpcStatus.RPC_CONNECTION_ACCEPTED:
                            case rpcStatus.RPC_CONNECTION_PENDING:
                                this.rpc._updateRegistrationStatusAddChange(1, sid, rpcStatus.RPC_CONNECTION_ACCEPTED, "");
                                break;
                        }
                        break;
                    default: //fail:access_denied fail:error
                    dberr =    new dBError("E082");
                    dberr.updatecode(subject.toUpperCase(), "");
                        switch (this.rpc._get_rpcStatus(sid)) {
                            case rpcStatus.RPC_CONNECTION_INITIATED:
                                this.rpc._updateRegistrationStatusAddChange(0, sid, rpcStatus.RPC_CONNECTION_ERROR, dberr);
                                break;
                            case rpcStatus.RPC_CONNECTION_ACCEPTED:
                            case rpcStatus.RPC_CONNECTION_PENDING:
                                this.rpc._updateRegistrationStatusAddChange(1, sid, rpcStatus.RPC_CONNECTION_PENDING, dberr);
                                break;
                        }
                        break;
                }
                break;
            case MessageTypes.RPC_CALL_RESPONSE:
                mpayload = undefined;
                try {
                    mpayload = (payload) ? payload.toString() : "";
                } catch (error) {
                    mpayload = "";
                }
           

                 rpccaller = this.rpc.get_object(sid)
                rpccaller._handle_callResponse(sid, mpayload, rspend, rsub);
                break;
           
            case MessageTypes.RPC_CALL_RECEIVED:
                if (sid != 0) {
                    let mpayload = undefined;
                    try {
                        mpayload = (payload) ? payload.toString() : "";
                    } catch (error) {
                        mpayload = "";
                    }
    
                    rpccaller = this.rpc.get_rpcServerObject(sid);
                    rpccaller._handle_dispatcher_WithObject(subject, rsub, sid, mpayload, sourceip, sourceid);

                }
                            
                break;
            case MessageTypes.RPC_RESPONSE_TRACKER:
                 rpccaller = this.rpc.get_rpcServerObject(sid)
                rpccaller._handle_tracker_dispatcher(subject, rsub);
                break;
            case MessageTypes.RPC_CALLEE_QUEUE_EXCEEDED:
                 rpccaller = this.rpc.get_rpcServerObject(sid)
                rpccaller._handle_exceed_dispatcher();
                break;
    


        }
    }

    #convertToObject = (sourceip, sourceid, channelname = undefined) => {
        let sessionid = "";
        let libtype = "";
        let sourceipv4 = "";
        let sourceipv6 = "";
        let msourceid = "";
        let sourcesysid = "";

        if (sourceid) {
            var strData = sourceid.split("#")
            if (strData.length > 1) sessionid = strData[0];
            if (strData.length > 2) libtype = strData[1];
            if (strData.length > 3) sourceipv4 = strData[2];
            if (strData.length > 4) sourceipv6 = strData[3];
            if (strData.length >= 5) sourcesysid = strData[4];
        }

        let inObject = (channelname) ? {
            "sessionid": sessionid, "libtype": libtype,
            "sourceipv4": sourceipv4, "sourceipv6": sourceipv6, "sysinfo": sourceip,
            "channelname": channelname
        } :  {
            "sessionid": sessionid, "libtype": libtype,
            "sourceipv4": sourceipv4, "sourceipv6": sourceipv6, "sysinfo": sourceip
        }; 

        return {"i": inObject , "s": sessionid, "sysid": sourcesysid};

    }


    #IOConnect  = ()=>
    {
    }

    #IOConnectFailed  = (info)=>
    {
        
        this.connectionstate._handledispatcher(states.ERROR, new dBError("E063"));
    
        if(this.#ClientSocket) this.#ClientSocket.removeAllListeners();
    
        if(this.autoReconnect)  this.#reconnect();
    }

    #IOError  = (err)=>
    {
        this.connectionstate._handledispatcher(states.ERROR, err);
        
        if(this.#ClientSocket) this.#ClientSocket.removeAllListeners();
        
        if(this.autoReconnect) this.#reconnect();
        
    }

    
    _isSocketConnected(){
        return (this.#ClientSocket)? this.#ClientSocket.connected : false;
    }

    send = (msgDbp)=>
    {
        let flag = false;
        if(this.#ClientSocket.connected){
            setImmediate(()=>{ 
                this.#ClientSocket.emit(
                msgDbp.eventname,
                msgDbp.dbmsgtype,
                msgDbp.subject,
                msgDbp.rsub,
                msgDbp.sid,
                msgDbp.payload,
                msgDbp.fenceid,
                msgDbp.rspend,
                msgDbp.rtrack,
                msgDbp.rtrackstat,
                msgDbp.t1,
                msgDbp.latency,
                msgDbp.globmatch,
                msgDbp.sourceid,
                msgDbp.sourceip,
                msgDbp.replylatency,
                msgDbp.oqueumonitorid
                );});
            flag = true;
        }
    
        return flag;
        
    }

    

}

module.exports = dBridges;