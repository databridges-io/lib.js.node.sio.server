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
const utils = require('../utils/util');
const MessageTypes = require('../msgtypes/dbmessagetypes');
const CaccessRpcResponse =  require('./rpcaccessresponse')
const CrpcSResponse =  require('./rpcsresponse');
const dBError = require('../exception/errormessages');

class CrpCaller
{
    #dispatch = undefined;
	#dbcore = undefined;
    #serverName = undefined;
	functions = undefined;
	#sid_functionname=undefined;
    #isOnline = false;
    #rpccore = undefined;
	#callerTYPE=undefined;

    constructor(serverName, dBCoreObject, rpccoreobject, callertype="rpc")
    {
        this.#dispatch = new dispatcher();
	    this.#dbcore = dBCoreObject;
        this.#rpccore = rpccoreobject;
        
		this.enable =  false;
		this.functions = undefined;
		this.#sid_functionname = new Map();
        this.#serverName = serverName;
        this.#isOnline = false;
		this.#callerTYPE =  callertype
    }


    getServerName()
    {
	  return this.#serverName;
	}
	
	isOnline()
	{
		return this.#isOnline;
	}

	_set_isOnline(value)
	{
		this.#isOnline = value;
	}


    bind(eventName , callback)
	{
		if(!(eventName)) throw (new dBError("E076")); 
		if(!(callback)) throw (new dBError("E077"));
		if(!(typeof eventName === "string" )) throw(new dBError( "E076")); 
		if(!(typeof callback === "function") ) throw(new dBError("E077"));
		this.#dispatch.bind(eventName , callback);
	}

    unbind(eventName , callback)
	{
	    this.#dispatch.unbind(eventName , callback); 
	}


	_handle_dispatcher(functionName ,  returnSubect ,  sid , payload)
	{
	
		let response = new CrpcSResponse(functionName,returnSubect, sid ,  this.#dbcore );

		this.#dispatch.emit_clientfunction(functionName ,  payload ,  response);
	}

	_handle_callResponse( sid, payload , isend, rsub)
	{
		if(this.#sid_functionname.has(sid)){
			let mataData = {'functionName': this.#sid_functionname.get(sid)};
			this.#dispatch.emit_clientfunction(sid ,  payload ,  isend, rsub);
		}
	}

	_handle_tracker_dispatcher(responseid ,  errorcode)
	{
		this.#dispatch.emit_clientfunction('rpc.response.tracker' ,  responseid , errorcode);
	}

	_handle_exceed_dispatcher()
	{
		let err = new dBError("E054");
		err.updatecode("CALLEE_QUEUE_EXCEEDED");
		this.#dispatch.emit_clientfunction('rpc.callee.queue.exceeded' ,  err , null);
	}



	async #call_internal(sessionid , functionName ,  inparameter, sid, progress_callback)
	{
		return new Promise( async (resolve , reject) =>{
			let cstatus =  undefined;
			if(this.#callerTYPE == 'rpc'){
				cstatus =  utils.updatedBNewtworkCF(this.#dbcore , MessageTypes.CALL_RPC_FUNCTION, sessionid, functionName , null , sid ,  inparameter );
			}else{
				cstatus =  utils.updatedBNewtworkCF(this.#dbcore , MessageTypes.CALL_CHANNEL_RPC_FUNCTION, sessionid, functionName , null , sid ,  inparameter );
			}
				if(!cstatus) {
					if(this.#callerTYPE == 'rpc'){
						reject(new dBError("E079")); 
					}else{
						reject(new dBError("E033")); 
					}
				}

		this.bind(sid , (response , rspend, rsub)=>{
			let dberror = undefined;
			if(!rspend){
				if(progress_callback) progress_callback(response);
			}else{
				if(rsub != null){
					switch(rsub.toUpperCase())
					{
						case "EXP": //exception from callee 
							let eobject =  JSON.parse(response);
							if(this.#callerTYPE == 'rpc'){
								dberror = new dBError("E055");
								dberror.updatecode(eobject.c, eobject.m );
								reject(dberror);
							}else{ //Channel call
								dberror = new dBError("E041"); 
								dberror.updatecode(eobject.c, eobject.m );
								reject(dberror);
							}
							break;
						default: // DBNET ERROR 
							if(this.#callerTYPE == 'rpc'){
								dberror = new dBError("E054");
								dberror.updatecode(rsub.toUpperCase(), "");
								reject(dberror);
							}else{ //Channel call
								dberror = new dBError("E040"); 
								dberror.updatecode(rsub.toUpperCase(), "");
								reject(dberror);
							}
							break;
					}

				}else{
					resolve(response);
				}
				this.unbind(sid);
				this.#sid_functionname.delete(sid);
			}
			});
		});
	}

	#GetUniqueSid(sid){
		let nsid =  sid + utils.GenerateUniqueId();
		if(this.#sid_functionname.has(nsid)){
			nsid = ("" + Math.random()).substring(2, 8);
		}
		return nsid;
	}

	call(functionName ,  inparameter ,  ttlms , progress_callback)
	{		


		let sid = "";
		let sid_created = true;
		let loop_index = 0;
		let loop_counter = 3;
		let mflag = false;
		sid = utils.GenerateUniqueId();

			do {

				if (this.#sid_functionname.has(sid)) {
					sid = this.#GetUniqueSid(sid);
					loop_index++;
				}else {
					this.#sid_functionname.set(sid, functionName);
					mflag = true;
				}
			} while ((loop_index < loop_counter) && (!mflag));

			if (!mflag) {
				sid = this.#GetUniqueSid(sid);
				if (!this.#sid_functionname.has(sid)) {
					this.#sid_functionname.set(sid, functionName);
				} else {
					sid_created = false;
				}
			}

		if (!sid_created) {
			if (this.#callerTYPE == 'rpc') {
				throw (new dBError("E108"));
			} else {
				throw (new dBError("E109")); //need to change this 
			}
		}

//*************************************************************************************************************************
        this.#rpccore.store_object(sid,this);

		let timer = undefined;

		return Promise.race([
			this.#call_internal(this.#serverName, functionName, inparameter, sid, progress_callback),
			new Promise((_r, rej) =>{
				    timer = setTimeout(()=>{
					this.unbind(sid);
						this.#sid_functionname.delete(sid);
						if (this.#callerTYPE == 'rpc') {
							rej(new dBError("E080"));
						} else {
							rej(new dBError("E042"));
						}
					utils.updatedBNewtworkCF(this.#dbcore , MessageTypes.RPC_CALL_TIMEOUT, null,sid,null , null , null , null , null );
					clearTimeout(timer);
				}, ttlms);
			})
		]).then((result)=>{
			if(timer){
				
				clearTimeout(timer);
			}
            this.#rpccore.delete_object(sid);
			
			return result;
		}).catch((err) => {
			if(timer){
				clearTimeout(timer)
			}
			throw err;
           
        });
	}

    emit(eventName , eventData ,  metadata )
	{
		this.#dispatch.emit_channel(eventName, eventData, metadata);
	}
}



module.exports = CrpCaller;