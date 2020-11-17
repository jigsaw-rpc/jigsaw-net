import {RPC,RPCSpi} from "jigsaw-rpc"

class AddrRoute implements RPCSpi.network.IRoute{
    private addr : RPCSpi.network.AddressInfo;
    
    constructor(addr:RPCSpi.network.AddressInfo){
        this.addr = addr;
    }
    async preload(){

    }
    async getAddressInfo() : Promise<RPCSpi.network.AddressInfo>{
        return this.addr;
    }
}

export default AddrRoute;
