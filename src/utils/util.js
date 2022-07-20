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


 function updatedBNewtworkSC(dbcore , dbmsgtype ,  channelName , sid, channelToken, subject, source_id, t1, seqnum=undefined){
    if(!subject) subject = null;
    if(!channelToken) channelToken =  null;
	if(!source_id) source_id = null;
	if(!t1) t1 = null;
	if(!seqnum) seqnum =  null;

    let msgDbp =  { "eventname": "db", 
    "dbmsgtype": dbmsgtype,
	"subject": subject,
	"rsub": null,
	"sid": sid,
	"payload": (channelToken)? new Buffer.from(channelToken.toString('utf-8')):new Buffer.from("".toString('utf-8')),
	"fenceid": channelName,
	"rspend": null,
	"rtrack": null,
	"rtrackstat": null,
	"t1": t1,
	"latency": null,
	"globmatch": 0,
	"sourceid": source_id,
	"sourceip": null,
	"replylatency": null,
	"oqueumonitorid": seqnum}
		return dbcore.send(msgDbp);
}


function updatedBNewtworkCF(dbcore , dbmsgtype , sessionid, functionName , returnSubject , sid , payload , rspend , rtrack ){
    if(!functionName) functionName = null;
    if(!returnSubject) returnSubject =  null;
	if(!sid) sid = null;
	if(!payload) payload = null;
	if(!rspend) rspend = false;
	if(!rtrack) rtrack = null;
	if(!sessionid) sessionid=null;

    let msgDbp =  { "eventname": "db", 
    "dbmsgtype": dbmsgtype,
	"subject": functionName,
	"rsub": returnSubject,
	"sid": sid,
	"payload": (payload)? new Buffer.from(payload.toString('utf-8')):new Buffer.from("".toString('utf-8')),
	"fenceid": sessionid,
	"rspend": rspend,
	"rtrack": rtrack,
	"rtrackstat": null,
	"t1": null,
	"latency": null,
	"globmatch": 0,
	"sourceid": null,
	"sourceip": null,
	"replylatency": null,
	"oqueumonitorid": null}
		return dbcore.send(msgDbp);
}


function GenerateUniqueId(){
        return  ("" + Math.random()).substring(2, 8);
}


 

const systemEvents = Object.freeze(
    {   
		SUBSCRIBE_SUCCESS:  "dbridges:subscribe.success",
        SUBSCRIBE_FAIL: "dbridges:subscribe.fail" , 
		ONLINE:			"dbridges:channel.online",
		OFFLINE:	"dbridges:channel.offline",

		REMOVE: "dbridges:channel.removed",
		
		UNSUBSCRIBE_SUCCESS:  "dbridges:unsubscribe.success",
        UNSUBSCRIBE_FAIL: "dbridges:unsubscribe.fail" , 


		CONNECT_SUCCESS:  "dbridges:connect.success",
        CONNECT_FAIL: "dbridges:connect.fail" , 


		DISCONNECT_SUCCESS:  "dbridges:disconnect.success",
        DISCONNECT_FAIL: "dbridges:disconnect.fail" ,


		RESUBSCRIBE_SUCCESS:  "dbridges:resubscribe.success",
        RESUBSCRIBE_FAIL: "dbridges:resubscribe.fail" , 

		RECONNECT_SUCCESS:  "dbridges:reconnect.success",
        RECONNECT_FAIL: "dbridges:reconnect.fail" ,
		PARTICIPANT_JOINED:   "dbridges:participant.joined",
		PARTICIPANT_LFET:   "dbridges:participant.left",

		REGISTRATION_SUCCESS:  "dbridges:rpc.server.registration.success",
        REGISTRATION_FAIL: "dbridges:rpc.server.registration.fail" , 
		SERVER_ONLINE:			"dbridges:rpc.server.online",
		SERVER_OFFLINE:	"dbridges:rpc.server.offline",

		UNREGISTRATION_SUCCESS:  "dbridges:rpc.server.unregistration.success",
        UNREGISTRATION_FAIL: "dbridges:rpc.server.unregistration.fail" , 
		

		RPC_CONNECT_SUCCESS:  "dbridges:rpc.server.connect.success",
        RPC_CONNECT_FAIL: "dbridges:rpc.server.connect.fail" , 


    });


const accessTokenActions = Object.freeze(
	{
		CHANNELSUBSCRIBE:"channel.subscribe",
		CHANNELCONNECT: "channel.connect",
		RPCCONNECT: "rpc.connect",
		RPCREGISTER: "rpc.register",
		SYSTEM_CHANNELSUBSCRIBE:   "system_channel.subscribe"
	});


 module.exports = {updatedBNewtworkSC , GenerateUniqueId, systemEvents, updatedBNewtworkCF, accessTokenActions}

