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

const Crpcclient = require('./rpcclient');
const Crpcserver = require('./rpcserver');
const rpcStatus = require('./rpcstatus');
const dispatcher =  require('../dispatcher/dispatcher');
const utils = require('../utils/util');
const CrpCaller = require('./rpccaller');
const dBError = require('../exception/errormessages')
class CRpc
{
    #dbcore =  undefined;
    #serverSid_registry = undefined;
	#serverName_sid = undefined;
    #dispatch = undefined;
    #callersid_object= undefined;
	#server_type = undefined;
	#private_resubscribe_count = undefined;

    constructor(dbcorelib){
        this.#dbcore =  dbcorelib;
        this.#serverName_sid = new Map();
        this.#serverSid_registry = new Map();
        this.#dispatch =  new dispatcher();
        this.#callersid_object=new Map();
	
		this.#server_type = ["pvt" ,   "prs", "sys"];
	
    }


	isPrivateChannel(serverName)
	{
		let flag = false;
		if(serverName.includes(":")){
			var sdata = serverName.toLowerCase().split(":");
			if(this.#server_type.includes(sdata[0])) {
				flag = true;
			}else{
				flag=false;
			}
		}
		return flag;

	}


	_ReSubscribeAll()
	{
		const _communicateR = async (mtype , serverName, sid , access_token)=>
		{
			let cStatus =  false;
			if(mtype ==  0){
				cStatus = utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.REGISTER_RPC_SERVER, serverName, sid ,  access_token );
			}else{
				cStatus = utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.CONNECT_TO_RPC_SERVER, serverName, sid ,  access_token);
			}
			if(!cStatus) {
				if(mtype == 0) {
					throw(new dBError("E047")); 
				}else{
					throw(new dBError("E053"))
				}

			}
		}

		const _ReSubscribe = async (sid)=>{
				let m_object = this.#serverSid_registry.get(sid)
				let access_token =  undefined;

			switch(m_object.status)
			{
				
				case rpcStatus.REGISTRATION_ACCEPTED:
					try {
						_communicateR(0, m_object.name , sid, access_token);
						
					} catch (error) {
						this._handleRegisterEvents([utils.systemEvents.REGISTRATION_FAIL,utils.systemEvents.SERVER_OFFLINE ] , error ,  m_object);
						return;
					}
					break;

			
				case rpcStatus.RPC_CONNECTION_ACCEPTED:
					try {
						_communicateR(1, m_object.name , sid, access_token);
						
					} catch (error) {
						this._handleRegisterEvents([utils.systemEvents.RPC_CONNECT_FAIL] , error ,  m_object);
						return;
					}
					break;
						
			}

		}

		var private_registration =  [];
		var public_registration = [];
		var all_connect = [];
		this.#private_resubscribe_count = 0;




		this.#serverName_sid.forEach((sidmap, key) => {
			sidmap.forEach((value, sid) => {
				let m_object = this.#serverSid_registry.get(sid)
				if (m_object.type == "r") {
					if (this.isPrivateChannel(m_object.name)) {
						private_registration.push(sid);
					} else {
						public_registration.push(sid);
					}
				} else {
					all_connect.push(sid);
				}
			});
		});
		 

		this.#private_resubscribe_count = private_registration.length;

		for(let i = 0; i < private_registration.length; i++){
			_ReSubscribe(private_registration[i]);
		}

		for(let i = 0; i < public_registration.length; i++){
			_ReSubscribe(public_registration[i]);
		}

		for(let i = 0; i < all_connect.length; i++){
			_ReSubscribe(all_connect[i]);
		}
	}
	

    isEmptyOrSpaces(str){
		return str === null || (/^ *$/).test(str);
	}


	_validateServerName(serverName, mtype=0)
	{		
		if(this.isEmptyOrSpaces(serverName)) 
		{
			if(mtype==0){
				throw(new dBError("E043"));
			}else{
				throw(new dBError("E048"));
			}
		}
		if(serverName.length > 64) {
			if(mtype==0){
				throw(new dBError("E045"));
			}else{
				throw(new dBError("E051"));
			}
		}
		//var letters = '/^[0-9a-zA-Z_-:.]+$/';
		if(!(/^[a-zA-Z0-9\.:_-]*$/.test(serverName))) {
			if(mtype==0){
			throw(new dBError("E044"));
		}else{
			throw(new dBError("E052"));
		}
		}


		if(serverName.includes(":")){
			var sdata = serverName.toLowerCase().split(":");
			if(!this.#server_type.includes(sdata[0])) {
				if(mtype==0){
					throw(new dBError("E046"));
				}else{
					throw(new dBError("E049"));
				}
			}
		}
	}


    init(serverName)
	{
        try {
			this._validateServerName(serverName)
		} catch (error) {
			throw(error);
		}

        if(this.#serverName_sid.has(serverName)) throw(new dBError("E043"));
        let sid =  utils.GenerateUniqueId();
		let rpcserver = new Crpcserver(serverName, sid, this.#dbcore);

		this.#serverName_sid.set(serverName, new Map());
		this.#serverName_sid.get(serverName).set(sid, null);

        let m_value = {"name": serverName , "type":  "r", "status": rpcStatus.REGISTRATION_INITIATED, "ino": rpcserver};
        this.#serverSid_registry.set(sid ,  m_value);
        return rpcserver;
    }

    _get_rpcStatus(sid)
	{
        
		return this.#serverSid_registry.get(sid).status;
	}


    
    bind(eventName, callback)
	{

		this.#dispatch.bind(eventName, callback);
	}

	unbind(eventName, callback)
	{
		this.#dispatch.unbind(eventName, callback);
	}

	bind_all(callback)
	{
		this.#dispatch.bind_all(callback);
	}

	unbind_all(callback)
	{
		this.#dispatch.unbind_all(callback);
	}

	
	
	_handledispatcherEvent(eventName ,serverName)
	{
		this.#dispatch.emit(eventName, serverName);
		let sidmap = this.#serverName_sid.get(serverName);
		sidmap.forEach((value, sid) => {
			let m_object = this.#serverSid_registry.get(sid);
			if (!m_object) return;
			m_object.ino.emit(eventName, serverName);
		});
	}
	


	_handleRegisterEvents(eventName , eventData ,  m_object)
	{

		const dispatchEvents = async (i) => {
			let metadata = {"servername": m_object.ino.getServerName(),  "eventname": eventName[i]};

			this.#dispatch.emit_channel(eventName[i], eventData, metadata);
			m_object.ino.emit(eventName[i], eventData, metadata);

			i = i + 1;
            if (i < eventName.length) {
                dispatchEvents(i);
            } 
		}
		if (eventName.length > 0) {
            dispatchEvents(0);
        } 
	}


    _handleRegisterEventsOld(eventName , eventData ,  m_object)
	{
		const dispatchEvents = async (i) => {
			m_object.ino.emit(eventName[i], eventData,  m_object.ino.getServerName());
			this._handledispatcherEvent(eventName[i] , eventData, m_object.ino.getServerName() );

			i = i + 1;
            if (i < eventName.length) {
                dispatchEvents(i);
            } 
		}
		if (eventName.length > 0) {
            dispatchEvents(0);
        } 

	}

	_updateRegistrationStatus(sid , status , reason)
	{
		if(!this.#serverSid_registry.has(sid)) return;
		let m_object = this.#serverSid_registry.get(sid);

		switch(m_object.type)
		{
			case "r":
				switch(status){
					case rpcStatus.REGISTRATION_ACCEPTED:
							this.#serverSid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(true);
							this._handleRegisterEvents([utils.systemEvents.REGISTRATION_SUCCESS, utils.systemEvents.SERVER_ONLINE] , "" ,  m_object);
						break;
					case rpcStatus.UNREGISTRATION_ACCEPTED:
						this.#serverSid_registry.get(sid).status = rpcStatus.REGISTRATION_INITIATED;
						m_object.ino._set_isOnline(false);
						this._handleRegisterEvents([utils.systemEvents.UNREGISTRATION_SUCCESS, utils.systemEvents.SERVER_OFFLINE], "", m_object);
						//this.#serverName_sid.get(m_object.name).delete(sid);
						//this.#serverSid_registry.delete(sid);
						break;
					
					default:
							this.#serverSid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
						if (status == rpcStatus.UNREGISTRATION_ERROR) {
							this._handleRegisterEvents([utils.systemEvents.UNREGISTRATION_FAIL], reason, m_object);
						} else {
							this._handleRegisterEvents([utils.systemEvents.REGISTRATION_FAIL], reason, m_object);
							//this.#serverName_sid.get(m_object.name).delete(sid);
							//this.#serverSid_registry.delete(sid);

						}
							
						break;

				}
				break;
			case "c":
				switch(status){
					case rpcStatus.RPC_CONNECTION_ACCEPTED:
							this.#serverSid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(true);
							this._handleRegisterEvents([utils.systemEvents.RPC_CONNECT_SUCCESS, utils.systemEvents.SERVER_ONLINE] , "" ,  m_object);
						break;
					default:
							this.#serverSid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
							this._handleRegisterEvents([utils.systemEvents.RPC_CONNECT_FAIL] , reason ,  m_object);
							this.#serverName_sid.get(m_object.name).delete(sid);
							this.#serverSid_registry.delete(sid);

						break;

				}
				break;
			default:
				break;
		}
		
	}




_updateRegistrationStatusRepeat(sid , status , reason)
	{
		if(!this.#serverSid_registry.has(sid)) return;
		let m_object = this.#serverSid_registry.get(sid);

		switch(m_object.type)
		{
			case "r":
				switch(status){
					case rpcStatus.REGISTRATION_ACCEPTED:
							this.#private_resubscribe_count =  this.#private_resubscribe_count - 1;
							this.#serverSid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(true);
							this._handleRegisterEvents([utils.systemEvents.SERVER_ONLINE] , "" ,  m_object);
						break;
					default:
							this.#serverSid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
							this._handleRegisterEvents([utils.systemEvents.SERVER_OFFLINE] , reason ,  m_object);
						break;

				}
				break;
			case "c":
				switch(status){
					case rpcStatus.RPC_CONNECTION_ACCEPTED:
							this.#serverSid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(true);
						this._handleRegisterEvents([utils.systemEvents.SERVER_ONLINE] , "" ,  m_object);
						break;
					default:
							this.#serverSid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
						this._handleRegisterEvents([utils.systemEvents.SERVER_OFFLINE] , reason ,  m_object);
						break;

				}
				break;
			default:
				break;
		}
		
	}
		
	
    
	_updateRegistrationStatusAddChange(life_cycle, sid ,  status ,  reason)
	{
		if(life_cycle == 0)  // first time subscription 
		{
          
			this._updateRegistrationStatus(sid , status, reason);
		}else{ // resubscribe due to network failure 
			this._updateRegistrationStatusRepeat(sid , status, reason);
		}
	}


    connect(serverName)
	{
        try {
			this._validateServerName(serverName, 1)
		} catch (error) {
			throw(error);
		}

		
        let sid =  utils.GenerateUniqueId();
        
        let cStatus = utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.CONNECT_TO_RPC_SERVER, serverName, sid ,  undefined);
		if(!cStatus) throw(new dBError("E053")); 

		let rpccaller = new CrpCaller(serverName, this.#dbcore, this);

		if (this.#serverName_sid.has(serverName)) {
			this.#serverName_sid.get(serverName).set(sid, null);
		} else {
			this.#serverName_sid.set(serverName, new Map());
			this.#serverName_sid.get(serverName).set(sid, null);
		}
        let m_value = {"name": serverName , "type":  "c", "status": rpcStatus.RPC_CONNECTION_INITIATED, "ino": rpccaller};
        this.#serverSid_registry.set(sid ,  m_value);
        return rpccaller;
    }


	ChannelCall(channelName) {
		if (this.#serverName_sid.has(channelName)) {
			let sid = [... this.#serverName_sid.get(channelName).keys()][0];
			let mobject = this.#serverSid_registry.get(sid);
			//this.#serverSid_registry.get(sid).count = mobject.count + 1;
			return mobject.ino;
		}
		let sid = utils.GenerateUniqueId();
		let rpccaller = new CrpCaller(channelName, this.#dbcore, this, "ch");
		this.#serverName_sid.set(channelName, new Map());
		this.#serverName_sid.get(channelName).set(sid, null);
		let m_value = { "name": channelName, "type": "x", "status": rpcStatus.RPC_CONNECTION_INITIATED, "ino": rpccaller, "count": 1 };
		this.#serverSid_registry.set(sid, m_value);
		return rpccaller;
	}

	/*ClearChannel(channelName){
		if(!this.#serverName_sid.has(channelName)) return;
		let sid = this.#serverName_sid.get(channelName)
		
		if (this.#serverSid_registry.get(sid).count ==  1){
			this.#serverName_sid.delete(channelName);
			this.#serverSid_registry.delete(sid);
		}else{
			let mobject =  this.#serverSid_registry.get(sid);
			this.#serverSid_registry.get(sid).count = mobject.count - 1; 			
		}
	}*/

    store_object(sid , rpccaller)
    {
        this.#callersid_object.set(sid ,  rpccaller);
    }

    delete_object(sid)
    {
        this.#callersid_object.delete(sid);
    }

    get_object(sid)
    {
        return this.#callersid_object.get(sid);
    }

    get_rpcServerObject(sid)
    {
		if(this.#serverSid_registry.has(sid))  return this.#serverSid_registry.get(sid).ino;
		if(this.#callersid_object.has(sid) ) return this.#callersid_object.get(sid);
    }

	_send_OfflineEvents() {

		this.#serverName_sid.forEach((sidmap, key) => {
			sidmap.forEach((svalue, sid) => {
				let value = this.#serverSid_registry.get(sid);
				value.ino._set_isOnline(false);
				this._handleRegisterEvents([utils.systemEvents.SERVER_OFFLINE], "", value);
			});
		}); 
	} 

	cleanUp_All() {
		const clean_channel = (sid) => {
			return new Promise(resolve => {
				let mobject = this.#serverSid_registry.get(sid);
				mobject.ino.unbind();
				resolve();
			});
		}
		this.#serverName_sid.forEach((sidmap, key) => {
			let excludeFlag = false;
			sidmap.forEach((svalue, sid) => {
				let mobject = this.#serverSid_registry.get(sid);
				if (mobject.type == 'r') {
					excludeFlag = true;
				} else {
					clean_channel(sid).then(() => {
						this.#serverSid_registry.delete(sid);
					});
				}
			});
			if (!excludeFlag) {
				this.#serverName_sid.delete(key);
			}
		});
	}
}


module.exports = CRpc;