import assert from "assert";
import {RPCSpi} from "jigsaw-rpc";



class Accessor{
    private reply_info? : RPCSpi.network.AddressInfo;
    private can_reply : boolean = false;
    private from_domain : string = "";
    private jgname : string = "";

    constructor(){

    }
    update(jgname:string,from_domain:string,reply_info : RPCSpi.network.AddressInfo){
        this.from_domain = from_domain;
        this.reply_info = reply_info;
        this.jgname = jgname;
        this.can_reply = true;
    }
    getCanReply(){
        return this.can_reply;
    }
    getFromDomain(){
        return this.from_domain;
    }
    getReplyInfo(){
        assert(this.can_reply);
        return this.reply_info as RPCSpi.network.AddressInfo;
    }

}

export default Accessor;
