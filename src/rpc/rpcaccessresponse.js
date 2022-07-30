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

class CaccessRpcResponse
{
    #dbrpc = undefined;
    #serverName = undefined;
    #sid = undefined;
    #mtype =  undefined
    constructor(m_type , serverName , sid , rpc)
    {
        this.#dbrpc = channels;
        this.#mtype = m_type;
        this.#serverName = serverName;
        this.#sid =  sid;
        this.#dbrpc =rpc;
    }

    end(data)
    {
     
        this.#dbrpc._send_to_dbr(this.#mtype ,  this.#serverName , this.#sid , data );
    }

    exception(info)
    {
        let vresult  = {'statuscode': 9 ,  'error_message':  info ,  'accesskey': null};

        this.#dbrpc._send_to_dbr(this.#mtype ,  this.#serverName , this.#sid , vresult );
    }

}

module.exports = CaccessRpcResponse;