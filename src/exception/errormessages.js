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

// version : 20220419
// Date : 19-04-2022

const errMsg = {
    "E001": [1, 1],
    "E002": [1, 2],
    "E003": [1, 2],
    "E005": [1, 12],
    "E006": [1, 5],
    "E008": [1, 5],
    "E009": [1, 7],
    "E010": [1, 7],
    "E011": [4, 8],
    "E012": [5, 9],
    "E013": [5, 10],
    "E014": [6, 8],
    "E015": [6, 11],
    "E016": [6, 11],
    "E017": [6, 14],
    "E019": [19, 8],
    "E020": [19, 11],
    "E021": [19, 11],
    "E022": [19, 14],
    "E023": [19, 11],
    "E024": [11, 8],
    "E025": [11, 11],
    "E026": [11, 11],
    "E027": [11, 14],
    "E028": [11, 11],
    "E029": [11, 15],
    "E030": [12, 16],
    "E031": [12, 17],
    "E032": [12, 8],
    "E033": [20, 8],
    "E035": [20, 11],
    "E036": [20, 14],
    "E037": [20, 11],
    "E038": [20, 24],
    "E039": [20, 11],
    "E040": [3, 3],
    "E041": [10, 13],
    "E042": [20, 19],
    "E043": [25, 18],
    "E044": [25, 18],
    "E045": [25, 18],
    "E046": [25, 18],
    "E047": [26, 8],
    "E048": [21, 18],
    "E049": [21, 18],
    "E051": [21, 18],
    "E052": [21, 18],
    "E053": [21, 8],
    "E054": [15, 3],
    "E055": [22, 3],
    "E058": [6, 20],
    "E059": [6, 20],
    "E060": [1, 21],
    "E061": [24, 22],
    "E062": [24, 23],
    "E063": [1, 8],
    "E064": [7, 3],
    "E065": [14, 3],
    "E066": [16, 9],
    "E067": [16, 10],
    "E068": [27, 8],
    "E069": [27, 25],
    "E070": [13, 3],
    "E071": [2, 3],
    "E072": [26, 26],
    "E073": [26, 26],
    "E074": [17, 9],
    "E075": [17, 10],
    "E076": [18, 9],
    "E077": [18, 10],
    "E079": [15, 8],
    "E080": [15, 25],
    "E081": [8, 3],
    "E082": [9, 3],
    "E105": [27, 37],
    "E106": [23, 37],
    "E107": [27, 38],
    "E108": [23, 38],
    "E109": [20, 38],
    "E110": [32, 39],
    "E111": [32, 10],
    "E112": [33, 39],
    "E113": [33, 10]
};

const source_lookup = {
    1: "DBLIB_CONNECT",
    2: "DBCFCALLEE_CF_CALL",
    3: "DBNET_CHANNEL_CALL",
    4: "DBLIB_RTTPING",
    5: "DBLIB_CONNECT_BIND",
    6: "DBLIB_CHANNEL_PUBLISH",
    7: "DBNET_CHANNEL_SUBSCRIBE",
    8: "DBNET_RPC_REGISTER",
    9: "DBNET_RPC_CONNECT",
    10: "DBRPCCALLEE_CHANNEL_CALL",
    11: "DBLIB_CHANNEL_SUBSCRIBE",
    12: "DBLIB_CHANNEL_UNSUBSCRIBE",
    13: "DBNET_CF_CALL",
    14: "DBNET_CHANNEL_UNSUBSCRIBE",
    15: "DBNET_RPC_CALL",
    16: "DBLIB_CF_BIND",
    17: "DBLIB_RPC_BIND",
    18: "DBLIB_RPC_CALLER",
    19: "DBLIB_CHANNEL_SENDMSG",
    20: "DBLIB_CHANNEL_CALL",
    21: "DBLIB_RPC_CONNECT",
    22: "DBRPCCALLEE_RPC_CALL",
    23: "DBLIB_RPC_CALL",
    24: "DBNET_CONNECT",
    25: "DBLIB_RPC_INIT",
    26: "DBLIB_RPC_REGISTER",
    27: "DBLIB_CF_CALL",
    28: "DBNET_CHANNEL_CONNECT",
    29: "DBNET_CHANNEL_DISCONNECT",
    30: "DBLIB_CHANNEL_CONNECT",
    31: "DBLIB_CHANNEL_DISCONNECT",
    32: "DBLIB_CF_REGFN",
    33: "DBLIB_RPC_REGFN"
};

const code_lookup = {
    1: "INVALID_URL",
    2: "INVALID_AUTH_PARAM",
    3: "ERR_",
    4: "INVALID_ACCESSTOKEN_FUNCTION",
    5: "HTTP_",
    6: "AUTH_FAILED",
    7: "INVALID_CLIENTFUNCTION",
    8: "NETWORK_DISCONNECTED",
    9: "INVALID_EVENTNAME",
    10: "INVALID_CALLBACK",
    11: "INVALID_CHANNELNAME",
    12: "ACCESSTOKEN_FAILED",
    13: "CALLEE_EXCEPTION",
    14: "INVALID_CHANNELNAME_LENGTH",
    15: "CHANNEL_ALREADY_SUBSCRIBED",
    16: "CHANNEL_NOT_SUBSCRIBED",
    17: "CHANNEL_ALREADY_UNSUBSCRIBED",
    18: "INVALID_SERVERNAME",
    19: "RPC_TIMEOUT",
    20: "INVALID_SUBJECT",
    21: "RECONNECT_ATTEMPT_EXCEEDED",
    22: "DISCONNECT_REQUEST",
    23: "RECONNECT_REQUEST",
    24: "INVALID_FUNCTION",
    25: "RESPONSE_TIMEOUT",
    26: "RPC_INVALID_FUNCTIONS",
    27: "ACCESS_TOKEN_FAIL",
    28: "ACCESS_TOKEN",
    29: "CHANNEL_EXISTS",
    30: "CHANNEL_ALREADY_CONNECTED",
    31: "INVALID_CHANNEL",
    32: "UNSUBSCRIBE_ALREADY_INITIATED",
    33: "INVALID_TYPE",
    34: "DISCONNECT_ALREADY_INITIATED",
    35: "INVALID_BINDING",
    36: "ACCESS_DENIED",
    37: "RESPONSE_OBJECT_CLOSED",
    38: "ID_GENERATION_FAILED",
    39: "INVALID_FUNCTION_NAME",
    40: "INVALID_CHANNEL_TYPE",
    41: "INVALID_CHANNEL_TYPE_BINDING"
};


class dBError extends Error
{
    #EKEY =  undefined;
    source =undefined;
    code = undefined;
    constructor(ekey, elist=undefined)
    {
        let mflag = false;
        if(ekey in errMsg)
        {
            super(ekey);
            let evalue = errMsg[ekey];
            if(evalue.length ==  2){
                if(evalue[0] in source_lookup) {
                this.source =   source_lookup[evalue[0]];
                mflag = true;  
                }else{
                    this.source = "DBLIB_EXCEPTION" + "_" + evalue[0];
                    this.code = evalue[0] + "_undefined";
                }

                if(evalue[1] in code_lookup) {
                    this.code =   code_lookup[evalue[1]];  
                } else {
                    if (mflag)
                        this.code = evalue[1] + "_undefined";
                    else
                        this.code = evalue[0] + "_" + evalue[1] + "_undefined";
                    } 
            }else{
                this.source =   "DBLIB_EXCEPTION"
            }

            if(elist){
                this.message = elist.join(", ");
            }else{
                this.message = "";
            }

        } else {
            super(ekey);
            this.source = "DBLIB_EXCEPTION";
            this.code = ekey + "_undefined";
        }
        Error.captureStackTrace(this, this.constructor);
        this.#EKEY =  ekey;
    }

    updatecode(code, message=undefined)
    {
        if (code) {
            if (this.code.charAt(this.code.length - 1) != "_") {
                this.code = this.code + "_" + code;
            } else {
                this.code = this.code + code;
            }
        }

        if(message) this.message =  message
    }

    getEKEY()
    {
        return this.#EKEY;
    }

}

module.exports = dBError;