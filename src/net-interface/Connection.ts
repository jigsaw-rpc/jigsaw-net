import {RPC,RPCSpi} from "jigsaw-rpc"
import Defer from "../utils/Defer";
import AddrRoute from "./AddrRoute";
import Util from "util";
const sleep = Util.promisify(setTimeout);


class Connection{
    private invoker : RPCSpi.jigsaw.IJigsaw;
    private connector : RPCSpi.jigsaw.IJigsaw;
    private jgname : string;
    private domain_name? : string;
    private loop : boolean = false;
    private closing_defer = new Defer<void>();
    private to_domain :string;
    constructor(connector: RPCSpi.jigsaw.IJigsaw,to_domain:string,to_regserver:string,jgname:string){
    
        this.invoker = RPC.GetJigsaw({registry:to_regserver});
        this.connector = connector;
        this.jgname = jgname;
        this.to_domain = to_domain;
        this.start();
    }
    setDomainName(domain_name : string){
        this.domain_name = domain_name;
    }
    getTargetInterfaceName(){
        return this.jgname;
    }
    getTargetDomainName(){
        return this.to_domain;
    }
    getInvoker(){
        return this.invoker;
    }

    async start(){
        if(this.loop)
            throw new Error("already started");

        this.loop = true;
        while(this.loop){
            try{

                await this.connect();
            }catch(err){
//                console.log(err);
            }
            await sleep(5000);
        }
        this.closing_defer.resolve();
    }
    async close(){
        await this.invoker.close();
        this.loop = false;
        await this.closing_defer.promise;
        
    }
    private async connect(){
        if(!this.domain_name)
            throw new Error("provide domain_name first");

        let target = await this.invoker.getRegistryClient().resolve(this.jgname);

        let data = {
            from_domain:this.domain_name,
            jgname:this.jgname,
        };

        let ret = await this.connector.call(new RPCSpi.network.Path(this.jgname,"connect"),new AddrRoute(target.addr),data);
    }
    
}

export default Connection;