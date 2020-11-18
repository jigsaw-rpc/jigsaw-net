import NetConfigServer from "../net-config/NetConfigServer";

import { RPC,RPCSpi } from "jigsaw-rpc";
import InterfaceManager from "./InterfaceManager";
import NetHelperService from "./NetHelperService";


class NetHelper{
    private regserver ;
    private net_name : string;
    private registry : string;

    private config_server : NetConfigServer;
    private interface_manager : InterfaceManager;
    private helper_serv : NetHelperService;

    constructor(net_name:string,def_routes:string[][] = [],bind_port:number = 3793){
        this.net_name = net_name;
        let registry = `jigsaw://127.0.0.1:${bind_port}/`;

        this.registry = registry;

        this.config_server = new NetConfigServer(registry,this.net_name,def_routes);
        this.regserver = new RPC.registry.Server(bind_port);
        this.interface_manager = new InterfaceManager(this.registry);

        this.helper_serv = new NetHelperService(this.config_server,this.regserver,this.interface_manager);
        
    }

    getHelperService(){
        return this.helper_serv;
    }
    getRegistryServer(){
        return this.regserver; 
    }
    getConfigServer(){
        return this.config_server;
    }
    getInterfaceManager(){
        return this.interface_manager;
    }

    async close(){

        await this.interface_manager.close();
        await this.helper_serv.close();
        await this.config_server.close();
        await this.regserver.close();

    }
}

export default NetHelper;