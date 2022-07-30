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

const dBError = require('../exception/errormessages');

class dispatcher
{
    #local_register = undefined;
    #global_register = undefined;

    constructor()
    {
        this.#local_register = new Map();
        this.#global_register = [];
    }


    isExists(eventName){
        return this.#local_register.has(eventName);
    }

    bind(eventName ,  callback)
    {
        if (!eventName)  throw (new dBError("E012")); 
        if (!callback) throw (new dBError("E013"));

        if (typeof (eventName) != "string") throw (new dBError("E012"));
        if (typeof (callback) != "function") throw (new dBError("E013"));

        if(!this.#local_register.has(eventName)){
            this.#local_register.set(eventName ,  [callback]);
        }else{
            this.#local_register.get(eventName).push(callback);
        }
    }

    bind_all(callback) {
        if (!callback) throw (new dBError("E013"))
        if (typeof (callback) != 'function') throw (new dBError("E013"))
        this.#global_register.push(callback);
    }


    unbind(eventName , callback)
    {
        if(!eventName && !callback) {
            this.#local_register = new Map();
            return;
        }

        if(eventName && !callback){
            this.#local_register.delete(eventName);
            return;
        }

        if(eventName && callback){
            this.#local_register.get(eventName).forEach(ca => {
                if(ca ===  callback){
                    delete this.#local_register.get(eventName)[ca];
                }
            });
        }
    }


    unbind_all(callback){
        if(!callback) {
            this.#global_register = [];
            return;
        }
        delete this.#global_register[callback];       
    }

    emit2(eventName , channelName ,  sessionId , action ,  response)
    {
        if(this.#local_register.has(eventName)){
            var callbacks = this.#local_register.get(eventName);
          if(callbacks.length > 0)  {
              for (let index = 0; index < callbacks.length; index++) {
                  callbacks[index](channelName,sessionId,action,  response );
          }
        }
    }
    }

    emit_cf(functionName ,  inparameter , response , rsub=null)
    {
        if(this.#local_register.has(functionName)){
            var callbacks = this.#local_register.get(functionName);
          if(callbacks.length > 0)  {
            callbacks[0](inparameter, response, rsub );
          }
        }
    }
   
    emit_connectionState(eventName ,  payload=undefined ,  metadata=undefined)
    {
        const global_registry_call = (index) => {
            if(!payload && !metadata) this.#global_register[index]();
            if(!payload && metadata) this.#global_register[index](undefined ,  metadata);
            if(payload && metadata) this.#global_register[index](payload ,  metadata);
            if(payload && !metadata) this.#global_register[index](payload);
            index = index + 1;
            if (index < this.#global_register.length) global_registry_call(index);
        };
        if (this.#global_register.length > 0)  global_registry_call(0);
        //=========================================================================================
        if(this.#local_register.has(eventName)){
            var callbacks = this.#local_register.get(eventName);
            const local_registry_call = (index) => {
                if(!payload && !metadata) callbacks[index]();
                if(!payload && metadata) callbacks[index](undefined ,  metadata);
                if(payload && metadata) callbacks[index](payload ,  metadata);
                if(payload && !metadata) callbacks[index](payload);
                index = index + 1;
                if (index < callbacks.length) local_registry_call(index);
            };
            if (callbacks.length > 0) local_registry_call(0);
        }
    }


    emit_channel(eventName ,  payload=undefined ,  metadata=undefined)
    {
        const global_registry_call = (index) => {
            if(!payload && !metadata) this.#global_register[index]();
            if(!payload && metadata) this.#global_register[index](undefined ,  metadata);
            if(payload && metadata) this.#global_register[index](payload ,  metadata);
            if(payload && !metadata) this.#global_register[index](payload);
            index = index + 1;
            if (index < this.#global_register.length) global_registry_call(index);
        };
        if (this.#global_register.length > 0)  global_registry_call(0);
        //=========================================================================================
        if(this.#local_register.has(eventName)){
            var callbacks = this.#local_register.get(eventName);
            const local_registry_call = (index) => {
                if(!payload && !metadata) callbacks[index]();
                if(!payload && metadata) callbacks[index](undefined ,  metadata);
                if(payload && metadata) callbacks[index](payload ,  metadata);
                if(payload && !metadata) callbacks[index](payload);
                index = index + 1;
                if (index < callbacks.length) local_registry_call(index);
            };
            if (callbacks.length > 0) local_registry_call(0);
        }
    }

    emit_clientfunction(functionName ,  inparameter , response=null , rsub=null)
    {
        if(this.#local_register.has(functionName)){
            var callbacks = this.#local_register.get(functionName);
          if(callbacks.length > 0)  {
            for (let index = 0; index < callbacks.length; index++) {
            callbacks[index](inparameter, response, rsub );
            }

          }
        }
    }


    emit(eventName , EventInfo ,  channelName ,  metadata, recdDate,recdlatency, rcount)
    {
        const global_registry_call = (index) => {
            if(EventInfo && channelName && metadata){       
                this.#global_register[index](eventName,channelName, EventInfo,  metadata );
                
            }else if(EventInfo && channelName && !metadata){
                this.#global_register[index](eventName,channelName,EventInfo );
            }else if(EventInfo && !channelName && metadata){
                this.#global_register[index](eventName,EventInfo , metadata);
            }else if(EventInfo && !channelName && !metadata){
                this.#global_register[index](eventName, EventInfo);
            }else if(!EventInfo && !channelName && !metadata){
                this.#global_register[index](eventName);
            }else if(!EventInfo && channelName && !metadata){
                this.#global_register[index](eventName ,  channelName);
            }
            
            index = index + 1;
            if (index < this.#global_register.length) {
                global_registry_call(index);
            } 
        };

        if (this.#global_register.length > 0) {
            global_registry_call(0);
        } 


        if(this.#local_register.has(eventName)){
            var callbacks = this.#local_register.get(eventName);

            const local_registry_call = (index) => {
                if(EventInfo && channelName && metadata){
                    callbacks[index](channelName,eventName,EventInfo,  metadata );
                    
                    
                }else if(EventInfo && channelName && !metadata){
                    callbacks[index](channelName,eventName,EventInfo );
                }else if(EventInfo && !channelName && metadata){
                    callbacks[index](eventName,EventInfo , metadata);
                }else if(EventInfo && !channelName && !metadata){
                    callbacks[index](EventInfo);
                }else if(!EventInfo && !channelName && !metadata){
                    callbacks[index]();
                }else if(!EventInfo && channelName && !metadata){
                    callbacks[index](channelName);
                }

                index = index + 1;
                if (index < callbacks.length) {
                    local_registry_call(index);
                } 
            };

            if (callbacks.length > 0) {
                local_registry_call(0);
            }

        }
    }
}


module.exports = dispatcher;