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

const dispatcher =  require('../dispatcher/dispatcher');
const states = require('./states')
const utils = require('../utils/util');
const MessageTypes = require('../msgtypes/dbmessagetypes');
const dBError = require('../exception/errormessages');

class ConnectionState
{
	#supportedEvents = undefined;
	#registry = undefined;
	#newLifeCycle = undefined;
	#NoChangeEvents = undefined;
	reconnect_attempt = 0;
	#dbcore = undefined;
	rttms = undefined;

    constructor(dBCoreObject)
    {
        this.state = "";
		this.isconnected = false;
		this.#supportedEvents = ["connect_error" , "connected" ,	"disconnected" , 
								"reconnecting", "connecting", "state_change",
								 "reconnect_error", "reconnect_failed", "reconnected",
								"connection_break" ,  "rttpong"]; 

		this.#registry = new dispatcher();
		this.#newLifeCycle = true;
		this.reconnect_attempt = 0;
		this.#dbcore = dBCoreObject;
		this.rttms = undefined;
    }

	
	rttping(payload=null)
	{
		const now = new Date();
		const t1 = now.getTime();
		let m_status =  utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.SYSTEM_MSG, null, null ,  payload, "rttping" , null, t1);

		if(!m_status) throw(new dBError("E011")); 
	}

	set_newLifeCycle(value){
		this.#newLifeCycle = value;
	}

	get_newLifeCycle(){
		return this.#newLifeCycle;
	}

    bind(eventName , callback)
	{

		if(!(eventName)) throw (new dBError("E012")); 
		
		if(!(callback)) throw (new dBError("E013"));
		
		if(!(typeof eventName === "string" )) throw(new dBError( "E012")); 
		
		if(!(this.#supportedEvents.includes(eventName))) throw(new dBError("E012")); 
		
		if(!(typeof callback === "function") ) throw(new dBError("E013"));
	
		this.#registry.bind(eventName , callback);
	}

    unbind(eventName , callback)
	{
	    this.#registry.unbind(eventName , callback); 
	}


	_updatestates(eventName)
	{
		switch(eventName){
			case states.CONNECTED:
			case states.RECONNECTED:
			case states.RTTPONG:
			case states.RTTPING:
				this.isconnected = true;
				break;
			default:
				this.isconnected = false;
				break;
		}
	}
	
	_handledispatcher(eventName ,  eventInfo)
	{
		let previous =  this.state;
		let metadata = {"eventname": eventName };
		if(!["reconnect_attempt", 'rttpong', 'rttping'].includes(eventName)) this.state =  eventName; this.state =  eventName;
	
		this._updatestates(eventName);

		if(eventName != previous)
		{
	
			if(!["reconnect_attempt", 'rttpong', 'rttping'].includes(eventName))  {
				if(!["reconnect_attempt", 'rttpong', 'rttping'].includes(previous)){
					let leventInfo = {"previous": previous, "current": eventName}; 
					this.state =  eventName;
					if (eventName == "disconnected")
					{
						this.state = ""
					}
					this.#registry.emit_connectionState(states.STATE_CHANGE, leventInfo);
				}
			}
		}

		if(eventInfo){
			this.#registry.emit_connectionState(eventName, eventInfo);
		}else{
			this.#registry.emit_connectionState(eventName);
		}
		if(eventName ==  "reconnected") this.state = "connected"
		
	}

}

module.exports = ConnectionState;