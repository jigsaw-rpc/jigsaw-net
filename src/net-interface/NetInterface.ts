import { RPC, RPCSpi } from "jigsaw-rpc";
import Connection from "./Connection";
import DomainPath from "./DomainPath";
import Config from "../net-config/Config";
import Accessor from "./Accessor"
import AddrRoute from "./AddrRoute";
import assert from "assert";
import NetConfigClient from "../net-config/NetConfigClient";
import LifeCycle from "../utils/LifeCycle";
import Middleware from "../Middleware";
import Defer from "../utils/Defer";
import Direction from "./Direction";
import ConnectRequest from "./ConnectRequest";
import Util from "util";
import RoutingPacket from "../packet/RoutingPacket";
const sleep = Util.promisify(setTimeout);

class NetInterface{

    private conn? : Connection;
    private accessor = new Accessor();

    private domain : string = "";
    private name : string;
    private ref = 0;
    
    private middle_ware : Middleware;
    private loop : boolean = false;
    private closing_defer = new Defer<void>();
    
    private config_client : NetConfigClient;
    private lifeCycle = new LifeCycle();
    private jigsaw : RPCSpi.jigsaw.IJigsaw;

    constructor(jgoption:RPCSpi.jigsaw.option.JigsawOption,default_connect_to?:ConnectRequest){
        
        this.middle_ware = new Middleware(jgoption);
        this.middle_ware.getLifeCycle().when("ready").then(async ()=>{
            this.setRef(+1);
            this.start_loop();
        });

        this.middle_ware.getLifeCycle().on("closed",async ()=>{
            this.setRef(-1);
        });


        this.jigsaw = this.middle_ware.getJigsaw();
        
        this.config_client = this.middle_ware.getConfigClient();

        this.name = this.jigsaw.getName();

        this.jigsaw.pre(this.middle_ware.handle());
        this.jigsaw.port("route",this.onRouteRequest.bind(this));
        this.jigsaw.port("connect",this.onConnect.bind(this));
        this.jigsaw.port("ping",async()=>(this.config_client.getConfig()));

        this.lifeCycle.on("ready",()=>{
            if(default_connect_to)
                this.connect(default_connect_to.registry,default_connect_to.domain,default_connect_to.name);
        })
        this.lifeCycle.setState("starting");

    }
    getName(){
        return this.name;
    }
    getLifeCycle(){
        return this.lifeCycle;
    }
    getDirection() : Direction{
        if(this.hasConnection() && this.getConnection().isConnected() && !this.accessor.getCanReply()){
            return Direction.OUT;
        }else if(!this.hasConnection() && this.accessor.getCanReply()){
            return Direction.IN;
        }else{
            return Direction.UNKNOWN;
        }
    }
    getAccessor(){
        assert(this.accessor.getCanReply());

        return this.accessor;
    }
    hasConnection(){
        return this.conn ? true : false;
    }
    getConnection():Connection{
        if(!this.hasConnection())
            throw new Error("right now don't connect to any interface");

        return this.conn as Connection;
    }
    private connect(to_regserver:string,to_domain:string,to_name:string){
        assert.strictEqual(this.getLifeCycle().getState() , "ready");

        if(this.conn)
            throw new Error(`already connect to ${to_domain}/${to_name}`);

        this.conn = new Connection(this.jigsaw,to_domain,to_regserver,to_name);
        this.conn.setDomainName(this.config_client.getConfig().netname);
    }
    private async start_loop(){
        if(this.loop)
            throw new Error("this loop has already started");

        this.setRef(+1);
        this.loop = true;
        while(this.loop){
            try{

                if(this.accessor.getCanReply()){
                    await this.config_client.reportInterfaceInfo({
                        intf_name:this.name,
                        from_domain:this.accessor.getFromDomain()
                    });    
                }
                if(this.conn)
                    await this.config_client.reportInterfaceInfo({
                        intf_name:this.name,
                        from_domain:this.conn.getTargetDomainName()
                    });
                
            }catch(err){

            }
            await sleep(3000);
        }

        this.setRef(-1);
    }
    private setRef(offset:number){
        this.ref += offset;
        if(this.ref == 2 && this.lifeCycle.getState() == "starting"){
            this.lifeCycle.setState("ready");
        }

        //console.log(this.ref,this.lifeCycle.getState())
        if(this.ref == 0 && this.lifeCycle.getState() == "closing"){
            this.closing_defer.resolve();
        };

    }
    async close(){
        assert(this.lifeCycle.getState()=="ready");

        this.lifeCycle.setState("closing");
        if(this.conn)
            await this.conn.close();

        await this.middle_ware.close();
        await this.jigsaw.close();

        this.loop = false;
        await this.closing_defer.promise;
        this.lifeCycle.setState("closed");

    }
    
    private getConfig(){
        return this.config_client.getConfig();
    }
    private async onRouteRequest(data:any){
        
        if(!(data instanceof Buffer))
            return;
        
        let routing_packet = new RoutingPacket();
        routing_packet.setBuffer(data);
        routing_packet.decode();

        
        let path = DomainPath.parse(routing_packet.dst_pathstr);
        let config = this.getConfig();
        if(path.domain == config.netname){
            let ret = await this.sendToInside(routing_packet);
            return ret;
        }
        
        if(!this.conn && this.accessor.getCanReply()){
            if(routing_packet.from_domain == this.accessor.getFromDomain()){
                return await this.continueRoute(routing_packet);
            }

            return await this.sendToAccessor(data);
        }

        if(this.conn && !this.accessor.getCanReply()){
            if(routing_packet.from_domain == this.conn.getTargetDomainName()){
                return await this.continueRoute(routing_packet);
            }

            return await this.sendToConnection(data);
        }

        /* CAN NOT RECOGNIZE THIS PACKET, SEND TO OTHERS */


    }
    private continueRoute(routing_packet:RoutingPacket){

        return this.jigsaw.send(routing_packet.dst_pathstr,this.getPayload(routing_packet));
    }
    private getPayload(routing_packet:RoutingPacket){
        let payload = routing_packet.isJSON ? 
        JSON.parse(routing_packet.payload.toString()) : 
        routing_packet.payload;
        return payload;
    }
    private async sendToAccessor(data:any){

        let result = await this.jigsaw.call(new RPCSpi.network.Path("path","route"),new AddrRoute(
            this.accessor.getReplyInfo()
        ),data);
        return result;
    }
    private async sendToInside(routing_packet:RoutingPacket){
        let path = DomainPath.parse(routing_packet.dst_pathstr);
        let result = await this.jigsaw.send(`${path.regpath}:${path.method}`,this.getPayload(routing_packet));   
        return result;
    }
    private async sendToConnection(data:any){
        //console.log(!!this.conn,data);

        if(!this.conn)
            throw new Error("not this connection");

        return await this.conn.getInvoker().send(`${this.conn.getTargetInterfaceName()}:route`,data);
    }

    private async onConnect(data:any,ctx:any){
        this.accessor.update(data.jgname,data.from_domain,data.from_intf,ctx.reply_info);

        return {ok:true};
    }

    
}


export default NetInterface;