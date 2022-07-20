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
const CrpcResponse = require('./rpcresponse');
const utils = require('../utils/util');
const MessageTypes = require('../msgtypes/dbmessagetypes');
const dBError = require('../exception/errormessages');

class Crpcclient
{
    #dispatch = undefined;
	#dbcore = undefined;
    
	enable =false;
	functions = undefined;
	#sid_functionname=undefined;
	#functionNames = undefined

    constructor(dBCoreObject)
    {
        this.#dispatch = new dispatcher();
	    this.#dbcore = dBCoreObject;
        
		this.enable =  false;
		this.functions = undefined;
		this.#sid_functionname = new Map();
		this.#functionNames = ["cf.callee.queue.exceeded", "cf.response.tracker"];
	}


	_verify_function()
	{
		let mflag = false;
		if(this.enable){
			if(!this.functions) throw(new dBError("E009"));
			if(typeof this.functions != 'function')	throw(new dBError("E010"));		
			mflag=true;
		}else{
			mflag = true;
		}
		return mflag
	}


	regfn(functionName, callback) {
		if (!(functionName)) throw (new dBError("E110"));
		if (!(callback)) throw (new dBError("E111"));
		if (!(typeof functionName === "string")) throw (new dBError("E110"));
		if (!(typeof callback === "function")) throw (new dBError("E111"));

		if (this.#functionNames.includes(functionName)) throw (new dBError("E110"));
		this.#dispatch.bind(functionName, callback);
	}


	unregfn(functionName, callback) {
		if (this.#functionNames.includes(functionName)) return;
		this.#dispatch.unbind(functionName, callback);
	}

    bind(eventName , callback)
	{
		
		if(!(eventName)) throw (new dBError("E066")); 
		
		if(!(callback)) throw (new dBError("E067"));
		
		if(!(typeof eventName === "string" )) throw(new dBError("E066")); 
		if(!(typeof callback === "function") ) throw(new dBError("E067"));

		if (!this.#functionNames.includes(eventName)) throw (new dBError("E066"));

		this.#dispatch.bind(eventName, callback);
	}


    unbind(eventName , callback)
	{
		if (!this.#functionNames.includes(eventName)) return;
	    this.#dispatch.unbind(eventName , callback); 
	}


	_handle_dispatcher(functionName ,  returnSubect ,  sid , payload)
	{
		let response = new CrpcResponse(functionName,returnSubect, sid ,  this.#dbcore );
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
		
		this.#dispatch.emit_clientfunction('cf.response.tracker' ,  responseid , errorcode);
	}

	_handle_exceed_dispatcher()
	{
		let err = new dBError("E070");
		err.updatecode("CALLEE_QUEUE_EXCEEDED");
		this.#dispatch.emit_clientfunction('cf.callee.queue.exceeded' ,  err , null);
	}



	resetqueue() {
		let m_status = utils.updatedBNewtworkCF(this.#dbcore, MessageTypes.CF_CALLEE_QUEUE_EXCEEDED, null, null, null, null, null, null, null);
		if (!m_status) throw (new dBError("E068"));
	}


	async #call_internal(sessionid , functionName ,  inparameter, sid, progress_callback)
	{
		return new Promise( async (resolve , reject) =>{
		

		let cstatus =  utils.updatedBNewtworkCF(this.#dbcore , MessageTypes.CF_CALL, sessionid, functionName , null , sid ,  inparameter );

		if(!cstatus) reject(new dBError("E068")); 

		this.#dispatch.bind(sid , (response , rspend, rsub)=>{
			let dberror = undefined;
			let eobject = undefined;
			if(!rspend){
				if(progress_callback) progress_callback(response);
			}else{
				if(rsub != null){
					if(rsub == "EXP"){
						eobject =  JSON.parse(response);
						dberror = new dBError("E071");
						dberror.updatecode(eobject.c, eobject.m );
						reject(dberror);
					}else{
						dberror = new dBError("E070");
						dberror.updatecode(rsub);
						reject(dberror);
					}
				}else{
					resolve(response);
				}
				this.#dispatch.unbind(sid);
				this.#sid_functionname.delete(sid);
			}
			});
		});
	}

	#GetUniqueSid(sid){
		let nsid = sid + utils.GenerateUniqueId();
		if (this.#sid_functionname.has(nsid)) {
			nsid = ("" + Math.random()).substring(2, 8);
		}
		return nsid;
	}

	call(sessionid , functionName ,  inparameter ,  ttlms , progress_callback)
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
			} else {
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
			throw (new dBError("E107"));
		}

		//*************************************************************************************************************************

		let timer = undefined;
		return Promise.race([
			this.#call_internal(sessionid, functionName, inparameter, sid, progress_callback),
			new Promise((_r, rej) =>{
				    timer = setTimeout(()=>{
					this.#dispatch.unbind(sid);
					this.#sid_functionname.delete(sid);
					rej(new dBError("E069"));
					utils.updatedBNewtworkCF(this.#dbcore , MessageTypes.CF_CALL_TIMEOUT, null,sid,null , null , null , null , null );
					
					clearTimeout(timer);
				}, ttlms);
			})
		]).then((result)=>{
			if(timer){
		
				clearTimeout(timer);
			}
			
			return result;
		}).catch((err) => {
			if(timer){
				clearTimeout(timer)
			}
			throw err;
			
        });
	}

}



module.exports = Crpcclient;