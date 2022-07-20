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

const MessageTypes = require('../msgtypes/dbmessagetypes');
const channel = require('./channel');
const utils = require('../utils/util');

const channelStatus = require('./channelstatus');
const dispatcher =  require('../dispatcher/dispatcher');
const dBError = require('../exception/errormessages');

class Channels
{
	#channel_type = undefined;
	#channelsid_registry = undefined;
	#channelname_sid = undefined;
	#dbcore = undefined;
	#dispatch = undefined;
	#metadata =  {
		"channelname": undefined , 
		"eventname": undefined,
		"sourcesysid": undefined, 
		"sqnum": undefined,
		"sessionid": undefined, 
		"intime": undefined,
	};

	

    constructor(dBCoreObject)
	{		
		this.#channel_type = ["pvt" ,   "prs", "sys"];
		this.#channelsid_registry=new Map(); 

		this.#channelname_sid = new Map();
		this.#dbcore = dBCoreObject;
		this.#dispatch =  new dispatcher();
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

	_handledispatcherX(eventName ,  eventInfo, channelName, metadata , recdDate, recdlatency, rcount)
	{
		if(metadata){
			this.#dispatch.emit(eventName, eventInfo,channelName, metadata, recdDate,recdlatency, rcount);
		}else{
			this.#dispatch.emit(eventName, eventInfo,channelName);
		}
	}


	_handledispatcher(eventName ,  eventInfo=undefined,  metadata=undefined )
	{
		this.#dispatch.emit_channel(eventName, eventInfo,metadata);
	}


	_handledispatcherEvents(eventName ,  eventInfo=undefined, channelName=undefined, metadata=undefined)
	{
	
		this.#dispatch.emit_channel(eventName, eventInfo,metadata);
		
		let sid =  this.#channelname_sid.get(channelName);
		let m_object =  this.#channelsid_registry.get(sid);
		if(!m_object) return;
		
		m_object.ino.emit_channel(eventName, eventInfo,metadata);
	}




	isPrivateChannel(channelName)
	{
		let flag = false;
		if(channelName.includes(":")){
			var sdata = channelName.toLowerCase().split(":");
			if(this.#channel_type.includes(sdata[0])) {
				flag = true;
			}else{  // the first : if anything in : 
				flag=false;
			}
		}
		return flag;

	}



	_ReSubscribeAll()
	{
		const _communicateR = async (mtype , channelName, sid , access_token)=>
		{
			let cStatus =  false;
			if(mtype ==  0){
				cStatus = utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.SERVER_SUBSCRIBE_TO_CHANNEL, channelName, sid ,  access_token );
			}
			if(!cStatus) throw(new dBError("E024")); 
		}

		const _ReSubscribe = async (sid)=>{
				let m_object = this.#channelsid_registry.get(sid)
				let access_token =  undefined;

			switch(m_object.status)
			{
				case channelStatus.SUBSCRIPTION_ACCEPTED:
				case channelStatus.SUBSCRIPTION_INITIATED:
					try {
						_communicateR(0, m_object.name , sid, access_token);
						
					} catch (error) {
						this._handleSubscribeEvents([utils.systemEvents.OFFLINE] , error ,  m_object);
						return;
					}
					break;
				
				case channelStatus.UNSUBSCRIBE_INITIATED:
					m_object.ino._set_isOnline(false);
					this._handleSubscribeEvents([utils.systemEvents.UNSUBSCRIBE_SUCCESS,utils.systemEvents.REMOVE] , "" ,  m_object);
					this.#channelname_sid.delete(m_object.name);
					this.#channelsid_registry.delete(sid);

					break;
						
			}

		}

		this.#channelname_sid.forEach((value,key) => {
			_ReSubscribe(value);
		});
	}




	isEmptyOrSpaces(str){
		return str === null || (/^ *$/).test(str);
	}


	_validateChanelName(channelName, error_type=0)
	{
		if(!this.#dbcore.connectionstate.isconnected) {
			switch (error_type) {
				case 0:
					throw (new dBError("E024"));
					break;
				case 1:
					throw (new dBError("E030"));
					break;
				case 2:
					throw(new dBError("E014"));
					break;
				case 3:
					throw(new dBError("E019"));
					break;
				case 4:
					throw(new dBError("E033"));
					break;
				default:
					break;
			}
			
		}
		if(typeof channelName != 'string') {
			switch (error_type) {
				case 0:
					throw (new dBError("E026"));
					break;
				case 1:
					throw (new dBError("E030"));
					break;
				case 2:
					throw(new dBError("E015"));
					break;
				case 3:
					throw(new dBError("E020"));
					break;
				case 4:
					throw(new dBError("E035"));
					break;
				
				default:
					break;
			}
		}
		if(this.isEmptyOrSpaces(channelName)) {
			switch (error_type) {
				case 0:
					throw (new dBError("E025"));
					break;
				case 1:
					throw (new dBError("E030"));
					break;
				case 2:
					throw(new dBError("E016"));
					break;
				case 3:
					throw(new dBError("E021"));
					break;
				case 4:
					throw(new dBError("E037"));
					break;
				
				default:
					break;
			}
		}
		if(channelName.length > 64) {
			switch (error_type) {
				case 0:
					throw (new dBError("E027"));
					break;
				case 1:
					throw (new dBError("E030"));
					break;
				case 2:
					throw(new dBError("E017"));
					break;
				case 3:
					throw(new dBError("E022"));
					break;
				case 4:
					throw(new dBError("E036"));
					break;
				
				default:
					break;
			}

		}
		//var letters = '/^[0-9a-zA-Z_-:.]+$/';
		if(!(/^[a-zA-Z0-9\.:_-]*$/.test(channelName))) {
			switch (error_type) {
				case 0:
					throw (new dBError("E028"));
					break;
				case 1:
					throw (new dBError("E030"));
					break;
				case 2:
					throw(new dBError("E015")); //E018
					break;
				case 3:
					throw(new dBError("E023"));
					break;
				case 4:
					throw(new dBError("E039"));
					break;
				
				default:
					break;
			}
		}
	
		if(channelName.includes(":")){
			var sdata = channelName.toLowerCase().split(":");
			if(!this.#channel_type.includes(sdata[0])) {
				switch (error_type) {
					case 0:
						throw (new dBError("E028"));
						break;
					case 1:
						throw (new dBError("E030"));
						break;
					case 2:
						throw(new dBError("E015"));
						break;
					case 3:
						throw(new dBError("E023"));
						break;
					case 4:
						throw(new dBError("E039"));
						break;	
					default:
						break;
				}
			}
		}



	}




	_communicate(mtype , channelName, access_token)
	{
		let cStatus =  false;
		let m_channel = undefined;
		let m_value = undefined;

		let sid =  utils.GenerateUniqueId();

		cStatus = utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.SERVER_SUBSCRIBE_TO_CHANNEL, channelName, sid ,  access_token );

		if(!cStatus) {
			if(mtype == 0){
				throw(new dBError("E024")); 
			}else{
				throw(new dBError("E024"));
			}
		}


		m_channel =  new channel(channelName ,  sid, this.#dbcore );
		m_value = {"name": channelName , "type":  "s", "status": channelStatus.SUBSCRIPTION_INITIATED, "ino": m_channel };

		
		this.#channelsid_registry.set(sid , m_value);
		this.#channelname_sid.set(channelName, sid);
		return m_channel;
	}



	subscribe(channelName)
	{
		let access_token = null;
		
		if (channelName.toLowerCase() != "sys:*") {
			try {
				this._validateChanelName(channelName)
			} catch (error) {
				throw (error);
			}
		}

		if(this.#channelname_sid.has(channelName)) throw(new dBError("E029"));
		let m_channel = undefined;
		try {
			m_channel = this._communicate(0 , channelName, access_token);
		} catch (error) {
			throw(error);
		}
		return m_channel;
	}


	unsubscribe(channelName)
	{
		if(!channelName) throw(new dBError("E030"));
		if (channelName.toLowerCase() != "sys:*") {
			try {
				this._validateChanelName(channelName, 1);
			} catch (error) {
				throw (error);
			}
		}

		if(!this.#channelname_sid.has(channelName)) throw(new dBError("E030"));

		let sid = this.#channelname_sid.get(channelName);
		let m_object = this.#channelsid_registry.get(sid);
		let m_status = false;
		if(m_object.type != "s") throw(new dBError("E030"));

		if(m_object.status == channelStatus.UNSUBSCRIBE_INITIATED) throw(new dBError("E031"));

		if(m_object.status == channelStatus.SUBSCRIPTION_ACCEPTED || 
			m_object.status == channelStatus.SUBSCRIPTION_INITIATED ||
			m_object.status == channelStatus.SUBSCRIPTION_PENDING || 
			m_object.status == channelStatus.SUBSCRIPTION_ERROR || 
			m_object.status == channelStatus.UNSUBSCRIBE_ERROR ){
				m_status = utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.SERVER_UNSUBSCRIBE_DISCONNECT_FROM_CHANNEL, channelName, sid ,  undefined );
		}

		if(!m_status) throw(new dBError("E032")); 

		this.#channelsid_registry.get(sid).status =  channelStatus.UNSUBSCRIBE_INITIATED;
	}



	_handleSubscribeEvents(eventName , eventData ,  m_object)
	{
		const dispatchEvents = async (i) => {
			let metadata =  Object.assign({}, this.#metadata);
			 metadata.channelname =  m_object.ino.getChannelName();
			 metadata.eventname = eventName[i];

			this.#dispatch.emit_channel(eventName[i], eventData, metadata);
			m_object.ino.emit_channel(eventName[i], eventData, metadata);

			i = i + 1;
            if (i < eventName.length) {
                dispatchEvents(i);
            } 
		}
		if (eventName.length > 0) {
            dispatchEvents(0);
        } 
	}

	_updateSubscribeStatus(sid , status , reason)
	{
		if(!this.#channelsid_registry.has(sid)) return;
		let m_object = this.#channelsid_registry.get(sid);

		switch(m_object.type)
		{
			case "s":
				switch(status){
					case channelStatus.SUBSCRIPTION_ACCEPTED:
							this.#channelsid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(true);
							this._handleSubscribeEvents([utils.systemEvents.SUBSCRIBE_SUCCESS, utils.systemEvents.ONLINE] , "" ,  m_object);
						break;
					default:
							this.#channelsid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
							this._handleSubscribeEvents([utils.systemEvents.SUBSCRIBE_FAIL] , reason ,  m_object);
							this.#channelname_sid.delete(m_object.name);
							this.#channelsid_registry.delete(sid);

						break;

				}
				break;
			case "c":
				switch(status){
					case channelStatus.CONNECTION_ACCEPTED:
							this.#channelsid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(true);
							this._handleSubscribeEvents([utils.systemEvents.CONNECT_SUCCESS, utils.systemEvents.ONLINE] , "" ,  m_object);
						break;
					default:
							this.#channelsid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
							this._handleSubscribeEvents([utils.systemEvents.CONNECT_FAIL] , reason ,  m_object);
							this.#channelname_sid.delete(m_object.name);
							this.#channelsid_registry.delete(sid);

						break;

				}
				break;
			default:
				break;
		}
		
	}




	_updateSubscribeStatusRepeat(sid , status , reason)
	{
		if(!this.#channelsid_registry.has(sid)) return;
		let m_object = this.#channelsid_registry.get(sid);

		switch(m_object.type)
		{
			case "s":
				switch(status){
					case channelStatus.SUBSCRIPTION_ACCEPTED:
							this.#channelsid_registry.get(sid).status = status;
						m_object.ino._set_isOnline(true);
						this._handleSubscribeEvents([utils.systemEvents.RESUBSCRIBE_SUCCESS, utils.systemEvents.ONLINE], "", m_object);
						break;
					default:
							this.#channelsid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
							this._handleSubscribeEvents([utils.systemEvents.OFFLINE] , reason ,  m_object);
						break;

				}
				break;
			case "c":
				switch(status){
					case channelStatus.CONNECTION_ACCEPTED:
							this.#channelsid_registry.get(sid).status = status;
						m_object.ino._set_isOnline(true);
						this._handleSubscribeEvents([utils.systemEvents.RECONNECT_SUCCESS, utils.systemEvents.ONLINE], "", m_object);
						break;
					default:
							this.#channelsid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
							this._handleSubscribeEvents([utils.systemEvents.OFFLINE] , reason ,  m_object);
						break;

				}
				break;
			default:
				break;
		}
		
	}
	
	

	_updateChannelsStatusAddChange(life_cycle, sid ,  status ,  reason)
	{
		if(life_cycle == 0)  // first time subscription 
		{
			this._updateSubscribeStatus(sid , status, reason);
		}else{ // resubscribe due to network failure 
			this._updateSubscribeStatusRepeat(sid , status, reason);
		}
	}


	_updateChannelsStatusRemove(sid, status, reason)
	{
		if(!this.#channelsid_registry.has(sid)) return;
		let m_object = this.#channelsid_registry.get(sid);

		switch(m_object.type)
		{
			case "s":
				switch(status){
					case channelStatus.UNSUBSCRIBE_ACCEPTED:
							this.#channelsid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
							this._handleSubscribeEvents([utils.systemEvents.UNSUBSCRIBE_SUCCESS,utils.systemEvents.REMOVE] , "" ,  m_object);
							this.#channelname_sid.delete(m_object.name);
							this.#channelsid_registry.delete(sid);
						break;
					default:
							this.#channelsid_registry.get(sid).status = channelStatus.SUBSCRIPTION_ACCEPTED;
							m_object.ino._set_isOnline(true);
							this._handleSubscribeEvents([utils.systemEvents.UNSUBSCRIBE_FAIL , utils.systemEvents.ONLINE] , reason ,  m_object);
						break;

				}
				break;
			case "c":
				switch(status){
					case channelStatus.DISCONNECT_ACCEPTED:
							this.#channelsid_registry.get(sid).status = status;
							m_object.ino._set_isOnline(false);
							this._handleSubscribeEvents([ utils.systemEvents.DISCONNECT_SUCCESS, utils.systemEvents.REMOVE] , "" ,  m_object);
							this.#channelname_sid.delete(m_object.name);
							this.#channelsid_registry.delete(sid);
						break;
					default:
							this.#channelsid_registry.get(sid).status = channelStatus.CONNECTION_ACCEPTED;
							m_object.ino._set_isOnline(true);
							this._handleSubscribeEvents([utils.systemEvents.DISCONNECT_FAIL,   utils.systemEvents.ONLINE] , reason ,  m_object);
						break;

				}
				break;
			default:
				break;
		}
	}



	_isonline(sid)
	{
		if(!this.#channelsid_registry.has(sid)) return false;
		let m_object =  this.#channelsid_registry.get(sid);
		if(m_object.status == channelStatus.CONNECTION_ACCEPTED ||
			m_object.status == channelStatus.SUBSCRIPTION_ACCEPTED ) return true;

		return false;
	}

	isOnline(channelName)
	{
		if(!this.#dbcore._isSocketConnected()) return false;
		if(!this.#channelname_sid.has(channelName)) return false;
		let sid =  this.#channelname_sid.get(channelName);
		return this._isonline(sid);
	}

	list()
	{
		let m_data = [];

		this.#channelsid_registry.forEach((value,key) => {
			let i_data = {"name":  value.name , "type": (value.type == "s")? "subscribed": "connect" ,  "isonline": this._isonline(key) };
			m_data.push(i_data);
		});

		return m_data;
	}

	_send_OfflineEvents(){

		this.#channelsid_registry.forEach((value,key) => {
			let meta_data = Object.assign({}, this.#metadata);
			meta_data.eventname = utils.systemEvents.OFFLINE;
			meta_data.channelname = value.name;
			value.ino._set_isOnline(false);

			this._handledispatcherEvents(utils.systemEvents.OFFLINE, value.name, value.name, meta_data);
		});

	}
	
	_get_subscribeStatus(sid)
	{
		return this.#channelsid_registry.get(sid).status;
	}


	_get_channelType(sid)
	{
		return this.#channelsid_registry.has(sid) ? this.#channelsid_registry.get(sid).type : "";
	}


	_get_channelName(sid)
	{
		return (this.#channelsid_registry.has(sid))? this.#channelsid_registry.get(sid).name : undefined;
	}


	publish(channelName, eventName, eventData, exclude_session_id=undefined , source_id=undefined, seqnum=undefined)
	{
		

		if (channelName.toLowerCase() == "sys:*") throw (new dBError("E015"));
		
		try {
			this._validateChanelName(channelName, 2)
		} catch (error) {
			throw (error);
		}

		if(!eventName) throw(new dBError("E058"));
		if (typeof eventName != 'string') throw (new dBError("E059"));


		let m_status =  utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.SERVER_PUBLISH_TO_CHANNEL, channelName, (!exclude_session_id)?null:exclude_session_id ,  eventData, eventName , source_id,  null, seqnum);

		if(!m_status) throw(new dBError("E014"));

		return;	
	}


	sendmsg(channelName, eventName, eventData, to_session_id, source_id=undefined, seqnum=undefined){
		
		
		if (channelName.toLowerCase() == "sys:*") throw (new dBError("E020"));
		
		try {
			this._validateChanelName(channelName, 3)
		} catch (error) {
			throw (error);
		}
		
		if(channelName.toLowerCase().startsWith("prs:")) {
			if(!source_id) throw (new dBError("E020"));
		}

												
		let m_status =  utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.SERVER_CHANNEL_SENDMSG, channelName, (!to_session_id)?null:to_session_id ,  eventData, eventName , source_id, null, seqnum);

		if(!m_status) throw(new dBError("E019"));
		return;
	}
	

	getConnectStatus(sid)
	{
		return this.#channelsid_registry.get(sid).status;
	}


	getChannel(sid)
	{
		if(!this.#channelsid_registry.has(sid)) return undefined;
		return this.#channelsid_registry.get(sid).ino;
	}

	getChannelName(sid)
	{
		if(!this.#channelsid_registry.has(sid)) return undefined;
		return this.#channelsid_registry.get(sid).name;
	}

	isSubscribedChannel(sid)
	{
		if(!this.#channelsid_registry.has(sid)) return false;
		if(this.#channelsid_registry.get(sid).type == "s"){
			return this.#channelsid_registry.get(sid).ino.isSubscribed;
		}else{
			return false;
		}

	}

	//call(channelName, FunctionName, ?payload, ttl,(response)=> {
	call(channelName, functionName ,  payload ,  ttl , callback)
	{
		return new Promise( async (resolve , reject) =>{

			try {
				this._validateChanelName(channelName, 4)
			} catch (error) {
				reject (error);
			}

			if( !['channelMemberList', 'channelMemberInfo', 'timeout' ,  'err'].includes(functionName)){
		
				reject(new dBError("E038"));
			}else{

			if(channelName.toLowerCase().startsWith("prs:") || 
				channelName.toLowerCase().startsWith("sys:") ) {
				let caller = this.#dbcore.rpc.ChannelCall(channelName);
		
				caller.call(functionName ,  payload ,  ttl ,  (response)=>{
                    callback(response);
                })
                .then((response) => {
                    resolve(response)
					
                })
                .catch((error)=>{
					
                    reject(error);
                });
			}else{
		
				reject(new dBError("E039"));
			}
		}
		});
	}


	cleanUp_All()
	{
		
		const clean_channel=(sid)=>{
			return new Promise(resolve => {
				let mobject = this.#channelsid_registry.get(sid);
				if(mobject.type == "s"){
					mobject.ino.unbind();
					mobject.ino.unbind_all();
				}else{
					mobject.ino.unbind();
				}
				resolve();
			});
		}

		this.#channelname_sid.forEach((value,key) => {
			let metadata =  Object.assign({}, this.#metadata);
			 metadata.channelname =  key;
			 metadata.eventname = "dbridges:channel.removed";
			
			
			this._handledispatcherEvents(utils.systemEvents.REMOVE , undefined , key ,metadata );
			
			clean_channel(value)
				.then(()=>{
					this.#channelname_sid.delete(key);
					this.#channelsid_registry.delete(value);
				});
		});

		//this.#dispatch.unbind();
		//this.#dispatch.unbind_all();

	}
}

module.exports = Channels;