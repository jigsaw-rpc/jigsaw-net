import NetConfigClient from "./net-config/NetConfigClient";
import {RPC, RPCSpi} from "jigsaw-rpc";
import DomainPath from "./net-interface/DomainPath";
import RouteParser from "./RouteParser";
import RoutingPacket from "./packet/RoutingPacket";
import Config from "./net-config/Config";
import LifeCycle from "./utils/LifeCycle";


type RouteContext = {
    handled : boolean,
    ctx:RPCSpi.jigsaw.context.PreContext,
    path:DomainPath,
    config:Config,
    routes:Array<Array<string>>   
}
class RouteError extends Error{};

class Middleware{
    private config_client;
    private jg : RPCSpi.jigsaw.IJigsaw;
    private ref : number = 0 ;

    constructor(jigsaw : RPCSpi.jigsaw.IJigsaw){
        this.jg = jigsaw;

        this.config_client = new NetConfigClient(this.jg);
        this.setRef(+1);

    }
    getLifeCycle(){
        return this.config_client.getLifeCycle();
    }
    setRef(offset:number){
        this.ref += offset;
    }
    getConfigClient(){
        return this.config_client;
    }
    handle() : RPCSpi.jigsaw.ware.PreWare{
        return this.process.bind(this);
    }
    async close(){
        
        await this.config_client.close();
        this.setRef(-1);

    }
    private async process(ctx:RPCSpi.jigsaw.context.PreContext,next:RPCSpi.jigsaw.ware.NextFunction){

        await next();

        if(this.getLifeCycle().getState() != "ready")
            return;
        
        try{
            let path = DomainPath.parse(ctx.pathstr);

            let config = this.config_client.getConfig();
            let routes = this.config_client.getConfigRoutes();
            let context : RouteContext = {handled : false,ctx,path,config,routes};

            this.handleSelfRoute(context);
            this.handleRoutes(context);

            throw new RouteError("can't find the route to this path");
        
        }catch(err){
            if(err instanceof RouteError)
                throw err;



            //console.log(err);
            return;
        }
        
        
    }

    private handleRoutes(context:RouteContext){

        for(let route of context.routes){
            let parser = new RouteParser(context.path.domain,route);
            if(parser.isMatched()){

                let regpath = parser.getRegpath();
                let payload = context.ctx.rawdata;
                let isJSON = !(payload instanceof Buffer);
                if(isJSON)
                    payload = Buffer.from(JSON.stringify(context.ctx.rawdata));
                
                
                let routing_packet = new RoutingPacket();
                
                routing_packet.dst_pathstr = context.ctx.rawpathstr;
                routing_packet.from_domain = context.config.netname;
                routing_packet.payload = payload;
                routing_packet.isJSON = isJSON;

                routing_packet.encode();

                
                context.ctx.pathstr = `${regpath}:route`;
                context.ctx.data = routing_packet.getBuffer();
                context.ctx.route = new RPCSpi.network.RegistryRoute(regpath,this.jg.getRegistryClient());
                //ctx.route.regpath = regpath;

                throw new Error("route finished");
            }

        }

    }
    private handleSelfRoute(context:RouteContext){
        let config = this.config_client.getConfig();
        if(context.path.domain == config.netname){ // self domain
            context.ctx.route = new RPCSpi.network.RegistryRoute(context.path.regpath,this.jg.getRegistryClient());
            context.ctx.pathstr = `${context.path.regpath}:${context.path.method}`;
            context.handled = true;
            throw new Error("this domain is inside");            
        }

    }

}

export default Middleware;
