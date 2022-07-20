
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
const utils = require('../utils/util');
const moment = require('moment')
const dBError = require('../exception/errormessages');

class CrpcResponse
{
    #functionName= undefined;
    tracker = false;
    #returnSubsect = undefined;
    #dbcore=undefined;
    #sid = undefined;
    #isend=false;
    id =  undefined;
    #isRpc = false;


    constructor(functionName , returnSubect, sid , dbcoreobject ,  rpc=false)
    {
        this.#functionName = functionName;
        this.#returnSubsect = returnSubect;
        this.#sid = sid;
        this.#dbcore = dbcoreobject;
        this.#isend = false;
        this.id =  returnSubect;
        this.tracker = false;
        this.#isRpc =  rpc;

    }

    next(data)
    {
        if(!this.#isend){

            let cstatus =   false;
            if(!this.#isRpc){
             cstatus =  utils.updatedBNewtworkCF(this.#dbcore ,  MessageTypes.CF_CALL_RESPONSE , null, this.#returnSubsect , null , this.#sid , data , this.#isend, this.tracker);
            }else{
                cstatus =  utils.updatedBNewtworkCF(this.#dbcore ,  MessageTypes.RPC_CALL_RESPONSE , null, this.#returnSubsect , null , this.#sid , data , this.#isend, this.tracker);
            }

         if(!cstatus)
         {
            if(!this.#isRpc){
            throw(new dBError("E068")); 
            }else{
                throw(new dBError("E079")); 
            }
         }
        }else{
            if(!this.#isRpc){
                throw(new dBError("E105")); 
                }else{
                    throw(new dBError("E106")); 
                }
        }

    }


    end(data)
    {
        if(!this.#isend){
            this.#isend = true;
            
            let cstatus =  false;
            if(!this.#isRpc){
                cstatus = utils.updatedBNewtworkCF(this.#dbcore ,  MessageTypes.CF_CALL_RESPONSE , null, this.#returnSubsect , null , this.#sid , data , this.#isend, this.tracker);
            }else{
                cstatus = utils.updatedBNewtworkCF(this.#dbcore ,  MessageTypes.RPC_CALL_RESPONSE , null, this.#returnSubsect , null , this.#sid , data , this.#isend, this.tracker);
            }
   
            if(!cstatus) {
                if(!this.#isRpc){
                    throw(new dBError("E068")); 
                    }else{
                        throw(new dBError("E079")); 
                    }
            }

           }else{
            if(!this.#isRpc){
                throw(new dBError("E105")); 
                }else{
                    throw(new dBError("E106")); 
                }
           }
   
    }

    exception(expCode , expShortMessage)
    {
        let epayload = JSON.stringify({'c': expCode, 'm': expShortMessage});
        
        if(!this.#isend){
            this.#isend = true;
            let cstatus = false;
            
            if(!this.#isRpc){
               cstatus = utils.updatedBNewtworkCF(this.#dbcore ,  MessageTypes.CF_CALL_RESPONSE , null, this.#returnSubsect , "EXP" , this.#sid , epayload , this.#isend, this.tracker);
            }else{
                cstatus = utils.updatedBNewtworkCF(this.#dbcore ,  MessageTypes.RPC_CALL_RESPONSE , null, this.#returnSubsect , "EXP" , this.#sid , epayload , this.#isend, this.tracker);
            }
            
   
            if(!cstatus) {
                if(!this.#isRpc){
                    throw(new dBError("E068")); 
                    }else{
                        throw(new dBError("E079")); 
                    }
            }
           }else{
            if(!this.#isRpc){
                throw(new dBError("E105")); 
                }else{
                    throw(new dBError("E106")); 
                } 
           }
    }

}

module.exports = CrpcResponse