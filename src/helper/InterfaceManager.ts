import ConnectRequest from "../net-interface/ConnectRequest";
import NetInterface from "../net-interface/NetInterface";

class InterfaceManager{
    private interfaces : Array<NetInterface> = [];
    private registry:string;
    constructor(registry:string){
        this.registry = registry;
    }
    getInterfaces(){
        return this.interfaces;
    }
    getNewInterface(name:string,entry:string,to_registry?:string,to_domain?:string,to_name?:string){
        let default_connect_to : ConnectRequest | undefined = undefined;
        if(to_registry && to_domain && to_name)
            default_connect_to = {registry:to_registry,domain:to_domain,name:to_name};

        let intf = new NetInterface({name,registry:this.registry,entry},default_connect_to);
        this.interfaces.push(intf);
        return intf;
    }
    getNetInterface(name:string){
        let ret = this.interfaces.find((x)=>{
            return x.getName() == name;
        });
        if(!ret)
            throw new Error(`can find this NetInterface ${name}`)
        return ret;
    }
    async close(){
        for(let intf of this.interfaces)
            await intf.close();

    }
    
}

export default InterfaceManager;