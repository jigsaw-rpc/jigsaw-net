import NetConfigServer from "./net-config/NetConfigServer";
import NetInterface from "./net-interface/NetInterface";
import { RPC,RPCSpi } from "jigsaw-rpc";


class NetHelper{
    private server : NetConfigServer;
    private regserver ;
    private net_name : string;
    private registry : string;
    private interfaces : Array<NetInterface> = [];
    constructor(net_name:string,def_routes:string[][] = [],bind_port:number = 3793){
        this.net_name = net_name;
        let registry = `jigsaw://127.0.0.1:${bind_port}/`;

        this.registry = registry;
        this.server = new NetConfigServer(registry,this.net_name,def_routes);
        this.regserver = new RPC.registry.Server(bind_port);
    }
    getRegistryServer(){
        return this.regserver; 
    }
    getConfigServer(){
        return this.server;
    }
    getNewInterface(name:string,to_registry?:string,to_domain?:string,to_name?:string){
        let default_connect_to : any = undefined;
        if(to_registry && to_domain && to_name)
            default_connect_to = {registry:to_registry,domain:to_domain,name:to_name};

        let intf = new NetInterface({name,registry:this.registry},default_connect_to);
        this.interfaces.push(intf);
        return intf;
    }
    async close(){
        for(let intf of this.interfaces)
            await intf.close();

        await this.server.close();
        await this.regserver.close();

    }
}

export default NetHelper;