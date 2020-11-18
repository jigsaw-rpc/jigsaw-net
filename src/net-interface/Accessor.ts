import assert from "assert";
import {RPCSpi} from "jigsaw-rpc";



class Accessor{
    private reply_info? : RPCSpi.network.AddressInfo;
    private can_reply : boolean = false;
    private from_domain : string = "";
    private from_intf : string = "";
    private jgname : string = "";

    constructor(){

    }
    update(jgname:string,from_domain:string,from_intf:string,reply_info : RPCSpi.network.AddressInfo){
        this.from_domain = from_domain;
        this.from_intf = from_intf;
        this.reply_info = reply_info;
        this.jgname = jgname;
        this.can_reply = true;
    }
    getCanReply(){
        return this.can_reply;
    }
    getFromInterfaceName(){
        return this.from_intf;
    }
    getFromDomain(){
        return this.from_domain;
    }
    getReplyInfo(){
        assert(this.can_reply,"this Accessor can not reply now");
        return this.reply_info as RPCSpi.network.AddressInfo;
    }

}

export default Accessor;
