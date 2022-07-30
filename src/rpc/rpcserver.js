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

const rpcStatus = require('./rpcstatus');
const dispatcher =  require('../dispatcher/dispatcher');
const CrpcResponse = require('./rpcresponse');
const utils = require('../utils/util');
const moment = require('moment');
const dBError = require('../exception/errormessages');

class Crpcserver
{
    #serverName=undefined;
    #dbcore = undefined;
    #sid = undefined;
    #isOnline = false;
    #dispatch = undefined;
	functions = undefined;
	#functionNames = undefined;

    constructor(servername, sid , dbpointer)
    {
        this.#serverName = servername;
        this.#dbcore = dbpointer;
        this.#sid = sid;
        this.#isOnline = false;
        this.#dispatch = new dispatcher();
		this.functions = undefined;

		this.#functionNames = ["rpc.callee.queue.exceeded", "rpc.response.tracker", "dbridges:rpc.server.registration.success",
			"dbridges:rpc.server.registration.fail", "dbridges:rpc.server.online", "dbridges:rpc.server.offline", "dbridges:rpc.server.unregistration.success",
			"dbridges:rpc.server.unregistration.fail"];
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



    register()
    {
        try {
            if(this._verify_function()){
                this.functions();
            }
        } catch (error) {
            throw error;
        }
        

       let cStatus = utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.REGISTER_RPC_SERVER, this.#serverName, this.#sid ,  undefined);
		if(!cStatus) throw(new dBError("E047")); 
    }




    unregister()
    {
       let cStatus = utils.updatedBNewtworkSC(this.#dbcore, MessageTypes.UNREGISTER_RPC_SERVER, this.#serverName, this.#sid ,  undefined);
		if(!cStatus) throw(new dBError("E047")); 
		//this.unbind();
		//this.functions = null;
    }



    _verify_function()
	{
		let mflag = false;

        if(!this.functions) throw(new dBError("E072"));

        if(typeof this.functions != 'function')	throw(new dBError("E073"));		
        mflag=true;		
		return mflag
	}


	regfn(functionName, callback) {
		if (!(functionName)) throw (new dBError("E112"));
		if (!(callback)) throw (new dBError("E113"));
		if (!(typeof functionName === "string")) throw (new dBError("E112"));
		if (!(typeof callback === "function")) throw (new dBError("E113"));

		if (this.#functionNames.includes(functionName)) throw (new dBError("E112"));
		if(!this.#dispatch.isExists(functionName)){
			this.#dispatch.bind(functionName, callback);
		}
	}


	unregfn(functionName, callback) {
		if (this.#functionNames.includes(functionName)) return;
		this.#dispatch.unbind(functionName, callback);
	}


    bind(eventName , callback)
	{
		if(!(eventName)) throw (new dBError("E074")); 
		
		if(!(callback)) throw (new dBError("E075"));
		
		if(!(typeof eventName === "string" )) throw(new dBError( "E074")); 
		
		if(!(typeof callback === "function") ) throw(new dBError("E075"));

		if (!this.#functionNames.includes(eventName)) throw (new dBError("E074"));

		this.#dispatch.bind(eventName , callback);
	}

    unbind(eventName , callback)
	{
		if (!this.#functionNames.includes(eventName)) return;
	    this.#dispatch.unbind(eventName , callback); 
	}


	_handle_dispatcher(functionName ,  returnSubect ,  sid , payload)
	{
		

		let response = new CrpcResponse(functionName,returnSubect, sid ,  this.#dbcore , true);

		this.#dispatch.emit_clientfunction(functionName ,  payload ,  response);
	}


	_handle_dispatcher_WithObject(functionName ,  returnSubect ,  sid , payload, sourceip, sourceid)
	{
	
		let response = new CrpcResponse(functionName,returnSubect, sid ,  this.#dbcore , true);

		let sessionid =  "";
		let libtype = "";
		let sourceipv4 = "";
		let sourceipv6 = "";
		let msourceid = "";
		if(sourceid){
		var strData = sourceid.split("#")
			if(strData.length > 1) sessionid =  strData[0];
			if(strData.length > 2) libtype =  strData[1];
			if(strData.length > 3) sourceipv4 =  strData[2];
			if(strData.length >= 4) sourceipv6 =  strData[3];
		}



		let inOnject = {"inparam": payload ,  "sessionid": sessionid, "libtype": libtype,
						"sourceipv4": sourceipv4 , "sourceipv6": sourceipv6 , "info": sourceip}

		this.#dispatch.emit_clientfunction(functionName ,  inOnject ,  response);

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


	
    
    emit(eventName , EventInfo ,  channelName )
	{
		this.#dispatch.emit_clientfunction(eventName , EventInfo ,  channelName );
	}


	resetqueue() {
		let m_status = utils.updatedBNewtworkCF(this.#dbcore, MessageTypes.RPC_CALLEE_QUEUE_EXCEEDED, null, null, null, null, null, null, null);
		if (!m_status) throw (new dBError("E068"));
	}

}


module.exports = Crpcserver;