import { RPC,RPCSpi } from "jigsaw-rpc";
import NetConfigServer from "../net-config/NetConfigServer";
import InterfaceInfo from "../net-config/InterfaceInfo";
import InterfaceManager from "./InterfaceManager";
import Direction from "../net-interface/Direction";

type IntfInfo = {intf_name:string,from_domain:string,to_domain:string,type:Direction};

class NetHelperService{
    private jigsaw : RPCSpi.jigsaw.IJigsaw;
    private config_server : NetConfigServer;
    private registry_server : RPCSpi.network.RegistryServer;
    private interface_manager : InterfaceManager;

    constructor(config_server:NetConfigServer,registry_server:RPCSpi.network.RegistryServer,interface_manager:InterfaceManager){
        
        this.config_server = config_server;
        this.registry_server = registry_server;
        this.interface_manager = interface_manager;

        this.jigsaw = RPC.GetJigsaw({name:"jigsaw-net.helper",registry:this.config_server.getRegistryURL()});
        this.jigsaw.on("error",()=>{
            
        });

        this.jigsaw.port("getNodes",this.getRegistryNodes.bind(this));
        this.jigsaw.port("listNodes",this.listRegistryNodes.bind(this));

        this.jigsaw.port("getIntfs",this.getInterfacesInfo.bind(this));
        this.jigsaw.port("listIntfs",this.listInterfacesInfo.bind(this));

    }
    getRegistryNodes(){

        let storage = this.registry_server.getStorage();
        return storage.getFlattedNodes();
    }
    listRegistryNodes(){
        let nodes = this.getRegistryNodes();
        return nodes;
    }
    getInterfacesInfo(){
        let handle_intfs =  this.config_server.getInterfaces();
        
        let ret : Array<IntfInfo> = [];
        let interfaces = this.interface_manager.getInterfaces();
        interfaces.forEach((net_intf)=>{
            
            let name = net_intf.getName();
            let direction = net_intf.getDirection();
            let obj = {intf_name:name,from_domain:"",to_domain:"",type:direction};
            if(handle_intfs.has(name)){

                if(direction == Direction.IN){
                    obj.from_domain = net_intf.getAccessor().getFromDomain();
                }else if(direction == Direction.OUT)
                    obj.to_domain = net_intf.getConnection().getTargetDomainName();

            }

            ret.push(obj);
        })

        return ret;
    }
    listInterfacesInfo() : string{
        let intfs = this.getInterfacesInfo();
        let ret:Array<string> = [];
        intfs.forEach((v)=>{
            let part_name = v.intf_name;

            if(v.type == Direction.IN)
                ret.push(`<${part_name}> <- [${v.from_domain.padEnd(6)}]`);
            else if(v.type == Direction.OUT)
                ret.push(`<${part_name}> -> [${v.to_domain.padEnd(6)}]`);
            else{
                ret.push(`<${part_name}> ? [${"".padEnd(6)}]`);
            }

        });
        return ret.join("\n");
    }
    async close(){
        await this.jigsaw.close();
    }

}

export default NetHelperService;
